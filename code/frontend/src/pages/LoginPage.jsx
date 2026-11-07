import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthCard, Field } from '../components/forms/AuthForm';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;
  if (user) return <Navigate to={from || (user.role === 'admin' ? '/admin' : '/')} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      const u = await login(form);
      navigate(from || (u.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Tizimga kirish"
      footer={<>Hisobingiz yo‘qmi? <Link to="/royxatdan-otish" state={{ from }}>Ro‘yxatdan o‘ting</Link></>}
    >
      <form onSubmit={submit} className="stack">
        <Field label="Email" error={errors.email} required>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Parol" error={errors.password} required>
          <input type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
        </Field>
        {message && <div className="form-error">{message}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
      </form>
    </AuthCard>
  );
}
