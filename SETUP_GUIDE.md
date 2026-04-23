# PC Club Booking System - Setup & Usage Guide

## Quick Start

### 1. Prerequisites
- PostgreSQL 12+
- Python 3.9+
- Node.js (for frontend)

### 2. Setup Database

```bash
# Create database (if not exists)
createdb pc_club

# Apply schema and seed data
psql pc_club < db/01_schema.sql
psql pc_club < db/02_seed.sql
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file if needed (optional, uses defaults)
# Default: PostgreSQL on localhost:5435

# Run migrations (if any)
python manage.py migrate

# Start development server
python manage.py runserver 0.0.0.0:8000
```

### 4. Frontend Setup

```bash
cd frontend

# Using VS Code Live Server extension or similar:
# Open in browser: http://127.0.0.1:5500/index.html
```

## Default Test Credentials

### Super Admin (for all clubs)
- **Email**: admin@example.com
- **Password**: admin123
- **Can manage**: CyberZone club

### Club Admin (eSport Arena)
- **Email**: arena.admin@example.com
- **Password**: admin123

### Regular Users (for booking)
- ivanov@example.com / password123
- petrova@example.com / password123
- sidorov@example.com / password123

## System Architecture

### Backend Structure
```
backend/
├── config/          # Django settings
├── core/           # Main app
│   ├── models.py   # Database models
│   ├── views.py    # API endpoints
│   ├── serializers.py
│   ├── urls.py     # Routes
│   └── auth.py     # JWT authentication
└── manage.py
```

### Frontend Structure
```
frontend/
├── index.html      # Login/registration page
├── app.html        # Main application page
├── auth.js         # Authentication logic
├── script.js       # Application logic
└── style.css       # Styling
```

## API Endpoints

### Public Endpoints
- `POST /api/auth/register/` - Register user
- `POST /api/auth/login/` - Login user
- `GET /api/clubs/` - List clubs (requires auth)
- `GET /api/pcs/` - List PCs (requires auth)
- `GET /api/pcs/filters/` - Get filter options for PCs
- `GET /api/bookings/available-slots/` - Get available time slots
- `POST /api/bookings/` - Create booking

### Admin Endpoints
- `PATCH /api/admin/clubs/{id}/` - Edit club info
- `GET /api/admin/clubs/` - Get admin's club
- `POST /api/admin/pcs/` - Create PC
- `PATCH /api/admin/pcs/{id}/` - Edit PC
- `DELETE /api/admin/pcs/{id}/` - Delete PC
- `POST /api/admin/tariffs/` - Create tariff
- `GET /api/admin/tariffs/` - List tariffs
- `POST /api/admin/peripherals/` - Create peripheral
- `GET /api/admin/peripherals/` - List peripherals
- `POST /api/admin/pc-peripherals/` - Link peripheral to PC
- `GET /api/admin/pc-peripherals/` - List PC peripherals

## Data Model

### Clubs
- id, name, address, phone, description, photo_url, price (base hourly rate)

### PCs
- id, club_id, number, processor, gpu, ram, storage_type, monitor_model, status

### Peripherals
- id, type (mouse/keyboard/headset/monitor/mousepad), brand, model, description

### PC Peripherals (M2M)
- id, pc_id, peripheral_id, quantity

### Tariffs
- id, club_id, day_of_week (0-6 or null), time_from, time_to, price_per_hour

### Users
- id, email, username, phone, password_hash

### Admins
- id, email, username, password_hash, club_id

### Bookings
- id, user_id, pc_id, start_time, end_time, total_price, status, created_at

## User Workflows

### For Regular Users
1. Navigate to index.html
2. Click "На страницу входа" or register if new
3. Login with user account
4. Browse clubs in "Клубы" section
5. Select club → browse PCs → select PC
6. Choose date and duration in "Свободные слоты"
7. Book available time slot

### For Club Admins
1. Navigate to index.html
2. Select "Администратор" role
3. Login with admin@example.com / admin123
4. Navigate to app.html
5. Click "Загрузить данные" in admin panel
6. Manage:
   - **Club**: Edit name, address, phone, price, photo URL, description
   - **PCs**: Add/edit/delete computers in club
   - **Tariffs**: Set different prices for time periods (e.g., peak/off-peak)
   - **Peripherals**: Create peripherals and link to PCs

## Key Features

### Filtering
- **Clubs**: Search by name/address, filter by price range, show only with photos
- **PCs**: Filter by GPU, CPU, RAM, storage type, peripheral type/brand/model

### Dynamic Pricing
- Tariffs can vary by:
  - Time of day (08:00-12:00, 12:00-18:00, etc.)
  - Day of week (weekday vs weekend)
- Price calculation is automatic based on booking duration

### Peripherals Management
- Admin can create peripherals once and link to multiple PCs
- Each PC peripheral has a quantity field
- Peripherals shown in PC details for users

## Troubleshooting

### "Токен найден. Можно работать в кабинете." but page is blank
- Refresh the page or clear browser cache
- Check browser console for errors

### PC list not showing
- Ensure club is selected first (click "Выбрать клуб")
- Check that club has PCs in database

### Filters empty
- PC filters populate dynamically based on selected club
- Make sure club is selected before applying filters

### Admin panel not showing
- Ensure logged in as admin (principal = "admin")
- Check that you're on app.html (not index.html)

## Database Schema Notes

### Constraints
- Each club has unique PC numbers (within that club)
- Each PC can have multiple peripherals, but no duplicate peripheral per PC
- Bookings cannot overlap on same PC
- Tariff times must be valid (time_to > time_from)

### Defaults
- PC status defaults to 'active'
- Booking status defaults to 'created'
- Day of week NULL means applies to all days

## Performance Tips

- Club list loads on first app.html visit
- PC filters load when club is selected
- Use pagination for large PC lists (default: 10 per page)
- Peripheral selects limited to current club's data

## Future Enhancements

- File upload for club photos (currently uses URL field)
- Edit/delete UI for PC peripherals
- Bulk operations for adding peripherals to multiple PCs
- Payment integration
- Booking history and statistics
- Email notifications
