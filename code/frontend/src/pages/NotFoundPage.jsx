import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const inPanel = useLocation().pathname.startsWith('/panel');
  return (
    <div className="state">
      <h1>404 — Sahifa topilmadi</h1>
      <p>Bunday manzil mavjud emas.</p>
      <Link to={inPanel ? '/panel' : '/'} className="btn primary">{inPanel ? 'Panel bosh sahifasi' : 'Bosh sahifaga'}</Link>
    </div>
  );
}
