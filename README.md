# Kalinga Frontend + Laravel Backend

This repository now contains a React/Vite single-page application (`/`), alongside a Laravel 12 API backend (`/backend`).

## Project Structure

```
.
├── backend/                 # Laravel API application
│   ├── app/
│   ├── bootstrap/
│   ├── routes/
│   └── ...
├── public/
├── src/                     # React frontend source
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or pnpm
- PHP 8.2+
- [Composer](https://getcomposer.org/)

## Frontend Setup (React + Vite)

```bash
npm install
npm run dev
```

The development server starts on [http://localhost:4000](http://localhost:4000) by default.

## Backend Setup (Laravel API)

```bash
cd backend
composer install   # already executed during scaffolding, run if dependencies change
cp .env.example .env
php artisan key:generate

# optional: configure database in .env, then run migrations
# php artisan migrate

php artisan serve  # serves API on http://127.0.0.1:8000
```

### Health Check Endpoint

```
GET http://127.0.0.1:8000/api/status

Response: {
	"status": "ok",
	"message": "Kalinga backend is running",
	"timestamp": "2025-10-13T09:30:00.000000Z"
}
```

Use this endpoint to verify the backend is online before wiring up frontend API calls.

## Running Frontend and Backend Together

1. Start the Laravel API: `cd backend && php artisan serve`
2. In a separate terminal start the Vite dev server: `npm run dev`

Adjust frontend API requests to target `http://127.0.0.1:8000/api/*`.

## Testing

- **Frontend:** integrate a testing framework such as Vitest or React Testing Library if needed.
- **Backend:** `cd backend && php artisan test`

## Next Steps

- Configure CORS in `backend/app/Http/Middleware/HandleCors.php` if the frontend will call the API from a different origin.
- Implement authentication (Laravel Breeze, Sanctum, or Passport) for protected routes.
- Replace the sample `/api/status` response with real data sources.
