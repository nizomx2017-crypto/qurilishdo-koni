// Yuqori menyu: logotip, bo'limlar, savatcha soni, kirish/chiqish. Mobil ekranda ☰ orqali ochiladi.
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const onLogout = () => {
    logout();
    navigate('/');
  };

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
          {user && (
            <>
              <NavLink to="/savatcha">
                Savatcha {cart.count > 0 && <span className="pill">{cart.count}</span>}
              </NavLink>
              <NavLink to="/buyurtmalarim">Buyurtmalarim</NavLink>
            </>
          )}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          <span className="nav-sep" />
          {user ? (
            <>
              <span className="nav-user" title={user.email}>{user.full_name}</span>
              <button className="btn ghost small" onClick={onLogout}>Chiqish</button>
            </>
          ) : (
            <>
              <NavLink to="/kirish">Kirish</NavLink>
              <Link to="/royxatdan-otish" className="btn primary small">Ro‘yxatdan o‘tish</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
