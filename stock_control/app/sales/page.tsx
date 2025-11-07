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
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

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

    // Verificar estoque antes de finalizar
    for (const item of saleItems) {
      const product = productStorage.getById(item.productId);
      if (!product || product.quantity < item.quantity) {
        alert(`Estoque insuficiente para ${item.productName}`);
        return;
      }
    }

    const newSale: Omit<Sale, 'id'> = {
      customerId: customer.id,
      customerName: customer.name,
      items: saleItems,
      totalAmount: calculateTotal(),
      saleDate: new Date(),
      notes: notes
    };

    saleStorage.add(newSale);
    
    resetForm();
    loadData();
    setShowModal(false);
    alert('Venda realizada com sucesso!');
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSaleItems([]);
    setSelectedProduct('');
    setQuantity('1');
    setNotes('');
  };

  const printInvoice = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                    </span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalhes da Venda</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Data:</span>
                <p className="text-gray-900">{new Date(viewingSale.saleDate).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Cliente:</span>
                <p className="text-gray-900">{viewingSale.customerName}</p>
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
