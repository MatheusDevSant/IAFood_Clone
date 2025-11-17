(async()=>{
  const jwt = require('jsonwebtoken');
  require('dotenv').config();
  const secret = process.env.JWT_SECRET || 'seu_segredo_jwt';
  const token = jwt.sign({ id: 12, role: 'courier' }, secret, { expiresIn: '12h' });
  console.log(token);
})();
