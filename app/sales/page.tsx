'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sale, SaleItem, Product, Customer, Settings } from '@/types';
import { saleService, productService, customerService, settingsService } from '@/services';
import { CreateOrderDto, SaleItemDto, UpdateSaleDto } from '@/types/dtos';
import CustomerSelector from '@/components/CustomerSelector';

function SalesContent() {
  const searchParams = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [saleStatus, setSaleStatus] = useState<Sale['status']>('Pending');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Pix' | 'Debit' | 'Credit' | ''>('');
  const [saleDate, setSaleDate] = useState<string>('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [editingStatus, setEditingStatus] = useState<{ saleId: string; currentStatus: Sale['status'] } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ saleId: string; newStatus: Sale['status'] } | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isBirthdayDiscount, setIsBirthdayDiscount] = useState(false);
  const [birthdayDiscountPercentage, setBirthdayDiscountPercentage] = useState('0');
  const [additionalDiscountPercentage, setAdditionalDiscountPercentage] = useState('0');
  const [jarCreditsUsed, setJarCreditsUsed] = useState(0);
  const [jarDiscountAmount, setJarDiscountAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    birthdayDiscount: 0,
    jarDiscount: 0,
    lowStockThreshold: 10,
    companyName: 'Velas Aromáticas'
  });

  useEffect(() => {
    loadData();
    
    // Verificar se deve abrir o modal automaticamente
    if (searchParams.get('openModal') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  // Recalcular desconto de potes quando itens mudarem
  useEffect(() => {
    calculateJarDiscount();
  }, [saleItems, selectedCustomer, customers]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesData, productsData, customersData, settingsData] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getAll(),
        settingsService.get(),
      ]);
      setSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é mês de aniversário do cliente
  const checkBirthdayMonth = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.birthDate) return false;

    const today = new Date();
    const birthDate = new Date(customer.birthDate);
    
    // Comparar apenas o mês
    return today.getMonth() === birthDate.getMonth();
  };

  // Aplicar desconto de aniversário automaticamente
  const applyBirthdayDiscount = (customerId: string) => {
    if (settings.birthdayDiscount > 0 && checkBirthdayMonth(customerId)) {
      setBirthdayDiscountPercentage(settings.birthdayDiscount.toString());
      setIsBirthdayDiscount(true);
      return true;
    }
    
    return false;
  };

  // Calcular desconto de potes automaticamente
  const calculateJarDiscount = () => {
    if (!selectedCustomer || saleItems.length === 0) {
      setJarCreditsUsed(0);
      setJarDiscountAmount(0);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer || (customer.jarCredits || 0) === 0) {
      setJarCreditsUsed(0);
      setJarDiscountAmount(0);
      return;
    }

    if (settings.jarDiscount <= 0) {
      setJarCreditsUsed(0);
      setJarDiscountAmount(0);
      return;
    }

    // Contar quantas velas (total de itens) - proporção 1:1
    const totalCandlesInSale = saleItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Créditos disponíveis do cliente
    const availableCredits = customer.jarCredits || 0;
    
    // Usar no máximo 1 crédito por vela (1:1)
    const creditsToUse = Math.min(totalCandlesInSale, availableCredits);
    
    // Calcular desconto total
    const totalJarDiscount = creditsToUse * settings.jarDiscount;
    
    setJarCreditsUsed(creditsToUse);
    setJarDiscountAmount(totalJarDiscount);
  };

  // Handler para mudança de cliente
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    
    // Resetar descontos antes de recalcular
    setJarCreditsUsed(0);
    setJarDiscountAmount(0);
    
    // Se não estiver editando uma venda, aplicar desconto de aniversário
    if (!editingSale) {
      const hasDiscount = applyBirthdayDiscount(customerId);
      if (!hasDiscount) {
        setBirthdayDiscountPercentage('0');
        setIsBirthdayDiscount(false);
      }
    }
  };

  const addItemToSale = () => {
    if (!selectedProduct || !quantity) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    const existingItem = saleItems.find(item => item.productId === selectedProduct);
    
    // Verificar se a quantidade total (existente + nova) ultrapassa o estoque
    const totalQuantity = existingItem ? existingItem.quantity + qty : qty;
    
    if (totalQuantity > product.quantity) {
      alert(`Quantidade indisponível em estoque! Disponível: ${product.quantity}, já adicionado: ${existingItem?.quantity || 0}`);
      return;
    }
    
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

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateBirthdayDiscount = () => {
    const discount = parseFloat(birthdayDiscountPercentage) || 0;
    if (discount < 0 || discount > 100) return 0;
    return (calculateSubtotal() * discount) / 100;
  };

  const calculateAdditionalDiscount = () => {
    const discount = parseFloat(additionalDiscountPercentage) || 0;
    if (discount < 0 || discount > 100) return 0;
    return (calculateSubtotal() * discount) / 100;
  };

  const calculateDiscount = () => {
    return calculateBirthdayDiscount() + calculateAdditionalDiscount();
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() - jarDiscountAmount + shippingCost;
  };

  const handleSubmitSale = async () => {
    // Se está editando, usar função de atualização
    if (editingSale) {
      await handleUpdateSale();
      return;
    }

    if (!selectedCustomer || saleItems.length === 0) {
      alert('Selecione um cliente e adicione produtos à venda!');
      return;
    }

    // Validar método de pagamento se o status for "paid"
    if (saleStatus === 'Paid' && !paymentMethod) {
      alert('Selecione o método de pagamento para vendas pagas!');
      return;
    }

    // Validar descontos
    const birthdayDiscount = parseFloat(birthdayDiscountPercentage) || 0;
    const additionalDiscount = parseFloat(additionalDiscountPercentage) || 0;
    const totalDiscountPercentage = birthdayDiscount + additionalDiscount;
    
    if (birthdayDiscount < 0 || birthdayDiscount > 100 || additionalDiscount < 0 || additionalDiscount > 100) {
      alert('Os descontos devem estar entre 0% e 100%!');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscount();
    const total = calculateTotal();

    // Criar data com hora ao meio-dia para evitar problemas de fuso horário
    let saleDateObj: Date;
    if (saleDate) {
      saleDateObj = new Date(saleDate + 'T12:00:00');
    } else {
      saleDateObj = new Date();
      saleDateObj.setHours(12, 0, 0, 0);
    }

    // Criar nota com detalhamento dos descontos se houver múltiplos
    let saleNotes = notes;
    if (birthdayDiscount > 0 && additionalDiscount > 0) {
      const discountDetail = `\n[Descontos: 🎂 Aniversário ${birthdayDiscount}% + 💰 Adicional ${additionalDiscount}%]`;
      saleNotes = notes ? notes + discountDetail : discountDetail.trim();
    } else if (birthdayDiscount > 0) {
      const discountDetail = `\n[Desconto: 🎂 Aniversário ${birthdayDiscount}%]`;
      saleNotes = notes ? notes + discountDetail : discountDetail.trim();
    }
    if (jarCreditsUsed > 0) {
      const jarDetail = `\n[🫙 ${jarCreditsUsed} ${jarCreditsUsed === 1 ? 'pote usado' : 'potes usados'}: -R$ ${jarDiscountAmount.toFixed(2)}]`;
      saleNotes = saleNotes ? saleNotes + jarDetail : jarDetail.trim();
    }

    // Converter SaleItem para SaleItemDto
    const itemsDto: SaleItemDto[] = saleItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    // Criar DTO para envio
    const saleDto: CreateOrderDto = {
      customerId: customer.id,
      customerName: customer.name,
      items: itemsDto,
      subtotal: subtotal,
      discountPercentage: totalDiscountPercentage,
      discountAmount: discountAmount,
      shippingCost: shippingCost,
      totalAmount: total,
      saleDate: saleDateObj,
      status: saleStatus,
      paymentMethod: saleStatus === 'Paid' ? paymentMethod : undefined,
      notes: saleNotes,
    };

    try {
      await saleService.create(saleDto);
      
      // Subtrair créditos de potes do cliente (apenas se não for cancelada)
      if (saleStatus !== 'Cancelled' && jarCreditsUsed > 0) {
        const currentCredits = customer.jarCredits || 0;
        const newCredits = Math.max(0, currentCredits - jarCreditsUsed);
        await customerService.updateJarCredits(customer.id, newCredits);
      }
      
      resetForm();
      await loadData();
      setShowModal(false);
      
      let message = 'Venda realizada com sucesso!';
      if (jarCreditsUsed > 0) {
        message += `\n\n♻️ ${jarCreditsUsed} crédito${jarCreditsUsed > 1 ? 's' : ''} de pote${jarCreditsUsed > 1 ? 's' : ''} utilizado${jarCreditsUsed > 1 ? 's' : ''}!`;
        message += `\nDesconto aplicado: R$ ${jarDiscountAmount.toFixed(2)}`;
      }
      alert(message);
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
    setBirthdayDiscountPercentage('0');
    setAdditionalDiscountPercentage('0');
    setShippingCost(0);
    setSaleStatus('Pending');
    setPaymentMethod('');
    
    // Definir data atual como padrão (usando hora local para evitar problemas de fuso)
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de fuso
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSaleDate(`${year}-${month}-${day}`);
    
    setEditingSale(null);
    setIsBirthdayDiscount(false);
    setJarCreditsUsed(0);
    setJarDiscountAmount(0);
  };

  const handleEditSale = (sale: Sale) => {
    // Preencher o formulário com os dados da venda
    setEditingSale(sale);
    setSelectedCustomer(sale.customerId);
    setSaleItems([...sale.items]);
    setNotes(sale.notes || '');
    
    // Carregar descontos (mantém apenas o valor total para compatibilidade com vendas antigas)
    setBirthdayDiscountPercentage('0');
    setAdditionalDiscountPercentage(sale.discountPercentage.toString());
    setIsBirthdayDiscount(false);
    
    setShippingCost(sale.shippingCost || 0);
    setSaleStatus(sale.status);
    setPaymentMethod(sale.paymentMethod || '');
    
    // Formatar data para o input type="date" (ajustando fuso horário)
    const date = new Date(sale.saleDate);
    date.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de fuso
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSaleDate(`${year}-${month}-${day}`);
    
    setViewingSale(null);
    setShowModal(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    
    if (!selectedCustomer || saleItems.length === 0) {
      alert('Selecione um cliente e adicione produtos à venda!');
      return;
    }

    // Validar método de pagamento se o status for "paid"
    if (saleStatus === 'Paid' && !paymentMethod) {
      alert('Selecione o método de pagamento para vendas pagas!');
      return;
    }

    // Validar descontos
    const birthdayDiscount = parseFloat(birthdayDiscountPercentage) || 0;
    const additionalDiscount = parseFloat(additionalDiscountPercentage) || 0;
    const totalDiscountPercentage = birthdayDiscount + additionalDiscount;
    
    if (birthdayDiscount < 0 || birthdayDiscount > 100 || additionalDiscount < 0 || additionalDiscount > 100) {
      alert('Os descontos devem estar entre 0% e 100%!');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscount();
    const total = calculateTotal();

    // Criar data com hora ao meio-dia para evitar problemas de fuso horário
    let saleDateObj: Date;
    if (saleDate) {
      saleDateObj = new Date(saleDate + 'T12:00:00');
    } else {
      saleDateObj = editingSale.saleDate;
    }

    // Criar nota com detalhamento dos descontos se houver múltiplos
    let saleNotes = notes;
    if (birthdayDiscount > 0 && additionalDiscount > 0) {
      const discountDetail = `\n[Descontos: 🎂 Aniversário ${birthdayDiscount}% + 💰 Adicional ${additionalDiscount}%]`;
      saleNotes = notes ? notes + discountDetail : discountDetail.trim();
    } else if (birthdayDiscount > 0) {
      const discountDetail = `\n[Desconto: 🎂 Aniversário ${birthdayDiscount}%]`;
      saleNotes = notes ? notes + discountDetail : discountDetail.trim();
    }
    if (jarCreditsUsed > 0) {
      const jarDetail = `\n[🫙 ${jarCreditsUsed} ${jarCreditsUsed === 1 ? 'pote usado' : 'potes usados'}: -R$ ${jarDiscountAmount.toFixed(2)}]`;
      saleNotes = saleNotes ? saleNotes + jarDetail : jarDetail.trim();
    }

    // Converter SaleItem para SaleItemDto
    const itemsDto: SaleItemDto[] = saleItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    // Criar DTO para envio
    const saleDto: UpdateSaleDto = {
      customerId: customer.id,
      customerName: customer.name,
      items: itemsDto,
      subtotal: subtotal,
      discountPercentage: totalDiscountPercentage,
      discountAmount: discountAmount,
      shippingCost: shippingCost,
      totalAmount: total,
      saleDate: saleDateObj,
      status: saleStatus,
      paymentMethod: saleStatus === 'Paid' ? paymentMethod : undefined,
      notes: saleNotes,
    };

    try {
      await saleService.update(editingSale.id, saleDto);
      
      resetForm();
      await loadData();
      setShowModal(false);
      alert('Venda atualizada com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao atualizar venda: ${error.message}`);
      } else {
        alert('Erro desconhecido ao atualizar venda');
      }
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (sale.status === 'Paid') {
      const confirmDelete = window.confirm(
        '⚠️ ATENÇÃO: Esta venda já foi PAGA!\n\n' +
        'Ao excluir esta venda:\n' +
        '• O estoque dos produtos será devolvido\n' +
        '• A receita será removida do balanço financeiro\n' +
        '• Esta ação NÃO pode ser desfeita\n\n' +
        'Tem certeza absoluta que deseja excluir esta venda paga?'
      );
      if (!confirmDelete) return;
      
      // Segunda confirmação para vendas pagas
      const doubleConfirm = window.confirm(
        '⚠️ ÚLTIMA CONFIRMAÇÃO\n\n' +
        'Você está prestes a excluir uma venda PAGA de R$ ' + sale.totalAmount.toFixed(2) + '\n' +
        'Cliente: ' + sale.customerName + '\n\n' +
        'Confirma a exclusão?'
      );
      if (!doubleConfirm) return;
    } else {
      const confirmDelete = window.confirm('Deseja realmente excluir esta venda?');
      if (!confirmDelete) return;
    }

    try {
      await saleService.delete(saleId);
      await loadData();
      setViewingSale(null);
      alert('Venda excluída com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao excluir venda: ${error.message}`);
      } else {
        alert('Erro desconhecido ao excluir venda');
      }
    }
  };

  const handleUpdateStatus = async (saleId: string, newStatus: Sale['status']) => {
    // Verificar se a venda já está paga
    const sale = sales.find(s => s.id === saleId);
    if (sale?.status === 'Paid') {
      alert('Vendas com status "Pago" não podem ter seu status alterado!');
      setEditingStatus(null);
      return;
    }

    // Se está mudando para "Paid", pedir método de pagamento
    if (newStatus === 'Paid') {
      setPendingStatusChange({ saleId, newStatus });
      setShowPaymentModal(true);
      setEditingStatus(null);
      return;
    }

    // Para outros status, atualizar diretamente
    try {
      await saleService.updateStatus(saleId, newStatus);
      await loadData();
      setEditingStatus(null);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao atualizar status: ${error.message}`);
      } else {
        alert('Erro desconhecido ao atualizar status');
      }
      setEditingStatus(null);
      loadData();
    }
  };

  const confirmPaymentMethod = async () => {
    if (!paymentMethod || !pendingStatusChange) {
      alert('Selecione um método de pagamento!');
      return;
    }

    try {
      await saleService.updateStatus(pendingStatusChange.saleId, pendingStatusChange.newStatus, paymentMethod);
      await loadData();
      setShowPaymentModal(false);
      setPendingStatusChange(null);
      setPaymentMethod('');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao atualizar status: ${error.message}`);
      } else {
        alert('Erro desconhecido ao atualizar status');
      }
      loadData();
    }
  };

  const getStatusBadge = (status: Sale['status']) => {
    const badges = {
      Pending: 'bg-gray-100 text-gray-800',
      AwaitingPayment: 'bg-yellow-100 text-yellow-800',
      Paid: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };

    const labels = {
      Pending: 'Pendente',
      AwaitingPayment: 'Aguardando Pagamento',
      Paid: 'Pago',
      Cancelled: 'Cancelado',
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
      Pending: 'Pendente',
      AwaitingPayment: 'Aguardando Pagamento',
      Paid: 'Pago',
      Cancelled: 'Cancelado',
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
          .header img {
            max-width: 200px;
            height: auto;
            margin-bottom: 10px;
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
          <img src="/logo.png" alt="${settings.companyName}" />
          <h1>${settings.companyName}</h1>
          <h2>Nota de Venda</h2>
          ${settings.companyPhone ? `<p style="margin: 5px 0;">📞 ${settings.companyPhone}</p>` : ''}
          ${settings.companyEmail ? `<p style="margin: 5px 0;">📧 ${settings.companyEmail}</p>` : ''}
          ${settings.companyAddress ? `<p style="margin: 5px 0;">📍 ${settings.companyAddress}</p>` : ''}
        </div>
        
        <div class="info">
          <p><strong>Nota:</strong> #${sale.id}</p>
          <p><strong>Data:</strong> ${new Date(sale.saleDate).toLocaleString('pt-BR')}</p>
          <p><strong>Cliente:</strong> ${sale.customerName}</p>
          <p><strong>Status:</strong> <span class="status status-${sale.status}">${statusLabels[sale.status]}</span></p>
          ${sale.paymentMethod && sale.status === 'Paid' ? `<p><strong>Pagamento:</strong> ${
            sale.paymentMethod === 'Cash' ? '💵 Dinheiro' :
            sale.paymentMethod === 'Pix' ? '📱 PIX' :
            sale.paymentMethod === 'Debit' ? '💳 Cartão de Débito' :
            sale.paymentMethod === 'Credit' ? '💳 Cartão de Crédito' : ''
          }</p>` : ''}
          ${sale.fromOrder ? '<p style="color: #1d4ed8; font-weight: 600; margin-top: 8px;">📦 Origem: Encomenda (não afeta estoque)</p>' : ''}
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

        <div style="text-align: right; margin-top: 20px;">
          ${sale.discountPercentage > 0 || sale.shippingCost > 0 ? `
            <p style="margin: 5px 0;">Subtotal: R$ ${sale.subtotal.toFixed(2)}</p>
            ${sale.discountPercentage > 0 ? `<p style="margin: 5px 0; color: #dc2626;">Desconto (${sale.discountPercentage}%): - R$ ${sale.discountAmount.toFixed(2)}</p>` : ''}
            ${sale.shippingCost > 0 ? `<p style="margin: 5px 0; color: #2563eb;">Frete: + R$ ${sale.shippingCost.toFixed(2)}</p>` : ''}
            <p style="font-size: 1.2em; font-weight: bold; margin: 10px 0; padding-top: 10px; border-top: 2px solid #333;">
              Total: R$ ${sale.totalAmount.toFixed(2)}
            </p>
          ` : `
            <p class="total">Total: R$ ${sale.totalAmount.toFixed(2)}</p>
          `}
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando vendas...</p>
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
            onClick={loadData}
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
              <p className="text-2xl font-bold text-gray-600">{filterSalesByStatus('Pending').length}</p>
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
              <p className="text-2xl font-bold text-yellow-600">{filterSalesByStatus('AwaitingPayment').length}</p>
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
              <p className="text-2xl font-bold text-green-600">{filterSalesByStatus('Paid').length}</p>
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
              <p className="text-2xl font-bold text-red-600">{filterSalesByStatus('Cancelled').length}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
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
                    <span className="text-sm text-gray-900">
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)} un.
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-green-600">
                        R$ {sale.totalAmount.toFixed(2)}
                      </span>
                      {sale.discountPercentage > 0 && (
                        <span className="text-xs text-gray-500">
                          {sale.discountPercentage}% off
                        </span>
                      )}
                    </div>
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
                        <option value="Pending">Pendente</option>
                        <option value="AwaitingPayment">Aguardando Pagamento</option>
                        <option value="Paid">Pago</option>
                        <option value="Cancelled">Cancelado</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => {
                          if (sale.status === 'Paid') {
                            alert('Vendas com status "Pago" não podem ter seu status alterado!');
                            return;
                          }
                          setEditingStatus({ saleId: sale.id, currentStatus: sale.status });
                        }}
                        className="hover:opacity-80"
                      >
                        {getStatusBadge(sale.status)}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.paymentMethod ? (
                      <span className="text-sm text-gray-900">
                        {sale.paymentMethod === 'Cash' && '💵 Dinheiro'}
                        {sale.paymentMethod === 'Pix' && '📱 PIX'}
                        {sale.paymentMethod === 'Debit' && '💳 Débito'}
                        {sale.paymentMethod === 'Credit' && '💳 Crédito'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingSale ? 'Editar Venda' : 'Nova Venda'}
            </h2>
            
            {/* Seleção de Cliente */}
            <CustomerSelector
              value={selectedCustomer}
              onChange={handleCustomerChange}
              customers={customers}
              onCustomerAdded={loadData}
              label="Cliente"
              required={true}
              showBirthdayIcon={true}
              checkBirthdayMonth={checkBirthdayMonth}
              className="mb-6"
            />
            {isBirthdayDiscount && (
              <div className="mt-2 p-3 bg-pink-50 border border-pink-200 rounded-lg flex items-center gap-2 mb-6">
                <span className="text-2xl">🎂</span>
                <div>
                  <p className="text-sm font-semibold text-pink-800">
                    Mês de aniversário do cliente!
                  </p>
                  <p className="text-xs text-pink-700">
                    Desconto de {birthdayDiscountPercentage}% aplicado automaticamente
                  </p>
                </div>
              </div>
            )}

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
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.weight ? ` (${product.weight})` : ''}
                        {' - '}R$ {product.price.toFixed(2)}
                        {' | '}Estoque: {product.quantity}
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
                    {saleItems.map(item => {
                      return (
                        <tr key={item.productId}>
                          <td className="px-4 py-2 text-sm">{item.productName}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1;
                                setSaleItems(saleItems.map(i => 
                                  i.productId === item.productId 
                                    ? { ...i, quantity: newQuantity, totalPrice: newQuantity * i.unitPrice }
                                    : i
                                ));
                              }}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {(() => {
                    const subtotal = calculateSubtotal();
                    const birthdayDiscount = calculateBirthdayDiscount();
                    const additionalDiscount = calculateAdditionalDiscount();
                    const percentDiscount = birthdayDiscount + additionalDiscount;
                    const total = calculateTotal();
                    const totalDiscounts = percentDiscount + jarDiscountAmount;

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-base text-gray-700">
                          <span>Subtotal dos itens:</span>
                          <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
                        </div>
                        
                        {(percentDiscount > 0 || jarDiscountAmount > 0) && (
                          <div className="border-t pt-2 space-y-1">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Descontos aplicados:</div>
                            
                            {birthdayDiscount > 0 && (
                              <div className="flex justify-between text-sm text-pink-600 bg-pink-50 py-1.5 px-4 -mx-4 rounded">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-base">🎂</span>
                                  <span className="font-semibold">Desconto de Aniversário</span>
                                  <span className="text-xs bg-pink-200 px-1.5 py-0.5 rounded-full">especial</span>
                                  <span className="font-normal">({birthdayDiscountPercentage}%):</span>
                                </span>
                                <span className="font-semibold whitespace-nowrap">- R$ {birthdayDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {additionalDiscount > 0 && (
                              <div className="flex justify-between text-sm text-orange-600 px-4 -mx-4">
                                <span className="flex items-center gap-1.5">
                                  <span>💰</span>
                                  <span>Desconto Adicional</span>
                                  <span className="font-normal">({additionalDiscountPercentage}%):</span>
                                </span>
                                <span className="font-semibold whitespace-nowrap">- R$ {additionalDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {jarDiscountAmount > 0 && (
                              <div className="flex justify-between text-sm text-green-600 px-4 -mx-4">
                                <span className="flex items-center gap-1.5">
                                  <span>♻️</span>
                                  <span>Devolução de potes ({jarCreditsUsed} {jarCreditsUsed === 1 ? 'pote' : 'potes'}):</span>
                                </span>
                                <span className="font-semibold whitespace-nowrap">- R$ {jarDiscountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {totalDiscounts > 0 && (
                              <div className="flex justify-between text-sm text-gray-600 font-semibold px-4 -mx-4 pt-2 mt-1 border-t">
                                <span>Total em descontos:</span>
                                <span className="whitespace-nowrap">- R$ {totalDiscounts.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {shippingCost > 0 && (
                          <div className="flex justify-between text-base text-blue-600 border-t pt-2">
                            <span className="flex items-center gap-1.5">
                              <span>🚚</span>
                              <span>Frete:</span>
                            </span>
                            <span className="font-semibold">+ R$ {shippingCost.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2 border-t-2 border-gray-400">
                          <span>Total a pagar:</span>
                          <span className="text-green-600">R$ {total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Descontos */}
            {saleItems.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Desconto de Aniversário */}
                {isBirthdayDiscount && (
                  <div className="rounded-lg p-4 border-2 bg-pink-50 border-pink-300">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-2xl">🎂</span>
                      <span className="text-pink-700 font-semibold">Desconto de Aniversário</span>
                      <span className="text-xs font-normal text-white bg-pink-500 px-2 py-0.5 rounded-full">
                        ESPECIAL
                      </span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={birthdayDiscountPercentage}
                        onChange={(e) => setBirthdayDiscountPercentage(e.target.value)}
                        className="w-32 px-4 py-2 border-2 border-pink-300 focus:ring-pink-500 bg-white rounded-lg focus:ring-2 focus:border-transparent"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 text-xs text-pink-700 bg-pink-100 px-3 py-2 rounded border border-pink-200">
                        🎉 Este cliente está de aniversário este mês! Desconto automático aplicado.
                      </div>
                    </div>
                  </div>
                )}

                {/* Desconto Adicional */}
                <div className="rounded-lg p-4 border-2 bg-white border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <span>Desconto Adicional (%)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={additionalDiscountPercentage}
                      onChange={(e) => setAdditionalDiscountPercentage(e.target.value)}
                      className="w-32 px-4 py-2 border-2 border-gray-300 focus:ring-blue-500 rounded-lg focus:ring-2 focus:border-transparent"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {jarCreditsUsed > 0 && `♻️ ${jarCreditsUsed} ${jarCreditsUsed === 1 ? 'pote será usado' : 'potes serão usados'} automaticamente. `}
                    {isBirthdayDiscount && 'Este desconto será somado ao desconto de aniversário. '}
                    O resumo completo dos descontos aparecerá abaixo.
                  </p>
                </div>
              </div>
            )}

            {/* Frete */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-xl">🚚</span>
                <span>Custo de Frete (R$)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                O valor do frete será adicionado ao total da venda
              </p>
            </div>

            {/* Data da Venda */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Venda
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
              />
              <p className="mt-1 text-xs text-[#814923]">
                {saleDate 
                  ? `Data selecionada: ${new Date(saleDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                  : 'Data atual será usada'
                }
              </p>
            </div>

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
                disabled={editingSale?.status === 'Paid'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="Pending">Pendente</option>
                <option value="AwaitingPayment">Aguardando Pagamento</option>
                <option value="Paid">Pago</option>
                <option value="Cancelled">Cancelado</option>
              </select>
              {saleStatus === 'Cancelled' && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ Vendas canceladas não descontarão do estoque
                </p>
              )}
            </div>

            {/* Método de Pagamento */}
            {saleStatus === 'Paid' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Pix' | 'Debit' | 'Credit' | '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione o método</option>
                  <option value="Cash">💵 Dinheiro</option>
                  <option value="Pix">📱 PIX</option>
                  <option value="Debit">💳 Débito</option>
                  <option value="Credit">💳 Crédito</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitSale}
                className="px-6 py-2 bg-[#814923] text-white rounded-lg hover:bg-[#AF6138] transition-colors"
              >
                {editingSale ? 'Atualizar Venda' : 'Finalizar Venda'}
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
              {viewingSale.paymentMethod && viewingSale.status === 'Paid' && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Método de Pagamento:</span>
                  <p className="text-gray-900 mt-1">
                    {viewingSale.paymentMethod === 'Cash' && '💵 Dinheiro'}
                    {viewingSale.paymentMethod === 'Pix' && '📱 PIX'}
                    {viewingSale.paymentMethod === 'Debit' && '💳 Cartão de Débito'}
                    {viewingSale.paymentMethod === 'Credit' && '💳 Cartão de Crédito'}
                  </p>
                </div>
              )}
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
              {viewingSale.discountPercentage > 0 || viewingSale.shippingCost > 0 ? (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    Subtotal: R$ {viewingSale.subtotal.toFixed(2)}
                  </div>
                  {viewingSale.discountPercentage > 0 && (
                    <div className="text-sm text-red-600">
                      Desconto ({viewingSale.discountPercentage}%): - R$ {viewingSale.discountAmount.toFixed(2)}
                    </div>
                  )}
                  {viewingSale.shippingCost > 0 && (
                    <div className="text-sm text-blue-600">
                      Frete: + R$ {viewingSale.shippingCost.toFixed(2)}
                    </div>
                  )}
                  <div className="text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                    Total: R$ {viewingSale.totalAmount.toFixed(2)}
                  </div>
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  Total: R$ {viewingSale.totalAmount.toFixed(2)}
                </span>
              )}
            </div>

            {viewingSale.notes && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500">Observações:</span>
                <p className="text-gray-900">{viewingSale.notes}</p>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSale(viewingSale)}
                  className="px-6 py-2 bg-[#5D663D] text-white rounded-lg hover:bg-[#22452B] transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteSale(viewingSale.id)}
                  className="px-6 py-2 bg-[#AF6138] text-white rounded-lg hover:bg-[#814923] transition-colors"
                >
                  Excluir
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingSale(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => printInvoice(viewingSale)}
                  className="px-6 py-2 bg-[#814923] text-white rounded-lg hover:bg-[#AF6138] transition-colors"
                >
                  Imprimir Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Método de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Selecionar Método de Pagamento</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Como foi realizado o pagamento? *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Pix' | 'Debit' | 'Credit' | '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              >
                <option value="">Selecione o método</option>
                <option value="Cash">💵 Dinheiro</option>
                <option value="Pix">📱 PIX</option>
                <option value="Debit">💳 Cartão de Débito</option>
                <option value="Credit">💳 Cartão de Crédito</option>
              </select>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingStatusChange(null);
                  setPaymentMethod('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPaymentMethod}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AF6138] mx-auto"></div>
          <p className="mt-4 text-[#814923]">Carregando...</p>
        </div>
      </div>
    }>
      <SalesContent />
    </Suspense>
  );
}