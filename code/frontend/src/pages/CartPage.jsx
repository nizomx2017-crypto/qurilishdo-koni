// Savatcha: miqdorni o'zgartirish, olib tashlash va buyurtmani rasmiylashtirish
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatMoney } from '../utils/format';
import { Field } from '../components/forms/AuthForm';
import ProductImage from '../components/shop/ProductImage';

function CartRow({ item, onQty, onRemove, busy }) {
  const [value, setValue] = useState(String(item.quantity));
  useEffect(() => setValue(String(item.quantity)), [item.quantity]);

  const commit = () => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 1) setValue(String(item.quantity));
    else if (n !== item.quantity) onQty(item, n);
  };

  return (
    <div className={`cart-row ${item.available ? '' : 'unavailable'}`}>
      <ProductImage product={item} />
      <div className="cart-info">
        <Link to={`/mahsulot/${item.product_id}`} className="cart-name">{item.name}</Link>
        <div className="dim">{formatMoney(item.price)} / {item.unit}</div>
        {!item.available && <div className="warn-text">Hozir sotuvda emas — olib tashlang</div>}
        {item.available && item.quantity > item.stock_quantity && (
          <div className="warn-text">Omborda faqat {item.stock_quantity} {item.unit} qoldi</div>
        )}
      </div>
      <div className="qty">
        <button className="icon-btn" disabled={busy || item.quantity <= 1} onClick={() => onQty(item, item.quantity - 1)} aria-label="Kamaytirish">−</button>
        <input
          className="qty-input"
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-label="Miqdor"
        />
        <button className="icon-btn" disabled={busy} onClick={() => onQty(item, item.quantity + 1)} aria-label="Ko‘paytirish">+</button>
      </div>
      <div className="cart-total num">{formatMoney(item.total_price)}</div>
      <button className="icon-btn danger" disabled={busy} onClick={() => onRemove(item)} title="Olib tashlash" aria-label="Olib tashlash">✕</button>
    </div>
  );
}

export default function CartPage() {
  const { user } = useAuth();
  const { cart, loading, update, remove, refresh, setCart } = useCart();
  const notify = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ phone: user?.phone || '', address: '', note: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { notify(e.message, 'bad'); } finally { setBusy(false); }
  };

  async function checkout(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      const order = await api.checkout(form);
      setCart({ items: [], total: 0, count: 0 });
      notify(`Buyurtma №${order.id} qabul qilindi`);
      navigate('/buyurtmalarim', { state: { highlight: order.id } });
    } catch (err) {
      setMessage(err.message);
      if (err.status === 409 && err.details) {
        setMessage(`${err.message}: ${Object.values(err.details).join('; ')}`);
        refresh().catch(() => {});
      } else if (err.details && typeof err.details === 'object') {
        setErrors(err.details);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading && !cart.items.length) return <div className="state">Yuklanmoqda…</div>;

  if (!cart.items.length) {
    return (
      <div className="state">
        <h1>Savatcha bo‘sh</h1>
        <p>Katalogdan kerakli mahsulotlarni tanlang.</p>
        <Link to="/" className="btn primary">Katalogga o‘tish</Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="cart-page">
      <h1>Savatcha</h1>
      <div className="cart-layout">
        <section className="card cart-list">
          {cart.items.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              busy={busy}
              onQty={(it, q) => run(() => update(it.id, q))}
              onRemove={(it) => run(() => remove(it.id))}
            />
          ))}
        </section>

        <form className="card checkout" onSubmit={checkout}>
          <h2>Buyurtma berish</h2>
          <div className="summary">
            <span>{cart.count} ta mahsulot</span>
            <b>{formatMoney(cart.total)}</b>
          </div>
          <Field label="Telefon" error={errors.phone} required>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" required />
          </Field>
          <Field label="Yetkazish manzili" error={errors.address} required>
            <textarea rows={3} value={form.address} onChange={set('address')} required />
          </Field>
          <Field label="Izoh" error={errors.note}>
            <textarea rows={2} value={form.note} onChange={set('note')} placeholder="Masalan: qulay vaqt" />
          </Field>
          {message && <div className="form-error">{message}</div>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Yuborilmoqda…' : 'Buyurtmani tasdiqlash'}
          </button>
          <p className="dim small-text">To‘lov mahsulot yetkazilganda amalga oshiriladi.</p>
        </form>
      </div>
    </div>
  );
}
