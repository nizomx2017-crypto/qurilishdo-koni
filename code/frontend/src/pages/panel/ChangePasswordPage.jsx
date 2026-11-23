/**
 * Parolni o'zgartirish (har bir xodim uchun). Vaqtinchalik parol bilan kirilganda majburiy:
 * panelning boshqa sahifalari shu sahifaga qaytaradi. Talablar jonli ko'rsatiladi; haqiqiy tekshiruv serverda.
 * Muvaffaqiyatda boshqa barcha qurilmalardagi sessiyalar yopiladi, joriy sessiya yangi tokenlar bilan davom etadi.
 */
import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthCard, Field } from '../../components/forms/AuthForm';
import PasswordInput, { PasswordChecklist } from '../../components/forms/PasswordInput';
import { passwordChecks } from '../../utils/password';

export default function ChangePasswordPage() {
  const { user, isLoading, mustChangePassword, changePassword, logout } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  if (isLoading) return <div className="state">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/panel/login" replace state={{ from: '/panel/change-password' }} />;

  const checks = passwordChecks(form.newPassword, user.username, { current: form.currentPassword, confirm: form.confirm });
  const valid = form.currentPassword && checks.every((c) => c.ok);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    if (sending.current || !valid) return;
    sending.current = true;
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      notify('Parol o‘zgartirildi. Boshqa qurilmalardagi sessiyalar yopildi');
      navigate(from && from.startsWith('/panel') && from !== '/panel/change-password' ? from : '/panel', { replace: true });
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Parolni o‘zgartirish"
      footer={mustChangePassword
        ? <button type="button" className="link-btn" onClick={() => logout().then(() => navigate('/panel/login'))}>Chiqish</button>
        : <Link to="/panel">← Panelga qaytish</Link>}
    >
      {mustChangePassword && (
        <div className="alert warn">Siz vaqtinchalik parol bilan kirdingiz. Davom etish uchun o‘z parolingizni o‘rnating.</div>
      )}
      <form onSubmit={submit} className="stack">
        <input type="text" autoComplete="username" value={user.username} readOnly hidden />
        <Field label={mustChangePassword ? 'Vaqtinchalik (joriy) parol' : 'Joriy parol'} error={errors.currentPassword} required>
          <PasswordInput value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" maxLength={128} required />
        </Field>
        <Field label="Yangi parol" error={errors.newPassword} required>
          <PasswordInput value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" maxLength={128} required />
        </Field>
        <Field label="Yangi parolni takrorlang" required>
          <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" maxLength={128} required />
        </Field>
        <PasswordChecklist checks={checks} />
        {message && <div className="form-error">{message}</div>}
        <button className="btn primary block" disabled={busy || !valid}>{busy ? 'Saqlanmoqda…' : 'Parolni saqlash'}</button>
      </form>
    </AuthCard>
  );
}
