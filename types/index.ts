// Tipos para o sistema de controle de estoque

// Catálogo de materiais reutilizáveis
export interface Material {
  id: string;
  name: string;
  unit: string; // g, ml, unidade, etc
  totalQuantityPurchased: number; // Quantidade total comprada (para cálculo do custo)
  currentStock: number; // Estoque atual disponível
  lowStockAlert: number; // Alerta quando estoque fica abaixo deste valor
  totalCostPaid: number; // Custo total pago
  costPerUnit: number; // Custo por unidade (calculado)
  category?: string; // cera, essência, embalagem, etc
  supplier?: string; // Fornecedor
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Material usado em um produto específico
export interface ProductionMaterial {
  id: string;
  materialId: string; // Referência ao material do catálogo
  materialName: string;
  quantity: number; // Quantidade usada neste produto
  unit: string; // g, ml, unidade, etc
  costPerUnit: number; // Custo por unidade
  totalCost: number; // quantity * costPerUnit
}

export interface PriceHistory {
  price: number;
  date: Date;
  reason?: string; // Ex: "Atualização de categoria", "Ajuste manual"
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category?: string;
  fragrance?: string;
  weight?: string;
  productionMaterials?: ProductionMaterial[]; // Materiais usados na produção
  productionCost?: number; // Custo total de produção calculado
  profitMargin?: number; // Margem de lucro (price - productionCost)
  priceHistory?: PriceHistory[]; // Histórico de alterações de preço
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  birthDate?: Date; // Data de aniversário do cliente
  jarCredits: number; // Créditos de potes devolvidos (1 pote = desconto em 1 vela)
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number; // Valor antes do desconto
  discountPercentage: number; // Desconto em percentual (0-100)
  discountAmount: number; // Valor do desconto em reais
  shippingCost: number; // Custo do frete
  totalAmount: number; // Valor final após desconto + frete
  saleDate: Date;
  status: 'Pending' | 'AwaitingPayment' | 'Paid' | 'Cancelled';
  paymentMethod?: 'Cash' | 'Pix' | 'Debit' | 'Credit';
  notes?: string;
  fromOrder?: boolean; // Indica se veio de uma encomenda
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  orderDate: Date;
  expectedDeliveryDate: Date;
  deliveredDate?: Date; // Data real da entrega
  status: 'Pending' | 'InProduction' | 'ReadyForDelivery' | 'Delivered' | 'Cancelled';
  paymentMethod?: 'Cash' | 'Pix' | 'Debit' | 'Credit';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  lowStockThreshold: number;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  birthdayDiscount: number; // Desconto de aniversário em percentual (0-100)
  jarDiscount: number; // Valor do desconto por pote devolvido (em R$)
}

export interface CategoryPrice {
  id: string;
  categoryName: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  category: 'Production' | 'Investment' | 'FixedCost' | 'VariableCost' | 'Other';
  amount: number;
  date: Date;
  isRecurring: boolean; // Se é despesa recorrente mensal
  notes?: string;
}

export interface InstallmentPaymentStatus {
  id: string;
  installmentPaymentId: string;
  installmentNumber: number;
  isPaid: boolean;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstallmentPayment {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  currentInstallment: number;
  installmentAmount: number;
  startDate: Date;
  category: 'Production' | 'Investment' | 'Equipment' | 'Other';
  notes?: string;
  paymentStatus: InstallmentPaymentStatus[]; // Status de pagamento de cada parcela
}
