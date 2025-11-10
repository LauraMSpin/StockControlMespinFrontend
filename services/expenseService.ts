import api from './api';
import { Expense } from '@/types';

export const expenseService = {
  // Listar todas as despesas
  getAll: async (): Promise<Expense[]> => {
    return api.get<Expense[]>('/Expenses');
  },

  // Obter uma despesa por ID
  getById: async (id: string): Promise<Expense> => {
    return api.get<Expense>(`/Expenses/${id}`);
  },

  // Obter despesas por categoria
  getByCategory: async (category: string): Promise<Expense[]> => {
    return api.get<Expense[]>(`/Expenses/category/${category}`);
  },

  // Obter despesas por período
  getByDateRange: async (startDate: string, endDate: string): Promise<Expense[]> => {
    return api.get<Expense[]>(`/Expenses/date-range?startDate=${startDate}&endDate=${endDate}`);
  },

  // Obter despesas recorrentes
  getRecurring: async (): Promise<Expense[]> => {
    return api.get<Expense[]>('/Expenses/recurring');
  },

  // Criar despesa
  create: async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
    return api.post<Expense>('/Expenses', expense);
  },

  // Atualizar despesa
  update: async (id: string, expense: Partial<Expense>): Promise<void> => {
    return api.put<void>(`/Expenses/${id}`, expense);
  },

  // Deletar despesa
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Expenses/${id}`);
  },
};

export default expenseService;
