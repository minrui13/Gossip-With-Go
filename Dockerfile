# Use Go 1.25.5 for backend
FROM golang:1.25.5 AS backend

WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod tidy
COPY backend ./
RUN go build -o main .

# Use Node for frontend build
FROM node:20 AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Combine frontend + backend
FROM golang:1.25.5

WORKDIR /app
COPY --from=backend /app/backend/main ./backend/
COPY --from=frontend /app/frontend/build ./frontend/build

# Set port
ENV PORT=8080

# Command to run backend
CMD ["./backend/main"]
