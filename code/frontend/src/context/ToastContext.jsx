// Qisqa bildirishnomalar (pastki o'ng burchakda): notify('Saqlandi') yoki notify('Xato', 'bad')
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((text, tone = 'ok') => setToast({ text, tone, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && <div key={toast.id} className={`toast tone-${toast.tone}`} role="status">{toast.text}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
