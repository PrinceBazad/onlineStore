import React, { createContext, useContext, useMemo, useState } from 'react';
import { db } from '../db.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(db.getCart());

  const persist = (next) => {
    setCart(next);
    db.saveCart(next);
  };

  const addItem = (product, qty = 1) => {
    let next;
    const idx = cart.findIndex((c) => c.id === product.id);
    if (idx >= 0) {
      next = cart.map((c, i) =>
        i === idx ? { ...c, qty: c.qty + qty } : c
      );
    } else {
      next = [
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          color: product.color,
          qty,
        },
      ];
    }
    persist(next);
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      persist(cart.filter((c) => c.id !== id));
      return;
    }
    persist(cart.map((c) => (c.id === id ? { ...c, qty } : c)));
  };

  const removeItem = (id) => persist(cart.filter((c) => c.id !== id));

  const clearCart = () => persist([]);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => s + c.qty * c.price, 0);

  const value = useMemo(
    () => ({
      cart,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      totalItems,
      subtotal,
    }),
    [cart, totalItems, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}