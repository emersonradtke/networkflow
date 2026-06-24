import { useState, useEffect } from 'react';

const CART_KEY = 'boldlife_cart';

export function useCartStorage() {
  const [cart, setCartState] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const setCart = (updater) => {
    setCartState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  return [cart, setCart];
}