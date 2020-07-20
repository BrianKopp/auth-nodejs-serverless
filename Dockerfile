# Build stage
FROM node:12-alpine as build
WORKDIR /app
COPY *.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run test

# Deploy stage
FROM node:12-alpine
WORKDIR /app
COPY *.json ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
