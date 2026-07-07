FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set strict-ssl false && npm install

COPY . .

# Bypass SSL leaf certificate errors when Next.js downloads SWC binary compiler files
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]