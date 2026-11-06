// Chap menyu: jadvallar guruhlarga bo'lib ko'rsatiladi (Katalog, Ombor, Savdo, ...)
const ICONS = {
  products: '📦', categories: '🗂️', inventory_movements: '🔄', suppliers: '🚚',
  sales: '🧾', sale_items: '📋', customers: '👷', payments: '💳', debts: '📒',
  users: '👤', roles: '🛡️', settings: '⚙️',
};

export default function Sidebar({ resources, active, onSelect, open, onClose }) {
  const groups = resources.reduce((acc, r) => {
    (acc[r.group] = acc[r.group] || []).push(r);
    return acc;
  }, {});

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">Q</div>
        <div>
          <div className="brand-name">Qurilishdo'koni</div>
          <div className="brand-sub">Boshqaruv paneli</div>
        </div>
      </div>

      <nav>
        {Object.entries(groups).map(([group, items]) => (
          <div className="nav-group" key={group}>
            <div className="nav-title">{group}</div>
            {items.map((r) => (
              <button
                key={r.key}
                className={`nav-item ${active === r.key ? 'is-active' : ''}`}
                onClick={() => { onSelect(r.key); onClose(); }}
              >
                <span className="nav-icon" aria-hidden>{ICONS[r.key] || '•'}</span>
                {r.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
