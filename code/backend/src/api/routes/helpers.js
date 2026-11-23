// Marshrutlar uchun umumiy yordamchilar
const HttpError = require('../../utils/httpError');

// async xatolarni error middleware'ga uzatish
const wrap = require('../middleware/asyncHandler');

// URL'dagi :id ni tekshirish (PostgreSQL INT chegarasi ichida musbat butun son)
const idOf = (req, param = 'id') => {
  const id = Number(req.params[param]);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new HttpError(400, 'Noto\'g\'ri ID');
  return id;
};

module.exports = { wrap, idOf };
