Create database ifood_clone;
USE ifood_clone;


-- USERS
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('client', 'merchant', 'courier', 'admin') NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADDRESSES
CREATE TABLE addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    geohash VARCHAR(20),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    label VARCHAR(100),
    address_line VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MERCHANTS
CREATE TABLE merchants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20),
    status ENUM('open', 'closed', 'suspended') DEFAULT 'closed',
    radius_km DECIMAL(5,2) DEFAULT 5.0,
    open_hours_json JSON,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MENUS
CREATE TABLE menus (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_id BIGINT NOT NULL,
    title VARCHAR(100),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- MENU ITEMS
CREATE TABLE menu_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT NOT NULL,
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- ITEM OPTIONS
CREATE TABLE item_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT NOT NULL,
    name VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- COURIERS
CREATE TABLE couriers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    vehicle_type ENUM('bike', 'motorcycle', 'car') DEFAULT 'bike',
    is_online BOOLEAN DEFAULT FALSE,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    rating DECIMAL(3,2) DEFAULT 5.0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ORDERS
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    merchant_id BIGINT NOT NULL,
    courier_id BIGINT,
    status ENUM('PLACED','ACCEPTED','READY','ASSIGNED','PICKED_UP','DELIVERED','CANCELLED') DEFAULT 'PLACED',
    total DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
    eta_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    FOREIGN KEY (courier_id) REFERENCES couriers(id)
);

-- ORDER ITEMS
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    qty INT DEFAULT 1,
    unit_price DECIMAL(10,2),
    options_json JSON,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(id)
);

-- PAYMENTS
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    provider ENUM('mercadopago','stripe','pagarme') DEFAULT 'stripe',
    amount DECIMAL(10,2),
    split_json JSON,
    status ENUM('PENDING','COMPLETED','FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- DELIVERY QUOTES
CREATE TABLE delivery_quotes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    distance_m INT,
    fee DECIMAL(10,2),
    algorithm VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- EVENTS (para event sourcing leve)
CREATE TABLE events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT,
    type VARCHAR(50),
    payload_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- REVIEWS
CREATE TABLE reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- COUPONS
CREATE TABLE coupons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    discount_percent DECIMAL(5,2),
    valid_until DATE,
    usage_limit INT DEFAULT 1,
    used_count INT DEFAULT 0
);

-- INDEXES PARA PERFORMANCE
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_couriers_online ON couriers(is_online);
CREATE INDEX idx_merchants_geo ON merchants(lat, lng);
CREATE INDEX idx_couriers_geo ON couriers(lat, lng);

USE ifood_clone;
SHOW TABLES;
SELECT COUNT(*) FROM merchants;
SELECT COUNT(*) FROM menus;
SELECT COUNT(*) FROM menu_items;

USE ifood_clone;


SET FOREIGN_KEY_CHECKS = 0;

-- Limpa dados antigos (opcional)
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE couriers;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE menus;
TRUNCATE TABLE merchants;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Usuários (senha = 123)
-- =====================================================
INSERT INTO users (id, role, name, email, phone, password_hash)
VALUES
(1, 'client', 'Matheus', 'matheus@mail.com', '11999990001', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y'),
(2, 'client', 'Juliana', 'juliana@mail.com', '11999990002', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y'),
(3, 'merchant', 'Ana', 'ana@mail.com', '11999990003', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y'),
(4, 'merchant', 'Bruno', 'bruno@mail.com', '11999990004', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y'),
(5, 'courier', 'Rafael', 'rafael@mail.com', '11999990005', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y'),
(6, 'courier', 'Carlos', 'carlos@mail.com', '11999990006', '$2b$12$.gjVm0DR1jmjCnHcY0Bet.doTnPJAlDH.hdpmEbgZB5Hkc/SHRh/y');

-- =====================================================
-- Restaurantes
-- =====================================================
INSERT INTO merchants (id, user_id, name, cnpj, status, radius_km, lat, lng, open_hours_json)
VALUES
(1, 3, 'Cantina São Paulo', '12345678000199', 'open', 5.0, -23.55052, -46.633308,
    JSON_OBJECT('mon_fri', '10h-22h', 'sat_sun', '11h-23h')),
(2, 4, 'Bistrô Verde', '98765432000111', 'open', 4.0, -23.558000, -46.640000,
    JSON_OBJECT('mon_fri', '11h-23h', 'sat_sun', '12h-00h'));

-- =====================================================
-- Menus
-- =====================================================
INSERT INTO menus (id, merchant_id, title)
VALUES
(1, 1, 'Cardápio Principal'),
(2, 2, 'Menu Executivo');

-- =====================================================
-- Itens do menu
-- =====================================================
INSERT INTO menu_items (id, menu_id, name, description, price, available)
VALUES
(1, 1, 'Lasanha Bolonhesa', 'Massa artesanal com molho bolonhesa', 34.90, TRUE),
(2, 1, 'Espaguete ao Alho', 'Espaguete com alho dourado e azeite', 26.50, TRUE),
(3, 1, 'Tiramisu', 'Clássico italiano com café e cacau', 15.00, TRUE),
(4, 1, 'Suco de Laranja', 'Natural 300ml', 8.00, TRUE),

(5, 2, 'Risoto de Cogumelos', 'Arroz arbóreo com cogumelos frescos', 39.90, TRUE),
(6, 2, 'Salada Caesar', 'Folhas, frango e molho caesar', 28.50, TRUE),
(7, 2, 'Panna Cotta', 'Creme com frutas vermelhas', 14.00, TRUE),
(8, 2, 'Suco Verde', 'Couve, maçã e limão', 9.00, TRUE);

-- =====================================================
-- Entregadores
-- =====================================================
INSERT INTO couriers (id, user_id, name, vehicle_type, is_online, lat, lng, rating)
VALUES
(1, 5, 'Rafa', 'motorcycle', TRUE, -23.553000, -46.633000, 4.9),
(2, 6, 'Carlos', 'bike', TRUE, -23.555000, -46.637000, 4.8);

-- =====================================================
-- Pedidos
-- =====================================================
INSERT INTO orders (id, customer_id, merchant_id, courier_id, status, total, delivery_fee, payment_status, eta_minutes, created_at)
VALUES
(1, 1, 1, 1, 'PLACED', 84.40, 7.90, 'PAID', 30, NOW()),
(2, 2, 1, 1, 'ACCEPTED', 59.40, 7.90, 'PAID', 25, NOW()),
(3, 1, 2, 2, 'READY', 48.50, 6.50, 'PAID', 10, NOW()),
(4, 2, 2, 2, 'DELIVERED', 67.90, 6.50, 'PAID', 0, NOW() - INTERVAL 2 HOUR),
(5, 1, 1, 1, 'CANCELLED', 34.90, 7.90, 'REFUNDED', 0, NOW() - INTERVAL 1 DAY);

-- =====================================================
-- Itens dos pedidos
-- =====================================================
INSERT INTO order_items (order_id, item_id, qty, unit_price)
VALUES
(1, 1, 1, 34.90),
(1, 2, 1, 26.50),
(1, 3, 1, 15.00),
(1, 4, 1, 8.00),

(2, 1, 1, 34.90),
(2, 3, 1, 15.00),
(2, 4, 1, 8.00),

(3, 5, 1, 39.90),
(3, 8, 1, 9.00),

(4, 6, 1, 28.50),
(4, 5, 1, 39.90),

(5, 1, 1, 34.90);

-- =====================================================
-- Cupons de desconto
-- =====================================================
INSERT INTO coupons (code, discount_percent, valid_until, usage_limit)
VALUES
('PROMO10', 10.00, '2025-12-31', 100),
('FRETEGRATIS', 100.00, '2025-12-31', 50);


-- Cria tabela assignments
CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  courier_id BIGINT NOT NULL,               
  score DOUBLE DEFAULT NULL,
  status ENUM('PENDING','ACCEPTED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assign_order (order_id),
  INDEX idx_assign_courier (courier_id),
  INDEX idx_assign_expires (expires_at),
  CONSTRAINT fk_assignment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_courier FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE couriers
  ADD COLUMN last_active DATETIME NULL AFTER lng;

  
INSERT INTO assignments (order_id, courier_id, score, status, expires_at)
VALUES (3, 1, 1.234, 'PENDING', DATE_ADD(NOW(), INTERVAL 20 SECOND));

show tables;
describe menu_items;


ALTER TABLE orders
  ADD COLUMN address_id BIGINT NULL;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_address
  FOREIGN KEY (address_id) REFERENCES addresses(id);