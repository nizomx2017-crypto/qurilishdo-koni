import Modal from './Modal';

export default function ConfirmDialog({
  text, onConfirm, onCancel, busy, title = 'O\'chirishni tasdiqlang', confirmText = 'Ha, o\'chirish',
}) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <div className="modal-body"><p>{text}</p></div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Yopish</button>
        <button className="btn danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Bajarilmoqda…' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
