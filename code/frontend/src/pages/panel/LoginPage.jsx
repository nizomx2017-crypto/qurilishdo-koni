/**
 * Xodimlar paneliga kirish: username + parol.
 *  - bir necha xatodan keyin server captcha talab qiladi (CAPTCHA_REQUIRED) — rasm shu yerda chiqadi;
 *  - akkaunt qulflangan bo'lsa qolgan vaqt ko'rsatiladi;
 *  - vaqtinchalik parol bilan kirilsa — darhol /panel/change-password;
 *  - yuborish davomida tugma o'chiq (ikki marta yuborilmaydi).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthCard, Field } from '../../components/forms/AuthForm';
import Captcha from '../../components/forms/Captcha';
import PasswordInput from '../../components/forms/PasswordInput';

function formatWait(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} daq ${String(s).padStart(2, '0')} son` : `${s} soniya`;
}

export default function PanelLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from && from.startsWith('/panel') && from !== '/panel/login' ? from : '/panel';
  const [form, setForm] = useState({ username: '', password: '' });
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState({ captchaId: '', captchaAnswer: '' });
  const [captchaKey, setCaptchaKey] = useState(0);
  const [message, setMessage] = useState('');
  const [lockedFor, setLockedFor] = useState(0);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (lockedFor <= 0) return undefined;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  if (user) {
    return <Navigate to={user.mustChangePassword ? '/panel/change-password' : target} replace state={{ from: target }} />;
  }

  async function submit(e) {
    e.preventDefault();
    if (sending.current || lockedFor > 0) return;
    sending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const u = await login({ username: form.username.trim(), password: form.password, ...(needCaptcha ? captcha : {}) });
      navigate(u.mustChangePassword ? '/panel/change-password' : target, { replace: true, state: { from: target } });
    } catch (err) {
      setMessage(err.message);
      if (err.code === 'CAPTCHA_REQUIRED' || err.code === 'CAPTCHA_INVALID') setNeedCaptcha(true);
      // Captcha bir martalik: yuborilgan bo'lsa (yoki endi kerak bo'lsa) — yangi rasm
      if (needCaptcha || err.code === 'CAPTCHA_REQUIRED' || err.code === 'CAPTCHA_INVALID') setCaptchaKey((k) => k + 1);
      if (err.code === 'ACCOUNT_LOCKED') setLockedFor(Number(err.retryAfterSeconds) || 60);
      if (err.code === 'INVALID_CREDENTIALS') setForm((f) => ({ ...f, password: '' }));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Xodimlar paneli" footer={<Link to="/">← Saytga qaytish</Link>}>
      <form onSubmit={submit} className="stack">
        <Field label="Username" required>
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={32}
            required
            autoFocus
          />
        </Field>
        <Field label="Parol" required>
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </Field>
        {needCaptcha && <Captcha value={captcha} onChange={setCaptcha} reloadKey={captchaKey} />}
        {lockedFor > 0 && (
          <div className="alert warn">Akkaunt vaqtincha bloklangan. Qayta urinish: {formatWait(lockedFor)}</div>
        )}
        {message && lockedFor <= 0 && <div className="form-error">{message}</div>}
        <button className="btn primary block" disabled={busy || lockedFor > 0}>{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
        <p className="dim small-text">Username va vaqtinchalik parolni administrator yoki direktor beradi. Parolingizni hech kimga aytmang.</p>
      </form>
    </AuthCard>
  );
}
