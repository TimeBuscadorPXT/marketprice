import { useState } from 'react';
import { Settings as SettingsIcon, User, MapPin, Star } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Settings() {
  useDocumentTitle('Configurações');
  const { user } = useAuth();
  const [region, setRegion] = useState(user?.region ?? '');
  const [saved, setSaved] = useState(false);

  function handleSaveRegion() {
    // Placeholder - would call an API to update region
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* User info */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
          <User className="h-4 w-4" />
          Informações do Usuário
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[#f0f0f5]/50">Nome</p>
            <p className="mt-0.5 text-sm font-medium text-[#f0f0f5]">
              {user?.name ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#f0f0f5]/50">Email</p>
            <p className="mt-0.5 text-sm font-medium text-[#f0f0f5]">
              {user?.email ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#f0f0f5]/50">Membro desde</p>
            <p className="mt-0.5 text-sm font-medium text-[#f0f0f5]">
              {user?.createdAt
                ? new Intl.DateTimeFormat('pt-BR').format(new Date(user.createdAt))
                : '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* Region */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
          <MapPin className="h-4 w-4" />
          Região Padrão
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Região"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Ex: SP, RJ, MG"
            />
          </div>
          <Button onClick={handleSaveRegion}>Salvar</Button>
        </div>
        {saved && (
          <p className="mt-2 text-xs text-[#22c55e]">Região atualizada com sucesso!</p>
        )}
      </Card>

      {/* Favorite models placeholder */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
          <Star className="h-4 w-4" />
          Modelos Favoritos
        </h3>
        <p className="text-sm text-[#f0f0f5]/40">
          Em breve você poderá salvar seus modelos favoritos para acesso rápido.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-2 text-xs text-[#f0f0f5]/30">
            Nenhum modelo salvo
          </div>
        </div>
      </Card>
    </div>
  );
}
