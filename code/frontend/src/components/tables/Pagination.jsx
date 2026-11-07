// Sahifalash: oldingi / raqamlar / keyingi + (onLimit berilsa) sahifadagi qatorlar soni
function pageList(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…' + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);

  return (
    <div className="pagination">
      <div className="pg-info">
        {from}–{to} / jami <b>{total}</b>
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} aria-label="Sahifadagi qatorlar">
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} ta</option>)}
          </select>
        )}
      </div>
      <div className="pg-buttons">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Oldingi</button>
        {pageList(page, pages).map((p) =>
          typeof p === 'string'
            ? <span key={p} className="pg-gap">…</span>
            : <button key={p} className={p === page ? 'is-current' : ''} onClick={() => onPage(p)}>{p}</button>
        )}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Keyingi ›</button>
      </div>
    </div>
  );
}
