import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatMoney, formatNumber } from '../utils/format';
import ProductImage from '../components/shop/ProductImage';
import useAddToCart from '../components/shop/useAddToCart';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { addToCart, busyId } = useAddToCart();

  useEffect(() => {
    setProduct(null);
    setError('');
    api.product(id).then(setProduct).catch((e) => setError(e.status === 404 ? 'Mahsulot topilmadi yoki sotuvda emas' : e.message));
  }, [id]);

  if (error) return <div className="state"><p>{error}</p><Link to="/" className="btn ghost">Katalogga qaytish</Link></div>;
  if (!product) return <div className="state">Yuklanmoqda…</div>;

  const out = product.stock_quantity <= 0;
  const max = Math.max(1, product.stock_quantity);

  return (
    <div className="product-page">
      <Link to="/" className="back">‹ Katalog</Link>
      <div className="product-detail card">
        <ProductImage product={product} large />
        <div className="product-info">
          <div className="product-cat">{product.category_id__label}</div>
          <h1>{product.name}</h1>
          {product.sku && <div className="dim">Kod: {product.sku}</div>}
          <div className="price big">{formatMoney(product.price)} <span className="dim">/ {product.unit}</span></div>
          <div className={`stock ${out ? 'out' : ''}`}>
            {out ? 'Hozircha tugagan' : `Omborda: ${formatNumber(product.stock_quantity)} ${product.unit}`}
          </div>
          {product.description && <p className="description">{product.description}</p>}

          {!out && (
            <div className="buy-row">
              <input
                type="number"
                min={1}
                max={max}
                value={qty}
                onChange={(e) => setQty(Math.min(max, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
                aria-label="Miqdor"
                className="qty-input"
              />
              <button className="btn primary" disabled={busyId === product.id} onClick={() => addToCart(product, qty)}>
                Savatchaga qo‘shish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
