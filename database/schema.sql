-- =====================================================
-- Script de Criação do Banco de Dados
-- Sistema de Controle de Estoque - Mespin
-- =====================================================

-- Tabela de Configurações do Sistema
CREATE TABLE settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    low_stock_threshold INT NOT NULL DEFAULT 10,
    company_name VARCHAR(255) NOT NULL,
    company_phone VARCHAR(20),
    company_email VARCHAR(255),
    company_address TEXT,
    birthday_discount DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (birthday_discount >= 0 AND birthday_discount <= 100),
    jar_discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (jar_discount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Materiais (Catálogo de materiais reutilizáveis)
CREATE TABLE materials (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL COMMENT 'g, ml, unidade, etc',
    total_quantity_purchased DECIMAL(10, 3) NOT NULL DEFAULT 0,
    current_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
    low_stock_alert DECIMAL(10, 3) NOT NULL DEFAULT 0,
    total_cost_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10, 4) NOT NULL DEFAULT 0,
    category VARCHAR(100) COMMENT 'cera, essência, embalagem, etc',
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_current_stock (current_stock),
    INDEX idx_name (name)
);

-- Tabela de Produtos
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    fragrance VARCHAR(100),
    weight VARCHAR(50),
    production_cost DECIMAL(10, 2),
    profit_margin DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name),
    INDEX idx_quantity (quantity)
);

-- Tabela de Materiais de Produção (materiais usados em cada produto)
CREATE TABLE production_materials (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    material_id VARCHAR(36) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10, 4) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    INDEX idx_product_id (product_id),
    INDEX idx_material_id (material_id)
);

-- Tabela de Histórico de Preços
CREATE TABLE price_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_date (date)
);

-- Tabela de Clientes
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    birth_date DATE,
    jar_credits INT NOT NULL DEFAULT 0 COMMENT 'Créditos de potes devolvidos',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_birth_date (birth_date)
);

-- Tabela de Vendas
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id VARCHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP NOT NULL,
    status ENUM('pending', 'awaiting_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'pix', 'debit', 'credit'),
    notes TEXT,
    from_order BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_customer_id (customer_id),
    INDEX idx_sale_date (sale_date),
    INDEX idx_status (status)
);

-- Tabela de Itens de Venda
CREATE TABLE sale_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sale_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_sale_id (sale_id),
    INDEX idx_product_id (product_id)
);

-- Tabela de Encomendas/Pedidos
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id VARCHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    expected_delivery_date TIMESTAMP NOT NULL,
    delivered_date TIMESTAMP,
    status ENUM('pending', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'pix', 'debit', 'credit'),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_customer_id (customer_id),
    INDEX idx_product_id (product_id),
    INDEX idx_order_date (order_date),
    INDEX idx_expected_delivery_date (expected_delivery_date),
    INDEX idx_status (status)
);

-- Tabela de Preços por Categoria
CREATE TABLE category_prices (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_name (category_name)
);

-- Tabela de Despesas
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    description TEXT NOT NULL,
    category ENUM('production', 'investment', 'fixed_cost', 'variable_cost', 'other') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE COMMENT 'Se é despesa recorrente mensal',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_date (date),
    INDEX idx_is_recurring (is_recurring)
);

-- Tabela de Pagamentos Parcelados
CREATE TABLE installment_payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    description TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    installments INT NOT NULL,
    current_installment INT NOT NULL DEFAULT 1,
    installment_amount DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    category ENUM('production', 'investment', 'equipment', 'other') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_start_date (start_date),
    INDEX idx_current_installment (current_installment)
);

-- Tabela de Parcelas Pagas (para rastrear quais parcelas foram pagas)
CREATE TABLE installment_payment_status (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    installment_payment_id VARCHAR(36) NOT NULL,
    installment_number INT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (installment_payment_id) REFERENCES installment_payments(id) ON DELETE CASCADE,
    INDEX idx_installment_payment_id (installment_payment_id),
    INDEX idx_installment_number (installment_number),
    INDEX idx_is_paid (is_paid),
    UNIQUE KEY unique_installment (installment_payment_id, installment_number)
);

-- =====================================================
-- Triggers para atualização automática de campos calculados
-- =====================================================

-- Trigger para atualizar custo por unidade do material
DELIMITER $$
CREATE TRIGGER before_material_update
BEFORE UPDATE ON materials
FOR EACH ROW
BEGIN
    IF NEW.total_quantity_purchased > 0 THEN
        SET NEW.cost_per_unit = NEW.total_cost_paid / NEW.total_quantity_purchased;
    END IF;
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- Trigger para atualizar custo de produção do produto
DELIMITER $$
CREATE TRIGGER after_production_materials_change
AFTER INSERT ON production_materials
FOR EACH ROW
BEGIN
    UPDATE products 
    SET production_cost = (
        SELECT COALESCE(SUM(total_cost), 0) 
        FROM production_materials 
        WHERE product_id = NEW.product_id
    ),
    profit_margin = price - (
        SELECT COALESCE(SUM(total_cost), 0) 
        FROM production_materials 
        WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER after_production_materials_delete
AFTER DELETE ON production_materials
FOR EACH ROW
BEGIN
    UPDATE products 
    SET production_cost = (
        SELECT COALESCE(SUM(total_cost), 0) 
        FROM production_materials 
        WHERE product_id = OLD.product_id
    ),
    profit_margin = price - (
        SELECT COALESCE(SUM(total_cost), 0) 
        FROM production_materials 
        WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
END$$
DELIMITER ;

-- =====================================================
-- Views úteis para relatórios
-- =====================================================

-- View de produtos com estoque baixo
CREATE VIEW low_stock_products AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.quantity,
    p.price,
    p.production_cost,
    p.profit_margin,
    s.low_stock_threshold
FROM products p
CROSS JOIN settings s
WHERE p.quantity <= s.low_stock_threshold;

-- View de vendas com detalhes completos
CREATE VIEW sales_detailed AS
SELECT 
    s.id AS sale_id,
    s.customer_name,
    s.sale_date,
    s.status,
    s.payment_method,
    s.subtotal,
    s.discount_percentage,
    s.discount_amount,
    s.total_amount,
    si.product_name,
    si.quantity,
    si.unit_price,
    si.total_price AS item_total
FROM sales s
INNER JOIN sale_items si ON s.id = si.sale_id;

-- View de materiais com estoque baixo
CREATE VIEW low_stock_materials AS
SELECT 
    id,
    name,
    category,
    current_stock,
    low_stock_alert,
    unit,
    cost_per_unit
FROM materials
WHERE current_stock <= low_stock_alert;

-- View de vendas por mês
CREATE VIEW monthly_sales AS
SELECT 
    DATE_FORMAT(sale_date, '%Y-%m') AS month,
    COUNT(*) AS total_sales,
    SUM(subtotal) AS gross_revenue,
    SUM(discount_amount) AS total_discounts,
    SUM(total_amount) AS net_revenue,
    AVG(total_amount) AS average_ticket
FROM sales
WHERE status = 'paid'
GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
ORDER BY month DESC;

-- View de clientes com aniversário no mês atual
CREATE VIEW birthday_customers AS
SELECT 
    id,
    name,
    email,
    phone,
    birth_date,
    jar_credits,
    MONTH(birth_date) AS birth_month,
    DAY(birth_date) AS birth_day
FROM customers
WHERE MONTH(birth_date) = MONTH(CURRENT_DATE);

-- =====================================================
-- Dados iniciais (Settings padrão)
-- =====================================================

INSERT INTO settings (
    company_name,
    low_stock_threshold,
    birthday_discount,
    jar_discount
) VALUES (
    'Mespin',
    10,
    0.00,
    0.00
);

-- =====================================================
-- Comentários das tabelas
-- =====================================================

ALTER TABLE settings COMMENT 'Configurações gerais do sistema';
ALTER TABLE materials COMMENT 'Catálogo de materiais reutilizáveis para produção';
ALTER TABLE products COMMENT 'Produtos finais disponíveis para venda';
ALTER TABLE production_materials COMMENT 'Materiais usados na produção de cada produto';
ALTER TABLE price_history COMMENT 'Histórico de alterações de preço dos produtos';
ALTER TABLE customers COMMENT 'Cadastro de clientes';
ALTER TABLE sales COMMENT 'Vendas realizadas';
ALTER TABLE sale_items COMMENT 'Itens de cada venda';
ALTER TABLE orders COMMENT 'Encomendas/pedidos personalizados';
ALTER TABLE category_prices COMMENT 'Preços padrão por categoria de produto';
ALTER TABLE expenses COMMENT 'Despesas do negócio';
ALTER TABLE installment_payments COMMENT 'Pagamentos parcelados';
ALTER TABLE installment_payment_status COMMENT 'Status de pagamento de cada parcela';
