// Login va ro'yxatdan o'tish formalari uchun umumiy ko'rinish
export function AuthCard({ title, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{title}</h1>
        {children}
        {footer && <div className="auth-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, required, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}{required && <i className="req">*</i>}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
