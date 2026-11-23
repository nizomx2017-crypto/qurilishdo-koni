/**
 * Rollar va huquqlar (ADMIN, DIRECTOR).
 *  - chapda rollar ro'yxati, o'ngda tanlangan role;
 *  - MANAGER role uchun matritsa: qatorlar — sahifalar, ustunlar — amallar (mavjud bo'lmagan amal — o'chiq),
 *    "qatorni hammasini belgilash", saqlanmagan o'zgarishlar haqida ogohlantirish, "Saqlash";
 *  - ADMIN / DIRECTOR rollari — "To'liq huquq", matritsa yo'q.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';

const TYPE_LABEL = { ADMIN: 'Administrator', DIRECTOR: 'Direktor', MANAGER: 'Menejer' };
const ACTION_LABEL = {
  VIEW: 'Ko‘rish', CREATE: 'Qo‘shish', UPDATE: 'Tahrirlash', DELETE: 'O‘chirish', ARCHIVE: 'Arxivlash', APPROVE: 'Tasdiqlash',
};
const UNSAVED = 'Saqlanmagan o‘zgarishlar bor. Ular yo‘qoladi — davom etasizmi?';

function RoleForm({ role, allowedTypes, onClose, onSaved }) {
  const isEdit = Boolean(role);
  const [values, setValues] = useState({
    name: role?.name || '', type: role?.type || 'MANAGER', description: role?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      const payload = { name: values.name, description: values.description || null };
      if (!isEdit || (!role.isOwn && values.type !== role.type)) payload.type = values.type;
      onSaved(isEdit ? await api.roles.update(role.id, payload) : await api.roles.create(payload));
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? `Role: ${role.name}` : 'Yangi role'} onClose={onClose} width={460}>
      <form onSubmit={submit}>
        <div className="modal-body stack">
          <label className={`field ${errors.name ? 'has-error' : ''}`}>
            <span>Nomi<i className="req">*</i></span>
            <input value={values.name} onChange={set('name')} required minLength={2} maxLength={50} />
            {errors.name && <small>{errors.name}</small>}
          </label>
          <label className={`field ${errors.type ? 'has-error' : ''}`}>
            <span>Turi<i className="req">*</i></span>
            <select value={values.type} onChange={set('type')} disabled={isEdit && role.isOwn}>
              {allowedTypes.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <small className="dim">Administrator va Direktor — to‘liq huquq. Menejer — faqat belgilangan huquqlar.</small>
          </label>
          <label className="field">
            <span>Tavsif</span>
            <textarea rows={2} value={values.description} onChange={set('description')} maxLength={500} />
          </label>
        </div>
        {message && <div className="form-error">{message}</div>}
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AccessMatrix({ groups, draft, onToggle, onToggleRow, disabled }) {
  return (
    <div className="table-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th>Sahifa</th>
            <th className="center">Hammasi</th>
            {groups.actions.map((a) => <th key={a} className="center">{ACTION_LABEL[a]}</th>)}
          </tr>
        </thead>
        <tbody>
          {groups.pages.map((page) => {
            const all = page.accesses.length > 0 && page.accesses.every((a) => draft.has(a.id));
            return (
              <tr key={page.id}>
                <td><b>{page.name}</b> <span className="dim">{page.code}</span></td>
                <td className="center">
                  <input type="checkbox" checked={all} disabled={disabled || !page.accesses.length}
                    onChange={() => onToggleRow(page, !all)} aria-label={`${page.name}: hammasi`} />
                </td>
                {groups.actions.map((action) => {
                  const acc = page.accesses.find((a) => a.action === action);
                  return (
                    <td key={action} className="center">
                      {acc
                        ? <input type="checkbox" checked={draft.has(acc.id)} disabled={disabled}
                            onChange={() => onToggle(acc.id)} title={acc.code} aria-label={`${page.name}: ${ACTION_LABEL[action]}`} />
                        : <input type="checkbox" disabled aria-label="Bu amal mavjud emas" className="na" />}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RolesPage() {
  const { roleType } = useAuth();
  const notify = useToast();
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState({ actions: [], pages: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(new Set());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | role
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const allowedTypes = roleType === 'ADMIN' ? ['MANAGER', 'DIRECTOR', 'ADMIN'] : ['MANAGER'];
  const selected = roles.find((r) => r.id === selectedId) || null;
  const saved = useMemo(() => new Set(selected?.accessIds || []), [selected]);
  const dirty = Boolean(selected) && (draft.size !== saved.size || [...draft].some((id) => !saved.has(id)));

  const loadRoles = useCallback(async () => {
    const list = await api.roles.list();
    setRoles(list);
    return list;
  }, []);

  useEffect(() => {
    Promise.all([loadRoles(), api.accesses()])
      .then(([list, g]) => {
        setGroups(g);
        const first = list.find((r) => r.type === 'MANAGER') || list[0];
        if (first) setSelectedId(first.id);
      })
      .catch((e) => setError(e.message));
  }, [loadRoles]);

  useEffect(() => { setDraft(new Set(saved)); }, [saved]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const select = (id) => {
    if (id === selectedId) return;
    if (dirty && !window.confirm(UNSAVED)) return;
    setSelectedId(id);
  };

  const toggle = (id) => setDraft((d) => {
    const n = new Set(d);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const toggleRow = (page, on) => setDraft((d) => {
    const n = new Set(d);
    page.accesses.forEach((a) => (on ? n.add(a.id) : n.delete(a.id)));
    return n;
  });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.roles.setAccesses(selected.id, [...draft]);
      setRoles((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      notify(`"${updated.name}" huquqlari saqlandi`);
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  const onRoleSaved = async (role) => {
    setEditing(null);
    await loadRoles();
    setSelectedId(role.id);
    notify(`"${role.name}" saqlandi`);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.roles.remove(deleting.id);
      notify(`"${deleting.name}" o‘chirildi`);
      const list = await loadRoles();
      setSelectedId(list[0]?.id || null);
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <h1>Rollar va huquqlar</h1>
        <div className="toolbar">
          <button className="btn primary" onClick={() => (!dirty || window.confirm(UNSAVED)) && setEditing('new')}>+ Role qo‘shish</button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}

      <div className="roles-layout">
        <section className="card role-list">
          {roles.map((r) => (
            <button key={r.id} className={`role-item ${r.id === selectedId ? 'is-active' : ''}`} onClick={() => select(r.id)}>
              <span className="role-name">{r.name}</span>
              <span className="dim">{TYPE_LABEL[r.type]} · {r.usersCount} xodim</span>
            </button>
          ))}
        </section>

        <section className="card role-detail">
          {!selected && <div className="state">Role tanlang</div>}
          {selected && (
            <>
              <div className="role-head">
                <div>
                  <h2>{selected.name}</h2>
                  <div className="dim">{TYPE_LABEL[selected.type]}{selected.description ? ` — ${selected.description}` : ''}</div>
                </div>
                {selected.manageable && (
                  <div className="toolbar">
                    <button className="btn ghost small" onClick={() => setEditing(selected)}>Tahrirlash</button>
                    {!selected.isOwn && (
                      <button className="btn ghost small danger-text" onClick={() => setDeleting(selected)}>O‘chirish</button>
                    )}
                  </div>
                )}
              </div>

              {selected.fullAccess ? (
                <div className="full-access">
                  <b>To‘liq huquq</b>
                  <p className="dim">Bu turdagi role barcha bo‘limlar va amallarga kiradi — alohida huquq belgilanmaydi.</p>
                </div>
              ) : (
                <>
                  <AccessMatrix groups={groups} draft={draft} onToggle={toggle} onToggleRow={toggleRow} disabled={!selected.manageable || saving} />
                  {selected.manageable && (
                    <div className="matrix-foot">
                      {dirty && <span className="warn-text">Saqlanmagan o‘zgarishlar bor</span>}
                      <button className="btn ghost" disabled={!dirty || saving} onClick={() => setDraft(new Set(saved))}>Bekor qilish</button>
                      <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>

      {editing && (
        <RoleForm key={editing === 'new' ? 'new' : editing.id} role={editing === 'new' ? null : editing}
          allowedTypes={editing !== 'new' && !allowedTypes.includes(editing.type) ? [editing.type] : allowedTypes}
          onClose={() => setEditing(null)} onSaved={onRoleSaved} />
      )}
      {deleting && (
        <ConfirmDialog
          text={`"${deleting.name}" role'ini o'chirasizmi? Unda xodim bo'lsa, o'chirilmaydi.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </>
  );
}
