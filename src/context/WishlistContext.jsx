import React, { createContext, useContext, useMemo, useState } from 'react';
import { db } from '../db.js';
import { useAuth } from './AuthContext.jsx';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [lists, setLists] = useState(db.getWishlists());

  // current user's saved product ids
  const ids = userId ? lists[userId] || [] : [];

  const persist = (next) => {
    setLists(next);
    db.saveWishlists(next);
  };

  const toggle = (id) => {
    if (!userId) return false;
    const set = new Set(ids);
    let added;
    if (set.has(id)) {
      set.delete(id);
      added = false;
    } else {
      set.add(id);
      added = true;
    }
    persist({ ...lists, [userId]: Array.from(set) });
    return added;
  };

  const remove = (id) => {
    if (!userId) return;
    const arr = ids.filter((x) => x !== id);
    const next = { ...lists };
    if (arr.length) next[userId] = arr;
    else delete next[userId];
    persist(next);
  };

  const isWishlisted = (id) => userId && ids.includes(id);

  const value = useMemo(
    () => ({
      ids,
      count: ids.length,
      isWishlisted,
      toggle,
      remove,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, lists, userId]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}