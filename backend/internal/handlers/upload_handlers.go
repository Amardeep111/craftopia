package handlers

import (
	"crypto/rand"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/utils"
)

type UploadHandler struct {
	cfg *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	return &UploadHandler{cfg: cfg}
}

// SignUploadResponse contains presigned parameters for direct browser-to-cloud upload
type SignUploadResponse struct {
	DirectCloud bool   `json:"directCloud"`
	UploadURL   string `json:"uploadUrl"`
	APIKey      string `json:"apiKey,omitempty"`
	Timestamp   int64  `json:"timestamp,omitempty"`
	Signature   string `json:"signature,omitempty"`
	Folder      string `json:"folder,omitempty"`
	PublicID    string `json:"publicId,omitempty"`
}

// GeneratePresignedSignature produces cryptographic signature for direct client-to-Cloudinary upload
func (h *UploadHandler) GeneratePresignedSignature(w http.ResponseWriter, r *http.Request) {
	folder := r.URL.Query().Get("folder")
	if folder == "" {
		folder = "jamaes-craftopia/products"
	}
	folder = strings.ReplaceAll(folder, "..", "")

	// Check if direct cloud upload credentials exist
	if h.cfg.CloudinaryCloudName != "" && h.cfg.CloudinaryAPIKey != "" && h.cfg.CloudinaryAPISecret != "" {
		timestamp := time.Now().Unix()
		b := make([]byte, 6)
		_, _ = rand.Read(b)
		publicID := fmt.Sprintf("%d-%s", timestamp, hex.EncodeToString(b))

		// Signature string: folder=...&public_id=...&timestamp=...<secret>
		toSign := fmt.Sprintf("folder=%s&public_id=%s&timestamp=%d%s", folder, publicID, timestamp, h.cfg.CloudinaryAPISecret)
		hasher := sha1.New()
		hasher.Write([]byte(toSign))
		signature := hex.EncodeToString(hasher.Sum(nil))

		utils.Success(w, http.StatusOK, "Presigned signature generated", SignUploadResponse{
			DirectCloud: true,
			UploadURL:   fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", h.cfg.CloudinaryCloudName),
			APIKey:      h.cfg.CloudinaryAPIKey,
			Timestamp:   timestamp,
			Signature:   signature,
			Folder:      folder,
			PublicID:    publicID,
		})
		return
	}

	// Fallback to server endpoint
	utils.Success(w, http.StatusOK, "Local upload endpoint configured", SignUploadResponse{
		DirectCloud: false,
		UploadURL:   "/api/upload",
	})
}

// Upload handles direct multipart form file uploads on the backend
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart body up to 15MB
	if err := r.ParseMultipartForm(15 << 20); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid upload format or file exceeds 15 MB limit")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "No file provided in form field 'file'")
		return
	}
	defer file.Close()

	// Validate content type
	buff := make([]byte, 512)
	if _, err := file.Read(buff); err != nil {
		utils.Error(w, http.StatusBadRequest, "Failed to inspect file")
		return
	}
	contentType := http.DetectContentType(buff)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to rewind file buffer")
		return
	}

	allowedTypes := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}

	ext, ok := allowedTypes[contentType]
	if !ok {
		utils.Error(w, http.StatusBadRequest, "Invalid image type. Only JPEG, PNG, and WebP are supported")
		return
	}

	// Generate safe unique filename
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	filename := fmt.Sprintf("%d-%s%s", time.Now().Unix(), hex.EncodeToString(b), ext)

	uploadDir := filepath.Join("public", "uploads", "products")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to prepare storage directory")
		return
	}

	dstPath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to write file contents")
		return
	}

	relativeURL := fmt.Sprintf("/uploads/products/%s", filename)
	utils.Success(w, http.StatusOK, "File uploaded successfully", map[string]string{
		"url":      relativeURL,
		"filename": header.Filename,
	})
}

