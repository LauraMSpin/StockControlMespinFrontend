import api from './api';
import { InstallmentPayment } from '@/types';

export const installmentService = {
  // Listar todos os parcelamentos
  getAll: async (): Promise<InstallmentPayment[]> => {
    return api.get<InstallmentPayment[]>('/Installments');
  },

  // Obter um parcelamento por ID
  getById: async (id: string): Promise<InstallmentPayment> => {
    return api.get<InstallmentPayment>(`/Installments/${id}`);
  },

  // Obter parcelamentos por categoria
  getByCategory: async (category: string): Promise<InstallmentPayment[]> => {
    return api.get<InstallmentPayment[]>(`/Installments/category/${category}`);
  },

  // Obter parcelamentos pendentes
  getPending: async (): Promise<InstallmentPayment[]> => {
    return api.get<InstallmentPayment[]>('/Installments/pending');
  },

  // Criar parcelamento
  create: async (installment: Omit<InstallmentPayment, 'id'>): Promise<InstallmentPayment> => {
    return api.post<InstallmentPayment>('/Installments', installment);
  },

  // Atualizar parcelamento
  update: async (id: string, installment: Partial<InstallmentPayment>): Promise<void> => {
    return api.put<void>(`/Installments/${id}`, installment);
  },

  // Marcar parcela como paga/não paga
  toggleInstallment: async (id: string, installmentNumber: number): Promise<InstallmentPayment> => {
    return api.post<InstallmentPayment>(`/Installments/${id}/toggle-payment/${installmentNumber}`, {});
  },

  // Deletar parcelamento
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Installments/${id}`);
  },
};

export default installmentService;
