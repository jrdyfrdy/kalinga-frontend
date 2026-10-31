# Testing Kalinga locally on Windows

This runs the whole stack on your PC against a **local** PostgreSQL database, so
nothing touches the Supabase cloud data:

| Service            | Port | Started by `start.cmd` |
| ------------------ | ---- | ---------------------- |
| Laravel API        | 8000 | yes                    |
| Reverb (realtime)  | 8080 | yes                    |
| Node API           | 5000 | yes                    |
| Vite (frontend)    | 4000 | yes                    |

Commands are for **PowerShell**, run from the repo root unless a `cd` says otherwise.

---

## 1. Prerequisites (one time)

- **Git**
- **Node.js 20+** — `node -v`
- **PHP 8.2+** — `php -v`. In your `php.ini` make sure these lines are *not*
  commented out (no leading `;`): `extension=pdo_pgsql`, `extension=pgsql`,
  `extension=openssl`, `extension=mbstring`, `extension=fileinfo`, `extension=zip`.
  `php --ini` shows which `php.ini` is in use.
- **Composer** — `composer -V`
- **PostgreSQL 16** (EnterpriseDB installer). Remember the password you give the
  `postgres` user. Add `C:\Program Files\PostgreSQL\16\bin` to your PATH so `psql`
  works in PowerShell.

## 2. Get the code

```powershell
git fetch origin
git checkout fix/full-stack-audit
git pull
npm ci
cd node-backend; npm ci; cd ..
cd backend; composer install; cd ..
```

## 3. Create the local database

```powershell
psql -U postgres -c "CREATE USER kalinga WITH PASSWORD 'secret' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE kalinga OWNER kalinga;"
```

(`SUPERUSER` is needed because `node-backend\database\seed.sql` temporarily
disables foreign-key triggers. This is a throwaway local account.)

## 4. Environment files

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item node-backend\.env.example node-backend\.env
```

Then edit **only** these values.

**`backend\.env`**

```ini
DB_CONNECTION=pgsql_local
LOCAL_DB_HOST=127.0.0.1
LOCAL_DB_PORT=5432
LOCAL_DB_DATABASE=kalinga
LOCAL_DB_USERNAME=kalinga
LOCAL_DB_PASSWORD=secret

REVERB_APP_KEY=kalinga-local-key
REVERB_APP_SECRET=kalinga-local-secret
EDGE_DEVICE_API_KEY=local-edge-key
```

Then generate the app key:

```powershell
cd backend; php artisan key:generate; cd ..
```

**`node-backend\.env`**

```ini
DATABASE_URL=postgresql://kalinga:secret@127.0.0.1:5432/kalinga
DB_SSL=false
EDGE_DEVICE_API_KEY=local-edge-key
```

**`.env`** (repo root, frontend)

```ini
VITE_API_URL=http://localhost:8000
VITE_NODE_API_URL=http://localhost:5000
VITE_REVERB_APP_KEY=kalinga-local-key
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

Rules that matter:
- `VITE_REVERB_APP_KEY` **must equal** `REVERB_APP_KEY`, or realtime silently does nothing.
- `EDGE_DEVICE_API_KEY` must be the same in `backend\.env` and `node-backend\.env`.
- Leave the `VITE_FIREBASE_*` values empty unless you have them. Online training
  then shows "not configured" instead of crashing.
- `VITE_OPENWEATHER_API_KEY` is optional; without it the weather card stays empty.

## 5. Create tables and seed data

```powershell
cd backend
php artisan migrate --seed
cd ..
$env:PGPASSWORD = "secret"
psql -h 127.0.0.1 -U kalinga -d kalinga -v ON_ERROR_STOP=1 -f node-backend\database\seed.sql
psql -h 127.0.0.1 -U kalinga -d kalinga -v ON_ERROR_STOP=1 -f node-backend\database\migrations\001_add_qr_codes_activity_logs.sql
psql -h 127.0.0.1 -U kalinga -d kalinga -v ON_ERROR_STOP=1 -f node-backend\database\migrations\002_add_current_patients_to_hospitals.sql
psql -h 127.0.0.1 -U kalinga -d kalinga -v ON_ERROR_STOP=1 -f node-backend\database\migrations\003_active_devices.sql
```

`migrate --seed` takes about a minute (the forecast seeder is slow). Every command
should finish without an `ERROR` line.

To start over from scratch later:

```powershell
cd backend; php artisan migrate:fresh --seed; cd ..
```

Then re-run the four `psql` lines.

## 6. Start everything

Double-click **`start.cmd`** (or run `.\start.cmd`). Four windows open: Laravel,
Reverb, Node API and Vite. Keep them open, then browse to **http://localhost:4000**.

## 7. Test accounts

All passwords are **`password123`**.

| Role      | Email                    |
| --------- | ------------------------ |
| Admin     | `admin@kalinga.com`      |
| Logistics | `logistics1@kalinga.com` |
| Responder | `responder1@kalinga.com` |
| Patient   | `patient1@kalinga.com`   |

For realtime tests, use two browsers or a normal window plus an incognito window,
so each can be logged in as a different user.

---

## 8. What to test

Tick each one off. "Live" means it appears **without refreshing the page**.

### Realtime and emergencies
- [ ] **Patient SOS.** Window A: patient → *Report Emergency* → send an SOS.
  Window B: `responder1` dashboard.
  Expected: patient sees "A responder has been assigned"; the incident appears live
  for the responder.
- [ ] **Admin broadcast.** Window A: admin → *Broadcast advisory* → send.
  Window B: patient.
  Expected: the patient's bell shows it live.
- [ ] **Notifications.** Click one notification → it is marked read. Click
  *Mark all as read* → the badge clears and stays cleared after a refresh.
- [ ] **Admin connectivity.** Admin → Connectivity section.
  Expected: Database, Reverb and Node API show as up. Stop the Reverb window and
  that row turns red; restart it and it turns green again.

### Logistics
- [ ] **Supply request draft.** Logistics → *Resource Management* → Requests →
  create a draft → **Edit Draft** → change the quantity → *Save draft*.
  Expected: the drawer opens, saves and the list updates. Before this fix the
  button did nothing.
- [ ] Submit the draft, then approve / allocate it as admin or logistics.
  Expected: no error toasts, status changes stick after a refresh.
- [ ] **Allocations.** *Requested Allocation* → open suggestions → confirm one →
  reassign it.
- [ ] **Asset registry.** Add an asset, edit it, then select several →
  bulk *Maintenance* / *Export* / *Delete*.
- [ ] **Maintenance tab.** Schedule maintenance on an asset → reschedule it →
  mark it complete. It should move between Upcoming and Completed.
- [ ] **Profile.** Logistics → *Profile* shows *your* name and email (not a
  placeholder); *Edit* saves.

### Chat
- [ ] Send a message with a file attachment. The other side can open it.
- [ ] Archive a conversation. It leaves the main list.

### Settings and account
- [ ] Patient or responder → *Settings* → change a notification setting, refresh
  the page. Expected: it stays changed.
- [ ] *Change password* → log out → log in with the new password.
- [ ] *Devices* lists your logins; *Sign out* on another device revokes it.
- [ ] Patient → **Evacuation Centers** (`/patient/evacuation-center`) lists 3 centers.

### Magic login
- [ ] Register a new patient → submit the ID verification → as admin, approve it.
  The email is written to the log instead of being sent: open
  `backend\storage\logs\laravel.log`, find the newest `/magic-login?token=` link,
  and open it.
  Expected: you land logged in on the patient dashboard.

### Security spot checks (PowerShell)
- [ ] An unauthenticated status change is refused (expect **401**):
  ```powershell
  curl.exe -s -o NUL -w "%{http_code}`n" -X PATCH -H "Accept: application/json" http://127.0.0.1:8000/api/logistics/requests/1/status
  ```
- [ ] Self-registering as admin is refused (expect `The selected role is invalid.`):
  ```powershell
  curl.exe -s -X POST -H "Content-Type: application/json" -H "Accept: application/json" http://127.0.0.1:8000/api/register -d '{\"name\":\"X\",\"email\":\"x1@test.com\",\"password\":\"password123\",\"password_confirmation\":\"password123\",\"role\":\"admin\"}'
  ```

### Automated checks (optional)
```powershell
npm test                      # frontend unit tests: all pass
npm run build                 # production build: succeeds
cd backend; php artisan test  # 29/31 pass; the 2 DatabaseFailoverTest cases need the cloud DB
```

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `could not find driver` | Enable `extension=pdo_pgsql` and `extension=pgsql` in `php.ini`, then restart the windows. |
| `password authentication failed for user "kalinga"` | Re-check `LOCAL_DB_*` / `DATABASE_URL`, then run `cd backend; php artisan config:clear`. |
| A window says the port is in use | `npx kill-port 4000 5000 8000 8080`, then start again. `start.cmd` does this for you. |
| Nothing updates live | The Reverb window must be open, and `VITE_REVERB_APP_KEY` must equal `REVERB_APP_KEY`. Restart Vite after editing `.env`. |
| CORS errors in the browser console | `FRONTEND_URL=http://localhost:4000` in both `backend\.env` and `node-backend\.env`. |
| Login works but pages show 401s | Old token in the browser: log out, or clear site data for `localhost:4000`. |
| Changed `.env` but nothing changed | Laravel: `php artisan config:clear`. Vite: stop and restart its window. |
| Weather, map tiles or USGS feed empty | These are external internet services. Expected offline / without API keys. |
