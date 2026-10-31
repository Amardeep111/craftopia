package utils_test

import (
	"testing"

	"craftopia-backend/internal/utils"
)

func TestSessionCookieRoundTrip(t *testing.T) {
	secret := "test-secret-key-at-least-32-chars-long!"
	token := "4a8e99b0c2a1e345f67890abcdef1234567890abcdef1234567890abcdef12"

	encrypted, err := utils.EncryptSessionCookie(token, secret)
	if err != nil {
		t.Fatalf("failed to encrypt session cookie: %v", err)
	}

	decrypted, err := utils.DecryptSessionCookie(encrypted, secret)
	if err != nil {
		t.Fatalf("failed to decrypt session cookie: %v", err)
	}

	if decrypted != token {
		t.Fatalf("expected decrypted token %q, got %q", token, decrypted)
	}
}

func TestNodeJSCrossCompatibility(t *testing.T) {
	// Exact string encrypted in Node.js with "development-only-session-cookie-secret"
	secret := "development-only-session-cookie-secret"
	nodeEncrypted := "enc.v1.bnzszfxFS-MleORM.9g-kS0iEunyJ8oMAhUqwaA.1zNjBFUC-oBa2x6roQ7fE_7kbWplxgJ48DTMyDqm-qof"
	expectedToken := "my-secret-session-token-123456789"

	decrypted, err := utils.DecryptSessionCookie(nodeEncrypted, secret)
	if err != nil {
		t.Fatalf("failed to decrypt Node.js generated cookie: %v", err)
	}

	if decrypted != expectedToken {
		t.Fatalf("expected token %q, got %q", expectedToken, decrypted)
	}
}
