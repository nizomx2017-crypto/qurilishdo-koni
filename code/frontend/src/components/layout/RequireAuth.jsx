// Himoyalangan sahifa: login qilmagan bo'lsa — /kirish ga, admin bo'lmasa — bosh sahifaga.
// Bu faqat qulaylik uchun: haqiqiy ruxsat tekshiruvi backendda bajariladi.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ admin = false, children }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="state">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/kirish" replace state={{ from: location.pathname }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
