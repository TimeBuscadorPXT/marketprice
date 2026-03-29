import { useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Calculator,
  Settings,
  LogOut,
  Flame,
  Sparkles,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getDeals } from '@/services/deals';

const navItems = [
  { to: '/', icon: Flame, label: 'Oportunidades' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assistente', icon: Sparkles, label: 'IA Analista' },
  { to: '/analise', icon: BarChart3, label: 'Análise' },
  { to: '/fornecedores', icon: Users, label: 'Fornecedores' },
  { to: '/calculadora', icon: Calculator, label: 'Calculadora' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, user } = useAuth();

  const { data: dealsData } = useQuery({
    queryKey: ['deals-sidebar', user?.region],
    queryFn: () => getDeals(user?.region ?? '', { heat: 'hot', limit: 1 }),
    enabled: !!user?.region,
    refetchInterval: 60000,
  });
  const hotCount = dealsData?.summary?.hot ?? 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onClose) {
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Menu de navegação"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#0a0a0f] transition-transform duration-200',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-6">
          <span className="text-xl font-[800] text-[#f0f0f5]">
            Market<span className="text-[#22c55e]">Price</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu principal">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#22c55e]/10 text-[#22c55e] font-semibold'
                    : 'text-[#f0f0f5]/50 hover:bg-white/[0.04] hover:text-[#f0f0f5]',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
              {to === '/' && hotCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[10px] font-bold text-white">
                  {hotCount > 99 ? '99+' : hotCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#f0f0f5]/50 transition-colors hover:bg-white/[0.04] hover:text-[#f87171]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
