# PC Club Booking

Сервис для бронирования мест в компьютерных клубах с детальной информацией о характеристиках ПК и периферии.

## Структура репозитория

```
pc-club-booking/
├── backend/                 # Django + DRF
├── frontend/                # HTML/CSS/JS (SPA)
├── docs/                    # документация и диаграммы
│   └── diagrams/
├── tests/                   # тесты и отчет
├── docker-compose.yml       # Postgres для разработки
├── .gitignore
└── README.md
```

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

