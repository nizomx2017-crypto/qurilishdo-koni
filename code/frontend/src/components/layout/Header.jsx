// Ochiq qism sarlavhasi: logotip, katalog, savatcha soni, "Kirish" (xodimlar uchun) yoki "Panelga o'tish".
// Mobil ekranda ☰ orqali ochiladi. Mijoz uchun akkaunt yo'q.
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Header() {
  const { user } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">Q</span>
          <span>
            <span className="brand-name">Qurilishdo‘koni</span>
            <span className="brand-sub">qurilish materiallari</span>
          </span>
        </Link>

        <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menyu" aria-expanded={open}>
          ☰
        </button>

        <nav className={`nav ${open ? 'is-open' : ''}`}>
          <NavLink to="/" end>Katalog</NavLink>
          <NavLink to="/savatcha">
            Savatcha {count > 0 && <span className="pill">{count}</span>}
          </NavLink>
          <span className="nav-sep" />
          {user
            ? <Link to="/panel" className="btn primary small">Panelga o‘tish</Link>
            : <Link to="/panel/login" className="btn ghost small">Kirish</Link>}
        </nav>
      </div>
    </header>
  );
}
