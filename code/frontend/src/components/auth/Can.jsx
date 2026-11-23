// <Can access="PRODUCT_DELETE">…</Can> — huquq bo'lsagina ichidagini ko'rsatadi.
// <Can roleTypes={['ADMIN','DIRECTOR']}>…</Can> — role turi bo'yicha. Haqiqiy tekshiruv backendda.
import { useAuth } from '../../context/AuthContext';

export default function Can({ access, roleTypes, fallback = null, children }) {
  const { hasAccess, hasRoleType } = useAuth();
  const ok = (!access || hasAccess(access)) && (!roleTypes || hasRoleType(...roleTypes));
  return ok ? children : fallback;
}
