FROM node:12-alpine
WORKDIR /app
COPY *.json ./
RUN npm ci
COPY . .
