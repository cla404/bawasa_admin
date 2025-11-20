'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormField } from '@/components/auth/FormField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { ErrorMessage } from '@/components/auth/ErrorMessage';
import { auth } from '@/lib/supabase';
import { UserService } from '@/lib/user-service';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await auth.signIn(formData.email, formData.password);
      
      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Ensure admin user exists in public users table
        console.log('🔍 Ensuring admin user exists in public users table...');
        const { data: userProfile, error: profileError } = await UserService.ensureAdminUserExists(data.user);
        
        if (profileError) {
          console.error('❌ Error ensuring admin user exists:', profileError);
          // Don't block the sign-in flow, just log the error
          // The user can still proceed to admin dashboard
        } else {
          console.log('✅ Admin user profile ensured:', userProfile);
        }
        
        // Successful sign in - redirect to admin dashboard
        router.push('/admin');
      } else {
        throw new Error('Sign in failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Welcome back to BAWASA System"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorMessage message={error} />}
        
        <FormField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          required
          autoComplete="email"
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
          required
          autoComplete="current-password"
        />

        <SubmitButton
          text="Sign In"
          isLoading={isLoading}
          disabled={isLoading}
        />
      </form>
      
    </AuthLayout>
  );
}