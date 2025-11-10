-- =====================================================
-- Script de Criação do Banco de Dados - PostgreSQL
-- Sistema de Controle de Estoque - Mespin
-- =====================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Configurações do Sistema
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    company_name VARCHAR(255) NOT NULL,
    company_phone VARCHAR(20),
    company_email VARCHAR(255),
    company_address TEXT,
    birthday_discount NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (birthday_discount >= 0 AND birthday_discount <= 100),
    jar_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (jar_discount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Materiais
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    total_quantity_purchased NUMERIC(10, 3) NOT NULL DEFAULT 0,
    current_stock NUMERIC(10, 3) NOT NULL DEFAULT 0,
    low_stock_alert NUMERIC(10, 3) NOT NULL DEFAULT 0,
    total_cost_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(10, 4) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_current_stock ON materials(current_stock);
CREATE INDEX idx_materials_name ON materials(name);

-- Tabela de Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    fragrance VARCHAR(100),
    weight VARCHAR(50),
    production_cost NUMERIC(10, 2),
    profit_margin NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_quantity ON products(quantity);

-- Tabela de Materiais de Produção
CREATE TABLE production_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    material_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_per_unit NUMERIC(10, 4) NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_materials_product_id ON production_materials(product_id);
CREATE INDEX idx_production_materials_material_id ON production_materials(material_id);

-- Tabela de Histórico de Preços
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_date ON price_history(date);

-- Tabela de Clientes
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    birth_date DATE,
    jar_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_birth_date ON customers(birth_date);

-- Tipos ENUM para Sales
CREATE TYPE sale_status AS ENUM ('pending', 'awaiting_payment', 'paid', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'pix', 'debit', 'credit');

-- Tabela de Vendas
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    sale_date TIMESTAMP NOT NULL,
    status sale_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    notes TEXT,
    from_order BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(status);

-- Tabela de Itens de Venda
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Tipos ENUM para Orders
CREATE TYPE order_status AS ENUM ('pending', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled');

-- Tabela de Encomendas
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    expected_delivery_date TIMESTAMP NOT NULL,
    delivered_date TIMESTAMP,
    status order_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_expected_delivery_date ON orders(expected_delivery_date);
CREATE INDEX idx_orders_status ON orders(status);

-- Tabela de Preços por Categoria
CREATE TABLE category_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_prices_category_name ON category_prices(category_name);

-- Tipos ENUM para Expenses
CREATE TYPE expense_category AS ENUM ('production', 'investment', 'fixed_cost', 'variable_cost', 'other');

-- Tabela de Despesas
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    category expense_category NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_is_recurring ON expenses(is_recurring);

-- Tipos ENUM para Installment Payments
CREATE TYPE installment_category AS ENUM ('production', 'investment', 'equipment', 'other');

-- Tabela de Pagamentos Parcelados
CREATE TABLE installment_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    installments INTEGER NOT NULL,
    current_installment INTEGER NOT NULL DEFAULT 1,
    installment_amount NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    category installment_category NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_installment_payments_category ON installment_payments(category);
CREATE INDEX idx_installment_payments_start_date ON installment_payments(start_date);
CREATE INDEX idx_installment_payments_current_installment ON installment_payments(current_installment);

-- Tabela de Parcelas Pagas
CREATE TABLE installment_payment_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installment_payment_id UUID NOT NULL REFERENCES installment_payments(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(installment_payment_id, installment_number)
);

CREATE INDEX idx_installment_payment_status_installment_payment_id ON installment_payment_status(installment_payment_id);
CREATE INDEX idx_installment_payment_status_installment_number ON installment_payment_status(installment_number);
CREATE INDEX idx_installment_payment_status_is_paid ON installment_payment_status(is_paid);

-- =====================================================
-- Triggers e Functions
-- =====================================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_materials_updated_at BEFORE UPDATE ON production_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_prices_updated_at BEFORE UPDATE ON category_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_payments_updated_at BEFORE UPDATE ON installment_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_payment_status_updated_at BEFORE UPDATE ON installment_payment_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function para atualizar custo por unidade do material
CREATE OR REPLACE FUNCTION update_material_cost_per_unit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_quantity_purchased > 0 THEN
        NEW.cost_per_unit = NEW.total_cost_paid / NEW.total_quantity_purchased;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_material_update
    BEFORE INSERT OR UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_material_cost_per_unit();

-- Function para atualizar custo de produção do produto
CREATE OR REPLACE FUNCTION update_product_production_cost()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        production_cost = (
            SELECT COALESCE(SUM(total_cost), 0)
            FROM production_materials
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        profit_margin = price - (
            SELECT COALESCE(SUM(total_cost), 0)
            FROM production_materials
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_production_materials_change
    AFTER INSERT OR UPDATE OR DELETE ON production_materials
    FOR EACH ROW EXECUTE FUNCTION update_product_production_cost();

-- =====================================================
-- Views
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
    TO_CHAR(sale_date, 'YYYY-MM') AS month,
    COUNT(*) AS total_sales,
    SUM(subtotal) AS gross_revenue,
    SUM(discount_amount) AS total_discounts,
    SUM(total_amount) AS net_revenue,
    AVG(total_amount) AS average_ticket
FROM sales
WHERE status = 'paid'
GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
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
    EXTRACT(MONTH FROM birth_date)::INTEGER AS birth_month,
    EXTRACT(DAY FROM birth_date)::INTEGER AS birth_day
FROM customers
WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE);

-- =====================================================
-- Dados iniciais
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

COMMENT ON TABLE settings IS 'Configurações gerais do sistema';
COMMENT ON TABLE materials IS 'Catálogo de materiais reutilizáveis para produção';
COMMENT ON TABLE products IS 'Produtos finais disponíveis para venda';
COMMENT ON TABLE production_materials IS 'Materiais usados na produção de cada produto';
COMMENT ON TABLE price_history IS 'Histórico de alterações de preço dos produtos';
COMMENT ON TABLE customers IS 'Cadastro de clientes';
COMMENT ON TABLE sales IS 'Vendas realizadas';
COMMENT ON TABLE sale_items IS 'Itens de cada venda';
COMMENT ON TABLE orders IS 'Encomendas/pedidos personalizados';
COMMENT ON TABLE category_prices IS 'Preços padrão por categoria de produto';
COMMENT ON TABLE expenses IS 'Despesas do negócio';
COMMENT ON TABLE installment_payments IS 'Pagamentos parcelados';
COMMENT ON TABLE installment_payment_status IS 'Status de pagamento de cada parcela';
