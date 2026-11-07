// Admin: barcha buyurtmalar — holat bo'yicha filtr, qidiruv va holatni o'zgartirish
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ORDER_TRANSITIONS, VALUE_LABELS, formatDate, formatMoney } from '../../utils/format';
import OrderItems from '../../components/shop/OrderItems';
import StatusBadge from '../../components/shop/StatusBadge';
import Pagination from '../../components/tables/Pagination';
import ConfirmDialog from '../../components/modals/ConfirmDialog';

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const notify = useToast();
  const [query, setQuery] = useState({ page: 1, limit: 10, status: '', search: '' });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await api.admin.orders(query));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === searchText ? q : { ...q, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const changeStatus = async (order, status) => {
    setBusyId(order.id);
    try {
      const updated = await api.admin.setOrderStatus(order.id, status);
      setResult((r) => ({ ...r, data: r.data.map((o) => (o.id === order.id ? { ...o, ...updated } : o)) }));
      notify(`№${order.id}: ${VALUE_LABELS[status]}`);
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setBusyId(null);
      setCancelling(null);
    }
  };

  const onSelect = (order, status) => {
    if (status === 'cancelled') setCancelling(order);
    else changeStatus(order, status);
  };

  return (
    <>
      <div className="topbar">
        <h1>Buyurtmalar</h1>
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="№, mijoz, email yoki telefon…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Qidiruv"
          />
          <select value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))} aria-label="Holat">
            <option value="">Barcha holatlar</option>
            {STATUSES.map((s) => <option key={s} value={s}>{VALUE_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && !error && !result.data.length && <div className="state card">Buyurtma topilmadi</div>}

      <div className={loading ? 'is-loading' : ''}>
        {result.data.map((o) => {
          const next = ORDER_TRANSITIONS[o.status] || [];
          return (
            <details key={o.id} className="card order">
              <summary className="order-head">
                <span className="order-id">№{o.id}</span>
                <span className="order-user">{o.user_name}</span>
                <span className="dim">{formatDate(o.created_at)}</span>
                <StatusBadge value={o.status} />
                <b className="order-sum">{formatMoney(o.total_amount)}</b>
              </summary>
              <div className="order-body">
                <div className="order-meta">
                  <div><span className="dim">Mijoz:</span> {o.user_name} ({o.user_email})</div>
                  <div><span className="dim">Telefon:</span> {o.phone}</div>
                  <div><span className="dim">Manzil:</span> {o.address}</div>
                  {o.note && <div><span className="dim">Izoh:</span> {o.note}</div>}
                </div>
                <OrderItems order={o} />
                {next.length > 0 && (
                  <div className="order-actions">
                    <span className="dim">Holatni o‘zgartirish:</span>
                    {next.map((s) => (
                      <button
                        key={s}
                        className={`btn small ${s === 'cancelled' ? 'ghost danger-text' : 'primary'}`}
                        disabled={busyId === o.id}
                        onClick={() => onSelect(o, s)}
                      >
                        {VALUE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {result.total > 0 && (
        <div className="card">
          <Pagination
            page={query.page}
            pages={result.pages}
            total={result.total}
            limit={query.limit}
            onPage={(page) => setQuery((q) => ({ ...q, page }))}
            onLimit={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))}
          />
        </div>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Buyurtmani bekor qilish"
          confirmText="Ha, bekor qilish"
          text={`№${cancelling.id} buyurtmani bekor qilasizmi? Mahsulotlar qoldig'i omborga qaytariladi.`}
          onConfirm={() => changeStatus(cancelling, 'cancelled')}
          onCancel={() => setCancelling(null)}
          busy={busyId === cancelling.id}
        />
      )}
    </>
  );
}
