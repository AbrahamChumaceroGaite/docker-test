FROM node:18

# Create app directory
WORKDIR /app/

COPY package.json package-lock.json ./

RUN npm install
COPY . .
CMD ["npm", "run", "start"]