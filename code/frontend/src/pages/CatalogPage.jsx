// Katalog: kategoriyalar, nom bo'yicha qidiruv, tartiblash va sahifalash.
// Filtrlar URL'da saqlanadi (?q=&kategoriya=&tartib=&sahifa=), shuning uchun havolani ulashish mumkin.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/shop/ProductCard';
import useAddToCart from '../components/shop/useAddToCart';
import Pagination from '../components/tables/Pagination';

const SORTS = {
  yangi: { sort: 'id', order: 'desc', label: 'Avval yangilari' },
  arzon: { sort: 'price', order: 'asc', label: 'Avval arzonlari' },
  qimmat: { sort: 'price', order: 'desc', label: 'Avval qimmatlari' },
  nom: { sort: 'name', order: 'asc', label: 'Nomi bo‘yicha' },
};
const LIMIT = 12;

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('kategoriya') || '';
  const sortKey = SORTS[params.get('tartib')] ? params.get('tartib') : 'yangi';
  const page = Math.max(1, Number(params.get('sahifa')) || 1);

  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(q);
  const { addToCart, busyId } = useAddToCart();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('sahifa' in changes)) next.delete('sahifa');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => { setSearchText(q); }, [q]);

  // Qidiruv: yozish to'xtagach 350 ms kutib URL yangilanadi
  useEffect(() => {
    if (searchText === q) return undefined;
    const t = setTimeout(() => update({ q: searchText.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const { sort, order } = SORTS[sortKey];
    api.products({ search: q, category_id: category, sort, order, page, limit: LIMIT })
      .then((res) => { if (!cancelled) setResult(res); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, category, sortKey, page]);

  const activeCategory = categories.find((c) => String(c.id) === category);

  return (
    <div className="catalog">
      <aside className="filters">
        <h2 className="filters-title">Kategoriyalar</h2>
        <div className="chips">
          <button className={`chip ${!category ? 'is-active' : ''}`} onClick={() => update({ kategoriya: '' })}>
            Barchasi
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${String(c.id) === category ? 'is-active' : ''}`}
              onClick={() => update({ kategoriya: String(c.id) })}
            >
              {c.name} <span className="chip-count">{c.product_count}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="catalog-main">
        <div className="catalog-bar">
          <h1>{activeCategory ? activeCategory.name : 'Katalog'}</h1>
          <div className="catalog-tools">
            <input
              className="search"
              type="search"
              placeholder="Mahsulot nomi bo‘yicha qidirish…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Qidiruv"
            />
            <select value={sortKey} onChange={(e) => update({ tartib: e.target.value === 'yangi' ? '' : e.target.value })} aria-label="Tartiblash">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {!error && !loading && !result.data.length && (
          <div className="state">Hech narsa topilmadi. Qidiruv so‘zini yoki kategoriyani o‘zgartirib ko‘ring.</div>
        )}

        <div className={`grid ${loading ? 'is-loading' : ''}`}>
          {result.data.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} busy={busyId === p.id} />
          ))}
        </div>

        {result.pages > 1 && (
          <Pagination
            page={page}
            pages={result.pages}
            total={result.total}
            limit={LIMIT}
            onPage={(p) => { update({ sahifa: p > 1 ? String(p) : '' }); window.scrollTo(0, 0); }}
          />
        )}
      </section>
    </div>
  );
}
