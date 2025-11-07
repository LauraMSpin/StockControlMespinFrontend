// Migrações para atualizar dados antigos
import { orderStorage, productStorage } from './storage';

export const migrateOrders = () => {
  if (typeof window === 'undefined') return;
  
  const orders = orderStorage.getAll();
  let needsUpdate = false;

  const updatedOrders = orders.map(order => {
    // Se a encomenda não tem unitPrice ou totalAmount, calcular
    if (!order.unitPrice || !order.totalAmount) {
      needsUpdate = true;
      const product = productStorage.getById(order.productId);
      const unitPrice = product?.price || 0;
      const totalAmount = unitPrice * order.quantity;
      
      return {
        ...order,
        unitPrice,
        totalAmount
      };
    }
    return order;
  });

  if (needsUpdate) {
    orderStorage.save(updatedOrders);
    console.log('Encomendas migradas com sucesso!');
  }
};
