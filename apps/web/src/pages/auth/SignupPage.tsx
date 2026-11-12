/**
 * Signup Page for ENJ.
 * Authenticates with Better Auth backend route: POST /api/auth/sign-up/email.
 * Adaptive styling for both Default Light (White) mode and Dark mode.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, User, AtSign, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient, ensureApiBaseUrl } from '../../lib/api/client';

export interface SignupPageProps {
  onNavigate: (path: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signUp, isLoading } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  // Live availability check for the handle.
  useEffect(() => {
    const handle = username.trim().replace(/^@/, '').toLowerCase();

    if (!handle) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setUsernameStatus('invalid');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        await ensureApiBaseUrl();
        const res = await apiClient.get<{
          status: string;
          data: { available: boolean; username: string };
        }>('/api/username/check', { username: handle });
        if (!cancelled) {
          setUsernameStatus(res?.data?.available ? 'available' : 'taken');
        }
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    const handle = username.trim().replace(/^@/, '').toLowerCase();
    if (handle && usernameStatus === 'taken') {
      setFormError('That username is already taken. Please pick another one.');
      return;
    }
    if (handle && usernameStatus === 'invalid') {
      setFormError('Usernames may only contain letters, numbers and underscores (3-30 characters).');
      return;
    }

    try {
      await signUp(email.trim(), password, name.trim(), handle || undefined);
      showToast('Account created successfully', 'success');
      onNavigate('/');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create account.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-3xl p-8 shadow-xl transition-colors">
        {/* Header Branding with Custom ENJ Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#f3f4f6]">
            Create your account
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Join the thoughtful, modern creator community on ENJ.
          </p>
        </div>

        {formError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Jordan Hayes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="w-4 h-4" />}
            required
            autoComplete="name"
          />

          <Input
            label="Username"
            type="text"
            placeholder="jordanhayes"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            icon={<AtSign className="w-4 h-4" />}
            autoComplete="username"
            error={
              usernameStatus === 'taken'
                ? 'That username is already taken'
                : usernameStatus === 'invalid'
                  ? '3-30 characters, letters, numbers and underscores only'
                  : undefined
            }
            helperText={
              usernameStatus === 'available'
                ? `@${username.trim().replace(/^@/, '').toLowerCase()} is available`
                : undefined
            }
          />

          <Input
            label="Email address"
            type="email"
            placeholder="jordan@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-3"
            isLoading={isLoading}
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="text-[#FF3366] font-bold hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
