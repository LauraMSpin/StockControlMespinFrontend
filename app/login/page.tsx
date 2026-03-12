'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

const ACCESS_CODE = '647099';

export default function LoginPage() {
  const [step, setStep] = useState<'code' | 'login'>('code');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ACCESS_CODE) {
      setError('');
      setStep('login');
    } else {
      setError('Código de acesso inválido');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E8E4DE]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 mb-4 relative">
              <Image
                src="/logo.png"
                alt="Logo"
                width={96}
                height={96}
                className="rounded-full"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-[#22452B]">
              Controle de Estoque
            </h1>
            <p className="text-sm text-[#5D663D] mt-1">
              Velas Aromáticas
            </p>
          </div>

          {step === 'code' ? (
            /* Step 1: Access Code */
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-[#2C1810] mb-2">
                  Código de Acesso
                </label>
                <input
                  id="accessCode"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  placeholder="Digite o código de 6 dígitos"
                  className="w-full px-4 py-3 border border-[#E8E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22452B] focus:border-transparent text-center text-lg tracking-[0.5em] placeholder:tracking-normal placeholder:text-sm bg-[#FAF8F5]"
                  autoFocus
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#22452B] text-white rounded-xl font-medium hover:bg-[#1A3521] transition-colors cursor-pointer"
              >
                Verificar Código
              </button>
            </form>
          ) : (
            /* Step 2: Google Login */
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[#5D663D]">
                  Código verificado! Faça login para continuar.
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-[#E8E4DE] rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-[#22452B] rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="text-[#2C1810]">
                  {loading ? 'Entrando...' : 'Entrar com Google'}
                </span>
              </button>

              <button
                onClick={() => {
                  setStep('code');
                  setCode('');
                }}
                className="w-full text-sm text-[#5D663D] hover:text-[#22452B] transition-colors cursor-pointer"
              >
                ← Voltar
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#AF6138]/60 mt-6">
          Acesso restrito a usuários autorizados
        </p>
      </div>
    </div>
  );
}
