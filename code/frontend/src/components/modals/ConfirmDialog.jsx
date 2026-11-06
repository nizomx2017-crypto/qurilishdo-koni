import Modal from './Modal';

export default function ConfirmDialog({ text, onConfirm, onCancel, busy }) {
  return (
    <Modal title="O'chirishni tasdiqlang" onClose={onCancel} width={420}>
      <div className="modal-body"><p>{text}</p></div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Bekor qilish</button>
        <button className="btn danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'O\'chirilmoqda…' : 'Ha, o\'chirish'}
        </button>
      </div>
    </Modal>
  );
}
