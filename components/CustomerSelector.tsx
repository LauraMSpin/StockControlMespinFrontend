'use client';

import { useState } from 'react';
import { Customer } from '@/types';
import { customerService } from '@/services';

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string) => void;
  customers: Customer[];
  onCustomerAdded: () => void;
  label?: string;
  required?: boolean;
  showBirthdayIcon?: boolean;
  checkBirthdayMonth?: (customerId: string) => boolean;
  className?: string;
}

export default function CustomerSelector({
  value,
  onChange,
  customers,
  onCustomerAdded,
  label = 'Cliente',
  required = true,
  showBirthdayIcon = false,
  checkBirthdayMonth,
  className = '',
}: CustomerSelectorProps) {
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === '__add_new__') {
      setShowAddModal(true);
    } else {
      onChange(selectedValue);
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
      const newCustomer = await customerService.create(customerData as Omit<Customer, 'id' | 'createdAt'>);
      
      // Reset form
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
      
      setShowAddModal(false);
      
      // Notificar componente pai para recarregar clientes
      onCustomerAdded();
      
      // Selecionar o novo cliente
      onChange(newCustomer.id);
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      alert('Não foi possível criar o cliente. Tente novamente.');
    }
  };

  return (
    <>
      <div className={className}>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
          {label} {required && '*'}
        </label>
        <div className="relative">
          <select
            value={value}
            onChange={handleSelectChange}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base appearance-none pr-10"
            required={required}
          >
            <option value="">Selecione um cliente</option>
            {customers.map(customer => {
              const isBirthday = showBirthdayIcon && checkBirthdayMonth ? checkBirthdayMonth(customer.id) : false;
              return (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {isBirthday ? '🎂' : ''}
                </option>
              );
            })}
            <option value="__add_new__" className="font-semibold text-green-600">
              ➕ Adicionar Novo Cliente
            </option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              Adicionar Novo Cliente
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
                    placeholder="Nome do cliente"
                    autoFocus
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
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Créditos de Potes Devolvidos ♻️
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.jarCredits}
                    onChange={(e) => setFormData({ ...formData, jarCredits: e.target.value })}
                    className="w-full sm:w-32 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
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
                    setShowAddModal(false);
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
                  }}
                  className="px-4 sm:px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#5D663D] transition-colors text-sm sm:text-base"
                >
                  Adicionar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
