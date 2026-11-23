/**
 * Savatcha va buyurtma berish. Mijoz oldindan hech qayerda ro'yxatdan o'tmaydi:
 * ism, telefon va manzil faqat shu yerda, buyurtma berayotganda so'raladi.
 * Narx va qoldiq serverdan olinadi; yakuniy hisob-kitob ham serverda.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatMoney } from '../utils/format';
import { Field } from '../components/forms/AuthForm';
import Captcha from '../components/forms/Captcha';
import ProductImage from '../components/shop/ProductImage';

const EMPTY_FORM = { customer_name: '', phone: '', address: '', note: '' };
const EMPTY_CAPTCHA = { captchaId: '', captchaAnswer: '' };

function CartRow({ item, product, onQty, onRemove }) {
  const [value, setValue] = useState(String(item.quantity));
  useEffect(() => setValue(String(item.quantity)), [item.quantity]);

  if (!product) {
    return (
      <div className="cart-row unavailable">
        <div className="product-img placeholder" aria-hidden="true">?</div>
        <div className="cart-info">
          <div className="cart-name">Mahsulot #{item.product_id}</div>
          <div className="warn-text">Hozir sotuvda emas — olib tashlang</div>
        </div>
        <div />
        <div />
        <button className="icon-btn danger" onClick={() => onRemove(item)} title="Olib tashlash" aria-label="Olib tashlash">✕</button>
      </div>
    );
  }

  const commit = () => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 1) setValue(String(item.quantity));
    else if (n !== item.quantity) onQty(item, n);
  };
  const over = item.quantity > product.stock_quantity;

  return (
    <div className={`cart-row ${over ? 'unavailable' : ''}`}>
      <ProductImage product={product} />
      <div className="cart-info">
        <Link to={`/mahsulot/${product.id}`} className="cart-name">{product.name}</Link>
        <div className="dim">{formatMoney(product.price)} / {product.unit}</div>
        {over && <div className="warn-text">Omborda faqat {product.stock_quantity} {product.unit} qoldi</div>}
      </div>
      <div className="qty">
        <button className="icon-btn" disabled={item.quantity <= 1} onClick={() => onQty(item, item.quantity - 1)} aria-label="Kamaytirish">−</button>
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
        <button className="icon-btn" disabled={item.quantity >= product.stock_quantity} onClick={() => onQty(item, item.quantity + 1)} aria-label="Ko‘paytirish">+</button>
      </div>
      <div className="cart-total num">{formatMoney(item.quantity * product.price)}</div>
      <button className="icon-btn danger" onClick={() => onRemove(item)} title="Olib tashlash" aria-label="Olib tashlash">✕</button>
    </div>
  );
}

export default function CartPage() {
  const { items, count, setQuantity, remove, clear } = useCart();
  const notify = useToast();
  const [products, setProducts] = useState({}); // id -> mahsulot | null (sotuvda emas)
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [captcha, setCaptcha] = useState(EMPTY_CAPTCHA);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // muvaffaqiyatli buyurtma

  const ids = items.map((it) => it.product_id).join(',');

  const loadProducts = useCallback(async () => {
    const list = ids ? ids.split(',').map(Number) : [];
    const results = await Promise.allSettled(list.map((id) => api.product(id)));
    const map = {};
    results.forEach((r, i) => { map[list[i]] = r.status === 'fulfilled' ? r.value : null; });
    return map;
  }, [ids]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProducts()
      .then((map) => { if (!cancelled) setProducts(map); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadProducts]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function checkout(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      const order = await api.checkout({
        ...form,
        items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
        ...captcha,
      });
      clear();
      setForm(EMPTY_FORM);
      setDone(order);
      notify(`Buyurtma №${order.id} qabul qilindi`);
      window.scrollTo(0, 0);
    } catch (err) {
      setMessage(err.message);
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        setErrors(err.details); // captcha hali tekshirilmagan — o'sha rasm amal qiladi
      } else {
        if (err.code === 'CAPTCHA_INVALID' || err.code === 'CAPTCHA_REQUIRED') setErrors({ captcha: err.message });
        if (err.code === 'OUT_OF_STOCK' && err.details) {
          setMessage(`${err.message}: ${Object.values(err.details).join('; ')}`);
          setProducts(await loadProducts().catch(() => products));
        }
        if (err.status !== 429 && err.status !== 0) setCaptchaKey((k) => k + 1); // captcha ishlatildi — yangisi
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="state card done-card">
        <h1>Rahmat! Buyurtma №{done.id} qabul qilindi</h1>
        <p>Jami: <b>{formatMoney(done.total_amount)}</b>. Tez orada siz bilan bog‘lanamiz.</p>
        <p className="dim">Buyurtma raqamini eslab qoling — qo‘ng‘iroq qilganingizda shu raqamni ayting.</p>
        <Link to="/" className="btn primary">Katalogga qaytish</Link>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="state">
        <h1>Savatcha bo‘sh</h1>
        <p>Katalogdan kerakli mahsulotlarni tanlang.</p>
        <Link to="/" className="btn primary">Katalogga o‘tish</Link>
      </div>
    );
  }

  if (loading && !Object.keys(products).length) return <div className="state">Yuklanmoqda…</div>;

  const total = items.reduce((sum, it) => sum + (products[it.product_id] ? it.quantity * products[it.product_id].price : 0), 0);
  const hasProblem = items.some((it) => !products[it.product_id] || it.quantity > products[it.product_id].stock_quantity);

  return (
    <div className="cart-page">
      <h1>Savatcha</h1>
      <div className="cart-layout">
        <section className="card cart-list">
          {items.map((item) => (
            <CartRow
              key={item.product_id}
              item={item}
              product={products[item.product_id]}
              onQty={(it, q) => setQuantity(it.product_id, q)}
              onRemove={(it) => remove(it.product_id)}
            />
          ))}
        </section>

        <form className="card checkout" onSubmit={checkout} noValidate={false}>
          <h2>Buyurtma berish</h2>
          <div className="summary">
            <span>{count} ta mahsulot</span>
            <b>{formatMoney(total)}</b>
          </div>
          <Field label="Ismingiz" error={errors.customer_name} required>
            <input value={form.customer_name} onChange={set('customer_name')} autoComplete="name" required minLength={2} maxLength={150} />
          </Field>
          <Field label="Telefon" error={errors.phone} required>
            <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+998 90 123 45 67" required maxLength={30} />
          </Field>
          <Field label="Yetkazish manzili" error={errors.address} required>
            <textarea rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" required minLength={5} maxLength={500} />
          </Field>
          <Field label="Izoh" error={errors.note}>
            <textarea rows={2} value={form.note} onChange={set('note')} placeholder="Masalan: qulay vaqt" maxLength={1000} />
          </Field>
          <Captcha value={captcha} onChange={setCaptcha} reloadKey={captchaKey} error={errors.captcha} />
          {hasProblem && <div className="form-error">Savatchada sotuvda bo‘lmagan yoki yetarli bo‘lmagan mahsulot bor</div>}
          {message && <div className="form-error">{message}</div>}
          <button className="btn primary block" disabled={busy || hasProblem}>
            {busy ? 'Yuborilmoqda…' : 'Buyurtmani tasdiqlash'}
          </button>
          <p className="dim small-text">Ro‘yxatdan o‘tish shart emas. To‘lov mahsulot yetkazilganda amalga oshiriladi.</p>
        </form>
      </div>
    </div>
  );
}
