'use client';

import { useState, useEffect } from 'react';
import { Settings } from '@/types';
import { settingsService } from '@/services';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    lowStockThreshold: 10,
    companyName: 'Velas Aromáticas',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    birthdayDiscount: 0,
    jarDiscount: 0,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentSettings = await settingsService.get();
      setSettings(currentSettings);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Não foi possível carregar as configurações. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Não foi possível salvar as configurações. Tente novamente.');
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      const defaultSettings: Settings = {
        lowStockThreshold: 10,
        companyName: 'Velas Aromáticas',
        companyPhone: '',
        companyEmail: '',
        companyAddress: '',
        birthdayDiscount: 0,
        jarDiscount: 0,
      };
      
      try {
        await settingsService.update(defaultSettings);
        setSettings(defaultSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        console.error('Erro ao restaurar configurações:', err);
        alert('Não foi possível restaurar as configurações. Tente novamente.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-red-900 mb-2">Erro ao carregar</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadSettings}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Personalize as configurações do sistema</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          {/* Configurações de Estoque */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Controle de Estoque
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite para Estoque Baixo *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.lowStockThreshold}
                  onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">
                  Produtos com quantidade abaixo deste valor serão considerados com estoque baixo
                </span>
              </div>
            </div>
          </div>

          {/* Desconto de Aniversário */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎂</span>
              Desconto de Aniversário
            </h2>
            
            <div className="mb-4 bg-pink-50 border border-pink-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto Automático no Mês de Aniversário (%) *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={settings.birthdayDiscount || 0}
                  onChange={(e) => setSettings({ ...settings, birthdayDiscount: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-4 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <p className="mt-2 text-xs text-pink-700">
                Este desconto será aplicado automaticamente em todas as vendas de clientes durante o mês de aniversário deles. Configure 0 para desativar.
              </p>
            </div>
          </div>

          {/* Desconto por Pote Devolvido */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🫙</span>
              Desconto por Pote Devolvido
            </h2>
            
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Desconto por Pote (R$) *
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={settings.jarDiscount || 0}
                  onChange={(e) => setSettings({ ...settings, jarDiscount: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <p className="mt-2 text-xs text-green-700">
                <strong>Sistema 1:1</strong> - Para cada vela comprada, 1 crédito de pote será usado automaticamente. 
                Exemplo: Cliente com 8 potes compra 2 velas → usa 2 créditos (fica com 6). 
                Se comprar 1 vela → usa 1 crédito. Configure R$ 0,00 para desativar.
              </p>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Informações da Empresa
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Velas Aromáticas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={settings.companyPhone}
                  onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contato@velasaromaticas.com.br"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <textarea
                  value={settings.companyAddress}
                  onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rua das Velas, 123 - Centro - São Paulo - SP"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Restaurar Padrão
            </button>
            
            <div className="flex items-center gap-4">
              {saved && (
                <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Configurações salvas!
                </span>
              )}
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Card de Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 max-w-3xl">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Sobre as Configurações</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• As configurações são salvas automaticamente no seu navegador</li>
              <li>• O limite de estoque baixo afeta os alertas no dashboard e na listagem de produtos</li>
              <li>• As informações da empresa podem ser usadas em relatórios e notas fiscais</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
