// Kim tizimga kirgan — butun ilova uchun bitta joyda
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // token tekshirilib bo'lindimi

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setReady(true));
  }, [logout]);

  const applySession = ({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  };

  const value = useMemo(() => ({
    user,
    ready,
    isAdmin: user?.role === 'admin',
    login: async (data) => applySession(await api.login(data)),
    register: async (data) => applySession(await api.register(data)),
    logout,
  }), [user, ready, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
