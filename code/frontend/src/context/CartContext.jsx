// Savatcha holati: sarlavhadagi son va savatcha sahifasi bir xil ma'lumotni ishlatadi
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const EMPTY = { items: [], total: 0, count: 0 };
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(EMPTY);
      return EMPTY;
    }
    setLoading(true);
    try {
      const c = await api.cart();
      setCart(c);
      return c;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh().catch(() => setCart(EMPTY)); }, [refresh]);

  const value = useMemo(() => ({
    cart,
    loading,
    refresh,
    setCart,
    add: async (productId, qty) => setCart(await api.addToCart(productId, qty)),
    update: async (itemId, qty) => setCart(await api.updateCartItem(itemId, qty)),
    remove: async (itemId) => setCart(await api.removeCartItem(itemId)),
  }), [cart, loading, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
