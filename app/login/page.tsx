'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (isSigningUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Check your email for a confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#090d16', color: '#fff' }}>
      <form onSubmit={handleAuth} style={{ background: '#111827', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px', border: '1px solid #1f2937' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          {isSigningUp ? 'Create an Account' : 'Welcome Back'}
        </h1>

        {message && (
          <p style={{ background: '#374151', color: '#f3f4f6', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {message}
          </p>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #374151' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#1f2937', color: '#fff', border: '1px solid #374151' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', background: '#00d2ff', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', marginBottom: '1rem' }}>
          {isSigningUp ? 'Sign Up' : 'Log In'}
        </button>

        <p style={{ fontSize: '0.875rem', textAlign: 'center', color: '#9ca3af' }}>
          {isSigningUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSigningUp(!isSigningUp)}
            style={{ background: 'none', border: 'none', color: '#00d2ff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSigningUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </form>
    </div>
  );
}