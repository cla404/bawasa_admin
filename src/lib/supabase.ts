import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ghcumkeaayrrcuxvadxn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoY3Vta2VhYXlycmN1eHZhZHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjgyMDQsImV4cCI6MjA3MzM0NDIwNH0.m67Fy9gY6Uj7HHHhXnhuTs2t9Qyx6sLlparQnIIkyL0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Suppress refresh token errors in console - these are expected when cashiers use custom auth
if (typeof window !== 'undefined') {
  // Listen for unhandled promise rejections and suppress refresh token errors
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const errorMessage = error?.message || String(error || '')
    
    if (
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('Refresh Token Not Found') ||
      errorMessage.includes('JWTExpired') ||
      (errorMessage.includes('AuthApiError') && errorMessage.includes('refresh'))
    ) {
      // Prevent error from showing in Next.js overlay
      event.preventDefault()
      return
    }
  }, { capture: true })
}

// Auth helper functions
export const auth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    try {
      return await supabase.auth.getUser()
    } catch (error: any) {
      // Suppress refresh token errors - these are expected when cashiers use custom auth
      const errorMessage = error?.message || String(error || '')
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found') ||
        errorMessage.includes('JWTExpired')
      ) {
        // Return empty user instead of throwing error
        return { data: { user: null }, error: null }
      }
      throw error
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  },
}
