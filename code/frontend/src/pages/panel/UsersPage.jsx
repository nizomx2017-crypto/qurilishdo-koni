/**
 * Xodimlar (ADMIN, DIRECTOR): ro'yxat, qidiruv, yaratish, tahrirlash, bloklash/faollashtirish, parolni tiklash.
 *  - yaratishda vaqtinchalik parol kiritiladi yoki "Generatsiya" (12 belgi); xodim birinchi kirishda uni almashtiradi;
 *  - vaqtinchalik parol saqlangandan keyin modal oynada BIR MARTA ko'rsatiladi ("Nusxa olish" bilan);
 *  - DIRECTOR role tanlovida faqat MANAGER rollari (server "manageable" ni o'zi hisoblaydi va har amalda tekshiradi).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import { generatePassword, passwordChecks } from '../../utils/password';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import TempPasswordModal from '../../components/modals/TempPasswordModal';
import PasswordInput, { PasswordChecklist } from '../../components/forms/PasswordInput';
import Pagination from '../../components/tables/Pagination';

const TYPE_LABEL = { ADMIN: 'Administrator', DIRECTOR: 'Direktor', MANAGER: 'Menejer' };
const TYPE_TONE = { ADMIN: 'bad', DIRECTOR: 'warn', MANAGER: 'info' };
const USERNAME_PATTERN = '[a-zA-Z0-9_.]{3,32}';

function UserForm({ user, roles, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const choices = roles.filter((r) => r.manageable);
  const [values, setValues] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    roleId: String(user?.role.id || choices.find((r) => r.type === 'MANAGER')?.id || ''),
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const checks = passwordChecks(values.password, values.username.trim().toLowerCase());
  const passwordOk = isEdit || checks.every((c) => c.ok);

  async function submit(e) {
    e.preventDefault();
    if (saving || !passwordOk) return;
    setSaving(true);
    setMessage('');
    setErrors({});
    const payload = { fullName: values.fullName, username: values.username.trim().toLowerCase(), roleId: Number(values.roleId) };
    if (isEdit && user.isSelf) delete payload.roleId;
    if (!isEdit) payload.password = values.password;
    try {
      if (isEdit) {
        onSaved({ user: await api.users.update(user.id, payload) }, true);
      } else {
        const res = await api.users.create(payload);
        onSaved({ user: res.user, temporaryPassword: res.temporaryPassword || values.password }, false);
      }
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? `Xodim: ${user.fullName}` : 'Yangi xodim'} onClose={onClose} width={500}>
      <form onSubmit={submit}>
        <div className="modal-body stack">
          <label className={`field ${errors.fullName ? 'has-error' : ''}`}>
            <span>F.I.Sh.<i className="req">*</i></span>
            <input value={values.fullName} onChange={set('fullName')} required minLength={2} maxLength={150} />
            {errors.fullName && <small>{errors.fullName}</small>}
          </label>
          <label className={`field ${errors.username ? 'has-error' : ''}`}>
            <span>Username<i className="req">*</i></span>
            <input value={values.username} onChange={set('username')} required pattern={USERNAME_PATTERN}
              title="3–32 belgi: a-z, 0-9, _ va ." autoCapitalize="off" spellCheck={false} autoComplete="off" />
            <small className="dim">3–32 belgi: a-z, 0-9, _ va . (katta harflar kichikka o‘tkaziladi)</small>
            {errors.username && <small>{errors.username}</small>}
          </label>
          <label className={`field ${errors.roleId ? 'has-error' : ''}`}>
            <span>Role<i className="req">*</i></span>
            <select value={values.roleId} onChange={set('roleId')} required disabled={isEdit && user.isSelf}>
              <option value="">— tanlang —</option>
              {(isEdit && user.isSelf ? roles.filter((r) => r.id === user.role.id) : choices).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({TYPE_LABEL[r.type]})</option>
              ))}
            </select>
            {isEdit && user.isSelf && <small className="dim">O‘z role‘ingizni o‘zgartira olmaysiz</small>}
            {errors.roleId && <small>{errors.roleId}</small>}
          </label>
          {!isEdit && (
            <div className={`field ${errors.password ? 'has-error' : ''}`}>
              <span>Vaqtinchalik parol<i className="req">*</i></span>
              <div className="row-gap">
                <PasswordInput value={values.password} onChange={set('password')} autoComplete="new-password" maxLength={128} required />
                <button type="button" className="btn ghost small"
                  onClick={() => setValues((v) => ({ ...v, password: generatePassword() }))}>Generatsiya</button>
              </div>
              <PasswordChecklist checks={checks} />
              <small className="dim">Xodim birinchi kirishda o‘z parolini o‘rnatadi.</small>
              {errors.password && <small>{errors.password}</small>}
            </div>
          )}
        </div>
        {message && <div className="form-error">{message}</div>}
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
          <button type="submit" className="btn primary" disabled={saving || !passwordOk}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        </div>
      </form>
    </Modal>
  );
}

function statusBadge(u) {
  if (!u.isActive) return <span className="badge tone-muted">Bloklangan</span>;
  if (u.lockedUntil) return <span className="badge tone-warn" title={`${formatDate(u.lockedUntil)} gacha`}>Qulflangan</span>;
  if (u.mustChangePassword) return <span className="badge tone-info" title="Vaqtinchalik parol — birinchi kirishda almashtiradi">Faol · vaqtinchalik parol</span>;
  return <span className="badge tone-ok">Faol</span>;
}

export default function UsersPage() {
  const notify = useToast();
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', isActive: '' });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // null | 'new' | user
  const [confirm, setConfirm] = useState(null);   // { kind: 'status' | 'reset', user }
  const [shown, setShown] = useState(null);       // { user, password } — bir marta
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await api.users.list(query));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.roles.list().then(setRoles).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === searchText ? q : { ...q, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const onSaved = ({ user, temporaryPassword }, isEdit) => {
    setEditing(null);
    if (isEdit) notify(`${user.fullName} saqlandi`);
    else setShown({ user, password: temporaryPassword });
    load();
  };

  const runConfirm = async () => {
    const { kind, user } = confirm;
    setBusy(true);
    try {
      if (kind === 'status') {
        await api.users.setStatus(user.id, !user.isActive);
        notify(user.isActive ? `${user.fullName} bloklandi` : `${user.fullName} faollashtirildi`);
      } else {
        const res = await api.users.resetPassword(user.id);
        setShown({ user: res.user, password: res.temporaryPassword });
      }
      load();
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <h1>Xodimlar</h1>
        <div className="toolbar">
          <input className="search" type="search" placeholder="Ism yoki username…" value={searchText}
            onChange={(e) => setSearchText(e.target.value)} aria-label="Qidiruv" />
          <select value={query.isActive} onChange={(e) => setQuery((q) => ({ ...q, isActive: e.target.value, page: 1 }))} aria-label="Holat">
            <option value="">Barchasi</option>
            <option value="true">Faol</option>
            <option value="false">Bloklangan</option>
          </select>
          <button className="btn primary" onClick={() => setEditing('new')} disabled={!roles.some((r) => r.manageable)}>+ Xodim qo‘shish</button>
        </div>
      </div>

      <section className="card">
        {error && <div className="alert">{error}</div>}
        <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
          <table>
            <thead>
              <tr><th>F.I.Sh.</th><th>Username</th><th>Role</th><th>Holat</th><th>Yaratgan</th><th>Yaratilgan</th><th className="right actions-col">Amallar</th></tr>
            </thead>
            <tbody>
              {result.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}{u.isSelf && <span className="dim"> (siz)</span>}</td>
                  <td><code>{u.username}</code></td>
                  <td><span className={`badge tone-${TYPE_TONE[u.role.type]}`}>{u.role.name}</span></td>
                  <td>{statusBadge(u)}</td>
                  <td className="dim">{u.createdBy || '—'}</td>
                  <td className="dim">{formatDate(u.createdAt)}</td>
                  <td className="right actions">
                    {u.manageable && <button className="btn ghost small" onClick={() => setEditing(u)}>Tahrirlash</button>}
                    {u.manageable && !u.isSelf && (
                      <button className={`btn small ${u.isActive ? 'ghost danger-text' : 'primary'}`} onClick={() => setConfirm({ kind: 'status', user: u })}>
                        {u.isActive ? 'Bloklash' : 'Faollashtirish'}
                      </button>
                    )}
                    {u.manageable && !u.isSelf && (
                      <button className="btn ghost small" onClick={() => setConfirm({ kind: 'reset', user: u })}>Parolni tiklash</button>
                    )}
                    {u.isSelf && <Link className="btn ghost small" to="/panel/change-password">Parolni o‘zgartirish</Link>}
                  </td>
                </tr>
              ))}
              {!result.data.length && !loading && <tr><td colSpan={7} className="empty">Xodim topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={query.page} pages={result.pages} total={result.total} limit={query.limit}
          onPage={(page) => setQuery((q) => ({ ...q, page }))}
          onLimit={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))} />
      </section>

      {editing && (
        <UserForm key={editing === 'new' ? 'new' : editing.id} user={editing === 'new' ? null : editing}
          roles={roles} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'reset' ? 'Parolni tiklash' : (confirm.user.isActive ? 'Xodimni bloklash' : 'Xodimni faollashtirish')}
          confirmText={confirm.kind === 'reset' ? 'Ha, tiklash' : (confirm.user.isActive ? 'Ha, bloklash' : 'Ha, faollashtirish')}
          text={confirm.kind === 'reset'
            ? `${confirm.user.fullName} uchun yangi vaqtinchalik parol yaratiladi. Eski parol darhol ishlamay qoladi va barcha sessiyalari yopiladi.`
            : confirm.user.isActive
              ? `${confirm.user.fullName} panelga kira olmaydi, ochiq sessiyalari darhol yopiladi.`
              : `${confirm.user.fullName} yana panelga kira oladi (qulf ham olinadi).`}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}

      {shown && <TempPasswordModal user={shown.user} password={shown.password} onClose={() => setShown(null)} />}
    </>
  );
}
