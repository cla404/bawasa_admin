'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormField } from '@/components/auth/FormField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { ErrorMessage } from '@/components/auth/ErrorMessage';
import { auth } from '@/lib/supabase';
import { UserService } from '@/lib/user-service';
import { CashierAuthService } from '@/lib/cashier-auth-service';

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
      // First, try admin authentication (Supabase Auth)
      const { data: adminData, error: adminError } = await auth.signIn(formData.email, formData.password);
      
      if (!adminError && adminData?.user) {
        // Admin authentication successful
        console.log('✅ Admin authentication successful');
        
        // Ensure admin user exists in public users table
        const { error: profileError } = await UserService.ensureAdminUserExists(adminData.user);
        
        if (profileError) {
          console.error('❌ Error ensuring admin user exists:', profileError);
          // Don't block the sign-in flow, just log the error
        }
        
        // Redirect to admin dashboard
        router.push('/admin');
        return;
      }

      // If admin auth failed, try cashier authentication
      // Only try if admin error suggests invalid credentials (not network/server errors)
      const shouldTryCashier = !adminError || 
        adminError.message?.includes('Invalid login credentials') ||
        adminError.message?.includes('Email not confirmed') ||
        adminError.message?.includes('Invalid email or password');

      if (shouldTryCashier) {
        const cashierResponse = await CashierAuthService.login({
          email: formData.email,
          password: formData.password,
        });

        if (cashierResponse.success && cashierResponse.cashier) {
          // Cashier authentication successful
          console.log('✅ Cashier authentication successful');
          router.push('/cashier/dashboard');
          return;
        }
      }

      // Both authentication methods failed
      setError('Invalid email or password');
    } catch (err) {
      console.error('Authentication error:', err);
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