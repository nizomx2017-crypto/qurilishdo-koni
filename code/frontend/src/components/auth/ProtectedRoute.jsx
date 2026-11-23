// Panel sahifasi: login yo'q -> /panel/login, vaqtinchalik parol -> /panel/change-password,
// huquq yo'q -> 403 sahifasi.
// Bu faqat qulaylik uchun: haqiqiy ruxsat tekshiruvi backendda bajariladi.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForbiddenPage from '../../pages/ForbiddenPage';

export default function ProtectedRoute({ access, roleTypes, children }) {
  const { user, isLoading, hasAccess, hasRoleType, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="state">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/panel/login" replace state={{ from: location.pathname }} />;
  if (mustChangePassword) return <Navigate to="/panel/change-password" replace state={{ from: location.pathname }} />;
  if (access && !hasAccess(access)) return <ForbiddenPage />;
  if (roleTypes && !hasRoleType(...roleTypes)) return <ForbiddenPage />;
  return children ?? <Outlet />;
}
