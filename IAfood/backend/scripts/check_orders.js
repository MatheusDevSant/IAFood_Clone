(async function(){
  try{
    const db = require('../src/lib/db');
    const [rows] = await db.query("SELECT id,status,merchant_id,address_id,created_at FROM orders WHERE status IN ('READY','PICKED_UP') LIMIT 20");
    console.log('Pedidos encontrados:', JSON.stringify(rows, null, 2));
    process.exit(0);
  }catch(err){
    console.error('Erro ao consultar pedidos:', err);
    process.exit(1);
  }
})();
