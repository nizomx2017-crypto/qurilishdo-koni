// Mahsulot rasmi. Rasm bo'lmasa yoki yuklanmasa — nomning bosh harfi bilan joy egallovchi.
import { useState } from 'react';

export default function ProductImage({ product, large = false }) {
  const [failed, setFailed] = useState(false);
  const cls = `product-img ${large ? 'large' : ''}`;
  if (product.image_url && !failed) {
    return <img className={cls} src={product.image_url} alt={product.name} loading="lazy" onError={() => setFailed(true)} />;
  }
  return <div className={`${cls} placeholder`} aria-hidden="true">{product.name.slice(0, 1)}</div>;
}
