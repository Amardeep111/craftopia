package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

// DeriveKey generates a 32-byte AES-256 key via SHA-256 from the provided secret
func DeriveKey(secret string) []byte {
	h := sha256.Sum256([]byte(secret))
	return h[:]
}

// GenerateRandomHex produces a cryptographically secure hex string of n bytes (2n hex chars)
func GenerateRandomHex(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// EncryptSessionCookie encrypts a session token using AES-256-GCM, matching Node.js enc.v1 format
func EncryptSessionCookie(token, secret string) (string, error) {
	key := DeriveKey(secret)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	iv := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	sealed := gcm.Seal(nil, iv, []byte(token), nil)
	tagLen := gcm.Overhead()
	if len(sealed) < tagLen {
		return "", errors.New("sealed payload too short")
	}

	ciphertext := sealed[:len(sealed)-tagLen]
	tag := sealed[len(sealed)-tagLen:]

	return fmt.Sprintf("enc.v1.%s.%s.%s",
		base64.RawURLEncoding.EncodeToString(iv),
		base64.RawURLEncoding.EncodeToString(tag),
		base64.RawURLEncoding.EncodeToString(ciphertext),
	), nil
}

// DecryptSessionCookie decrypts an enc.v1.<iv>.<tag>.<ciphertext> AES-256-GCM cookie
func DecryptSessionCookie(value, secret string) (string, error) {
	if !strings.HasPrefix(value, "enc.v1.") {
		return "", errors.New("invalid session cookie format")
	}

	parts := strings.Split(value, ".")
	if len(parts) != 5 {
		return "", errors.New("invalid session cookie segment count")
	}

	iv, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("invalid IV: %w", err)
	}

	tag, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return "", fmt.Errorf("invalid tag: %w", err)
	}

	ciphertext, err := base64.RawURLEncoding.DecodeString(parts[4])
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext: %w", err)
	}

	key := DeriveKey(secret)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	ciphertextWithTag := append(ciphertext, tag...)
	plaintext, err := gcm.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt or authenticate session: %w", err)
	}

	return string(plaintext), nil
}

// PasswordEnvelope represents client-side RSA-OAEP encrypted password payload
type PasswordEnvelope struct {
	V          int    `json:"v"`
	Kid        string `json:"kid"`
	Ciphertext string `json:"ciphertext"`
}

// DecryptRSAEnvelope decrypts RSA-OAEP password payloads, or returns plaintext if raw string
func DecryptRSAEnvelope(rawPayload any, privateKeyB64 string) (string, error) {
	if rawPayload == nil {
		return "", errors.New("empty password")
	}

	// 1. Plaintext password string fallback
	if str, ok := rawPayload.(string); ok {
		return str, nil
	}

	// 2. Encrypted envelope format
	var env PasswordEnvelope
	b, err := json.Marshal(rawPayload)
	if err != nil {
		return "", errors.New("invalid password payload")
	}
	if err := json.Unmarshal(b, &env); err != nil {
		return "", errors.New("invalid password envelope")
	}

	if env.V != 1 || env.Ciphertext == "" {
		return "", errors.New("unsupported password envelope version or format")
	}

	if privateKeyB64 == "" {
		return "", errors.New("RSA private key not configured on server")
	}

	derBytes, err := base64.StdEncoding.DecodeString(privateKeyB64)
	if err != nil {
		return "", fmt.Errorf("invalid private key encoding: %w", err)
	}

	privKeyInterface, err := x509.ParsePKCS8PrivateKey(derBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse PKCS8 private key: %w", err)
	}

	rsaPrivKey, ok := privKeyInterface.(*rsa.PrivateKey)
	if !ok {
		return "", errors.New("not an RSA private key")
	}

	cipherBytes, err := base64.RawURLEncoding.DecodeString(env.Ciphertext)
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext base64url: %w", err)
	}

	decryptedBytes, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, rsaPrivKey, cipherBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt password: %w", err)
	}

	return string(decryptedBytes), nil
}

// GenerateUUID generates a compliant RFC 4122 version 4 UUID using crypto/rand
func GenerateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
