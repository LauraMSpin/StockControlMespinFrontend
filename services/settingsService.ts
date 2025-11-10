import api from './api';
import { Settings } from '@/types';

export const settingsService = {
  // Obter configurações
  get: async (): Promise<Settings> => {
    return api.get<Settings>('/Settings');
  },

  // Atualizar configurações
  update: async (settings: Settings): Promise<void> => {
    return api.put<void>('/Settings', settings);
  },
};

export default settingsService;
