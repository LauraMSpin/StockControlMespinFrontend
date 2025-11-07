'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UsersIcon, 
  ShoppingCartIcon,
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Produtos', href: '/products', icon: ShoppingBagIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Vendas', href: '/sales', icon: ShoppingCartIcon },
  { name: 'Encomendas', href: '/orders', icon: ClipboardDocumentListIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-center h-20 shadow-md">
        <h1 className="text-2xl font-bold text-white">🕯️ Velas Aromáticas</h1>
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
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 text-xs text-gray-500 border-t border-gray-800">
        Sistema de Controle de Estoque v1.0
      </div>
    </div>
  );
}
