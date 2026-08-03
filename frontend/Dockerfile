FROM node:20-alpine

WORKDIR /app

# 複製套件設定檔
COPY package.json package-lock.json* ./

# 安裝套件
RUN npm install

# 複製原始碼 (開發時會被 docker-compose 的 volume 覆蓋)
COPY . .

EXPOSE 5173

# 啟動 Vite 開發伺服器，並對外開放 host (讓本機能夠訪問)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
