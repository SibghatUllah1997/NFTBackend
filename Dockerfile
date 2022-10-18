FROM node:lts-slim
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
# RUN npm install
COPY . .

EXPOSE 3007

CMD ["npm", "start", "-s"]
