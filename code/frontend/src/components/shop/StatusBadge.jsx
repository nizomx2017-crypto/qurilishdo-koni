import { VALUE_LABELS, VALUE_TONE } from '../../utils/format';

export default function StatusBadge({ value }) {
  return <span className={`badge tone-${VALUE_TONE[value] || 'muted'}`}>{VALUE_LABELS[value] || value}</span>;
}
