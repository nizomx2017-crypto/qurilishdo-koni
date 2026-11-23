// "Savatchaga" tugmasi uchun umumiy mantiq. Login kerak emas — savatcha brauzerda saqlanadi.
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function useAddToCart() {
  const { add, items } = useCart();
  const notify = useToast();
  const [busyId] = useState(null);

  const addToCart = (product, qty = 1) => {
    const inCart = items.find((it) => it.product_id === product.id)?.quantity || 0;
    if (inCart >= product.stock_quantity) {
      notify(`"${product.name}": omborda faqat ${product.stock_quantity} ${product.unit} bor`, 'bad');
      return;
    }
    const total = Math.min(inCart + qty, product.stock_quantity);
    add(product.id, qty, product.stock_quantity);
    if (inCart + qty > product.stock_quantity) {
      notify(`"${product.name}": savatchada ${total} ${product.unit} (omborda shuncha bor)`, 'info');
    } else {
      notify(`"${product.name}" savatchaga qo‘shildi`);
    }
  };

  return { addToCart, busyId };
}
