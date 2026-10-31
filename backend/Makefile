.PHONY: build build-linux run test tidy docker-build docker-run clean

APP_NAME = craftopia-server

build:
	@echo "Building Go binary for current OS..."
	go build -ldflags="-s -w" -o bin/$(APP_NAME) ./cmd/server

build-linux:
	@echo "Cross-compiling static Linux AMD64 binary for VPS / Cloud..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/$(APP_NAME)-linux-amd64 ./cmd/server

run: build
	@echo "Running local server..."
	./bin/$(APP_NAME)

test:
	@echo "Running unit tests..."
	go test -v -race ./...

tidy:
	@echo "Tidying go modules..."
	go mod tidy

docker-build:
	@echo "Building multi-stage Docker image..."
	docker build -t craftopia-backend:latest .

docker-run:
	@echo "Running with docker-compose..."
	docker compose up --build

clean:
	@echo "Cleaning up build artifacts..."
	rm -rf bin/
