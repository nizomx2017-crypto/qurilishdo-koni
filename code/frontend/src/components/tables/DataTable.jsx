// Asosiy jadval: ustunlar registry (meta) dan olinadi, sarlavha bosilsa tartiblanadi.
// onEdit / onDelete berilmasa (huquq yo'q) — tegishli tugma ko'rsatilmaydi.
import { VALUE_LABELS, VALUE_TONE, formatMoney, formatNumber, formatDate } from '../../utils/format';

function Cell({ col, row }) {
  const v = row[col.name];
  if (v === null || v === undefined || v === '') return <span className="dim">—</span>;
  switch (col.type) {
    case 'ref':
      return <span>{row[col.name + '__label'] ?? `#${v}`}</span>;
    case 'select':
      return <span className={`badge tone-${VALUE_TONE[v] || 'muted'}`}>{VALUE_LABELS[v] || v}</span>;
    case 'money':
      return <span className={`num ${Number(v) < 0 ? 'neg' : ''}`}>{formatMoney(v)}</span>;
    case 'number':
      return <span className="num">{formatNumber(v)}</span>;
    case 'datetime':
      return <span className="dim">{formatDate(v)}</span>;
    default:
      return <span className="clip" title={String(v)}>{String(v)}</span>;
  }
}

export default function DataTable({ columns, rows, sort, order, onSort, onEdit, onDelete, loading }) {
  const visible = columns.filter((c) => !c.hidden);
  const hasActions = Boolean(onEdit || onDelete);

  const header = (name, label, right) => (
    <th key={name} className={right ? 'right' : ''} onClick={() => onSort(name)}>
      {label}
      <span className="sort">{sort === name ? (order === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  );

  return (
    <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
      <table>
        <thead>
          <tr>
            {header('id', 'ID')}
            {visible.map((c) => header(c.name, c.label, c.type === 'money' || c.type === 'number'))}
            {hasActions && <th className="right actions-col">Amallar</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="dim">#{row.id}</td>
              {visible.map((c) => (
                <td key={c.name} className={c.type === 'money' || c.type === 'number' ? 'right' : ''}>
                  <Cell col={c} row={row} />
                </td>
              ))}
              {hasActions && (
                <td className="right actions">
                  {onEdit && <button className="icon-btn" title="Tahrirlash" onClick={() => onEdit(row)}>✏️</button>}
                  {onDelete && <button className="icon-btn danger" title="O'chirish" onClick={() => onDelete(row)}>🗑️</button>}
                </td>
              )}
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr>
              <td colSpan={visible.length + (hasActions ? 2 : 1)} className="empty">Ma'lumot topilmadi</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
