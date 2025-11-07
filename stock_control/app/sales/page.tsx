'use client';

import { useState, useEffect } from 'react';
import { Sale, SaleItem, Product, Customer } from '@/types';
import { saleStorage, productStorage, customerStorage } from '@/lib/storage';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saleStatus, setSaleStatus] = useState<'pending' | 'awaiting_payment' | 'paid' | 'cancelled'>('pending');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [editingStatus, setEditingStatus] = useState<{ saleId: string; currentStatus: Sale['status'] } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSales(saleStorage.getAll());
    setProducts(productStorage.getAll());
    setCustomers(customerStorage.getAll());
  };

  const addItemToSale = () => {
    if (!selectedProduct || !quantity) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    if (qty > product.quantity) {
      alert('Quantidade indisponível em estoque!');
      return;
    }

    const existingItem = saleItems.find(item => item.productId === selectedProduct);
    
    if (existingItem) {
      setSaleItems(saleItems.map(item =>
        item.productId === selectedProduct
          ? {
              ...item,
              quantity: item.quantity + qty,
              totalPrice: (item.quantity + qty) * item.unitPrice
            }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: qty * product.price
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedProduct('');
    setQuantity('1');
  };

  const removeItem = (productId: string) => {
    setSaleItems(saleItems.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmitSale = () => {
    if (!selectedCustomer || saleItems.length === 0) {
      alert('Selecione um cliente e adicione produtos à venda!');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const newSale: Omit<Sale, 'id'> = {
      customerId: customer.id,
      customerName: customer.name,
      items: saleItems,
      totalAmount: calculateTotal(),
      saleDate: new Date(),
      status: saleStatus,
      notes: notes
    };

    try {
      saleStorage.add(newSale);
      
      resetForm();
      loadData();
      setShowModal(false);
      alert('Venda realizada com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao criar venda: ${error.message}`);
      } else {
        alert('Erro desconhecido ao criar venda');
      }
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSaleItems([]);
    setSelectedProduct('');
    setQuantity('1');
    setNotes('');
    setSaleStatus('pending');
  };

  const handleUpdateStatus = (saleId: string, newStatus: Sale['status']) => {
    try {
      saleStorage.update(saleId, { status: newStatus });
      loadData();
      setEditingStatus(null);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao atualizar status: ${error.message}`);
      } else {
        alert('Erro desconhecido ao atualizar status');
      }
      setEditingStatus(null);
      loadData(); // Recarregar para reverter a mudança visual
    }
  };

  const getStatusBadge = (status: Sale['status']) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      awaiting_payment: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: 'Pendente',
      awaiting_payment: 'Aguardando Pagamento',
      paid: 'Pago',
      cancelled: 'Cancelado',
    };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filterSalesByStatus = (status: Sale['status']) => {
    return sales.filter(sale => sale.status === status);
  };

  const printInvoice = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabels = {
      pending: 'Pendente',
      awaiting_payment: 'Aguardando Pagamento',
      paid: 'Pago',
      cancelled: 'Cancelado',
    };

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nota de Venda #${sale.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .info {
            margin-bottom: 20px;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.875em;
            font-weight: 600;
          }
          .status-pending { background-color: #f3f4f6; color: #374151; }
          .status-awaiting_payment { background-color: #fef3c7; color: #92400e; }
          .status-paid { background-color: #d1fae5; color: #065f46; }
          .status-cancelled { background-color: #fee2e2; color: #991b1b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .total {
            text-align: right;
            font-size: 1.2em;
            font-weight: bold;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🕯️ Velas Aromáticas</h1>
          <h2>Nota de Venda</h2>
        </div>
        
        <div class="info">
          <p><strong>Nota:</strong> #${sale.id}</p>
          <p><strong>Data:</strong> ${new Date(sale.saleDate).toLocaleString('pt-BR')}</p>
          <p><strong>Cliente:</strong> ${sale.customerName}</p>
          <p><strong>Status:</strong> <span class="status status-${sale.status}">${statusLabels[sale.status]}</span></p>
          ${sale.fromOrder ? '<p style="color: #1d4ed8; font-weight: 600; margin-top: 8px;">📦 Origem: Encomenda (não afeta estoque)</p>' : ''}
        </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Preço Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>R$ ${item.unitPrice.toFixed(2)}</td>
                <td>R$ ${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          Total: R$ ${sale.totalAmount.toFixed(2)}
        </div>

        ${sale.notes ? `<p><strong>Observações:</strong> ${sale.notes}</p>` : ''}

        <div class="footer">
          <p>Obrigado pela preferência!</p>
        </div>

        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Imprimir
        </button>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600 mt-2">Gerencie suas vendas e emita notas</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nova Venda
        </button>
      </div>

      {/* Resumo de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-600">{filterSalesByStatus('pending').length}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aguardando Pagamento</p>
              <p className="text-2xl font-bold text-yellow-600">{filterSalesByStatus('awaiting_payment').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pagas</p>
              <p className="text-2xl font-bold text-green-600">{filterSalesByStatus('paid').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Canceladas</p>
              <p className="text-2xl font-bold text-red-600">{filterSalesByStatus('cancelled').length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma venda registrada</h3>
          <p className="text-gray-600 mb-4">Comece registrando sua primeira venda</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Nova Venda
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
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
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-900">
                        {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                      </span>
                      {sale.fromOrder && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full w-fit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Encomenda
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{sale.customerName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{sale.items.length} produto(s)</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      R$ {sale.totalAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingStatus?.saleId === sale.id ? (
                      <select
                        value={editingStatus.currentStatus}
                        onChange={(e) => {
                          handleUpdateStatus(sale.id, e.target.value as Sale['status']);
                        }}
                        onBlur={() => setEditingStatus(null)}
                        autoFocus
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="pending">Pendente</option>
                        <option value="awaiting_payment">Aguardando Pagamento</option>
                        <option value="paid">Pago</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingStatus({ saleId: sale.id, currentStatus: sale.status })}
                        className="hover:opacity-80"
                      >
                        {getStatusBadge(sale.status)}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setViewingSale(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => printInvoice(sale)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Imprimir Nota
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Venda */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova Venda</h2>
            
            {/* Seleção de Cliente */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selecione um cliente</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Adicionar Produtos */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Adicionar Produtos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione um produto</option>
                    {products.filter(p => p.quantity > 0).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)} (Estoque: {product.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Qtd"
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={addItemToSale}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Itens */}
            {saleItems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Itens da Venda</h3>
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qtd</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Preço Unit.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {saleItems.map(item => (
                      <tr key={item.productId}>
                        <td className="px-4 py-2 text-sm">{item.productName}</td>
                        <td className="px-4 py-2 text-sm">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm font-semibold">R$ {item.totalPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-right">
                  <span className="text-xl font-bold text-gray-900">
                    Total: R$ {calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status da Venda */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status da Venda *
              </label>
              <select
                value={saleStatus}
                onChange={(e) => setSaleStatus(e.target.value as Sale['status'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="pending">Pendente</option>
                <option value="awaiting_payment">Aguardando Pagamento</option>
                <option value="paid">Pago</option>
                <option value="cancelled">Cancelado</option>
              </select>
              {saleStatus === 'cancelled' && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ Vendas canceladas não descontarão do estoque
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitSale}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalhes */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Detalhes da Venda</h2>
              {viewingSale.fromOrder && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Origem: Encomenda
                </span>
              )}
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Data:</span>
                <p className="text-gray-900">{new Date(viewingSale.saleDate).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Cliente:</span>
                <p className="text-gray-900">{viewingSale.customerName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <div className="mt-1">{getStatusBadge(viewingSale.status)}</div>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200 border mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qtd</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Preço</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {viewingSale.items.map(item => (
                  <tr key={item.productId}>
                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                    <td className="px-4 py-2 text-sm">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm">R$ {item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-semibold">R$ {item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right mb-4">
              <span className="text-xl font-bold text-gray-900">
                Total: R$ {viewingSale.totalAmount.toFixed(2)}
              </span>
            </div>

            {viewingSale.notes && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500">Observações:</span>
                <p className="text-gray-900">{viewingSale.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setViewingSale(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => printInvoice(viewingSale)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Imprimir Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
