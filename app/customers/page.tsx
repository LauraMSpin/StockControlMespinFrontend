'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Customer } from '@/types';
import { customerService, saleService } from '@/services';

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para busca, filtro e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBirthday, setFilterBirthday] = useState(false);
  const [filterJarCredits, setFilterJarCredits] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'credits'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const itemsPerPage = 10;
  
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

  // Função para verificar se é aniversariante do mês
  const isBirthdayMonth = (customer: Customer) => {
    if (!customer.birthDate) return false;
    const today = new Date();
    const birthDate = new Date(customer.birthDate);
    return today.getMonth() === birthDate.getMonth();
  };

  // Filtrar e ordenar clientes
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      // Filtro de busca
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de aniversariantes
      const matchesBirthday = !filterBirthday || isBirthdayMonth(customer);

      // Filtro de créditos de potes
      const matchesJarCredits = !filterJarCredits || (customer.jarCredits || 0) > 0;

      return matchesSearch && matchesBirthday && matchesJarCredits;
    });

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'credits') {
        return (b.jarCredits || 0) - (a.jarCredits || 0);
      }
      return 0;
    });

    return filtered;
  }, [customers, searchTerm, filterBirthday, filterJarCredits, sortBy]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredAndSortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBirthday, filterJarCredits, sortBy]);

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
        <>
          {/* Barra de Ferramentas */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nome, email, telefone ou cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterBirthday(!filterBirthday)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterBirthday
                      ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🎂 Aniversariantes
                </button>
                <button
                  onClick={() => setFilterJarCredits(!filterJarCredits)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterJarCredits
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ♻️ Com Créditos
                </button>
              </div>

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'recent' | 'credits')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
              >
                <option value="name">A-Z</option>
                <option value="recent">Mais Recentes</option>
                <option value="credits">Mais Créditos</option>
              </select>

              {/* Toggle de Visualização */}
              <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-[#22452B] text-white' : 'text-gray-600'}`}
                  title="Visualização em Tabela"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-[#22452B] text-white' : 'text-gray-600'}`}
                  title="Visualização em Grade"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contador de Resultados */}
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {paginatedCustomers.length} de {filteredAndSortedCustomers.length} cliente(s)
              {searchTerm && ` para "${searchTerm}"`}
            </div>
          </div>

          {/* Resultados */}
          {filteredAndSortedCustomers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
              <p className="text-gray-600 mb-4">Tente ajustar os filtros de busca</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterBirthday(false);
                  setFilterJarCredits(false);
                }}
                className="text-[#22452B] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Visualização em Tabela */
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aniversário
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créditos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-[#EEF2E8] flex items-center justify-center">
                                <span className="text-[#22452B] font-semibold">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                          <div className="text-sm text-gray-500">{customer.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {customer.birthDate ? (
                            <div className="flex items-center justify-center">
                              <span className={`text-sm ${isBirthdayMonth(customer) ? 'font-semibold text-pink-600' : 'text-gray-900'}`}>
                                {isBirthdayMonth(customer) && '🎂 '}
                                {new Date(customer.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(customer.jarCredits || 0) > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ♻️ {customer.jarCredits}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-[#22452B] hover:text-[#5D663D] mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-[#AF6138] hover:text-[#814923]"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Visualização em Grade */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedCustomers.map((customer) => (
                <div key={customer.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#EEF2E8] rounded-full flex items-center justify-center">
                        <span className="text-[#22452B] font-semibold text-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-2 sm:ml-3">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{customer.name}</h3>
                      </div>
                    </div>
                    {isBirthdayMonth(customer) && (
                      <span className="text-2xl" title="Aniversariante do mês!">🎂</span>
                    )}
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
                        {customer.jarCredits || 0} {(customer.jarCredits || 0) === 1 ? 'pote' : 'potes'}
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedCustomers.length)}</span> de{' '}
                    <span className="font-medium">{filteredAndSortedCustomers.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-[#22452B] border-[#22452B] text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Próxima</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
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

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AF6138] mx-auto"></div>
          <p className="mt-4 text-[#814923]">Carregando...</p>
        </div>
      </div>
    }>
      <CustomersContent />
    </Suspense>
  );
}