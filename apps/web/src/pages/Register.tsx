import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  region: string;
}

export default function Register() {
  useDocumentTitle('Cadastro');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  async function onSubmit(data: RegisterForm) {
    try {
      setError('');
      setLoading(true);
      await registerUser(data.name, data.email, data.password, data.region);
      navigate('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-[800] text-[#f0f0f5]">
          Market<span className="text-[#22c55e]">Price</span>
        </h1>
        <p className="mt-2 text-sm text-[#f0f0f5]/50">
          Crie sua conta e comece a monitorar
        </p>
      </div>

      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#f0f0f5]">Criar conta</h2>
            <p className="mt-1 text-sm text-[#f0f0f5]/50">
              Preencha os dados para se registrar
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">
              {error}
            </div>
          )}

          <Input
            label="Nome"
            placeholder="Seu nome"
            error={errors.name?.message}
            {...register('name', {
              required: 'Nome obrigatório',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
          />

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email obrigatório',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email inválido',
              },
            })}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            error={errors.password?.message}
            {...register('password', {
              required: 'Senha obrigatória',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' },
            })}
          />

          <Input
            label="Região"
            placeholder="Ex: SC, PR, SP"
            error={errors.region?.message}
            {...register('region', {
              required: 'Região obrigatória',
            })}
          />

          <Button type="submit" loading={loading} className="w-full">
            Criar conta
          </Button>

          <p className="text-center text-sm text-[#f0f0f5]/50">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-[#22c55e] hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
