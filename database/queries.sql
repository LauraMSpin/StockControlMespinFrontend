-- =====================================================
-- Queries Úteis - Sistema de Controle de Estoque
-- =====================================================

-- =====================================================
-- CONSULTAS DE PRODUTOS
-- =====================================================

-- Listar todos os produtos com estoque disponível
SELECT 
    id,
    name,
    category,
    fragrance,
    weight,
    price,
    quantity,
    production_cost,
    profit_margin,
    CASE 
        WHEN quantity = 0 THEN 'SEM ESTOQUE'
        WHEN quantity <= (SELECT low_stock_threshold FROM settings LIMIT 1) THEN 'ESTOQUE BAIXO'
        ELSE 'OK'
    END AS stock_status
FROM products
ORDER BY name;

-- Produtos mais vendidos
SELECT 
    p.id,
    p.name,
    p.category,
    SUM(si.quantity) AS total_sold,
    SUM(si.total_price) AS total_revenue
FROM products p
INNER JOIN sale_items si ON p.id = si.product_id
INNER JOIN sales s ON si.sale_id = s.id
WHERE s.status = 'paid'
GROUP BY p.id, p.name, p.category
ORDER BY total_sold DESC
LIMIT 10;

-- Produtos com maior margem de lucro
SELECT 
    name,
    category,
    price,
    production_cost,
    profit_margin,
    ROUND((profit_margin / price) * 100, 2) AS profit_margin_percentage
FROM products
WHERE production_cost IS NOT NULL
ORDER BY profit_margin DESC;

-- =====================================================
-- CONSULTAS DE CLIENTES
-- =====================================================

-- Clientes com mais compras
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.jar_credits,
    COUNT(s.id) AS total_purchases,
    SUM(s.total_amount) AS total_spent,
    AVG(s.total_amount) AS average_ticket
FROM customers c
INNER JOIN sales s ON c.id = s.customer_id
WHERE s.status = 'paid'
GROUP BY c.id, c.name, c.email, c.phone, c.jar_credits
ORDER BY total_spent DESC;

-- Clientes aniversariantes do mês
SELECT 
    name,
    email,
    phone,
    birth_date,
    DAY(birth_date) AS day,
    jar_credits
FROM customers
WHERE MONTH(birth_date) = MONTH(CURRENT_DATE)
ORDER BY DAY(birth_date);

-- Clientes inativos (sem compras nos últimos 90 dias)
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    MAX(s.sale_date) AS last_purchase_date,
    DATEDIFF(CURRENT_DATE, MAX(s.sale_date)) AS days_since_last_purchase
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id
GROUP BY c.id, c.name, c.email, c.phone
HAVING MAX(s.sale_date) IS NULL OR MAX(s.sale_date) < DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
ORDER BY days_since_last_purchase DESC;

-- =====================================================
-- CONSULTAS DE VENDAS
-- =====================================================

-- Vendas do dia
SELECT 
    s.id,
    s.customer_name,
    s.sale_date,
    s.subtotal,
    s.discount_amount,
    s.total_amount,
    s.status,
    s.payment_method
FROM sales s
WHERE DATE(s.sale_date) = CURRENT_DATE
ORDER BY s.sale_date DESC;

-- Vendas por período com detalhamento
SELECT 
    DATE(s.sale_date) AS date,
    COUNT(*) AS total_sales,
    SUM(s.subtotal) AS gross_revenue,
    SUM(s.discount_amount) AS total_discounts,
    SUM(s.total_amount) AS net_revenue,
    AVG(s.total_amount) AS average_ticket
FROM sales s
WHERE s.status = 'paid'
    AND s.sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY DATE(s.sale_date)
ORDER BY date DESC;

-- Vendas pendentes
SELECT 
    s.id,
    s.customer_name,
    s.sale_date,
    s.total_amount,
    s.status,
    DATEDIFF(CURRENT_DATE, s.sale_date) AS days_pending
FROM sales s
WHERE s.status IN ('pending', 'awaiting_payment')
ORDER BY s.sale_date;

-- Detalhamento completo de uma venda
SELECT 
    s.id AS sale_id,
    s.customer_name,
    s.sale_date,
    si.product_name,
    si.quantity,
    si.unit_price,
    si.total_price,
    s.subtotal,
    s.discount_percentage,
    s.discount_amount,
    s.total_amount,
    s.status,
    s.payment_method,
    s.notes
FROM sales s
INNER JOIN sale_items si ON s.id = si.sale_id
WHERE s.id = 'ID_DA_VENDA'
ORDER BY si.product_name;

-- =====================================================
-- CONSULTAS DE ESTOQUE E MATERIAIS
-- =====================================================

-- Materiais com estoque crítico
SELECT 
    m.name,
    m.category,
    m.current_stock,
    m.low_stock_alert,
    m.unit,
    m.cost_per_unit,
    (m.low_stock_alert - m.current_stock) AS quantity_needed,
    ROUND((m.low_stock_alert - m.current_stock) * m.cost_per_unit, 2) AS estimated_cost
FROM materials m
WHERE m.current_stock <= m.low_stock_alert
ORDER BY (m.current_stock / m.low_stock_alert) ASC;

-- Custo de produção por produto
SELECT 
    p.name AS product_name,
    pm.material_name,
    pm.quantity,
    pm.unit,
    pm.cost_per_unit,
    pm.total_cost
FROM products p
INNER JOIN production_materials pm ON p.id = pm.product_id
ORDER BY p.name, pm.material_name;

-- Valor total do estoque
SELECT 
    SUM(price * quantity) AS total_inventory_value,
    SUM(production_cost * quantity) AS total_cost_value,
    SUM((price - COALESCE(production_cost, 0)) * quantity) AS total_profit_potential
FROM products
WHERE quantity > 0;

-- =====================================================
-- CONSULTAS FINANCEIRAS
-- =====================================================

-- Receita vs Despesas por mês
SELECT 
    month,
    net_revenue,
    total_expenses,
    (net_revenue - total_expenses) AS profit
FROM (
    SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') AS month,
        SUM(total_amount) AS net_revenue
    FROM sales
    WHERE status = 'paid'
    GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
) AS revenue
LEFT JOIN (
    SELECT 
        DATE_FORMAT(date, '%Y-%m') AS month,
        SUM(amount) AS total_expenses
    FROM expenses
    GROUP BY DATE_FORMAT(date, '%Y-%m')
) AS expenses ON revenue.month = expenses.month
ORDER BY month DESC;

-- Descontos concedidos por período
SELECT 
    DATE_FORMAT(sale_date, '%Y-%m') AS month,
    COUNT(*) AS total_sales_with_discount,
    SUM(discount_amount) AS total_discount_amount,
    AVG(discount_percentage) AS avg_discount_percentage
FROM sales
WHERE discount_amount > 0
    AND status = 'paid'
GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
ORDER BY month DESC;

-- Métodos de pagamento mais utilizados
SELECT 
    payment_method,
    COUNT(*) AS total_sales,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS average_ticket
FROM sales
WHERE status = 'paid'
    AND payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total_sales DESC;

-- =====================================================
-- CONSULTAS DE ENCOMENDAS
-- =====================================================

-- Encomendas pendentes
SELECT 
    o.id,
    o.customer_name,
    o.product_name,
    o.quantity,
    o.total_amount,
    o.order_date,
    o.expected_delivery_date,
    o.status,
    DATEDIFF(o.expected_delivery_date, CURRENT_DATE) AS days_until_delivery
FROM orders o
WHERE o.status NOT IN ('delivered', 'cancelled')
ORDER BY o.expected_delivery_date;

-- Encomendas atrasadas
SELECT 
    o.id,
    o.customer_name,
    o.product_name,
    o.quantity,
    o.expected_delivery_date,
    o.status,
    DATEDIFF(CURRENT_DATE, o.expected_delivery_date) AS days_late
FROM orders o
WHERE o.status NOT IN ('delivered', 'cancelled')
    AND o.expected_delivery_date < CURRENT_DATE
ORDER BY days_late DESC;

-- =====================================================
-- RELATÓRIOS ANALÍTICOS
-- =====================================================

-- Dashboard resumido
SELECT 
    (SELECT COUNT(*) FROM sales WHERE status = 'paid' AND DATE(sale_date) = CURRENT_DATE) AS sales_today,
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'paid' AND DATE(sale_date) = CURRENT_DATE) AS revenue_today,
    (SELECT COUNT(*) FROM products WHERE quantity <= (SELECT low_stock_threshold FROM settings LIMIT 1)) AS low_stock_count,
    (SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered', 'cancelled')) AS pending_orders,
    (SELECT COUNT(*) FROM customers WHERE MONTH(birth_date) = MONTH(CURRENT_DATE)) AS birthday_customers;

-- Performance de categorias
SELECT 
    p.category,
    COUNT(DISTINCT p.id) AS total_products,
    SUM(si.quantity) AS units_sold,
    SUM(si.total_price) AS total_revenue,
    AVG(p.price) AS avg_price
FROM products p
INNER JOIN sale_items si ON p.id = si.product_id
INNER JOIN sales s ON si.sale_id = s.id
WHERE s.status = 'paid'
GROUP BY p.category
ORDER BY total_revenue DESC;

-- Análise de créditos de potes
SELECT 
    COUNT(*) AS total_customers_with_credits,
    SUM(jar_credits) AS total_jar_credits,
    AVG(jar_credits) AS avg_credits_per_customer,
    MAX(jar_credits) AS max_credits
FROM customers
WHERE jar_credits > 0;

-- Análise de parcelas
SELECT 
    ip.description,
    ip.total_amount,
    ip.installments,
    ip.current_installment,
    ip.installment_amount,
    COUNT(ips.id) AS total_installments,
    SUM(CASE WHEN ips.is_paid THEN 1 ELSE 0 END) AS paid_installments,
    SUM(CASE WHEN ips.is_paid THEN ip.installment_amount ELSE 0 END) AS total_paid,
    (ip.installments - SUM(CASE WHEN ips.is_paid THEN 1 ELSE 0 END)) AS remaining_installments,
    (ip.total_amount - SUM(CASE WHEN ips.is_paid THEN ip.installment_amount ELSE 0 END)) AS remaining_amount
FROM installment_payments ip
INNER JOIN installment_payment_status ips ON ip.id = ips.installment_payment_id
GROUP BY ip.id, ip.description, ip.total_amount, ip.installments, ip.current_installment, ip.installment_amount
ORDER BY ip.start_date DESC;
