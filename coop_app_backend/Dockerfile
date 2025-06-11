# 🐹 Stage 1: Build the Go binary
FROM golang:1.24 AS builder

# Set working directory inside container
WORKDIR /usr/src/app

# Copy Go modules first for caching
COPY go.mod ./

# Download dependencies
RUN go mod download

# Copy the rest of the app source code
COPY . .

# Build the app from the correct entry point
RUN go build -v -o /run-app ./cmd/server

# 🐧 Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /run-app /run-app

# Command to run when container starts
ENTRYPOINT ["/run-app"]