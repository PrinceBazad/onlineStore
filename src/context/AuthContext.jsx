import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from '../firebase.js';

const AuthContext = createContext(null);
const auth = getAuth(app);
const firestore = getFirestore(app);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        const userData = userDoc.data() || {};
        
        const session = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || userData.name || '',
          email: firebaseUser.email,
          phone: userData.phone || '',
          role: userData.role || 'customer',
        };
        setUser(session);
        db.saveSession(session);
      } else {
        setUser(null);
        db.clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async ({ name, email, password, phone }) => {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Save additional user data to Firestore
      const userData = {
        name: name || '',
        email: email.toLowerCase(),
        phone: phone || '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(firestore, 'users', firebaseUser.uid), userData);

      const session = {
        id: firebaseUser.uid,
        name: name || '',
        email: email.toLowerCase(),
        phone: phone || '',
        role: 'customer',
      };
      db.saveSession(session);
      setUser(session);
      return session;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please log in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(error.message);
    }
  };

  const login = async ({ email, password }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      const userData = userDoc.data() || {};

      const session = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || userData.name || '',
        email: firebaseUser.email,
        phone: userData.phone || '',
        role: userData.role || 'customer',
      };
      db.saveSession(session);
      setUser(session);
      return session;
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      db.clearSession();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}