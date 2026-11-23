/**
 * Savatcha — mijoz akkauntsiz, shuning uchun brauzerda (localStorage) saqlanadi: [{ product_id, quantity }].
 * Narx va qoldiq bu yerda saqlanmaydi: savatcha sahifasi ularni har safar serverdan oladi,
 * buyurtmada esa server o'zi qayta hisoblaydi. Boshqa tablar bilan sinxron.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'qd_cart';
const MAX_LINES = 50;
const MAX_QTY = 10000;
const CartContext = createContext(null);

function readCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((it) => it && Number.isInteger(it.product_id) && it.product_id > 0
        && Number.isInteger(it.quantity) && it.quantity > 0)
      .map((it) => ({ product_id: it.product_id, quantity: Math.min(it.quantity, MAX_QTY) }))
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* saqlab bo'lmadi */ }
  }, [items]);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setItems(readCart()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Qo'shadi; max berilsa (qoldiq) undan oshirmaydi */
  const add = useCallback((productId, qty = 1, max = MAX_QTY) => {
    setItems((list) => {
      const found = list.find((it) => it.product_id === productId);
      const limit = Math.min(max, MAX_QTY);
      if (found) {
        const quantity = Math.min(found.quantity + qty, limit);
        return list.map((it) => (it.product_id === productId ? { ...it, quantity } : it));
      }
      if (list.length >= MAX_LINES) return list;
      return [...list, { product_id: productId, quantity: Math.min(qty, limit) }];
    });
  }, []);

  const setQuantity = useCallback((productId, qty) => {
    const q = Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));
    setItems((list) => list.map((it) => (it.product_id === productId ? { ...it, quantity: q } : it)));
  }, []);

  const remove = useCallback((productId) => {
    setItems((list) => list.filter((it) => it.product_id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items,
    count: items.reduce((sum, it) => sum + it.quantity, 0),
    add,
    setQuantity,
    remove,
    clear,
  }), [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
