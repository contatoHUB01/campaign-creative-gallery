import { useState, type FormEvent } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export function MetaLogin() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/' },
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link. Verifique seu e-mail autorizado e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return <div className="mx-auto max-w-sm py-12 text-center">
    <h3 className="font-semibold">Entre para consultar os criativos</h3>
    {sent ? <p role="status" className="mt-3 text-sm text-muted-foreground">Se este e-mail estiver autorizado, você receberá um link para entrar.</p> :
      <form onSubmit={signIn} className="mt-5 flex flex-col gap-3">
        <label htmlFor="meta-email" className="text-left text-xs text-muted-foreground">E-mail</label>
        <input id="meta-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Mail />}Enviar link de acesso</Button>
      </form>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </div>;
}