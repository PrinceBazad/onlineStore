import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration - Replace with your own Firebase project credentials
// Get these from: https://console.firebase.google.com → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyReplaceMeWithYourOwn123",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
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

export async function firestoreSet(collection, docId, data) {
  if (!db) return false;
  try {
    await setDoc(doc(db, collection, docId), data, { merge: true });
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
