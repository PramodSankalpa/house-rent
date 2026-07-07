FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set strict-ssl false && npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]