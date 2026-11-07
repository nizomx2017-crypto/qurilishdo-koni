// "Savatchaga" tugmasi uchun umumiy mantiq: login bo'lmasa — kirish sahifasiga yuboradi
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function useAddToCart() {
  const { user } = useAuth();
  const { add } = useCart();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busyId, setBusyId] = useState(null);

  const addToCart = async (product, qty = 1) => {
    if (!user) {
      notify('Savatchaga qo‘shish uchun avval tizimga kiring', 'info');
      navigate('/kirish', { state: { from: location.pathname } });
      return;
    }
    setBusyId(product.id);
    try {
      await add(product.id, qty);
      notify(`"${product.name}" savatchaga qo‘shildi`);
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setBusyId(null);
    }
  };

  return { addToCart, busyId };
}
