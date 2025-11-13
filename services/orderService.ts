import api from './api';
import { Order } from '@/types';
import { OrderDto } from '@/types/dtos';

export const orderService = {
  // Listar todas as encomendas
  getAll: async (): Promise<Order[]> => {
    return api.get<Order[]>('/Orders');
  },

  // Obter uma encomenda por ID
  getById: async (id: string): Promise<Order> => {
    return api.get<Order>(`/Orders/${id}`);
  },

  // Obter encomendas por cliente
  getByCustomer: async (customerId: string): Promise<Order[]> => {
    return api.get<Order[]>(`/Orders/customer/${customerId}`);
  },

  // Obter encomendas pendentes
  getPending: async (): Promise<Order[]> => {
    return api.get<Order[]>('/Orders/pending');
  },

  // Criar encomenda
  create: async (orderDto: OrderDto): Promise<Order> => {
    return api.post<Order>('/Orders', orderDto);
  },

  // Atualizar encomenda
  update: async (id: string, orderDto: OrderDto): Promise<void> => {
    return api.put<void>(`/Orders/${id}`, orderDto);
  },

  // Atualizar status da encomenda
  updateStatus: async (id: string, status: string, paymentMethod?: string): Promise<Order> => {
    return api.patch<Order>(`/Orders/${id}/status`, { status, paymentMethod });
  },

  // Deletar encomenda
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Orders/${id}`);
  },
};

export default orderService;
