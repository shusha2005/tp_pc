# PC Club Booking

Сервис для бронирования мест в компьютерных клубах с детальной информацией о характеристиках ПК и периферии.

## Структура репозитория

```
pc-club-booking/
├── backend/                 # Django + DRF
├── frontend/                # многостраничный сайт (HTML/CSS/JS)
├── docs/                    # документация и диаграммы
│   └── diagrams/
├── tests/                   # тесты и отчет
├── docker-compose.yml       # Postgres для разработки
├── .gitignore
└── README.md
```

## Страницы сайта (frontend/)

| Страница | Описание |
|----------|----------|
| `index.html` | Главная (лендинг) |
| `login.html` | Вход и регистрация |
| `clubs.html` | Каталог клубов |
| `club.html?id=` | ПК клуба и фильтры |
| `booking.html?pc_id=&club_id=` | Выбор слота и бронь |
| `bookings.html` | Мои бронирования |
| `admin.html` | Панель администратора |

Откройте `frontend/` через Live Server (порт 5500) или аналог. API: `http://127.0.0.1:8000/api`.

## Быстрый старт (БД)

Поднять PostgreSQL:

```bash
docker compose up -d
```

Подключение из DBeaver:
- Host: `localhost`
- Port: `5435`
- User: `postgres`
- Password: `postgres`
- Database: `pc_club`

