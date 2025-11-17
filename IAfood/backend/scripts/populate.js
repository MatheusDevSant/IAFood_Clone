require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ifood_clone',
  });

  try {
    console.log('🧹 Limpando banco de dados...');
    // delete in order to avoid foreign key constraint errors
    await db.query('DELETE FROM order_items');
    await db.query('DELETE FROM assignments');
    await db.query('DELETE FROM orders');
    await db.query('DELETE FROM couriers');
    await db.query('DELETE FROM addresses');
    await db.query('DELETE FROM menu_items');
    await db.query('DELETE FROM menus');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM users');

    const restaurantes = [
      { nome: 'Burger House', categorias: ['Lanches', 'Bebidas', 'Sobremesas'], lat: -23.55052, lng: -46.63331 },
      { nome: 'Pizzaria Napoli', categorias: ['Pizzas', 'Massas', 'Bebidas'], lat: -23.55110, lng: -46.63250 },
      { nome: 'Sushi Express', categorias: ['Combinados', 'Temakis', 'Bebidas'], lat: -23.55220, lng: -46.63400 },
      { nome: 'Doce Mania', categorias: ['Tortas', 'Doces', 'Bebidas'], lat: -23.54980, lng: -46.63150 },
      { nome: 'Taco Loco', categorias: ['Tacos', 'Bebidas'], lat: -23.55300, lng: -46.63550 },
      { nome: 'Café Central', categorias: ['Sanduíches', 'Bebidas', 'Doces'], lat: -23.54850, lng: -46.63000 },
    ];

    const itens = {
      Lanches: [
        // itens originais que já existiam (mantidos)
        { nome: 'X-Burger', desc: 'Hambúrguer artesanal com queijo cheddar e maionese especial', preco: 24.9 },
        { nome: 'X-Salada', desc: 'Clássico com alface, tomate e queijo', preco: 26.5 },
        { nome: 'Batata Frita', desc: 'Porção crocante com 200g', preco: 14.9 },
        { nome: 'X-Burger Especial', desc: 'Hambúrguer especial da casa com molho secreto', preco: 34.5 },

        // 8 novos itens adicionais
        { nome: 'Cheeseburger Supremo', desc: 'Hambúrguer bovino suculento, queijo cheddar, cebola caramelizada e molho especial', preco: 29.9 },
        { nome: 'Bacon Smash', desc: 'Hambúrguer smash com camada extra de bacon crocante e queijo derretido', preco: 32.5 },
        { nome: 'Duplo Bacon Deluxe', desc: 'Dois discos de carne, bacon, queijo e maionese defumada', preco: 39.0 },
        { nome: 'Veggie Burger', desc: 'Hambúrguer à base de grão-de-bico e beterraba com molho de ervas', preco: 27.0 },
        { nome: 'Chicken Crisp', desc: 'Peito de frango empanado, alface, picles e molho picante', preco: 28.5 },
        { nome: 'BBQ Ranch Burger', desc: 'Hambúrguer com molho barbecue, onion rings e queijo prato', preco: 33.0 },
        { nome: 'Mushroom & Swiss', desc: 'Hambúrguer com cogumelos salteados e queijo suíço cremoso', preco: 34.0 },
        { nome: 'Egg & Cheese', desc: 'Hambúrguer com ovo frito, queijo e maionese de ervas', preco: 30.0 },
      ],
      Bebidas: [
        { nome: 'Coca-Cola Lata', desc: '350ml gelada', preco: 6.9 },
        { nome: 'Suco Natural', desc: 'Sabores variados - 300ml', preco: 8.9 },
        { nome: 'Água Mineral', desc: 'Com ou sem gás - 500ml', preco: 4.5 },
      ],
      Sobremesas: [
        { nome: 'Petit Gateau', desc: 'Com sorvete de creme', preco: 19.9 },
        { nome: 'Brownie', desc: 'Chocolate intenso com nozes', preco: 17.9 },
      ],
      Pizzas: [
        { nome: 'Margherita', desc: 'Mussarela, tomate e manjericão fresco', preco: 42.0 },
        { nome: 'Calabresa', desc: 'Calabresa fatiada e cebola roxa', preco: 45.0 },
        { nome: 'Quatro Queijos', desc: 'Mozzarella, gorgonzola, parmesão e catupiry', preco: 49.0 },
      ],
      Massas: [
        { nome: 'Spaghetti Carbonara', desc: 'Molho cremoso com bacon e parmesão', preco: 38.0 },
        { nome: 'Lasanha Bolonhesa', desc: 'Tradicional com molho de carne', preco: 41.0 },
      ],
      Combinados: [
        { nome: 'Combo Sushi 20 peças', desc: 'Peças variadas de salmão e atum', preco: 59.9 },
        { nome: 'Combo Sashimi 12 peças', desc: 'Fatias frescas de peixe nobre', preco: 54.9 },
      ],
      Temakis: [
        { nome: 'Temaki Salmão com Cream Cheese', desc: 'Arroz japonês e alga nori crocante', preco: 29.9 },
        { nome: 'Temaki Atum', desc: 'Com gergelim e cebolinha', preco: 27.9 },
      ],
      Tortas: [
        { nome: 'Torta de Limão', desc: 'Massa crocante e recheio cremoso', preco: 19.9 },
        { nome: 'Torta de Morango', desc: 'Coberta com morangos frescos', preco: 22.9 },
      ],
      Doces: [
        { nome: 'Brigadeiro Gourmet', desc: 'Feito com chocolate belga', preco: 4.5 },
        { nome: 'Beijinho', desc: 'Doce de coco com cravo', preco: 4.0 },
      ],
    };

    for (const r of restaurantes) {
      console.log(`🍽 Criando restaurante: ${r.nome}`);

      const [user] = await db.query(
        `INSERT INTO users (role, name, email, phone, password_hash)
         VALUES ('merchant', ?, ?, ?, '123')`,
        [r.nome, `${r.nome.toLowerCase().replace(/\s/g, '')}@email.com`, '11999999999']
      );
      const userId = user.insertId;

      const [merchant] = await db.query(
        `INSERT INTO merchants (user_id, name, status, radius_km, lat, lng)
         VALUES (?, ?, 'open', 5.0, ?, ?)`,
        [userId, r.nome, r.lat, r.lng]
      );
      const merchantId = merchant.insertId;

      for (const categoria of r.categorias) {
        const [menu] = await db.query(
          `INSERT INTO menus (merchant_id, title) VALUES (?, ?)`,
          [merchantId, categoria]
        );
        const menuId = menu.insertId;

        if (itens[categoria]) {
          for (const item of itens[categoria]) {
            await db.query(
              `INSERT INTO menu_items (menu_id, name, description, price, available)
               VALUES (?, ?, ?, ?, 1)`,
              [menuId, item.nome, item.desc, item.preco]
            );
          }
        }
      }
    }

    console.log('✅ Banco populado com sucesso com cardápios reais!');
    // Criar vários usuários clientes e entregadores com endereços reais/plaúsiveis
    console.log('� Criando usuários clientes e entregadores...');

    const clientes = [
      { name: 'Ana Silva', email: 'ana.silva@example.com', phone: '11990001111', addresses: [ {lat: -23.5512, lng: -46.6335, label: 'Casa Ana', address_line: 'R. Joaquim Floriano, 1000'}, {lat: -23.5489, lng: -46.6310, label: 'Trabalho Ana', address_line: 'Av. Paulista, 1500'} ] },
      { name: 'Bruno Costa', email: 'bruno.costa@example.com', phone: '11990002222', addresses: [ {lat: -23.5525, lng: -46.6352, label: 'Casa Bruno', address_line: 'R. Augusta, 2300'} ] },
      { name: 'Carla Souza', email: 'carla.souza@example.com', phone: '11990003333', addresses: [ {lat: -23.5495, lng: -46.6322, label: 'Casa Carla', address_line: 'R. Oscar Freire, 450'} ] },
    ];

    for (const c of clientes) {
      const [cu] = await db.query(`INSERT INTO users (role, name, email, phone, password_hash) VALUES ('client', ?, ?, ?, '123')`, [c.name, c.email, c.phone]);
      const clientId = cu.insertId;
      for (const a of c.addresses) {
        await db.query(`INSERT INTO addresses (user_id, geohash, lat, lng, label, address_line, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [clientId, null, a.lat, a.lng, a.label, a.address_line, 'São Paulo', 'SP', '01310-000']);
      }
    }

    const entregadores = [
      { name: 'Rafael Moto', email: 'rafael.moto@example.com', phone: '11990004444', lat: -23.5510, lng: -46.6340 },
      { name: 'Luiza Entrega', email: 'luiza.entrega@example.com', phone: '11990005555', lat: -23.5530, lng: -46.6360 },
      { name: 'Tiago Rápido', email: 'tiago.rapido@example.com', phone: '11990006666', lat: -23.5490, lng: -46.6325 },
    ];

    for (const e of entregadores) {
      const [eu] = await db.query(`INSERT INTO users (role, name, email, phone, password_hash) VALUES ('courier', ?, ?, ?, '123')`, [e.name, e.email, e.phone]);
      const courierUserId = eu.insertId;
      await db.query(`INSERT INTO couriers (user_id, is_online, lat, lng, rating, last_active) VALUES (?, 1, ?, ?, 4.7, NOW())`, [courierUserId, e.lat, e.lng]);
    }

    await db.end();
  } catch (err) {
    console.error('❌ Erro ao popular banco:', err);
  }
})();
