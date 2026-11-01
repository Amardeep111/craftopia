package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

const (
	defaultAdminPageSize = 25
	maxAdminPageSize     = 100
	maxAdminPage         = 1000000
)

func parseAdminPagination(r *http.Request) (page, pageSize int, err error) {
	page = 1
	pageSize = defaultAdminPageSize
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 || page > maxAdminPage {
			return 0, 0, fmt.Errorf("page must be between 1 and %d", maxAdminPage)
		}
	}
	rawSize := r.URL.Query().Get("pageSize")
	if rawSize == "" {
		rawSize = r.URL.Query().Get("limit")
	}
	if rawSize != "" {
		pageSize, err = strconv.Atoi(rawSize)
		if err != nil || pageSize < 1 || pageSize > maxAdminPageSize {
			return 0, 0, fmt.Errorf("pageSize must be between 1 and %d", maxAdminPageSize)
		}
	}
	return page, pageSize, nil
}

func adminSearch(r *http.Request) string {
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if runes := []rune(search); len(runes) > 120 {
		search = string(runes[:120])
	}
	return search
}
