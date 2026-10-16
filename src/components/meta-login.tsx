import { useState, type FormEvent } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export function MetaLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch {
      setError('E-mail ou senha incorretos.');
    } finally {
      setPending(false);
    }
  }

  return <div className="mx-auto w-full max-w-sm py-12 text-center">
    <h3 className="font-semibold">Entre para consultar os criativos</h3>
    <form onSubmit={signIn} className="mt-5 flex flex-col gap-3">
      <label htmlFor="meta-email" className="text-left text-xs text-muted-foreground">E-mail</label>
      <input id="meta-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
      <label htmlFor="meta-password" className="text-left text-xs text-muted-foreground">Senha</label>
      <input id="meta-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <LogIn />}Entrar</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </div>;
}
