import React, { createContext, useContext, useState } from 'react';
import { db } from '../db.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(db.getSession());

  const signup = ({ name, email, password, phone }) => {
    const users = db.getUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      throw new Error('An account with this email already exists. Please log in.');
    }
    const newUser = {
      id: db.uid('U-'),
      name,
      email,
      phone: phone || '',
      password,
      role: 'customer',
    };
    users.push(newUser);
    db.saveUsers(users);
    const session = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    };
    db.saveSession(session);
    setUser(session);
    return session;
  };

  const login = ({ email, password }) => {
    const users = db.getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password.');
    }
    const session = {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
      role: found.role,
    };
    db.saveSession(session);
    setUser(session);
    return session;
  };

  const logout = () => {
    db.clearSession();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}