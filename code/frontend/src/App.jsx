/**
 * Asosiy oyna:
 *   chapda — jadvallar menyusi (Sidebar)
 *   o'rtada — tanlangan jadval: qidiruv, "Qo'shish", jadval, sahifalash
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from './services/api';
import Sidebar from './components/layout/Sidebar';
import DataTable from './components/tables/DataTable';
import Pagination from './components/tables/Pagination';
import RecordForm from './components/forms/RecordForm';
import ConfirmDialog from './components/modals/ConfirmDialog';

const initialKey = () => window.location.hash.replace('#', '') || 'products';

export default function App() {
  const [resources, setResources] = useState([]);
  const [activeKey, setActiveKey] = useState(initialKey);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '', sort: 'id', order: 'desc' });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // null | 'new' | row
  const [deleting, setDeleting] = useState(null); // null | row
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const resource = resources.find((r) => r.key === activeKey);

  const notify = (text, tone = 'ok') => {
    setToast({ text, tone, id: Date.now() });
  };
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // 1) Bo'limlar ro'yxatini yuklash
  useEffect(() => {
    api.meta()
      .then((meta) => {
        setResources(meta);
        if (!meta.some((r) => r.key === initialKey())) setActiveKey(meta[0]?.key);
      })
      .catch((e) => setError(e.message));
  }, []);

  // 2) Tanlangan jadval ma'lumotlarini yuklash
  const load = useCallback(async () => {
    if (!activeKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.list(activeKey, query);
      // O'chirishdan keyin sahifa bo'sh qolsa — oldingi sahifaga o'tish
      if (!res.data.length && res.page > 1) setQuery((q) => ({ ...q, page: res.pages }));
      else setResult(res);
    } catch (e) {
      setError(e.message);
      setResult({ data: [], total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [activeKey, query]);

  useEffect(() => { load(); }, [load]);

  // Qidiruv: yozish to'xtagach 350 ms kutib so'rov yuboriladi
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === searchText ? q : { ...q, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const selectResource = (key) => {
    window.location.hash = key;
    setActiveKey(key);
    setSearchText('');
    setQuery((q) => ({ page: 1, limit: q.limit, search: '', sort: 'id', order: 'desc' }));
  };

  const onSort = (name) =>
    setQuery((q) => ({ ...q, sort: name, order: q.sort === name && q.order === 'desc' ? 'asc' : 'desc', page: 1 }));

  const onSaved = (row, isEdit) => {
    setEditing(null);
    notify(isEdit ? `#${row.id} saqlandi` : `Yangi yozuv qo'shildi (#${row.id})`);
    load();
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.remove(activeKey, deleting.id);
      notify(`#${deleting.id} o'chirildi`);
      setDeleting(null);
      load();
    } catch (e) {
      notify(e.message, 'bad');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="layout">
      <Sidebar
        resources={resources}
        active={activeKey}
        onSelect={selectResource}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menyu">☰</button>
          <div>
            <div className="crumb">{resource?.group}</div>
            <h1>{resource?.label || 'Yuklanmoqda…'}</h1>
          </div>
          <div className="toolbar">
            <input
              className="search"
              type="search"
              placeholder="Qidirish…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button className="btn primary" onClick={() => setEditing('new')} disabled={!resource}>
              + Qo'shish
            </button>
          </div>
        </header>

        <section className="card">
          {error && <div className="alert">{error}</div>}
          {resource && (
            <>
              <DataTable
                columns={resource.columns}
                rows={result.data}
                sort={query.sort}
                order={query.order}
                onSort={onSort}
                onEdit={(row) => setEditing(row)}
                onDelete={(row) => setDeleting(row)}
                loading={loading}
              />
              <Pagination
                page={query.page}
                pages={result.pages}
                total={result.total}
                limit={query.limit}
                onPage={(page) => setQuery((q) => ({ ...q, page }))}
                onLimit={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))}
              />
            </>
          )}
        </section>
      </main>

      {editing && resource && (
        <RecordForm
          key={editing === 'new' ? 'new' : editing.id}
          resource={resource}
          record={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {deleting && (
        <ConfirmDialog
          text={`${resource.label} bo'limidan #${deleting.id} yozuvini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      )}

      {toast && <div key={toast.id} className={`toast tone-${toast.tone}`}>{toast.text}</div>}
    </div>
  );
}
