import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0f]/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-[#f0f0f5]/50 hover:bg-white/[0.04] md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#f0f0f5]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user?.region && (
          <Badge variant="neutral">{user.region}</Badge>
        )}
        {user?.name && (
          <span className="text-sm text-[#f0f0f5]/70">{user.name}</span>
        )}
      </div>
    </header>
  );
}
