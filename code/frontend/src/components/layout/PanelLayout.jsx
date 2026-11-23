/**
 * Xodimlar paneli: chapda menyu (faqat VIEW huquqi bor bo'limlar), yuqorida xodim ismi, role,
 * "Saytga qaytish" va "Chiqish".
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PANEL_MENU = [
  { to: 'buyurtmalar', label: 'Buyurtmalar', access: 'ORDER_VIEW' },
  { to: 'mahsulotlar', label: 'Mahsulotlar', access: 'PRODUCT_VIEW' },
  { to: 'kategoriyalar', label: 'Kategoriyalar', access: 'CATEGORY_VIEW' },
  { to: 'users', label: 'Xodimlar', roleTypes: ['ADMIN', 'DIRECTOR'] },
  { to: 'roles', label: 'Rollar va huquqlar', roleTypes: ['ADMIN', 'DIRECTOR'] },
  { to: 'login-attempts', label: 'Kirish urinishlari', roleTypes: ['ADMIN'] },
];

export function visibleMenu(auth) {
  return PANEL_MENU.filter((m) => (!m.access || auth.hasAccess(m.access))
    && (!m.roleTypes || auth.hasRoleType(...m.roleTypes)));
}

const ROLE_TYPE_LABEL = { ADMIN: 'Administrator', DIRECTOR: 'Direktor', MANAGER: 'Menejer' };

export default function PanelLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menu = visibleMenu(auth);

  useEffect(() => setOpen(false), [location.pathname]);

  const onLogout = async () => {
    await auth.logout();
    navigate('/panel/login', { replace: true });
  };

  return (
    <div className="panel">
      <aside className={`panel-side ${open ? 'is-open' : ''}`}>
        <Link to="/panel" className="brand">
          <span className="brand-mark">Q</span>
          <span>
            <span className="brand-name">Qurilishdo‘koni</span>
            <span className="brand-sub">xodimlar paneli</span>
          </span>
        </Link>
        <nav className="panel-nav">
          {menu.map((m) => <NavLink key={m.to} to={m.to}>{m.label}</NavLink>)}
          {!menu.length && <span className="dim">Sizga hali bo‘lim ochilmagan</span>}
        </nav>
      </aside>

      <div className="panel-main">
        <header className="panel-top">
          <button className="icon-btn panel-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menyu" aria-expanded={open}>☰</button>
          <div className="panel-user">
            <b>{auth.user.fullName}</b>
            <span className="dim">{auth.user.role.name} · {ROLE_TYPE_LABEL[auth.user.role.type]}</span>
          </div>
          <Link to="/" className="btn ghost small">Saytga qaytish</Link>
          <button className="btn ghost small" onClick={onLogout}>Chiqish</button>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
