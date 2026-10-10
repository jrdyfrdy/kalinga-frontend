# Manual Startup: Core Services

Run each of these commands in a separate terminal window:

---

## 1. Laravel Backend (API)

```
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

---

## 2. Laravel Reverb (realtime WebSockets)

```
cd backend
php artisan reverb:start --port=8080
```

Requires `BROADCAST_CONNECTION=reverb` and `REVERB_*` in `backend/.env`, and the
matching `VITE_REVERB_*` values in the root `.env`.

---

## 3. Node.js Backend (API)

```
cd node-backend
node server.js
```

---

## 4. Vite Frontend (React)

```
npm run dev
```

---

After running all three, your services will be available at:
- Laravel  → http://127.0.0.1:8000
- Reverb   → ws://localhost:8080
- Node API → http://localhost:5000
- Vite     → http://localhost:4000
