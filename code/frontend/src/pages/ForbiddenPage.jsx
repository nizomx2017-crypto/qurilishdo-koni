import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="state">
      <h1>403 — Ruxsat yo‘q</h1>
      <p>Bu bo‘lim uchun sizda huquq yo‘q. Kerak bo‘lsa direktor yoki administratorga murojaat qiling.</p>
      <Link to="/panel" className="btn primary">Panel bosh sahifasi</Link>
    </div>
  );
}
