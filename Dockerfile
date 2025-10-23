# 1. Базовый образ Node
FROM node:20-alpine

# 2. Рабочая папка внутри контейнера
WORKDIR /app

# 3. Копируем package.json и package-lock.json
COPY package*.json ./

# 4. Устанавливаем зависимости
RUN npm install --production

# 5. Копируем исходники
COPY . .

# 6. Компилируем TypeScript → dist
RUN npx tsc

# 7. Открываем порт 3000
EXPOSE 3000

# 8. Команда запуска приложения
CMD ["node", "dist/index.js"]
