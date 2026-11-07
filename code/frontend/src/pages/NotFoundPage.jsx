import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="state">
      <h1>Sahifa topilmadi</h1>
      <p>Bunday manzil mavjud emas.</p>
      <Link to="/" className="btn primary">Bosh sahifaga</Link>
    </div>
  );
}
