/**
 * Xodim sessiyasi — butun ilova uchun bitta joyda.
 *   user, accesses, fullAccess, roleType, isLoading, login(), logout(), hasAccess(code), hasRoleType(...types)
 * Bu faqat ko'rinish uchun (menyu va tugmalarni yashirish): haqiqiy tekshiruv har doim backendda.
 * Huquqlar oyna fokusga qaytganda qayta olinadi — direktor o'zgartirsa menyu ham yangilanadi.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setSessionEndHandler, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(tokenStore.refresh()));

  const loadMe = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch (e) {
      // Faqat 401 da chiqaramiz: tarmoq xatosi yoki server uyg'onayotgani (Render) sessiyani o'chirmasin
      if (e.status === 401) {
        tokenStore.clear();
        setUser(null);
      }
      throw e;
    }
  }, []);

  useEffect(() => {
    setSessionEndHandler(() => setUser(null));
    if (!tokenStore.refresh()) {
      setIsLoading(false);
      return;
    }
    loadMe().catch(() => {}).finally(() => setIsLoading(false));
  }, [loadMe]);

  // Boshqa tabda kirish/chiqish
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== tokenStore.REFRESH_KEY) return;
      if (!e.newValue) setUser(null);
      else if (!user) loadMe().catch(() => {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, loadMe]);

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => loadMe().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, loadMe]);

  const login = useCallback(async (data) => {
    const res = await api.login(data);
    tokenStore.set(res);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const accesses = user?.accesses || [];
    const fullAccess = Boolean(user?.fullAccess);
    const roleType = user?.role?.type || null;
    return {
      user,
      accesses,
      fullAccess,
      roleType,
      isLoading,
      login,
      logout,
      refreshMe: loadMe,
      hasAccess: (code) => Boolean(user) && (fullAccess || accesses.includes(code)),
      hasRoleType: (...types) => Boolean(user) && types.includes(roleType),
    };
  }, [user, isLoading, login, logout, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
