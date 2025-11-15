'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UsersIcon, 
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  TagIcon,
  CubeIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Produtos', href: '/products', icon: ShoppingBagIcon },
  { name: 'Materiais', href: '/materials', icon: CubeIcon },
  { name: 'Preços por Categoria', href: '/category-prices', icon: TagIcon },
  { name: 'Custos de Produção', href: '/production-costs', icon: BeakerIcon },
  { name: 'Planejamento de Produção', href: '/production-planning', icon: ClipboardDocumentCheckIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Vendas', href: '/sales', icon: ShoppingCartIcon },
  { name: 'Encomendas', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Relatórios', href: '/reports', icon: ChartBarIcon },
  { name: 'Financeiro', href: '/financial', icon: CurrencyDollarIcon },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-[#22452B] h-screen fixed overflow-y-auto">
      <div className="flex items-center justify-center h-24 shadow-md px-4 py-4 bg-[#1A3521] flex-shrink-0 sticky top-0 z-10">
        <Image 
          src="/logo.png" 
          alt="Logo Velas Aromáticas" 
          width={150}
          height={50}
          className="object-contain max-h-20 w-full"
          priority
        />
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#AF6138] text-white'
                  : 'text-[#FAF8F5] hover:bg-[#5D663D] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 text-xs text-[#B49959] border-t border-[#5D663D] flex-shrink-0 sticky bottom-0 bg-[#22452B]">
        Sistema de Controle de Estoque v1.0
      </div>
    </div>
  );
}
