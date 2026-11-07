import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthCard, Field } from '../components/forms/AuthForm';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', password2: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || '/';
  if (user) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    if (form.password !== form.password2) {
      setErrors({ password2: 'Parollar mos kelmadi' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { password2, ...data } = form; // eslint-disable-line no-unused-vars
      await register(data);
      notify('Xush kelibsiz! Ro‘yxatdan o‘tdingiz');
      navigate(from, { replace: true });
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Ro‘yxatdan o‘tish" footer={<>Hisobingiz bormi? <Link to="/kirish" state={{ from }}>Kiring</Link></>}>
      <form onSubmit={submit} className="stack">
        <Field label="F.I.Sh." error={errors.full_name} required>
          <input autoComplete="name" value={form.full_name} onChange={set('full_name')} required minLength={2} />
        </Field>
        <Field label="Email" error={errors.email} required>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Telefon" error={errors.phone}>
          <input type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Parol (kamida 6 belgi)" error={errors.password} required>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={6} />
        </Field>
        <Field label="Parolni takrorlang" error={errors.password2} required>
          <input type="password" autoComplete="new-password" value={form.password2} onChange={set('password2')} required />
        </Field>
        {message && <div className="form-error">{message}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Ro‘yxatdan o‘tish'}</button>
      </form>
    </AuthCard>
  );
}
