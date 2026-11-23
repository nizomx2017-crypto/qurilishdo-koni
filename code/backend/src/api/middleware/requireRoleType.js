// requireRoleType('ADMIN', 'DIRECTOR') — boshqaruv endpointlari uchun (xodimlar, rollar, kirish jurnali).
// Bular access matritsasiga kirmaydi: aks holda director menejerga boshqaruv huquqini berib yuborishi mumkin edi.
const HttpError = require('../../utils/httpError');

const requireRoleType = (...types) => (req, res, next) => {
  if (!req.user || !types.includes(req.user.roleType)) {
    return next(new HttpError(403, 'Bu bo\'lim siz uchun yopiq', undefined, 'FORBIDDEN', { requiredRoleType: types }));
  }
  next();
};

module.exports = requireRoleType;
