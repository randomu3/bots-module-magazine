# Telegram Bot Modules Platform

Платформа для предоставления модулей заработка в Telegram ботах - это веб-сайт, который позволяет пользователям подключать различные модули монетизации к своим Telegram ботам через удобный интерфейс.

## Структура проекта

```
telegram-bot-modules-platform/
├── backend/                 # Backend API (Node.js + Express + TypeScript)
├── frontend/               # Frontend (Next.js + React + TypeScript)
├── nginx/                  # Nginx конфигурация
├── docker-compose.yml      # Production Docker конфигурация
├── docker-compose.dev.yml  # Development Docker конфигурация
└── README.md
```

## Технологический стек

### Backend
- **Node.js** с **Express.js** для API
- **TypeScript** для типизации
- **PostgreSQL** как основная база данных
- **Redis** для кэширования и сессий
- **JWT** для аутентификации

### Frontend
- **Next.js** с **React** для пользовательского интерфейса
- **TypeScript** для типизации
- **Tailwind CSS** для стилизации
- **Chart.js** для аналитических графиков

### Infrastructure
- **Docker** для контейнеризации
- **Nginx** как reverse proxy
- **PostgreSQL** и **Redis** в контейнерах

## Быстрый старт

### Предварительные требования

- Node.js 18+
- Docker и Docker Compose
- Git

### Установка и запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd telegram-bot-modules-platform
   ```

2. **Скопируйте файлы окружения:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Отредактируйте переменные окружения** в файлах `.env`

4. **Запуск с Docker (рекомендуется):**
   ```bash
   # Development режим
   npm run docker:dev
   
   # Production режим
   npm run docker:build
   docker-compose up
   ```

5. **Запуск без Docker:**
   ```bash
   # Установка зависимостей
   npm install
   
   # Запуск в development режиме
   npm run dev
   ```

### Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Health Check:** http://localhost:3001/health

## Скрипты

### Корневые скрипты
- `npm run dev` - Запуск frontend и backend в development режиме
- `npm run build` - Сборка production версии
- `npm run test` - Запуск тестов
- `npm run docker:dev` - Запуск в Docker (development)
- `npm run docker:build` - Сборка Docker образов

### Backend скрипты
- `npm run dev --workspace=backend` - Запуск backend в development режиме
- `npm run build --workspace=backend` - Сборка backend
- `npm run test --workspace=backend` - Запуск тестов backend

### Frontend скрипты
- `npm run dev --workspace=frontend` - Запуск frontend в development режиме
- `npm run build --workspace=frontend` - Сборка frontend
- `npm run test --workspace=frontend` - Запуск тестов frontend

## Переменные окружения

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telegram_bot_platform
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Архитектура

Система построена на микросервисной архитектуре с четким разделением ответственности:

- **Authentication Service** - регистрация, авторизация, управление токенами
- **User Service** - управление профилями и балансом пользователей
- **Bot Service** - подключение и управление Telegram ботами
- **Module Service** - каталог модулей и их активация
- **Payment Service** - обработка платежей и выплат
- **Analytics Service** - сбор и отображение статистики
- **Notification Service** - email уведомления и рассылки

## Разработка

### Структура кода

#### Backend
```
backend/src/
├── controllers/    # Контроллеры API
├── services/      # Бизнес-логика
├── middleware/    # Middleware функции
├── models/        # Модели данных
├── routes/        # Маршруты API
├── utils/         # Утилиты
├── config/        # Конфигурация
└── types/         # TypeScript типы
```

#### Frontend
```
frontend/src/
├── components/    # React компоненты
├── pages/         # Next.js страницы
├── hooks/         # Custom React hooks
├── utils/         # Утилиты
├── types/         # TypeScript типы
└── styles/        # CSS стили
```

### Тестирование

- **Unit тесты:** Jest для backend и frontend
- **Integration тесты:** Тестирование API endpoints
- **E2E тесты:** Cypress для пользовательских сценариев

### Линтинг и форматирование

- **ESLint** для проверки кода
- **TypeScript** для статической типизации
- **Prettier** для форматирования (рекомендуется настроить в IDE)

## Deployment

### Production

1. **Настройте переменные окружения** для production
2. **Соберите Docker образы:**
   ```bash
   docker-compose build
   ```
3. **Запустите приложение:**
   ```bash
   docker-compose up -d
   ```

### Мониторинг

- Health check endpoints доступны для мониторинга
- Логи доступны через `docker-compose logs`
- Метрики производительности через встроенные endpoints

## Безопасность

- JWT токены с коротким временем жизни
- Rate limiting для API endpoints
- HTTPS в production (настройте SSL сертификаты)
- Валидация всех входных данных
- Шифрование чувствительных данных

## Лицензия

[Укажите лицензию проекта]

## Поддержка

Для вопросов и поддержки создайте issue в репозитории или свяжитесь с командой разработки.