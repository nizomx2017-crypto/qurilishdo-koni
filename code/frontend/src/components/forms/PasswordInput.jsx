// Parol maydoni + "ko'rsatish/yashirish" tugmasi
import { useState } from 'react';

export default function PasswordInput({ value, onChange, autoComplete = 'current-password', ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoCapitalize="off"
        spellCheck={false}
        {...rest}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        title={visible ? 'Yashirish' : 'Ko‘rsatish'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}

/** Parol talablari ro'yxati (jonli) */
export function PasswordChecklist({ checks }) {
  return (
    <ul className="pw-checks" aria-live="polite">
      {checks.map((c) => (
        <li key={c.text} className={c.ok ? 'ok' : ''}>{c.ok ? '✓' : '•'} {c.text}</li>
      ))}
    </ul>
  );
}
