/**
 * Qo'shish / tahrirlash formasi. Maydonlar meta'dan avtomatik quriladi:
 *   text/password -> input, textarea -> textarea, number/money -> number input,
 *   select -> tayyor qiymatlar, ref -> boshqa jadvaldan olingan ro'yxat
 */
import { useEffect, useState } from 'react';
import Modal from '../modals/Modal';
import { api } from '../../services/api';
import { VALUE_LABELS } from '../../utils/format';

// lockedFields — huquq yo'qligi uchun o'zgartirib bo'lmaydigan maydonlar (masalan arxivlash huquqisiz status)
export default function RecordForm({ resource, record, onClose, onSaved, lockedFields = [] }) {
  const isEdit = Boolean(record);
  const fields = resource.columns.filter((c) => !c.readonly);

  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach((c) => {
      const v = record ? record[c.name] : c.default;
      init[c.name] = v === null || v === undefined ? '' : String(v);
    });
    return init;
  });
  const [refOptions, setRefOptions] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // ref maydonlar uchun ro'yxatlarni yuklash (masalan: kategoriyalar, xaridorlar)
  useEffect(() => {
    const refs = [...new Set(fields.filter((c) => c.type === 'ref').map((c) => c.ref))];
    refs.forEach((ref) =>
      api.admin.options(ref)
        .then((opts) => setRefOptions((o) => ({ ...o, [ref]: opts })))
        .catch(() => setRefOptions((o) => ({ ...o, [ref]: [] })))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.key]);

  const set = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const payload = { ...values };
    if (isEdit && !payload.password) delete payload.password; // parol bo'sh => o'zgarmaydi
    lockedFields.forEach((name) => { if (isEdit) delete payload[name]; });
    try {
      const saved = isEdit
        ? await api.admin.update(resource.key, record.id, payload)
        : await api.admin.create(resource.key, payload);
      onSaved(saved, isEdit);
    } catch (err) {
      setMessage(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    } finally {
      setSaving(false);
    }
  }

  const input = (c) => {
    const common = {
      id: `f-${c.name}`, value: values[c.name], onChange: (e) => set(c.name, e.target.value),
      disabled: lockedFields.includes(c.name),
    };
    switch (c.type) {
      case 'textarea':
        return <textarea rows={3} {...common} />;
      case 'number':
      case 'money':
        return <input type="number" step="any" inputMode="decimal" {...common} />;
      case 'password':
        return <input type="password" autoComplete="new-password"
          placeholder={isEdit ? 'O\'zgartirmaslik uchun bo\'sh qoldiring' : ''} {...common} />;
      case 'select':
        return (
          <select {...common}>
            {!c.required && !c.default && <option value="">— tanlanmagan —</option>}
            {c.options.map((o) => <option key={o} value={o}>{VALUE_LABELS[o] || o}</option>)}
          </select>
        );
      case 'ref': {
        const opts = (refOptions[c.ref] || []).filter((o) => !(c.ref === resource.key && record && o.id === record.id));
        return (
          <select {...common}>
            <option value="">{refOptions[c.ref] ? '— tanlang —' : 'Yuklanmoqda…'}</option>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        );
      }
      default:
        return <input type="text" {...common} />;
    }
  };

  const required = (c) => c.required === true || (c.required === 'create' && !isEdit);

  return (
    <Modal title={`${resource.label}: ${isEdit ? `#${record.id} tahrirlash` : 'yangi qo\'shish'}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          {fields.map((c) => (
            <label key={c.name} className={`field ${c.type === 'textarea' ? 'wide' : ''} ${errors[c.name] ? 'has-error' : ''}`}>
              <span>{c.label}{required(c) && <i className="req">*</i>}</span>
              {input(c)}
              {errors[c.name] && <small>{errors[c.name]}</small>}
            </label>
          ))}
        </div>
        {message && <div className="form-error">{message}</div>}
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
