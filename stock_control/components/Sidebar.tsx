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
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Produtos', href: '/products', icon: ShoppingBagIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Vendas', href: '/sales', icon: ShoppingCartIcon },
  { name: 'Encomendas', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-[#3D3530] min-h-screen">
      <div className="flex items-center justify-center h-24 shadow-md px-4 py-4 bg-[#2D2520]">
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
                  ? 'bg-[#8B7355] text-white'
                  : 'text-[#E8E4DC] hover:bg-[#6B563E] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 text-xs text-[#B8A894] border-t border-[#6B563E]">
        Sistema de Controle de Estoque v1.0
      </div>
    </div>
  );
}
