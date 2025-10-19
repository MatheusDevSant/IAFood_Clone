const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // max 60 requests por janela
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = apiLimiter;
