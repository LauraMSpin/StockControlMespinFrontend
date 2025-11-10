import api from './api';
import { Customer } from '@/types';

export const customerService = {
  // Listar todos os clientes
  getAll: async (): Promise<Customer[]> => {
    return api.get<Customer[]>('/Customers');
  },

  // Obter um cliente por ID
  getById: async (id: string): Promise<Customer> => {
    return api.get<Customer>(`/Customers/${id}`);
  },

  // Obter clientes aniversariantes do mês
  getBirthdayMonth: async (): Promise<Customer[]> => {
    return api.get<Customer[]>('/Customers/birthday-month');
  },

  // Obter clientes com créditos de potes
  getWithJarCredits: async (): Promise<Customer[]> => {
    return api.get<Customer[]>('/Customers/with-jar-credits');
  },

  // Criar cliente
  create: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    return api.post<Customer>('/Customers', customer);
  },

  // Atualizar cliente
  update: async (id: string, customer: Customer): Promise<void> => {
    return api.put<void>(`/Customers/${id}`, customer);
  },

  // Deletar cliente
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Customers/${id}`);
  },

  // Atualizar créditos de potes
  updateJarCredits: async (id: string, credits: number): Promise<{ id: string; name: string; jarCredits: number }> => {
    return api.post<{ id: string; name: string; jarCredits: number }>(`/Customers/${id}/jar-credits`, credits);
  },
};

export default customerService;
