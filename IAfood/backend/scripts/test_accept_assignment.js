(async ()=>{
  try{
    require('dotenv').config();
    const axios = require('axios');
    const jwt = require('jsonwebtoken');

    const secret = process.env.JWT_SECRET || 'seu_segredo_jwt';
    // user id 12 (courier), role courier
    const token = jwt.sign({ id: 12, role: 'courier' }, secret, { expiresIn: '1h' });

    const assignmentId = process.env.TEST_ASSIGNMENT_ID || '597';

    const res = await axios.post(`http://localhost:3000/assignments/${assignmentId}/respond`, { action: 'ACCEPT' }, {
      headers: { Authorization: 'Bearer ' + token }
    });

    console.log('Resposta do servidor:', res.status, res.data);
  }catch(err){
    if (err.response) {
      console.error('Erro resposta:', err.response.status, err.response.data);
    } else {
      console.error('Erro request:', err.message);
    }
    process.exit(1);
  }
})();
