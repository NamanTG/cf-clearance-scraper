FROM node:20-bookworm

# Install dependencies and Google Chrome stable
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    xvfb \
    curl \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
        > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*
    
# Set the Chrome binary path
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# App setup
WORKDIR /app

COPY package*.json ./
RUN npm update
RUN npm install
RUN npm i -g pm2

COPY . .

EXPOSE 3000

CMD ["pm2-runtime", "src/index.js"]
