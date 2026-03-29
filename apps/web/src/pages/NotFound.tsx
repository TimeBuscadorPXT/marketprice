import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Página não encontrada');
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 text-center">
      <p className="font-mono text-[8rem] font-[900] leading-none text-[#f0f0f5]/[0.04]">
        404
      </p>
      <div className="-mt-10">
        <h1 className="mb-3 text-2xl font-[800] text-[#f0f0f5]">
          Este anúncio foi removido do Marketplace
        </h1>
        <p className="mb-8 text-sm text-[#f0f0f5]/50">
          Parece que o vendedor sumiu com o celular... ou você digitou a URL errada.
        </p>
        <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
      </div>
    </div>
  );
}
