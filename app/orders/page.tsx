'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Order, Product, Customer } from '@/types';
import { orderService, productService, customerService } from '@/services';
import { migrateOrders } from '@/lib/migrations';
import CustomerSelector from '@/components/CustomerSelector';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'pix' | 'debit' | 'credit'>('pix');
  const [periodFilter, setPeriodFilter] = useState<'all' | '7days' | '15days' | '30days' | '90days'>('30days');
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: '1',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    status: 'pending' as Order['status'],
    notes: '',
  });

  useEffect(() => {
    // Migrar encomendas antigas
    migrateOrders();
    loadData();
    
    // Verificar se deve abrir o modal automaticamente
    if (searchParams.get('openModal') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, productsData, customersData] = await Promise.all([
        orderService.getAll(),
        productService.getAll(),
        customerService.getAll(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const customer = customers.find(c => c.id === formData.customerId);
    const product = products.find(p => p.id === formData.productId);
    
    if (!customer || !product) {
      alert('Selecione um cliente e um produto válidos');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const unitPrice = product.price;
    const totalAmount = quantity * unitPrice;

    try {
      if (editingOrder) {
        // O backend espera o objeto completo com id
        const fullOrderData: Order = {
          ...editingOrder,
          customerId: formData.customerId,
          customerName: customer.name,
          productId: formData.productId,
          productName: product.name,
          quantity: quantity,
          unitPrice: unitPrice,
          totalAmount: totalAmount,
          orderDate: new Date(formData.orderDate),
          expectedDeliveryDate: new Date(formData.expectedDeliveryDate),
          status: formData.status,
          notes: formData.notes,
        };

        // Se está mudando para delivered e ainda não tem data de entrega, adicionar
        if (editingOrder.status !== 'delivered' && formData.status === 'delivered' && !editingOrder.deliveredDate) {
          fullOrderData.deliveredDate = new Date();
        }
        
        await orderService.update(editingOrder.id, fullOrderData);
        
        // Se mudou para delivered, mostrar mensagem
        if (editingOrder.status !== 'delivered' && formData.status === 'delivered') {
          alert('Encomenda entregue! Uma venda foi criada automaticamente no histórico de vendas.');
        }
      } else {
        await orderService.create({
          customerId: formData.customerId,
          customerName: customer.name,
          productId: formData.productId,
          productName: product.name,
          quantity: quantity,
          unitPrice: unitPrice,
          totalAmount: totalAmount,
          orderDate: new Date(formData.orderDate),
          expectedDeliveryDate: new Date(formData.expectedDeliveryDate),
          status: formData.status,
          notes: formData.notes,
        });
      }

      resetForm();
      await loadData();
      setShowModal(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar encomenda: ${error.message}`);
      }
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerId: order.customerId,
      productId: order.productId,
      quantity: order.quantity.toString(),
      orderDate: new Date(order.orderDate).toISOString().split('T')[0],
      expectedDeliveryDate: new Date(order.expectedDeliveryDate).toISOString().split('T')[0],
      status: order.status,
      notes: order.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta encomenda?')) {
      try {
        await orderService.delete(id);
        await loadData();
      } catch (error) {
        if (error instanceof Error) {
          alert(`Erro ao excluir encomenda: ${error.message}`);
        }
      }
    }
  };

  const handleQuickComplete = (order: Order) => {
    setOrderToComplete(order);
    setSelectedPaymentMethod('pix');
    setShowPaymentModal(true);
  };

  const confirmQuickComplete = async () => {
    if (!orderToComplete) return;

    try {
      await orderService.updateStatus(orderToComplete.id, 'delivered', selectedPaymentMethod);
      alert('✅ Encomenda concluída! Uma venda foi criada automaticamente no histórico de vendas.');
      setShowPaymentModal(false);
      setOrderToComplete(null);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao concluir encomenda: ${error.message}`);
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao alterar status: ${error.message}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      productId: '',
      quantity: '1',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      status: 'pending',
      notes: '',
    });
    setEditingOrder(null);
  };

  const getStatusBadge = (status: Order['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_production: 'bg-purple-100 text-purple-800',
      ready_for_delivery: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: 'Pendente',
      in_production: 'Em Produção',
      ready_for_delivery: 'Pronta para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelada',
    };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filterOrdersByStatus = (status: Order['status']) => {
    return getFilteredOrders().filter(order => order.status === status);
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filtrar por período
    if (periodFilter !== 'all') {
      const now = new Date();
      const daysMap = {
        '7days': 7,
        '15days': 15,
        '30days': 30,
        '90days': 90,
      };
      const days = daysMap[periodFilter];
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(order => new Date(order.orderDate) >= cutoffDate);
    }

    // Ordenar por data mais recente primeiro
    filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return filtered;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando encomendas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Erro ao carregar dados</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadData()}
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
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Encomendas</h1>
            <p className="text-gray-600 mt-2">Gerencie pedidos futuros e planejados</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nova Encomenda
          </button>
        </div>

        {/* Filtro de Período */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Período:
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="15days">Últimos 15 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
              <option value="all">Todas as encomendas</option>
            </select>
            <span className="text-sm text-gray-500">
              {getFilteredOrders().length} {getFilteredOrders().length === 1 ? 'encomenda' : 'encomendas'}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo de Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Pendentes</p>
              <div className="p-2 bg-yellow-100 rounded-full">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{filterOrdersByStatus('pending').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Em Produção</p>
              <div className="p-2 bg-purple-100 rounded-full">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600">{filterOrdersByStatus('in_production').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Pronta</p>
              <div className="p-2 bg-indigo-100 rounded-full">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{filterOrdersByStatus('ready_for_delivery').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Entregues</p>
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{filterOrdersByStatus('delivered').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Canceladas</p>
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{filterOrdersByStatus('cancelled').length}</p>
          </div>
        </div>
      </div>

      {getFilteredOrders().length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {orders.length === 0 ? 'Nenhuma encomenda cadastrada' : 'Nenhuma encomenda encontrada neste período'}
          </h3>
          <p className="text-gray-600 mb-4">
            {orders.length === 0 ? 'Comece registrando sua primeira encomenda' : 'Tente selecionar um período maior'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Nova Encomenda
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega Prevista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega Realizada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredOrders().map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{order.customerName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{order.productName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{order.quantity} un.</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      R$ {order.totalAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {new Date(order.expectedDeliveryDate).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.deliveredDate ? (
                      <span className="text-sm text-green-600 font-medium">
                        {new Date(order.deliveredDate).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {/* Botões de mudança de status */}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'in_production')}
                          className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors font-medium"
                          title="Iniciar produção"
                        >
                          🔧 Produzir
                        </button>
                      )}
                      
                      {order.status === 'in_production' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'ready_for_delivery')}
                          className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors font-medium"
                          title="Marcar como pronta"
                        >
                          📦 Pronta
                        </button>
                      )}
                      
                      {order.status === 'ready_for_delivery' && (
                        <button
                          onClick={() => handleQuickComplete(order)}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                          title="Marcar como entregue e criar venda"
                        >
                          🚚 Entregar
                        </button>
                      )}
                      
                      {/* Botões de editar/excluir apenas se não estiver entregue */}
                      {order.status !== 'delivered' && (
                        <>
                          <button
                            onClick={() => handleEdit(order)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors font-medium"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors font-medium"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <CustomerSelector
                  value={formData.customerId}
                  onChange={(customerId) => setFormData({ ...formData, customerId })}
                  customers={customers}
                  onCustomerAdded={loadData}
                  label="Cliente"
                  required={true}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produto *
                  </label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                {/* Valor Total Calculado */}
                {formData.productId && formData.quantity && (
                  <div className="md:col-span-2 bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Valor Total da Encomenda:</span>
                      <span className="text-xl font-bold text-green-600">
                        R$ {(
                          (products.find(p => p.id === formData.productId)?.price || 0) * 
                          parseInt(formData.quantity || '0')
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Order['status'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_production">Em Produção</option>
                    <option value="ready_for_delivery">Pronta para Entrega</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  {formData.status === 'delivered' && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Esta encomenda será convertida em venda e adicionada ao balanço financeiro
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Pedido *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrega Prevista *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  {editingOrder ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Forma de Pagamento */}
      {showPaymentModal && orderToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Forma de Pagamento
            </h2>
            <p className="text-gray-600 mb-6">
              Encomenda de <strong>{orderToComplete.customerName}</strong>
              <br />
              Produto: <strong>{orderToComplete.productName}</strong>
              <br />
              Valor: <strong className="text-green-600">R$ {orderToComplete.totalAmount.toFixed(2)}</strong>
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={selectedPaymentMethod === 'cash'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                  className="w-4 h-4 text-[#22452B] focus:ring-[#22452B]"
                />
                <span className="ml-3 text-lg">💵 Dinheiro</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pix"
                  checked={selectedPaymentMethod === 'pix'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                  className="w-4 h-4 text-[#22452B] focus:ring-[#22452B]"
                />
                <span className="ml-3 text-lg">📱 PIX</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="debit"
                  checked={selectedPaymentMethod === 'debit'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                  className="w-4 h-4 text-[#22452B] focus:ring-[#22452B]"
                />
                <span className="ml-3 text-lg">💳 Cartão de Débito</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit"
                  checked={selectedPaymentMethod === 'credit'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                  className="w-4 h-4 text-[#22452B] focus:ring-[#22452B]"
                />
                <span className="ml-3 text-lg">💳 Cartão de Crédito</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setOrderToComplete(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmQuickComplete}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✓ Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
