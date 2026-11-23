// /panel — xodimga ochiq birinchi bo'limga yo'naltiradi
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visibleMenu } from '../../components/layout/PanelLayout';

export default function PanelHome() {
  const auth = useAuth();
  const first = visibleMenu(auth)[0];
  if (first) return <Navigate to={first.to} replace />;
  return (
    <div className="state">
      <h1>Xush kelibsiz, {auth.user.fullName}</h1>
      <p>Sizga hali hech qanday bo‘lim ochilmagan. Direktor yoki administratorga murojaat qiling.</p>
    </div>
  );
}
