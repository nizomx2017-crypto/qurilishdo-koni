// Kirish urinishlari jurnali (faqat ADMIN): filtr va sahifalash
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import Pagination from '../../components/tables/Pagination';

const REASON_LABEL = {
  SUCCESS: 'Muvaffaqiyatli',
  WRONG_CODE: 'Noto‘g‘ri kod',
  NO_USER: 'Bunday login yo‘q',
  INACTIVE: 'Bloklangan akkaunt',
  LOCKED: 'Qulflangan',
  CAPTCHA_REQUIRED: 'Captcha kiritilmagan',
  CAPTCHA_INVALID: 'Captcha noto‘g‘ri',
};

export default function LoginAttemptsPage() {
  const [query, setQuery] = useState({ page: 1, limit: 20, login: '', ip: '', success: '', reason: '' });
  const [text, setText] = useState({ login: '', ip: '' });
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await api.loginAttempts(query));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.login === text.login && q.ip === text.ip ? q : { ...q, ...text, page: 1 })), 400);
    return () => clearTimeout(t);
  }, [text]);

  const setFilter = (k) => (e) => setQuery((q) => ({ ...q, [k]: e.target.value, page: 1 }));

  return (
    <>
      <div className="topbar">
        <h1>Kirish urinishlari</h1>
        <div className="toolbar">
          <input className="search" type="search" placeholder="Login…" value={text.login}
            onChange={(e) => setText((t) => ({ ...t, login: e.target.value }))} aria-label="Login" />
          <input className="search narrow" type="search" placeholder="IP…" value={text.ip}
            onChange={(e) => setText((t) => ({ ...t, ip: e.target.value }))} aria-label="IP" />
          <select value={query.success} onChange={setFilter('success')} aria-label="Natija">
            <option value="">Barcha natijalar</option>
            <option value="true">Muvaffaqiyatli</option>
            <option value="false">Xato</option>
          </select>
          <select value={query.reason} onChange={setFilter('reason')} aria-label="Sabab">
            <option value="">Barcha sabablar</option>
            {Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <section className="card">
        {error && <div className="alert">{error}</div>}
        <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
          <table>
            <thead><tr><th>Vaqt</th><th>Login</th><th>IP</th><th>Natija</th><th>Sabab</th></tr></thead>
            <tbody>
              {result.data.map((r) => (
                <tr key={r.id}>
                  <td className="dim">{formatDate(r.createdAt)}</td>
                  <td><code>{r.login}</code></td>
                  <td className="dim">{r.ip || '—'}</td>
                  <td><span className={`badge tone-${r.success ? 'ok' : 'bad'}`}>{r.success ? 'Kirdi' : 'Rad etildi'}</span></td>
                  <td>{REASON_LABEL[r.reason] || r.reason}</td>
                </tr>
              ))}
              {!result.data.length && !loading && <tr><td colSpan={5} className="empty">Yozuv topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={query.page} pages={result.pages} total={result.total} limit={query.limit}
          onPage={(page) => setQuery((q) => ({ ...q, page }))}
          onLimit={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))} />
      </section>
    </>
  );
}
