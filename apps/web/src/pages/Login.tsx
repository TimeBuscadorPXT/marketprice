import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  useDocumentTitle('Login');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar com Google.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    try {
      setError('');
      setLoading(true);
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.';
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
          Monitore preços e maximize seus lucros
        </p>
      </div>

      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#f0f0f5]">Entrar</h2>
            <p className="mt-1 text-sm text-[#f0f0f5]/50">
              Acesse sua conta para continuar
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">
              {error}
            </div>
          )}

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
            placeholder="Sua senha"
            error={errors.password?.message}
            {...register('password', {
              required: 'Senha obrigatória',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' },
            })}
          />

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#f0f0f5]/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#12121a] px-3 text-[#f0f0f5]/40">ou</span>
            </div>
          </div>

          <div className="flex justify-center [&_iframe]:!rounded-lg">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Erro ao entrar com Google.')}
              theme="filled_black"
              size="large"
              width="100%"
              text="signin_with"
              locale="pt-BR"
            />
          </div>

          <p className="text-center text-sm text-[#f0f0f5]/50">
            Não tem conta?{' '}
            <Link to="/register" className="font-medium text-[#22c55e] hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
