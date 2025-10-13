# 🚀 Quick Integration Checklist

## ✅ What's Already Done

1. **Backend Setup**

   - ✅ Laravel 12 installed and configured
   - ✅ PostgreSQL database connected
   - ✅ 13 migrations created and run
   - ✅ Sample data seeded (users, incidents, centers, hospitals, etc.)
   - ✅ API routes defined for all user roles
   - ✅ IncidentController fully implemented
   - ✅ CORS configured for localhost:4000

2. **Frontend Setup**

   - ✅ API client utility created (`src/lib/api.js`)
   - ✅ Environment variables configured (`.env.development`)
   - ✅ Example integration component created

3. **Servers**
   - ✅ Backend running on port 8000
   - ⏳ Frontend needs to be started on port 4000

---

## 🔧 What You Need To Do Next

### Priority 1: Fix Remaining Controllers (30-45 minutes)

**Why:** 8 controllers have syntax errors and need to be fixed before the API works fully.

**How:**

```powershell
cd backend

# Fix each controller using this pattern:
Remove-Item -Force app\Http\Controllers\EvacuationCenterController.php
php artisan make:controller EvacuationCenterController --api

# Then edit the file and implement methods (use IncidentController as reference)
```

**Order:**

1. EvacuationCenterController
2. HospitalController
3. ResponderController
4. EmergencyReportController
5. PatientController
6. AssetController
7. SupplyItemController
8. NotificationController

**Reference:** Copy method patterns from `backend/app/Http/Controllers/IncidentController.php`

---

### Priority 2: Test Backend API (5 minutes)

**Start the frontend:**

```powershell
npm run dev -- --port 4000
```

**Test in browser console (F12):**

```javascript
// Test health check
fetch("http://127.0.0.1:8000/api/responder/incidents")
  .then((r) => r.json())
  .then(console.log);

// Should return the 3 seeded incidents
```

**Expected Result:**

```json
[
  {
    "id": 1,
    "code": "INC-4821",
    "incident_type": "Flash Flood",
    "severity": "critical",
    "status": "active",
    ...
  }
]
```

---

### Priority 3: Integrate One Component (15 minutes)

**Start with the simplest component - Evacuation Centers:**

**File:** `src/components/dashboard/Evacuation.jsx`

**Before (demo data):**

```javascript
const centers = [
  { id: 1, name: "Center 1", capacity: 100 },
  // ... hardcoded data
];
```

**After (API integration):**

```javascript
import { useEffect, useState } from "react";
import api from "@/lib/api";

function Evacuation() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.evacuationCenters
      .getAll()
      .then((data) => {
        setCenters(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch centers:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {centers.map((center) => (
        <div key={center.id}>
          <h3>{center.name}</h3>
          <p>{center.address}</p>
          <p>
            Occupancy: {center.current_occupancy}/{center.max_capacity}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

### Priority 4: Update Responder Context (30 minutes)

**File:** `src/components/responder/context/ResponderDataContext.jsx`

**What to do:**

1. Copy the pattern from `ResponderDataContext.example.jsx`
2. Replace hardcoded data with API calls
3. Test in responder dashboard

**Key changes:**

- Replace `const incidents = [...]` with `const [incidents, setIncidents] = useState([])`
- Add `useEffect` to fetch data from `api.incidents.getAll()`
- Add loading and error states

---

### Priority 5: Test Full Flow (15 minutes)

**Test Create Operation:**

1. Go to Emergency Report page: http://localhost:4000/report
2. Fill out the form
3. Submit
4. Check browser console for API call
5. Verify in database: `SELECT * FROM emergency_reports;`

**Test Read Operation:**

1. Go to Responder Dashboard: http://localhost:4000/responder
2. Should see 3 incidents from database
3. Click on an incident to see details

**Test Update Operation:**

1. In responder dashboard, change incident status
2. Verify API call in browser console
3. Check database for updated status

---

## 📋 Testing Checklist

Use this to verify each integration:

### Backend API

- [ ] EvacuationCenterController fixed
- [ ] HospitalController fixed
- [ ] ResponderController fixed
- [ ] EmergencyReportController fixed
- [ ] PatientController fixed
- [ ] AssetController fixed
- [ ] SupplyItemController fixed
- [ ] NotificationController fixed
- [ ] All API endpoints return 200 OK
- [ ] CORS headers present in responses

### Frontend Integration

- [ ] Evacuation centers load from API
- [ ] Incidents display in responder dashboard
- [ ] Emergency reports can be submitted
- [ ] Admin dashboard shows statistics
- [ ] Logistics assets display
- [ ] Patient portal shows data
- [ ] No CORS errors in console
- [ ] Loading states show correctly
- [ ] Error messages display when API fails

### Database

- [ ] Data persists after page refresh
- [ ] Create operations save to database
- [ ] Update operations modify database
- [ ] Delete operations remove from database

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch" error

**Solution:**

1. Check backend server is running: `php artisan serve --port=8000`
2. Check CORS config in `backend/config/cors.php`
3. Restart backend server

### Issue: "404 Not Found"

**Solution:**

1. Check route exists in `backend/routes/api.php`
2. Check controller method is implemented
3. Run: `php artisan route:list | Select-String "api"`

### Issue: "500 Internal Server Error"

**Solution:**

1. Check Laravel logs: `backend/storage/logs/laravel.log`
2. Check controller for syntax errors
3. Verify database connection in `.env`

### Issue: Data not showing in frontend

**Solution:**

1. Open browser DevTools (F12) → Network tab
2. Check API request was made
3. Check response data structure matches your component
4. Add `console.log()` to see what data is returned

---

## 📊 Database Quick Reference

### Sample Credentials

```
resident@kalinga.com / password
admin@kalinga.com / password
responder@kalinga.com / password
logistics@kalinga.com / password
```

### Sample Data

- **3 Incidents:** INC-4821 (Flash Flood), INC-4818 (Landslide), INC-4804 (Heat Exhaustion)
- **3 Evacuation Centers:** Barangay Hall (150/200), Sports Complex (80/500), Church Center (50/150)
- **3 Hospitals:** General Hospital (85/100 beds), Medical Center (120/150), Health Center (25/50)

### Useful Commands

```powershell
# View all incidents
cd backend
php artisan tinker
>>> App\Models\Incident::all();

# Count records
>>> App\Models\Incident::count();

# Fresh start
>>> php artisan migrate:fresh --seed
```

---

## 📝 API Client Quick Reference

Import in any component:

```javascript
import api from "@/lib/api";
```

### Most Used Endpoints:

```javascript
// Get incidents
const incidents = await api.incidents.getAll();

// Create emergency report
await api.emergencyReports.create({
  incident_type: "Fire",
  description: "Building on fire",
  latitude: 14.5995,
  longitude: 120.9842,
  severity: "critical",
  contact_number: "09123456789",
});

// Get evacuation centers
const centers = await api.evacuationCenters.getAll();

// Get hospitals
const hospitals = await api.hospitals.getAll();

// Get responder roster
const roster = await api.responders.getRoster();
```

---

## 🎯 Success Criteria

You'll know the integration is complete when:

1. ✅ Backend server runs without errors
2. ✅ Frontend loads data from backend (not demo data)
3. ✅ Emergency reports can be created and saved to database
4. ✅ Incidents can be updated and changes persist
5. ✅ No CORS errors in browser console
6. ✅ All dashboards display real data from PostgreSQL
7. ✅ Page refreshes don't lose data (persisted in DB)

---

## 📞 Need Help?

**Check these files first:**

1. `BACKEND_INTEGRATION.md` - Full integration guide
2. `backend/storage/logs/laravel.log` - Backend errors
3. Browser DevTools → Console - Frontend errors
4. Browser DevTools → Network - API requests/responses

**Verify setup:**

```powershell
# Backend running?
netstat -ano | findstr ":8000"

# Frontend running?
netstat -ano | findstr ":4000"

# Database connected?
cd backend
php artisan migrate:status
```

---

_Estimated Total Time: 1.5 - 2 hours_
_Current Progress: ~60% complete_
