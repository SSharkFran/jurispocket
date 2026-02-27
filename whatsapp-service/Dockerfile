FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p sessions

EXPOSE 3001
CMD ["npm", "run", "start"]
