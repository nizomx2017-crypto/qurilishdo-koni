/**
 * Captcha: rasm + "yangilash" + javob maydoni.
 * SVG <img src="data:..."> orqali ko'rsatiladi — HTML sifatida DOM'ga qo'yilmaydi (XSS xavfi yo'q).
 * Captcha 2 daqiqa amal qiladi, shuning uchun javob yozilmagan bo'lsa o'zi yangilanadi.
 * reloadKey o'zgarsa — yangi rasm (masalan noto'g'ri javobdan keyin).
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

const AUTO_RELOAD_MS = 110 * 1000;

export default function Captcha({ value, onChange, reloadKey = 0, error }) {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    api.captcha()
      .then((c) => {
        if (cancelled) return;
        setSvg(c.svg);
        onChange({ captchaId: c.captchaId, captchaAnswer: '' });
      })
      .catch((e) => { if (!cancelled) setLoadError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // onChange ataylab kirmaydi: har renderda yangi rasm so'ralmasin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, tick]);

  useEffect(() => {
    if (value.captchaAnswer) return undefined;
    const t = setTimeout(reload, AUTO_RELOAD_MS);
    return () => clearTimeout(t);
  }, [value.captchaId, value.captchaAnswer, reload]);

  return (
    <div className={`field captcha ${error ? 'has-error' : ''}`}>
      <span>Rasmdagi belgilar<i className="req">*</i></span>
      <div className="captcha-row">
        {svg
          ? <img className="captcha-img" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Tekshiruv rasmi" />
          : <div className="captcha-img placeholder">{loading ? '…' : ''}</div>}
        <button type="button" className="icon-btn" onClick={reload} disabled={loading} title="Yangi rasm" aria-label="Yangi rasm">↻</button>
      </div>
      <input
        value={value.captchaAnswer}
        onChange={(e) => onChange({ ...value, captchaAnswer: e.target.value.slice(0, 20) })}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Belgilarni kiriting"
        aria-label="Rasmdagi belgilar"
        required
      />
      {(error || loadError) && <small>{error || loadError}</small>}
    </div>
  );
}
