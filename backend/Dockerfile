# Stage 1: Build the application (빌드 전용)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build

# Stage 2: Production and Test environment (최종 실행 환경)
FROM node:18-alpine
WORKDIR /app
COPY . .                             
RUN npm install                      
COPY --from=builder /app/dist ./dist 

EXPOSE 3001
CMD ["node", "dist/server.js"]

# CMD ["npm", "start"] # This would be for production using dist
# For development, docker-compose will override this with `npm run dev` 
