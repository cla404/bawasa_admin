import { supabase } from './supabase'

export interface User {
  id: string
  auth_user_id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  account_type: 'pending' | 'consumer' | 'admin' | 'staff'
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserWithStatus extends User {
  status: 'verified' | 'pending' | 'suspended'
}

interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

export class UserService {
  /**
   * Fetch all users from the users table
   */
  static async getAllUsers(): Promise<{ data: User[] | null; error: unknown }> {
    try {
      console.log('🔍 Fetching users from Supabase...')
      
      // First, let's check if we're authenticated
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current authenticated user:', user)
      
      if (!user) {
        console.error('❌ No authenticated user found')
        return { data: null, error: { message: 'Not authenticated' } }
      }
      
      // Try to fetch users with different approaches
      console.log('🔄 Attempting to fetch users...')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Supabase response:', { data, error })
      
      if (error) {
        console.error('❌ Supabase error:', error)
        
        // If it's an RLS error, let's try a different approach
        if (error.message?.includes('policy') || error.message?.includes('permission')) {
          console.log('🔧 RLS policy issue detected, trying alternative approach...')
          
          // Try to fetch just the current user first
          const { data: currentUser, error: currentUserError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          
          console.log('👤 Current user data:', { currentUser, currentUserError })
          
          if (currentUserError) {
            console.error('❌ Even current user fetch failed:', currentUserError)
          }
        }
      } else {
        console.log('✅ Successfully fetched users:', data?.length || 0, 'users')
      }

      return { data, error }
    } catch (error) {
      console.error('💥 Unexpected error fetching users:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch a single user by ID
   */
  static async getUserById(id: string): Promise<{ data: User | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error fetching user:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch a single user by auth_user_id
   */
  static async getUserByAuthUserId(authUserId: string): Promise<{ data: User | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error fetching user by auth_user_id:', error)
      return { data: null, error }
    }
  }

  /**
   * Update user status (active/inactive)
   */
  static async updateUserStatus(id: string, isActive: boolean): Promise<{ data: User | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating user status:', error)
      return { data: null, error }
    }
  }

  /**
   * Update user account type
   */
  static async updateUserAccountType(id: string, accountType: 'consumer' | 'admin' | 'staff'): Promise<{ data: User | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ account_type: accountType })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating user account type:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a user (soft delete by setting is_active to false)
   */
  static async deleteUser(id: string): Promise<{ data: User | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error deleting user:', error)
      return { data: null, error }
    }
  }

  /**
   * Search users by name, email, or phone
   */
  static async searchUsers(query: string): Promise<{ data: User[] | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error searching users:', error)
      return { data: null, error }
    }
  }

  /**
   * Get users by account type
   */
  static async getUsersByAccountType(accountType: 'consumer' | 'admin' | 'staff'): Promise<{ data: User[] | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('account_type', accountType)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error fetching users by account type:', error)
      return { data: null, error }
    }
  }

  /**
   * Helper function to determine user status based on user data
   */
  static getUserStatus(user: User): 'verified' | 'pending' | 'suspended' {
    if (!user.is_active) {
      return 'suspended'
    }
    
    // If user has logged in at least once, consider them verified
    if (user.last_login_at) {
      return 'verified'
    }
    
    // If user has never logged in, consider them pending
    return 'pending'
  }

  /**
   * Check if admin user exists in public users table and create if not
   */
  static async ensureAdminUserExists(authUser: AuthUser): Promise<{ data: User | null; error: unknown }> {
    try {
      console.log('🔍 Checking if admin user exists in public users table...', authUser.id)
      
      // First, check if user already exists in public users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking existing user:', fetchError)
        return { data: null, error: fetchError }
      }

      if (existingUser) {
        console.log('✅ Admin user already exists in public users table')
        // Update last_login_at
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('auth_user_id', authUser.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Error updating last_login_at:', updateError)
          return { data: existingUser, error: updateError }
        }

        return { data: updatedUser, error: null }
      }

      // User doesn't exist in public users table, create them
      console.log('🆕 Creating admin user in public users table...')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Admin User',
          account_type: 'admin',
          is_active: true,
          last_login_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating admin user:', createError)
        return { data: null, error: createError }
      }

      console.log('✅ Admin user created successfully in public users table')
      return { data: newUser, error: null }

    } catch (error) {
      console.error('💥 Unexpected error ensuring admin user exists:', error)
      return { data: null, error }
    }
  }

  /**
   * Format user data for display
   */
  static formatUserForDisplay(user: User): UserWithStatus {
    return {
      ...user,
      status: this.getUserStatus(user)
    }
  }
}
