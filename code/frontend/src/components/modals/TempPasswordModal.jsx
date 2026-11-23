// Vaqtinchalik parol — faqat bir marta ko'rsatiladi (server uni boshqa qaytarmaydi)
import { useState } from 'react';
import Modal from './Modal';

export default function TempPasswordModal({ user, password, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal title="Vaqtinchalik parol" onClose={onClose} width={460}>
      <div className="modal-body">
        <p><b>{user.fullName}</b> — username: <code>{user.username}</code></p>
        <div className="code-box" aria-label="Vaqtinchalik parol">{password}</div>
        <div className="alert warn">
          Bu parol qayta ko‘rsatilmaydi. Uni nusxalab, xodimga xavfsiz yo‘l bilan bering.
          Xodim birinchi kirishda o‘z parolini o‘rnatadi. Yo‘qolsa — “Parolni tiklash”.
        </div>
      </div>
      <div className="modal-foot">
        <button type="button" className="btn ghost" onClick={copy}>{copied ? 'Nusxa olindi ✓' : 'Nusxa olish'}</button>
        <button type="button" className="btn primary" onClick={onClose}>Saqladim</button>
      </div>
    </Modal>
  );
}
