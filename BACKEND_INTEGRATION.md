# Kalinga Backend Integration Guide

## Overview

This guide explains the integration between the React frontend (Vite) and Laravel backend (PostgreSQL). Follow the steps carefully to ensure seamless operation.

---

## 🚀 Quick Start

### 1. Start Backend Server (Port 8000)

```powershell
cd backend
php artisan serve --port=8000
```

### 2. Start Frontend Server (Port 4000)

```powershell
# In a new terminal
npm run dev -- --port 4000
```

### 3. Verify Connection

Open browser to http://localhost:4000 - the frontend should now be connected to the backend API.

---

## 📁 Project Structure

```
kalinga-frontend/
├── backend/                          # Laravel 12 API Backend
│   ├── app/
│   │   ├── Http/Controllers/        # API Controllers
│   │   │   ├── IncidentController.php        ✅ COMPLETE
│   │   │   ├── EmergencyReportController.php ⚠️  NEEDS FIXING
│   │   │   ├── EvacuationCenterController.php ✅ SEMI-COMPLETE
│   │   │   ├── HospitalController.php         ⚠️  NEEDS FIXING
│   │   │   ├── ResponderController.php        ⚠️  NEEDS FIXING
│   │   │   ├── PatientController.php          ⚠️  NEEDS FIXING
│   │   │   ├── AssetController.php            ⚠️  NEEDS FIXING
│   │   │   ├── SupplyItemController.php       ⚠️  NEEDS FIXING
│   │   │   └── NotificationController.php     ⚠️  NEEDS FIXING
│   │   └── Models/                  # Eloquent Models (all created)
│   ├── database/
│   │   ├── migrations/              # Database schema (13 migrations ✅)
│   │   └── seeders/                 # Sample data (seeded ✅)
│   ├── routes/api.php               # API routes (defined ✅)
│   └── config/cors.php              # CORS config (configured ✅)
│
└── src/                             # React Frontend
    ├── lib/
    │   └── api.js                   # API client utility ✅ NEW
    ├── components/
    │   ├── dashboard/               # Needs API integration
    │   ├── emergency-sos/           # Needs API integration
    │   └── responder/context/       # Replace demo data with API calls
    └── pages/                       # All pages need API integration

```

---

## 🔧 Configuration

### Environment Variables

**Frontend (.env.development):**

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

**Backend (.env):**

```env
APP_NAME=Kalinga
APP_ENV=local
APP_KEY=base64:YOUR_GENERATED_KEY
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=kalinga
DB_USERNAME=postgres
DB_PASSWORD=YOUR_PASSWORD
```

### CORS Configuration

✅ Already configured in `backend/config/cors.php` to allow:

- http://localhost:4000
- http://127.0.0.1:4000

---

## 📡 API Endpoints

### Base URL: `http://127.0.0.1:8000/api`

### Public Endpoints (No Auth Required)

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| GET    | /status                    | Health check                |
| GET    | /public/evacuation-centers | List all evacuation centers |
| GET    | /public/hospitals          | List all hospitals          |

### Resident Endpoints

| Method | Endpoint                         | Description               |
| ------ | -------------------------------- | ------------------------- |
| POST   | /resident/emergency-reports      | Create emergency report   |
| GET    | /resident/emergency-reports/:id  | Get report details        |
| GET    | /resident/notifications          | Get user notifications    |
| PATCH  | /resident/notifications/:id/read | Mark notification as read |

### Responder Endpoints

| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | /responder/incidents        | List all incidents        |
| GET    | /responder/incidents/:id    | Get incident details      |
| PATCH  | /responder/incidents/:id    | Update incident           |
| GET    | /responder/roster           | Get responder team roster |
| GET    | /responder/patients         | List patients             |
| POST   | /responder/patients         | Add new patient           |
| GET    | /responder/hospitals/nearby | Find nearby hospitals     |

### Admin Endpoints

| Method | Endpoint                      | Description              |
| ------ | ----------------------------- | ------------------------ |
| GET    | /admin/dashboard/stats        | Get dashboard statistics |
| GET    | /admin/incidents              | List all incidents       |
| POST   | /admin/incidents              | Create incident          |
| GET    | /admin/incidents/:id          | Get incident             |
| PATCH  | /admin/incidents/:id          | Update incident          |
| DELETE | /admin/incidents/:id          | Delete incident          |
| POST   | /admin/evacuation-centers     | Create evacuation center |
| PATCH  | /admin/evacuation-centers/:id | Update evacuation center |

### Logistics Endpoints

| Method | Endpoint                   | Description              |
| ------ | -------------------------- | ------------------------ |
| GET    | /logistics/dashboard/stats | Get logistics statistics |
| GET    | /logistics/assets          | List all assets          |
| POST   | /logistics/assets          | Create asset             |
| PATCH  | /logistics/assets/:id      | Update asset             |
| GET    | /logistics/supplies        | List all supplies        |
| POST   | /logistics/supplies        | Create supply item       |
| PATCH  | /logistics/supplies/:id    | Update supply            |

### Patient Endpoints

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| GET    | /patient/appointments   | Get patient appointments |
| GET    | /patient/health-records | Get health records       |
| GET    | /patient/messages       | Get messages             |

---

## 🔌 Using the API Client

### Import the API client in your components:

```javascript
import api from "@/lib/api";
```

### Example Usage:

#### 1. Fetch Incidents (Responder Dashboard)

```javascript
// src/components/dashboard/Dashboard.jsx
import { useEffect, useState } from "react";
import api from "@/lib/api";

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const data = await api.incidents.getAll();
        setIncidents(data);
      } catch (error) {
        console.error("Failed to fetch incidents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {incidents.map((incident) => (
        <div key={incident.id}>
          <h3>{incident.code}</h3>
          <p>{incident.description}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 2. Create Emergency Report (Resident)

```javascript
// src/components/emergency-sos/Report.jsx
import api from "@/lib/api";

async function submitReport(reportData) {
  try {
    const response = await api.emergencyReports.create({
      incident_type: reportData.type,
      description: reportData.description,
      latitude: reportData.lat,
      longitude: reportData.lng,
      severity: reportData.severity,
      contact_number: reportData.phone,
    });

    console.log("Report created:", response);
    // Show success message
  } catch (error) {
    console.error("Failed to create report:", error);
    // Show error message
  }
}
```

#### 3. Fetch Evacuation Centers (Public)

```javascript
// src/components/dashboard/Evacuation.jsx
import { useEffect, useState } from "react";
import api from "@/lib/api";

function Evacuation() {
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    api.evacuationCenters
      .getAll()
      .then((data) => setCenters(data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <div>
      {centers.map((center) => (
        <div key={center.id}>
          <h3>{center.name}</h3>
          <p>
            Capacity: {center.current_occupancy}/{center.max_capacity}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Current Status & Next Steps

### ✅ COMPLETED

1. Laravel backend scaffolded with all models and migrations
2. Database seeded with sample data (4 users, 3 incidents, 3 centers, 3 hospitals, etc.)
3. API routes defined for all user roles
4. IncidentController fully implemented
5. CORS configured for localhost:4000
6. Frontend API client utility created (`src/lib/api.js`)
7. Backend server running on port 8000

### ⚠️ NEEDS ATTENTION

#### Priority 1: Fix Backend Controllers

**Status:** 8 controllers have duplicate method errors or are empty

**Solution:** Recreate each controller using the same pattern as IncidentController:

```powershell
cd backend

# Example: Fix EvacuationCenterController
Remove-Item -Force app\Http\Controllers\EvacuationCenterController.php
php artisan make:controller EvacuationCenterController --api
```

Then implement the methods in each controller. Use `IncidentController.php` as reference.

**Order of Priority:**

1. `EvacuationCenterController` - Used by public and admin
2. `HospitalController` - Used by public and responder
3. `ResponderController` - Used by responder portal
4. `EmergencyReportController` - Used by residents
5. `PatientController` - Used by responder and patient portals
6. `AssetController` - Used by logistics
7. `SupplyItemController` - Used by logistics
8. `NotificationController` - Used by residents

#### Priority 2: Frontend Integration

**Status:** Frontend still using demo data from ResponderDataContext

**Files to Update:**

1. `src/components/responder/context/ResponderDataContext.jsx`

   - Replace demo data with API calls
   - Fetch incidents, roster, patients from backend

2. `src/components/dashboard/Dashboard.jsx`

   - Fetch incidents from `/api/responder/incidents`
   - Display real-time data

3. `src/components/dashboard/Evacuation.jsx`

   - Fetch centers from `/api/public/evacuation-centers`
   - Show occupancy status

4. `src/components/emergency-sos/Report.jsx`

   - Submit reports to `/api/resident/emergency-reports`
   - Handle success/error responses

5. Admin pages in `src/pages/11_Dashboard.jsx`
   - Fetch stats from `/api/admin/dashboard/stats`

#### Priority 3: Testing

- Test each API endpoint with frontend components
- Verify CORS is working (no console errors)
- Test create/update/delete operations
- Verify database persistence

---

## 🐛 Troubleshooting

### Issue: CORS errors in browser console

**Solution:** Ensure backend server is running and `config/cors.php` allows your frontend origin.

### Issue: "Connection refused" errors

**Solution:**

1. Check Laravel server is running: `php artisan serve --port=8000`
2. Verify PostgreSQL is running
3. Check `.env` database credentials

### Issue: 404 Not Found errors

**Solution:**

1. Check route exists in `backend/routes/api.php`
2. Ensure controller method is implemented
3. Clear Laravel route cache: `php artisan route:cache`

### Issue: 500 Internal Server Error

**Solution:**

1. Check Laravel logs: `backend/storage/logs/laravel.log`
2. Ensure database migrations are run: `php artisan migrate`
3. Check controller syntax for errors

### Issue: Frontend not fetching data

**Solution:**

1. Open browser DevTools (F12) → Network tab
2. Check API requests are being made to correct URL
3. Verify `.env.development` has correct `VITE_API_URL`
4. Restart Vite dev server to load new env variables

---

## 📊 Sample Data

The database has been seeded with realistic sample data:

### Users

- **Resident:** resident@kalinga.com / password
- **Admin:** admin@kalinga.com / password
- **Responder:** responder@kalinga.com / password
- **Logistics:** logistics@kalinga.com / password

### Incidents

- INC-4821: Flash Flood (Critical) at Barangay Poblacion
- INC-4818: Landslide (High) at Mountain View Area
- INC-4804: Heat Exhaustion (Moderate) at Community Center

### Evacuation Centers

- Barangay Hall Evacuation Center (150/200 capacity)
- City Sports Complex (80/500 capacity)
- Church Community Center (50/150 capacity)

### Hospitals

- Kalinga General Hospital (85/100 beds)
- City Medical Center (120/150 beds)
- District Health Center (25/50 beds)

---

## 🎯 Integration Checklist

Use this checklist to track your progress:

### Backend

- [x] Laravel project created
- [x] Database migrations created
- [x] Database seeded
- [x] API routes defined
- [x] CORS configured
- [x] IncidentController implemented
- [ ] EvacuationCenterController fixed
- [ ] HospitalController fixed
- [ ] ResponderController fixed
- [ ] EmergencyReportController fixed
- [ ] PatientController fixed
- [ ] AssetController fixed
- [ ] SupplyItemController fixed
- [ ] NotificationController fixed

### Frontend

- [x] API client utility created (`src/lib/api.js`)
- [x] Environment variables configured
- [ ] ResponderDataContext updated to use API
- [ ] Dashboard components integrated
- [ ] Emergency SOS components integrated
- [ ] Admin components integrated
- [ ] Logistics components integrated
- [ ] Patient portal integrated
- [ ] Error handling added
- [ ] Loading states added
- [ ] Success/error notifications added

### Testing

- [ ] All API endpoints tested
- [ ] CORS verified working
- [ ] Create operations tested
- [ ] Update operations tested
- [ ] Delete operations tested
- [ ] Error handling tested
- [ ] Frontend-backend integration verified

---

## 📞 Support

If you encounter issues:

1. Check Laravel logs: `backend/storage/logs/laravel.log`
2. Check browser console for frontend errors
3. Verify both servers are running (frontend:4000, backend:8000)
4. Ensure PostgreSQL database is accessible

---

## 🚧 Development Workflow

### Making Changes to Backend

```powershell
cd backend

# 1. Create/modify controller
php artisan make:controller NewController --api

# 2. Add routes to routes/api.php

# 3. Test endpoints
php artisan route:list | Select-String "api"

# 4. If database changes needed
php artisan make:migration create_new_table
php artisan migrate
```

### Making Changes to Frontend

```javascript
// 1. Update src/lib/api.js with new endpoints
export const api = {
  newEndpoint: {
    getAll: () => apiFetch("/new-endpoint"),
  },
};

// 2. Use in components
import api from "@/lib/api";
const data = await api.newEndpoint.getAll();
```

---

## 🎓 Best Practices

1. **Error Handling:** Always wrap API calls in try-catch blocks
2. **Loading States:** Show loading indicators during API calls
3. **Validation:** Validate input before sending to API
4. **Security:** Never expose sensitive data in frontend
5. **Performance:** Cache API responses when appropriate
6. **Testing:** Test API endpoints before frontend integration

---

## 📝 Notes

- The backend uses Laravel 12 with PHP 8.4.7
- The frontend uses React 18 with Vite 7.1.3
- Database is PostgreSQL
- All API responses are in JSON format
- Authentication/authorization not yet implemented (TODO)
- File uploads for ID verification not yet implemented (TODO)

---

_Last Updated: [Current Date]_
_Version: 1.0.0_
