package repository

import (
	"reflect"
	"testing"
)

func TestDecodeAdminPermissions(t *testing.T) {
	tests := []struct {
		name     string
		input    []byte
		expected []string
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: []string{},
		},
		{
			name:     "empty byte slice",
			input:    []byte{},
			expected: []string{},
		},
		{
			name:     "null json string",
			input:    []byte("null"),
			expected: []string{},
		},
		{
			name:     "empty json array",
			input:    []byte("[]"),
			expected: []string{},
		},
		{
			name:     "valid permissions array",
			input:    []byte(`["orders.view","products.manage"]`),
			expected: []string{"orders.view", "products.manage"},
		},
		{
			name:     "invalid json format",
			input:    []byte(`{not valid json}`),
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := decodeAdminPermissions(tt.input)
			if result == nil {
				t.Fatalf("expected non-nil slice, got nil")
			}
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
