/**
 * Admin uchun umumiy CRUD sahifasi (kategoriyalar, mahsulotlar).
 * Ustunlar va forma maydonlari backenddagi registry'dan keladi (GET /api/admin/meta).
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/tables/Pagination';
import RecordForm from '../../components/forms/RecordForm';
import ConfirmDialog from '../../components/modals/ConfirmDialog';

const INITIAL_QUERY = { page: 1, limit: 10, search: '', sort: 'id', order: 'desc' };
let metaCache = null; // meta o'zgarmaydi — tablar orasida qayta yuklamaslik uchun

export default function AdminResourcePage({ resourceKey }) {
  const notify = useToast();
  const [resource, setResource] = useState(null);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // null | 'new' | row
  const [deleting, setDeleting] = useState(null); // null | row
  const [busy, setBusy] = useState(false);

  // 1) Resurs tavsifini yuklash; tab almashganda holatni tozalash
  useEffect(() => {
    setResource(null);
    setQuery(INITIAL_QUERY);
    setSearchText('');
    setEditing(null);
    const meta = metaCache ? Promise.resolve(metaCache) : api.admin.meta();
    meta
      .then((m) => {
        metaCache = m;
        setResource(m.find((r) => r.key === resourceKey) || null);
      })
      .catch((e) => setError(e.message));
  }, [resourceKey]);

  // 2) Ma'lumotlarni yuklash
  const load = useCallback(async () => {
    if (!resource) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.list(resource.key, query);
      // O'chirishdan keyin sahifa bo'sh qolsa — oxirgi sahifaga o'tish
      if (!res.data.length && res.page > 1) setQuery((q) => ({ ...q, page: res.pages }));
      else setResult(res);
    } catch (e) {
      setError(e.message);
      setResult({ data: [], total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [resource, query]);

  useEffect(() => { load(); }, [load]);

  // Qidiruv: yozish to'xtagach 350 ms kutib so'rov yuboriladi
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === searchText ? q : { ...q, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

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
      await api.admin.remove(resource.key, deleting.id);
      notify(`#${deleting.id} o'chirildi`);
      load();
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <h1>{resource?.label || 'Yuklanmoqda…'}</h1>
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Qidirish…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Qidiruv"
          />
          <button className="btn primary" onClick={() => setEditing('new')} disabled={!resource}>
            + Qo'shish
          </button>
        </div>
      </div>

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

      {editing && resource && (
        <RecordForm
          key={editing === 'new' ? 'new' : editing.id}
          resource={resource}
          record={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {deleting && resource && (
        <ConfirmDialog
          text={`${resource.label} bo'limidan #${deleting.id} yozuvini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
