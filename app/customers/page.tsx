'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Customer } from '@/types';
import { customerService, saleService } from '@/services';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    birthDay: '',
    birthMonth: '',
    jarCredits: '0',
  });

  useEffect(() => {
    loadCustomers();
    
    // Verificar se deve abrir o modal automaticamente
    if (searchParams.get('openModal') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const allCustomers = await customerService.getAll();
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError('Não foi possível carregar os clientes. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Criar data de aniversário com ano fixo (2000) apenas para mês/dia
    let birthDate: Date | undefined = undefined;
    if (formData.birthDay && formData.birthMonth) {
      const day = parseInt(formData.birthDay);
      const month = parseInt(formData.birthMonth);
      if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        birthDate = new Date(2000, month - 1, day);
      }
    }
    
    const customerData: Partial<Customer> = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      birthDate,
      jarCredits: parseInt(formData.jarCredits) || 0,
    };
    
    try {
      if (editingCustomer) {
        // O backend espera o objeto completo do cliente com id e createdAt
        const fullCustomerData: Customer = {
          ...editingCustomer,
          ...customerData,
          id: editingCustomer.id,
          createdAt: editingCustomer.createdAt,
        };
        await customerService.update(editingCustomer.id, fullCustomerData);
      } else {
        await customerService.create(customerData as Omit<Customer, 'id' | 'createdAt'>);
      }

      resetForm();
      await loadCustomers();
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Não foi possível salvar o cliente. Tente novamente.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    
    // Extrair dia e mês da data de aniversário
    let birthDay = '';
    let birthMonth = '';
    if (customer.birthDate) {
      const date = new Date(customer.birthDate);
      birthDay = String(date.getDate());
      birthMonth = String(date.getMonth() + 1);
    }
    
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      birthDay,
      birthMonth,
      jarCredits: (customer.jarCredits || 0).toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Verificar se o cliente tem vendas ativas (não canceladas)
      const sales = await saleService.getByCustomer(id);
      const activeSales = sales.filter(sale => sale.status !== 'Cancelled');

      if (activeSales.length > 0) {
        alert(`Este cliente não pode ser excluído porque possui ${activeSales.length} venda(s) ativa(s). Cancele as vendas antes de excluir o cliente.`);
        return;
      }

      if (confirm('Tem certeza que deseja excluir este cliente?')) {
        await customerService.delete(id);
        await loadCustomers();
      }
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      alert('Não foi possível excluir o cliente. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      birthDay: '',
      birthMonth: '',
      jarCredits: '0',
    });
    setEditingCustomer(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Gerencie seus clientes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto bg-[#22452B] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-[#5D663D] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm sm:text-base">Novo Cliente</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Carregando clientes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg shadow-md p-8 sm:p-12 text-center">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-semibold text-red-900 mb-2">Erro ao carregar</h3>
          <p className="text-sm sm:text-base text-red-700 mb-4">{error}</p>
          <button
            onClick={loadCustomers}
            className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Tentar Novamente
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#B49959] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-semibold text-[#2C1810] mb-2">Nenhum cliente cadastrado</h3>
          <p className="text-sm sm:text-base text-[#814923] mb-4">Comece adicionando seu primeiro cliente</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#22452B] text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-[#5D663D] transition-colors text-sm sm:text-base"
          >
            Adicionar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {customers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#EEF2E8] rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#22452B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{customer.name}</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3 sm:mb-4">
                {customer.phone && (
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 break-all">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {customer.email}
                  </div>
                )}
                {customer.birthDate && (
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <span className="mr-2">🎂</span>
                    {new Date(customer.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </div>
                )}
                {(customer.jarCredits || 0) > 0 && (
                  <div className="flex items-center text-xs sm:text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                    <span className="mr-2">♻️</span>
                    {customer.jarCredits || 0} {(customer.jarCredits || 0) === 1 ? 'pote' : 'potes'} devolvido{(customer.jarCredits || 0) === 1 ? '' : 's'}
                  </div>
                )}
                {customer.city && customer.state && (
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {customer.city}, {customer.state}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(customer)}
                  className="flex-1 bg-[#EEF2E8] text-[#5D663D] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#22452B] hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="flex-1 bg-[#FFEDD5] text-[#AF6138] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#AF6138] hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Data de Aniversário 🎂
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Dia</label>
                      <select
                        value={formData.birthDay}
                        onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">--</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mês</label>
                      <select
                        value={formData.birthMonth}
                        onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">--</option>
                        <option value="1">Janeiro</option>
                        <option value="2">Fevereiro</option>
                        <option value="3">Março</option>
                        <option value="4">Abril</option>
                        <option value="5">Maio</option>
                        <option value="6">Junho</option>
                        <option value="7">Julho</option>
                        <option value="8">Agosto</option>
                        <option value="9">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Cliente receberá desconto automático em compras no mês de aniversário
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Créditos de Potes Devolvidos ♻️
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <input
                      type="number"
                      min="0"
                      value={formData.jarCredits}
                      onChange={(e) => setFormData({ ...formData, jarCredits: e.target.value })}
                      className="w-full sm:w-32 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                    />
                    <span className="text-xs sm:text-sm text-gray-600">potes devolvidos</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    A cada compra de vela, 1 crédito será usado automaticamente para desconto (1 pote = 1 vela)
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, complemento"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 sm:px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#5D663D] transition-colors text-sm sm:text-base"
                >
                  {editingCustomer ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
