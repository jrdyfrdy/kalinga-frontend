import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
  firebaseConfig.databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
}

// Training content (courses, progress, uploads) lives in Firebase. Without
// configuration, initialising at import time threw (getAnalytics: missing
// projectId) and crashed every page that imports the training service.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const storage = app ? getStorage(app) : null;
const db = app ? getFirestore(app) : null;

// Analytics is optional and unsupported in some browsers/contexts.
let analytics = null;
if (app && firebaseConfig.measurementId) {
  analyticsSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {});
}

export { app, analytics, storage, db };
