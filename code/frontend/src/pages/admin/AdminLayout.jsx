// Admin bo'limi: yuqorida bo'limlar tablari, pastda tanlangan sahifa
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin">
      <div className="admin-head">
        <div className="crumb">Admin panel</div>
        <nav className="tabs">
          <NavLink to="buyurtmalar">Buyurtmalar</NavLink>
          <NavLink to="mahsulotlar">Mahsulotlar</NavLink>
          <NavLink to="kategoriyalar">Kategoriyalar</NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
