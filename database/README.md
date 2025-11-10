# Estrutura do Banco de Dados - Sistema de Controle de Estoque Mespin

## 📋 Visão Geral

Este diretório contém os scripts SQL para criação e gerenciamento do banco de dados do sistema de controle de estoque.

## 📁 Arquivos Disponíveis

### 1. `schema.sql` (MySQL/MariaDB)
Script completo para criação de todas as tabelas, índices, triggers e views para MySQL/MariaDB.

### 2. `schema_postgresql.sql` (PostgreSQL)
Script completo para criação de todas as tabelas, índices, triggers e views para PostgreSQL.

### 3. `queries.sql`
Coleção de queries úteis para consultas, relatórios e análises do sistema.

## 🗄️ Estrutura das Tabelas

### Tabelas Principais

#### `settings`
Configurações gerais do sistema (singleton - apenas um registro).
- Limiar de estoque baixo
- Dados da empresa
- Configurações de descontos (aniversário e potes)

#### `customers`
Cadastro completo de clientes.
- Dados pessoais (nome, email, telefone, endereço)
- Data de aniversário (para desconto automático)
- Créditos de potes devolvidos

#### `products`
Produtos finais disponíveis para venda.
- Informações básicas (nome, descrição, preço)
- Controle de estoque (quantidade)
- Classificação (categoria, fragrância, peso)
- Custos e margens (custo de produção, margem de lucro)

#### `materials`
Catálogo de materiais reutilizáveis para produção.
- Controle de estoque de matérias-primas
- Custos e fornecedores
- Alertas de estoque baixo

#### `production_materials`
Relacionamento N:N entre produtos e materiais.
- Define quais materiais são usados em cada produto
- Quantidades e custos por material

#### `sales`
Registro de todas as vendas.
- Dados do cliente e data
- Valores (subtotal, descontos, total)
- Status (pendente, aguardando pagamento, pago, cancelado)
- Método de pagamento

#### `sale_items`
Itens de cada venda (relacionamento 1:N com sales).
- Produto vendido
- Quantidade e preços

#### `orders`
Encomendas/pedidos personalizados.
- Cliente e produto
- Datas (pedido, entrega esperada, entrega real)
- Status do pedido
- Valores e pagamento

### Tabelas de Suporte

#### `price_history`
Histórico de alterações de preço dos produtos.
- Rastreamento de mudanças de preço
- Motivo da alteração

#### `category_prices`
Preços padrão por categoria de produto.
- Facilita precificação de novos produtos

#### `expenses`
Registro de despesas do negócio.
- Classificação por categoria
- Despesas únicas ou recorrentes

#### `installment_payments`
Pagamentos parcelados.
- Valor total e número de parcelas
- Categoria da despesa

#### `installment_payment_status`
Status individual de cada parcela.
- Rastreamento de parcelas pagas/pendentes

## 🔗 Relacionamentos

```
customers (1) → (N) sales
customers (1) → (N) orders

products (1) → (N) sale_items
products (1) → (N) production_materials
products (1) → (N) price_history

materials (1) → (N) production_materials

sales (1) → (N) sale_items

installment_payments (1) → (N) installment_payment_status
```

## 🔍 Views Disponíveis

### `low_stock_products`
Produtos com estoque abaixo do limiar configurado.

### `sales_detailed`
Vendas com todos os detalhes dos itens vendidos.

### `low_stock_materials`
Materiais com estoque abaixo do alerta configurado.

### `monthly_sales`
Resumo de vendas agrupadas por mês.

### `birthday_customers`
Clientes aniversariantes do mês atual.

## ⚙️ Triggers Automáticos

### MySQL/MariaDB

1. **`before_material_update`**
   - Atualiza automaticamente o custo por unidade quando materiais são modificados

2. **`after_production_materials_change`**
   - Recalcula custo de produção e margem de lucro quando materiais de produção são modificados

### PostgreSQL

1. **`update_updated_at_column()`**
   - Atualiza automaticamente o campo `updated_at` em todas as tabelas relevantes

2. **`update_material_cost_per_unit()`**
   - Calcula custo por unidade dos materiais

3. **`update_product_production_cost()`**
   - Recalcula custos e margens dos produtos

## 📊 Índices para Performance

Todos os campos frequentemente usados em buscas e joins possuem índices:
- IDs de relacionamento (customer_id, product_id, etc.)
- Campos de busca (name, email, category)
- Campos de ordenação (dates, status)
- Campos de filtro (quantity, stock levels)

## 🚀 Como Usar

### MySQL/MariaDB

```bash
# Criar banco de dados
mysql -u root -p -e "CREATE DATABASE mespin_stock;"

# Executar script de criação
mysql -u root -p mespin_stock < schema.sql

# Executar queries de exemplo (opcional)
mysql -u root -p mespin_stock < queries.sql
```

### PostgreSQL

```bash
# Criar banco de dados
psql -U postgres -c "CREATE DATABASE mespin_stock;"

# Executar script de criação
psql -U postgres -d mespin_stock -f schema_postgresql.sql

# Executar queries de exemplo (opcional)
psql -U postgres -d mespin_stock -f queries.sql
```

## 🔐 Segurança

### Recomendações:

1. **Usuários e Permissões**
   ```sql
   -- Criar usuário específico para a aplicação
   CREATE USER 'mespin_app'@'localhost' IDENTIFIED BY 'senha_forte';
   GRANT SELECT, INSERT, UPDATE, DELETE ON mespin_stock.* TO 'mespin_app'@'localhost';
   ```

2. **Backup Regular**
   ```bash
   # MySQL
   mysqldump -u root -p mespin_stock > backup_$(date +%Y%m%d).sql
   
   # PostgreSQL
   pg_dump -U postgres mespin_stock > backup_$(date +%Y%m%d).sql
   ```

3. **Validação de Dados**
   - Constraints CHECK garantem integridade dos dados
   - Foreign Keys impedem exclusões inválidas
   - Campos obrigatórios marcados como NOT NULL

## 📈 Estatísticas e Monitoramento

### Queries úteis para monitoramento:

```sql
-- Tamanho das tabelas (MySQL)
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'mespin_stock'
ORDER BY size_mb DESC;

-- Número de registros por tabela
SELECT 
    table_name,
    table_rows
FROM information_schema.TABLES
WHERE table_schema = 'mespin_stock'
ORDER BY table_rows DESC;
```

## 🔄 Migração de Dados

Para migrar dados do localStorage para o banco de dados:

1. Exportar dados do localStorage (JSON)
2. Converter para formato SQL
3. Importar usando os scripts apropriados

Exemplo de conversão será fornecido em scripts futuros de migração.

## 📝 Notas Importantes

1. **UUIDs vs IDs Numéricos**
   - MySQL usa VARCHAR(36) para IDs
   - PostgreSQL usa tipo UUID nativo
   - Ambos garantem unicidade global

2. **Campos Calculados**
   - `cost_per_unit` em materials
   - `production_cost` e `profit_margin` em products
   - São atualizados automaticamente via triggers

3. **Soft Delete**
   - Status 'cancelled' usado ao invés de exclusão física
   - Mantém histórico completo

4. **Timestamps**
   - Todos os registros têm `created_at`
   - Tabelas principais têm `updated_at` (atualizado automaticamente)

## 🆘 Troubleshooting

### Problema: Erro ao criar triggers
**Solução**: Verificar permissões TRIGGER no usuário do banco

### Problema: Views não atualizam
**Solução**: Recriar views após alterações nas tabelas base

### Problema: Performance lenta em queries
**Solução**: Verificar uso de índices com EXPLAIN

## 📞 Suporte

Para dúvidas sobre a estrutura do banco de dados, consulte a documentação dos tipos em `types/index.ts`.
