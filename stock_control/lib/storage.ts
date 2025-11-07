// Sistema de armazenamento local usando localStorage
import { Product, Customer, Sale, Order } from '@/types';

// Função auxiliar para gerar IDs únicos
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Storage para Produtos
export const productStorage = {
  getAll: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('products');
    return data ? JSON.parse(data) : [];
  },
  
  save: (products: Product[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('products', JSON.stringify(products));
  },
  
  add: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const products = productStorage.getAll();
    const newProduct: Product = {
      ...product,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    products.push(newProduct);
    productStorage.save(products);
    return newProduct;
  },
  
  update: (id: string, updates: Partial<Product>) => {
    const products = productStorage.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates, updatedAt: new Date() };
      productStorage.save(products);
      return products[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const products = productStorage.getAll();
    const filtered = products.filter(p => p.id !== id);
    productStorage.save(filtered);
  },
  
  getById: (id: string): Product | undefined => {
    const products = productStorage.getAll();
    return products.find(p => p.id === id);
  }
};

// Storage para Clientes
export const customerStorage = {
  getAll: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('customers');
    return data ? JSON.parse(data) : [];
  },
  
  save: (customers: Customer[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('customers', JSON.stringify(customers));
  },
  
  add: (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const customers = customerStorage.getAll();
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      createdAt: new Date(),
    };
    customers.push(newCustomer);
    customerStorage.save(customers);
    return newCustomer;
  },
  
  update: (id: string, updates: Partial<Customer>) => {
    const customers = customerStorage.getAll();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      customerStorage.save(customers);
      return customers[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const customers = customerStorage.getAll();
    const filtered = customers.filter(c => c.id !== id);
    customerStorage.save(filtered);
  },
  
  getById: (id: string): Customer | undefined => {
    const customers = customerStorage.getAll();
    return customers.find(c => c.id === id);
  }
};

// Storage para Vendas
export const saleStorage = {
  getAll: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('sales');
    return data ? JSON.parse(data) : [];
  },
  
  save: (sales: Sale[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sales', JSON.stringify(sales));
  },
  
  add: (sale: Omit<Sale, 'id'>) => {
    const sales = saleStorage.getAll();
    
    // Validar estoque antes de criar a venda (exceto se for cancelada OU se vier de encomenda)
    if (sale.status !== 'cancelled' && !sale.fromOrder) {
      for (const item of sale.items) {
        const product = productStorage.getById(item.productId);
        if (!product) {
          throw new Error(`Produto ${item.productName} não encontrado`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.quantity}, Solicitado: ${item.quantity}`);
        }
      }
    }
    
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      status: sale.status || 'pending', // Status padrão
    };
    sales.push(newSale);
    saleStorage.save(sales);
    
    // Atualizar estoque apenas se a venda não for cancelada E não vier de encomenda
    if (sale.status !== 'cancelled' && !sale.fromOrder) {
      sale.items.forEach(item => {
        const product = productStorage.getById(item.productId);
        if (product) {
          productStorage.update(item.productId, {
            quantity: product.quantity - item.quantity
          });
        }
      });
    }
    
    return newSale;
  },
  
  update: (id: string, updates: Partial<Sale>) => {
    const sales = saleStorage.getAll();
    const index = sales.findIndex(s => s.id === id);
    if (index !== -1) {
      const oldSale = sales[index];
      const newSale = { ...oldSale, ...updates };
      
      // Apenas manipular estoque se a venda NÃO vier de encomenda
      if (!oldSale.fromOrder) {
        // Se o status mudou de não-cancelado para cancelado, devolver ao estoque
        if (oldSale.status !== 'cancelled' && updates.status === 'cancelled') {
          oldSale.items.forEach(item => {
            const product = productStorage.getById(item.productId);
            if (product) {
              productStorage.update(item.productId, {
                quantity: product.quantity + item.quantity
              });
            }
          });
        }
        
        // Se o status mudou de cancelado para outro, validar e remover do estoque
        if (oldSale.status === 'cancelled' && updates.status && updates.status !== 'cancelled') {
          // Validar estoque antes de remover
          for (const item of oldSale.items) {
            const product = productStorage.getById(item.productId);
            if (!product) {
              throw new Error(`Produto ${item.productName} não encontrado`);
            }
            if (product.quantity < item.quantity) {
              throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.quantity}, Necessário: ${item.quantity}`);
            }
          }
          
          // Remover do estoque
          oldSale.items.forEach(item => {
            const product = productStorage.getById(item.productId);
            if (product) {
              productStorage.update(item.productId, {
                quantity: product.quantity - item.quantity
              });
            }
          });
        }
      }
      
      sales[index] = newSale;
      saleStorage.save(sales);
      return newSale;
    }
    return null;
  },
  
  getById: (id: string): Sale | undefined => {
    const sales = saleStorage.getAll();
    return sales.find(s => s.id === id);
  }
};

// Storage para Encomendas
export const orderStorage = {
  getAll: (): Order[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('orders');
    return data ? JSON.parse(data) : [];
  },
  
  save: (orders: Order[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('orders', JSON.stringify(orders));
  },
  
  add: (order: Omit<Order, 'id'>) => {
    const orders = orderStorage.getAll();
    const newOrder: Order = {
      ...order,
      id: generateId(),
    };
    orders.push(newOrder);
    orderStorage.save(orders);
    return newOrder;
  },
  
  update: (id: string, updates: Partial<Order>) => {
    const orders = orderStorage.getAll();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      const oldOrder = orders[index];
      const newOrder = { ...oldOrder, ...updates };
      
      // Se o status mudou para "delivered", converter em venda (SEM descontar estoque)
      if (oldOrder.status !== 'delivered' && updates.status === 'delivered') {
        // Criar venda automaticamente com status "paid" e flag fromOrder
        saleStorage.add({
          customerId: newOrder.customerId,
          customerName: newOrder.customerName,
          items: [{
            productId: newOrder.productId,
            productName: newOrder.productName,
            quantity: newOrder.quantity,
            unitPrice: newOrder.unitPrice,
            totalPrice: newOrder.totalAmount
          }],
          totalAmount: newOrder.totalAmount,
          saleDate: new Date(),
          status: 'paid',
          fromOrder: true, // Flag para não descontar do estoque
          notes: `Encomenda #${newOrder.id} - ${newOrder.notes || ''}`
        });
      }
      
      orders[index] = newOrder;
      orderStorage.save(orders);
      return newOrder;
    }
    return null;
  },
  
  delete: (id: string) => {
    const orders = orderStorage.getAll();
    const filtered = orders.filter(o => o.id !== id);
    orderStorage.save(filtered);
  }
};
