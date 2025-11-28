// Sistema de armazenamento local usando localStorage
import { Product, Customer, Sale, Order, Settings, Expense, InstallmentPayment, Material, CategoryPrice } from '@/types';

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
      const currentProduct = products[index];
      
      // Se o preço está sendo atualizado, adicionar ao histórico
      if (updates.price !== undefined && updates.price !== currentProduct.price) {
        const priceHistory = currentProduct.priceHistory || [];
        priceHistory.push({
          price: updates.price,
          date: new Date(),
          reason: (updates as any).priceChangeReason || 'Ajuste manual',
        });
        updates.priceHistory = priceHistory;
      }
      
      products[index] = { ...currentProduct, ...updates, updatedAt: new Date() };
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
    const sales = data ? JSON.parse(data) : [];
    
    // Adicionar campos padrão para vendas antigas
    return sales.map((sale: any) => ({
      ...sale,
      subtotal: sale.subtotal ?? sale.totalAmount,
      discountPercentage: sale.discountPercentage ?? 0,
      discountAmount: sale.discountAmount ?? 0,
    }));
  },
  
  save: (sales: Sale[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sales', JSON.stringify(sales));
  },
  
  add: (sale: Omit<Sale, 'id'>) => {
    const sales = saleStorage.getAll();
    
    // Validar estoque antes de criar a venda (exceto se for cancelada OU se vier de encomenda)
    if (sale.status !== 'Cancelled' && !sale.fromOrder) {
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
      status: sale.status || 'Pending', // Status padrão
    };
    sales.push(newSale);
    saleStorage.save(sales);
    
    // Atualizar estoque apenas se a venda não for cancelada E não vier de encomenda
    if (sale.status !== 'Cancelled' && !sale.fromOrder) {
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
        if (oldSale.status !== 'Cancelled' && updates.status === 'Cancelled') {
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
        if (oldSale.status === 'Cancelled' && updates.status && updates.status !== 'Cancelled') {
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
  
  delete: (id: string) => {
    const sales = saleStorage.getAll();
    const saleToDelete = sales.find(s => s.id === id);
    
    if (!saleToDelete) {
      throw new Error('Venda não encontrada');
    }
    
    // Se a venda foi paga e não veio de encomenda, devolver itens ao estoque
    if (saleToDelete.status === 'Paid' && !saleToDelete.fromOrder) {
      saleToDelete.items.forEach(item => {
        const product = productStorage.getById(item.productId);
        if (product) {
          productStorage.update(item.productId, {
            quantity: product.quantity + item.quantity
          });
        }
      });
    }
    
    // Remover a venda
    const updatedSales = sales.filter(s => s.id !== id);
    saleStorage.save(updatedSales);
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
      
      // Se o status mudou para "Delivered", converter em venda (SEM descontar estoque)
      if (oldOrder.status !== 'Delivered' && updates.status === 'Delivered') {
        // Criar venda automaticamente com status "Paid" e flag fromOrder
        saleStorage.add({
          customerId: newOrder.customerId,
          customerName: newOrder.customerName,
          items: newOrder.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          subtotal: newOrder.subtotal,
          discountPercentage: newOrder.discountPercentage,
          discountAmount: newOrder.discountAmount,
          shippingCost: newOrder.shippingCost,
          totalAmount: newOrder.totalAmount,
          saleDate: new Date(),
          status: 'Paid',
          paymentMethod: newOrder.paymentMethod,
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

// Storage para Configurações
const DEFAULT_SETTINGS: Settings = {
  lowStockThreshold: 10,
  companyName: 'Velas Aromáticas',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  birthdayDiscount: 0,
  jarDiscount: 0,
};

export const settingsStorage = {
  get: (): Settings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const data = localStorage.getItem('settings');
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },
  
  save: (settings: Settings) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('settings', JSON.stringify(settings));
  },
  
  update: (updates: Partial<Settings>) => {
    const current = settingsStorage.get();
    const updated = { ...current, ...updates };
    settingsStorage.save(updated);
    return updated;
  },
  
  reset: () => {
    settingsStorage.save(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
};

// Storage para Despesas
export const expenseStorage = {
  getAll: (): Expense[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('expenses');
    return data ? JSON.parse(data) : [];
  },
  
  save: (expenses: Expense[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('expenses', JSON.stringify(expenses));
  },
  
  add: (expense: Omit<Expense, 'id'>) => {
    const expenses = expenseStorage.getAll();
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
    };
    expenses.push(newExpense);
    expenseStorage.save(expenses);
    return newExpense;
  },
  
  update: (id: string, updates: Partial<Expense>) => {
    const expenses = expenseStorage.getAll();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates };
      expenseStorage.save(expenses);
      return expenses[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const expenses = expenseStorage.getAll();
    const filtered = expenses.filter(e => e.id !== id);
    expenseStorage.save(filtered);
  },
  
  getById: (id: string): Expense | undefined => {
    const expenses = expenseStorage.getAll();
    return expenses.find(e => e.id === id);
  }
};

// Storage para Parcelamentos
export const installmentStorage = {
  getAll: (): InstallmentPayment[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('installments');
    return data ? JSON.parse(data) : [];
  },
  
  save: (installments: InstallmentPayment[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('installments', JSON.stringify(installments));
  },
  
  add: (installment: Omit<InstallmentPayment, 'id'>) => {
    const installments = installmentStorage.getAll();
    const newInstallment: InstallmentPayment = {
      ...installment,
      id: generateId(),
    };
    installments.push(newInstallment);
    installmentStorage.save(installments);
    return newInstallment;
  },
  
  update: (id: string, updates: Partial<InstallmentPayment>) => {
    const installments = installmentStorage.getAll();
    const index = installments.findIndex(i => i.id === id);
    if (index !== -1) {
      installments[index] = { ...installments[index], ...updates };
      installmentStorage.save(installments);
      return installments[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const installments = installmentStorage.getAll();
    const filtered = installments.filter(i => i.id !== id);
    installmentStorage.save(filtered);
  },
  
  getById: (id: string): InstallmentPayment | undefined => {
    const installments = installmentStorage.getAll();
    return installments.find(i => i.id === id);
  },
  
  markInstallmentAsPaid: (id: string, installmentNumber: number) => {
    const installments = installmentStorage.getAll();
    const installment = installments.find(i => i.id === id);
    if (!installment || !installment.paymentStatus) return null;
    
    const statusIndex = installment.paymentStatus.findIndex(
      ps => ps.installmentNumber === installmentNumber
    );
    if (statusIndex === -1) return null;
    
    const currentStatus = installment.paymentStatus[statusIndex];
    const currentValue = currentStatus.isPaid;
    
    if (currentValue) {
      // Se está marcado, permitir desmarcar apenas se for a última parcela paga sequencial
      let lastPaidNumber = 0;
      installment.paymentStatus.forEach(ps => {
        if (ps.isPaid && ps.installmentNumber > lastPaidNumber) {
          lastPaidNumber = ps.installmentNumber;
        }
      });
      
      // Só pode desmarcar se for a última paga
      if (installmentNumber === lastPaidNumber) {
        installment.paymentStatus[statusIndex].isPaid = false;
        installment.paymentStatus[statusIndex].paidDate = undefined;
        installmentStorage.save(installments);
        return installment;
      }
      // Se não for a última, não faz nada
      return null;
    } else {
      // Se está desmarcado, verificar se pode marcar (deve ser sequencial)
      // Verificar se todas as anteriores estão pagas
      for (let i = 1; i < installmentNumber; i++) {
        const prevStatus = installment.paymentStatus.find(ps => ps.installmentNumber === i);
        if (!prevStatus?.isPaid) {
          // Tem parcela anterior não paga, não pode marcar
          return null;
        }
      }
      
      // Todas anteriores estão pagas, pode marcar
      installment.paymentStatus[statusIndex].isPaid = true;
      installment.paymentStatus[statusIndex].paidDate = new Date();
      installmentStorage.save(installments);
      return installment;
    }
  }
};

// Storage para Materiais (Catálogo)
export const materialStorage = {
  getAll: (): Material[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('materials');
    return data ? JSON.parse(data) : [];
  },
  
  save: (materials: Material[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('materials', JSON.stringify(materials));
  },
  
  add: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    const materials = materialStorage.getAll();
    const newMaterial: Material = {
      ...material,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    materials.push(newMaterial);
    materialStorage.save(materials);
    return newMaterial;
  },
  
  update: (id: string, updates: Partial<Material>) => {
    const materials = materialStorage.getAll();
    const index = materials.findIndex(m => m.id === id);
    if (index !== -1) {
      materials[index] = { ...materials[index], ...updates, updatedAt: new Date() };
      materialStorage.save(materials);
      return materials[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const materials = materialStorage.getAll();
    const filtered = materials.filter(m => m.id !== id);
    materialStorage.save(filtered);
  },
  
  getById: (id: string): Material | undefined => {
    const materials = materialStorage.getAll();
    return materials.find(m => m.id === id);
  }
};

// Storage para Preços por Categoria
export const categoryPriceStorage = {
  getAll: (): CategoryPrice[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('categoryPrices');
    return data ? JSON.parse(data) : [];
  },
  
  save: (categoryPrices: CategoryPrice[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('categoryPrices', JSON.stringify(categoryPrices));
  },
  
  add: (categoryPrice: Omit<CategoryPrice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const categoryPrices = categoryPriceStorage.getAll();
    const newCategoryPrice: CategoryPrice = {
      ...categoryPrice,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    categoryPrices.push(newCategoryPrice);
    categoryPriceStorage.save(categoryPrices);
    return newCategoryPrice;
  },
  
  update: (id: string, updates: Partial<CategoryPrice>) => {
    const categoryPrices = categoryPriceStorage.getAll();
    const index = categoryPrices.findIndex(cp => cp.id === id);
    if (index !== -1) {
      categoryPrices[index] = { ...categoryPrices[index], ...updates, updatedAt: new Date() };
      categoryPriceStorage.save(categoryPrices);
      return categoryPrices[index];
    }
    return null;
  },
  
  delete: (id: string) => {
    const categoryPrices = categoryPriceStorage.getAll();
    const filtered = categoryPrices.filter(cp => cp.id !== id);
    categoryPriceStorage.save(filtered);
  },
  
  getByCategory: (categoryName: string): CategoryPrice | undefined => {
    const categoryPrices = categoryPriceStorage.getAll();
    return categoryPrices.find(cp => cp.categoryName.toLowerCase() === categoryName.toLowerCase());
  }
};
