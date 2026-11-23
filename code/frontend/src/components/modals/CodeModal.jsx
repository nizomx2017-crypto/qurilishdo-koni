// Yangi kirish kodi — faqat bir marta ko'rsatiladi (server uni boshqa qaytarmaydi)
import { useState } from 'react';
import Modal from './Modal';

export default function CodeModal({ user, code, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal title="Kirish kodi" onClose={onClose} width={440}>
      <div className="modal-body">
        <p><b>{user.fullName}</b> — login: <code>{user.login}</code></p>
        <div className="code-box" aria-label="Kirish kodi">{code}</div>
        <div className="alert warn">
          Bu kod qayta ko‘rsatilmaydi. Uni nusxalab, xodimga xavfsiz yo‘l bilan bering.
          Yo‘qolsa — “Kodni yangilash” orqali yangisini yarating.
        </div>
      </div>
      <div className="modal-foot">
        <button type="button" className="btn ghost" onClick={copy}>{copied ? 'Nusxa olindi ✓' : 'Nusxa olish'}</button>
        <button type="button" className="btn primary" onClick={onClose}>Saqladim</button>
      </div>
    </Modal>
  );
}
