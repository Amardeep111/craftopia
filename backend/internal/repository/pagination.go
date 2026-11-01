package repository

type PageResult[T any] struct {
	Items    []T   `json:"items"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
	Total    int64 `json:"total"`
	Pages    int   `json:"pages"`
}

func newPage[T any](items []T, page, pageSize int, total int64) *PageResult[T] {
	pages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &PageResult[T]{Items: items, Page: page, PageSize: pageSize, Total: total, Pages: pages}
}
