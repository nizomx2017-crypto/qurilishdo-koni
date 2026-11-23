import { Link } from 'react-router-dom';
import { formatMoney, formatNumber } from '../../utils/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product, onAdd, busy }) {
  const out = product.stock_quantity <= 0;
  return (
    <article className="product-card">
      <Link to={`/mahsulot/${product.id}`} className="product-link">
        <ProductImage product={product} />
        <div className="product-cat">{product.category_id__label}</div>
        <h3 className="product-name">{product.name}</h3>
      </Link>
      <div className="product-foot">
        <div>
          <div className="price">{formatMoney(product.price)}</div>
          <div className={`stock ${out ? 'out' : ''}`}>
            {out ? 'Tugagan' : `Mavjud: ${formatNumber(product.stock_quantity)} ${product.unit}`}
          </div>
        </div>
        <button className="btn primary small" disabled={out || busy} onClick={() => onAdd(product)}>
          {busy ? '…' : 'Savatchaga'}
        </button>
      </div>
    </article>
  );
}
