import { supabase } from './supabase'
import { CashierService, CashierWithStatus } from './cashier-service'
import CashierSessionManager from './cashier-session-manager'

export interface CashierAuthResponse {
  success: boolean
  cashier?: CashierWithStatus
  error?: string
}

export interface CashierLoginData {
  email: string
  password: string
}

export class CashierAuthService {
  static async login(loginData: CashierLoginData): Promise<CashierAuthResponse> {
    try {
      console.log('🔐 [CashierAuth] Starting cashier login process...')
      
      // Step 1: Get account data from accounts table and validate credentials
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', loginData.email)
        .eq('user_type', 'cashier')
        .single()

      if (accountError) {
        console.log('ℹ️ [CashierAuth] Account lookup failed:', accountError.message)
        return { success: false, error: 'Invalid email or password' }
      }

      if (!accountData) {
        console.log('ℹ️ [CashierAuth] No account found')
        return { success: false, error: 'Invalid email or password' }
      }

      console.log('✅ [CashierAuth] Account data retrieved')

      // Step 2: Validate password using bcrypt
      const bcrypt = await import('bcryptjs')
      const isPasswordValid = await bcrypt.compare(loginData.password, accountData.password)

      if (!isPasswordValid) {
        console.log('ℹ️ [CashierAuth] Invalid password')
        return { success: false, error: 'Invalid email or password' }
      }

      console.log('✅ [CashierAuth] Password validated successfully')

      // Step 3: Get cashier data from cashiers table
      const { data: cashierData, error: cashierError } = await supabase
        .from('cashiers')
        .select(`
          *,
          accounts!account_id (
            *
          )
        `)
        .eq('account_id', accountData.id)
        .single()

      if (cashierError) {
        console.error('❌ [CashierAuth] Cashier lookup failed:', cashierError.message)
        return { success: false, error: 'Cashier profile not found' }
      }

      console.log('✅ [CashierAuth] Cashier data retrieved')

      // Step 4: Check if cashier is active
      if (cashierData.status !== 'active') {
        console.warn('⚠️ [CashierAuth] Cashier account is not active:', cashierData.status)
        if (cashierData.status === 'suspended') {
          return { success: false, error: 'Your account has been suspended. Please contact the administrator for assistance.' }
        }
        return { success: false, error: 'Cashier account is not active' }
      }

      // Step 5: Update last_signed_in timestamp
      await supabase
        .from('accounts')
        .update({ last_signed_in: new Date().toISOString() })
        .eq('id', accountData.id)

      // Step 6: Format cashier data for display
      const formattedCashier = CashierService.formatCashierForDisplay(cashierData)
      
      // Step 7: Store session
      CashierSessionManager.setSession(formattedCashier)
      
      console.log('🎉 [CashierAuth] Login successful for cashier:', formattedCashier.employee_id)
      
      return { success: true, cashier: formattedCashier }
    } catch (error) {
      console.error('💥 [CashierAuth] Unexpected error during login:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async logout(): Promise<void> {
    try {
      console.log('🚪 [CashierAuth] Logging out cashier...')
      // Clear the session
      CashierSessionManager.clearSession()
      console.log('✅ [CashierAuth] Logout successful')
    } catch (error) {
      console.error('❌ [CashierAuth] Logout error:', error)
    }
  }

  static async getCurrentCashier(): Promise<CashierAuthResponse> {
    try {
      console.log('👤 [CashierAuth] Getting current cashier...')
      
      // Check if there's a valid session
      const session = CashierSessionManager.getSession()
      
      if (!session) {
        console.log('ℹ️ [CashierAuth] No valid session found')
        return { success: false, error: 'No authenticated user' }
      }

      const sessionCashier = session.cashier as CashierWithStatus

      // Refresh cashier status from database
      try {
        const { data: cashierData, error: cashierError } = await supabase
          .from('cashiers')
          .select(`
            *,
            accounts!account_id (
              *
            )
          `)
          .eq('id', sessionCashier.id)
          .single()

        if (!cashierError && cashierData) {
          const formattedCashier = CashierService.formatCashierForDisplay(cashierData)
          
          // Update session with latest status
          CashierSessionManager.setSession(formattedCashier)
          
          // Check if cashier is suspended
          if (formattedCashier.status === 'suspended') {
            console.warn('⚠️ [CashierAuth] Cashier account is suspended')
            return { 
              success: false, 
              error: 'Your account has been suspended. Please contact the administrator.' 
            }
          }
        }
      } catch (refreshError) {
        console.error('⚠️ [CashierAuth] Error refreshing cashier status:', refreshError)
        // Continue with session data if refresh fails
      }

      // Check status from session (fallback if refresh failed)
      if (sessionCashier.status === 'suspended') {
        console.warn('⚠️ [CashierAuth] Cashier account is suspended')
        return { 
          success: false, 
          error: 'Your account has been suspended. Please contact the administrator.' 
        }
      }

      // Extend the session
      CashierSessionManager.extendSession()
      
      console.log('✅ [CashierAuth] Current cashier retrieved from session:', sessionCashier.employee_id)
      
      return { success: true, cashier: sessionCashier }
    } catch (error) {
      console.error('💥 [CashierAuth] Unexpected error getting current cashier:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updateLastLogin(cashierId: string): Promise<void> {
    try {
      console.log('🕒 [CashierAuth] Updating last login for cashier:', cashierId)
      
      // Get account_id from cashier
      const { data: cashier, error: fetchError } = await supabase
        .from('cashiers')
        .select('account_id')
        .eq('id', cashierId)
        .single()

      if (fetchError) {
        console.error('❌ [CashierAuth] Error fetching cashier for login update:', fetchError)
        return
      }

      // Update last_signed_in in accounts table
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ last_signed_in: new Date().toISOString() })
        .eq('id', cashier.account_id)

      if (updateError) {
        console.error('❌ [CashierAuth] Error updating last login:', updateError)
        return
      }

      console.log('✅ [CashierAuth] Last login updated successfully')
    } catch (error) {
      console.error('💥 [CashierAuth] Unexpected error updating last login:', error)
    }
  }
}
