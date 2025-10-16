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
    await db.query('DELETE FROM menu_items');
    await db.query('DELETE FROM menus');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM users');

    const restaurantes = [
      { nome: 'Burger House', categorias: ['Lanches', 'Bebidas', 'Sobremesas'] },
      { nome: 'Pizzaria Napoli', categorias: ['Pizzas', 'Massas', 'Bebidas'] },
      { nome: 'Sushi Express', categorias: ['Combinados', 'Temakis', 'Bebidas'] },
      { nome: 'Doce Mania', categorias: ['Tortas', 'Doces', 'Bebidas'] },
    ];

    const itens = {
      Lanches: [
        { nome: 'X-Burger', desc: 'Hambúrguer artesanal com queijo cheddar e maionese especial', preco: 24.9 },
        { nome: 'X-Salada', desc: 'Clássico com alface, tomate e queijo', preco: 26.5 },
        { nome: 'Batata Frita', desc: 'Porção crocante com 200g', preco: 14.9 },
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
         VALUES (?, ?, 'open', 5.0, -23.55, -46.63)`,
        [userId, r.nome]
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
    await db.end();
  } catch (err) {
    console.error('❌ Erro ao popular banco:', err);
  }
})();
