// Userning o'z buyurtmalari
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { formatDate, formatMoney } from '../utils/format';
import OrderItems from '../components/shop/OrderItems';
import StatusBadge from '../components/shop/StatusBadge';

export default function OrdersPage() {
  const location = useLocation();
  const highlight = location.state?.highlight;
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.myOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!orders) return <div className="state">Yuklanmoqda…</div>;
  if (!orders.length) {
    return (
      <div className="state">
        <h1>Buyurtmalar yo‘q</h1>
        <p>Siz hali buyurtma bermagansiz.</p>
        <Link to="/" className="btn primary">Katalogga o‘tish</Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>Buyurtmalarim</h1>
      {orders.map((o) => (
        <details key={o.id} className={`card order ${o.id === highlight ? 'is-new' : ''}`} open={o.id === highlight || orders.length === 1}>
          <summary className="order-head">
            <span className="order-id">№{o.id}</span>
            <span className="dim">{formatDate(o.created_at)}</span>
            <StatusBadge value={o.status} />
            <b className="order-sum">{formatMoney(o.total_amount)}</b>
          </summary>
          <div className="order-body">
            <div className="order-meta">
              <div><span className="dim">Telefon:</span> {o.phone}</div>
              <div><span className="dim">Manzil:</span> {o.address}</div>
              {o.note && <div><span className="dim">Izoh:</span> {o.note}</div>}
            </div>
            <OrderItems order={o} />
          </div>
        </details>
      ))}
    </div>
  );
}
