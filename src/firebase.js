import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration - Replace with your own Firebase project credentials
// Get these from: https://console.firebase.google.com → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyD-ICgenL_WQ8z0mfyvtPseOJUPbVMsxNs",
  authDomain: "onlinestore-10a26.firebaseapp.com",
  projectId: "onlinestore-10a26",
  storageBucket: "onlinestore-10a26.firebasestorage.app",
  messagingSenderId: "158922112325",
  appId: "1:158922112325:web:9f0b993a2babb5290c122c",
  measurementId: "G-C5775EY635"
};

let app = null;
let db = null;
let initialized = false;

export function initFirebase() {
  if (initialized) return { app, db };
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    initialized = true;
  } catch (err) {
    console.warn('Firebase init failed:', err.message);
  }
  return { app, db };
}

export function isFirebaseReady() {
  return initialized && db !== null;
}

// Firestore helpers
export async function firestoreGet(collection, docId) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, collection, docId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('firestoreGet error:', err.message);
    return null;
  }
}

// Recursively strip Firestore-invalid values (undefined → null, NaN → null).
// Firestore accepts null but throws "Unsupported field value: undefined".
function sanitizeForFirestore(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = sanitizeForFirestore(value[k]);
    }
    return out;
  }
  return value;
}

export async function firestoreSet(collection, docId, data) {
  if (!db) return false;
  try {
    await setDoc(doc(db, collection, docId), sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) {
    console.warn('firestoreSet error:', err.message);
    return false;
  }
}

export function firestoreListen(collection, docId, callback) {
  if (!db) return () => {};
  try {
    return onSnapshot(doc(db, collection, docId), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    });
  } catch (err) {
    console.warn('firestoreListen error:', err.message);
    return () => {};
  }
}

export { db, app };
