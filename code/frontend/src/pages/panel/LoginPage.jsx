/**
 * Xodimlar paneliga kirish: login + kod (XXXX-XXXX).
 *  - bir necha xatodan keyin server captcha talab qiladi (CAPTCHA_REQUIRED) — rasm shu yerda chiqadi;
 *  - akkaunt qulflangan bo'lsa qolgan vaqt ko'rsatiladi;
 *  - yuborish davomida tugma o'chiq (ikki marta yuborilmaydi).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthCard, Field } from '../../components/forms/AuthForm';
import Captcha from '../../components/forms/Captcha';

const CODE_ALPHABET = /[ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

/** Kiritilgan matnni XXXX-XXXX ko'rinishiga keltiradi (faqat ruxsat etilgan belgilar) */
function maskCode(raw) {
  const chars = (String(raw).toUpperCase().match(CODE_ALPHABET) || []).join('').slice(0, 8);
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars;
}

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
  const [form, setForm] = useState({ login: '', code: '' });
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

  if (user) return <Navigate to={from && from.startsWith('/panel') ? from : '/panel'} replace />;

  async function submit(e) {
    e.preventDefault();
    if (sending.current || lockedFor > 0) return;
    sending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await login({ login: form.login.trim(), code: form.code, ...(needCaptcha ? captcha : {}) });
      navigate(from && from.startsWith('/panel') ? from : '/panel', { replace: true });
    } catch (err) {
      setMessage(err.message);
      if (err.code === 'CAPTCHA_REQUIRED' || err.code === 'CAPTCHA_INVALID') setNeedCaptcha(true);
      // Captcha bir martalik: yuborilgan bo'lsa (yoki endi kerak bo'lsa) — yangi rasm
      if (needCaptcha || err.code === 'CAPTCHA_REQUIRED' || err.code === 'CAPTCHA_INVALID') setCaptchaKey((k) => k + 1);
      if (err.code === 'ACCOUNT_LOCKED') setLockedFor(Number(err.retryAfterSeconds) || 60);
      if (err.code === 'INVALID_CREDENTIALS') setForm((f) => ({ ...f, code: '' }));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Xodimlar paneli" footer={<Link to="/">← Saytga qaytish</Link>}>
      <form onSubmit={submit} className="stack">
        <Field label="Login" required>
          <input
            value={form.login}
            onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={50}
            required
            autoFocus
          />
        </Field>
        <Field label="Kod" required>
          <input
            className="code-input"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: maskCode(e.target.value) }))}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            inputMode="text"
            pattern="[A-Z0-9]{4}-[A-Z0-9]{4}"
            title="8 belgi: XXXX-XXXX"
            required
          />
        </Field>
        {needCaptcha && <Captcha value={captcha} onChange={setCaptcha} reloadKey={captchaKey} />}
        {lockedFor > 0 && (
          <div className="alert warn">Akkaunt vaqtincha bloklangan. Qayta urinish: {formatWait(lockedFor)}</div>
        )}
        {message && lockedFor <= 0 && <div className="form-error">{message}</div>}
        <button className="btn primary block" disabled={busy || lockedFor > 0}>{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
        <p className="dim small-text">Login va kodni administrator yoki direktor beradi. Kodni hech kimga aytmang.</p>
      </form>
    </AuthCard>
  );
}
