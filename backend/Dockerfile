# Stage 1: Build the TypeScript application
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts and package.json from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install all dependencies (including devDependencies for ts-node)
RUN npm install 

EXPOSE 3001

# CMD ["npm", "start"] # This would be for production using dist
# For development, docker-compose will override this with `npm run dev` 
