package handlers

import (
	"bytes"
	"crypto/rand"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
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

func (h *UploadHandler) storeFile(r *http.Request, file io.Reader, filename, folder string) (string, error) {
	if h.cfg.CloudinaryCloudName != "" && h.cfg.CloudinaryAPIKey != "" && h.cfg.CloudinaryAPISecret != "" {
		timestamp := time.Now().Unix()
		b := make([]byte, 6)
		_, _ = rand.Read(b)
		publicID := fmt.Sprintf("%d-%s", timestamp, hex.EncodeToString(b))
		toSign := fmt.Sprintf("folder=%s&public_id=%s&timestamp=%d%s", folder, publicID, timestamp, h.cfg.CloudinaryAPISecret)
		signature := sha1.Sum([]byte(toSign))
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		_ = form.WriteField("api_key", h.cfg.CloudinaryAPIKey)
		_ = form.WriteField("timestamp", fmt.Sprint(timestamp))
		_ = form.WriteField("folder", folder)
		_ = form.WriteField("public_id", publicID)
		_ = form.WriteField("signature", hex.EncodeToString(signature[:]))
		part, err := form.CreateFormFile("file", filepath.Base(filename))
		if err != nil {
			return "", err
		}
		if _, err := io.Copy(part, file); err != nil {
			return "", err
		}
		if err := form.Close(); err != nil {
			return "", err
		}
		endpoint := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", url.PathEscape(h.cfg.CloudinaryCloudName))
		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, endpoint, &body)
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", form.FormDataContentType())
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		var result struct {
			SecureURL string `json:"secure_url"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return "", err
		}
		if resp.StatusCode >= 300 || result.SecureURL == "" {
			return "", fmt.Errorf("cloud image upload failed: %s", resp.Status)
		}
		return result.SecureURL, nil
	}
	if h.cfg.IsServerless {
		return "", fmt.Errorf("persistent image storage is not configured")
	}
	return saveFileLocally(file, filename, folder)
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

// saveFileLocally stores an uploaded file in public/uploads subdirectories
func saveFileLocally(file io.Reader, filename string, subfolder string) (string, error) {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}
	safeName := fmt.Sprintf("%d-%s%s", time.Now().Unix(), hex.EncodeToString(b), ext)

	uploadDir := filepath.Join("public", "uploads", subfolder)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", err
	}

	dstPath := filepath.Join(uploadDir, safeName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/%s/%s", subfolder, safeName), nil
}

func validateImageUpload(file multipart.File, header *multipart.FileHeader, maxSize int64) (string, error) {
	if header.Size <= 0 || header.Size > maxSize {
		return "", fmt.Errorf("image must be between 1 byte and %d bytes", maxSize)
	}
	var signature [512]byte
	n, err := file.Read(signature[:])
	if err != nil && err != io.EOF {
		return "", err
	}
	contentType := http.DetectContentType(signature[:n])
	extensions := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}
	extension, ok := extensions[contentType]
	if !ok {
		return "", fmt.Errorf("unsupported image content type %q", contentType)
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	return extension, nil
}

// Upload handles direct multipart form file uploads on the backend
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
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
	extension, err := validateImageUpload(file, header, 15<<20)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Only JPEG, PNG, and WebP images up to 15 MB are accepted")
		return
	}

	filename := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename)) + extension
	relURL, err := h.storeFile(r, file, filename, "jamaes-craftopia/products")
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to store uploaded file")
		return
	}

	utils.Success(w, http.StatusOK, "File uploaded successfully", map[string]string{
		"url":      relURL,
		"filename": header.Filename,
	})
}

// Delete removes a Cloudinary image referenced by its delivery URL.
func (h *UploadHandler) Delete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.URL == "" {
		utils.Error(w, http.StatusBadRequest, "Image URL is required")
		return
	}
	if h.cfg.CloudinaryCloudName == "" || h.cfg.CloudinaryAPIKey == "" || h.cfg.CloudinaryAPISecret == "" {
		utils.Error(w, http.StatusServiceUnavailable, "Image deletion is not configured")
		return
	}
	parsed, err := url.Parse(body.URL)
	if err != nil || parsed == nil {
		utils.Error(w, http.StatusBadRequest, "Only Cloudinary image URLs can be deleted")
		return
	}
	host := strings.ToLower(parsed.Hostname())
	if parsed.Scheme != "https" || (host != "cloudinary.com" && !strings.HasSuffix(host, ".cloudinary.com")) {
		utils.Error(w, http.StatusBadRequest, "Only Cloudinary image URLs can be deleted")
		return
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 4 || parts[0] != h.cfg.CloudinaryCloudName || parts[1] != "image" || parts[2] != "upload" {
		utils.Error(w, http.StatusBadRequest, "Image URL does not belong to the configured Cloudinary account")
		return
	}
	idx := 3
	for idx < len(parts) {
		part := parts[idx]
		if len(part) < 2 || part[0] != 'v' {
			idx++
			continue
		}
		allDigits := true
		for _, ch := range part[1:] {
			if ch < '0' || ch > '9' {
				allDigits = false
				break
			}
		}
		if allDigits {
			idx++
			break
		}
		idx++
	}
	if idx >= len(parts) {
		utils.Error(w, http.StatusBadRequest, "Invalid Cloudinary image URL")
		return
	}
	publicID := strings.TrimSuffix(strings.Join(parts[idx:], "/"), filepath.Ext(parts[len(parts)-1]))
	if publicID == "" {
		utils.Error(w, http.StatusBadRequest, "Invalid Cloudinary image URL")
		return
	}
	timestamp := time.Now().Unix()
	signature := sha1.Sum([]byte(fmt.Sprintf("public_id=%s&timestamp=%d%s", publicID, timestamp, h.cfg.CloudinaryAPISecret)))
	form := url.Values{
		"public_id": {publicID}, "timestamp": {fmt.Sprint(timestamp)},
		"api_key": {h.cfg.CloudinaryAPIKey}, "signature": {hex.EncodeToString(signature[:])},
	}
	endpoint := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/destroy", url.PathEscape(h.cfg.CloudinaryCloudName))
	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.PostForm(endpoint, form)
	if err != nil {
		utils.Error(w, http.StatusBadGateway, "Could not reach image storage")
		return
	}
	defer resp.Body.Close()
	var result struct {
		Result string `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || resp.StatusCode >= 300 || (result.Result != "ok" && result.Result != "not found") {
		utils.Error(w, http.StatusBadGateway, "Image storage could not delete this image")
		return
	}
	utils.Success(w, http.StatusOK, "Image deleted", nil)
}

// UploadCustomRequestImage handles POST /api/custom-requests/upload
func (h *UploadHandler) UploadCustomRequestImage(w http.ResponseWriter, r *http.Request) {
	if r.ContentLength > int64(4.5*1024*1024) {
		utils.Error(w, http.StatusRequestEntityTooLarge, "Each image must be 4 MB or smaller.")
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid image upload format.")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Choose an image to upload.")
		return
	}
	defer file.Close()
	extension, err := validateImageUpload(file, header, 4<<20)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Only JPEG, PNG, and WebP images up to 4 MB are accepted")
		return
	}

	filename := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename)) + extension
	relURL, err := h.storeFile(r, file, filename, "jamaes-craftopia/custom-requests")
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not upload this image.")
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	utils.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"url":     relURL,
	})
}

// UploadReviewImages handles POST /api/reviews/upload
func (h *UploadHandler) UploadReviewImages(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid review photos upload.")
		return
	}

	productID := r.FormValue("productId")
	if productID == "" {
		utils.Error(w, http.StatusBadRequest, "Product ID is required for review photos.")
		return
	}

	form := r.MultipartForm
	files := form.File["files"]
	if len(files) == 0 {
		files = form.File["file"]
	}

	if len(files) == 0 || len(files) > 5 {
		utils.Error(w, http.StatusBadRequest, "Choose between 1 and 5 photos for this product review.")
		return
	}
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not read one of the review photos")
			return
		}
		_, validationErr := validateImageUpload(f, fh, 4<<20)
		_ = f.Close()
		if validationErr != nil {
			utils.Error(w, http.StatusBadRequest, "Only JPEG, PNG, and WebP review photos up to 4 MB each are accepted")
			return
		}
	}

	var urls []string
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not read one of the review photos")
			return
		}
		extension, validationErr := validateImageUpload(f, fh, 4<<20)
		if validationErr != nil {
			_ = f.Close()
			utils.Error(w, http.StatusBadRequest, "Only JPEG, PNG, and WebP review photos up to 4 MB each are accepted")
			return
		}
		filename := strings.TrimSuffix(filepath.Base(fh.Filename), filepath.Ext(fh.Filename)) + extension
		relURL, err := h.storeFile(r, f, filename, fmt.Sprintf("jamaes-craftopia/reviews/%s", productID))
		_ = f.Close()
		if err != nil {
			utils.Error(w, http.StatusBadGateway, "Could not store one of the review photos")
			return
		}
		urls = append(urls, relURL)
	}

	utils.JSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"images":  urls,
	})
}
