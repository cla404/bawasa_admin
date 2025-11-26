import { supabase } from './supabase'

export interface MeterReaderUser {
  id: number // Account ID from accounts table
  created_at: string
  full_name: string | null
  email: string | null
  password: string | null
  mobile_no: number | null
  full_address: string | null
  last_signed_in: string | null
  user_type: string | null
  meter_reader_id: number // ID from bawasa_meter_reader table
  status: string | null // Status from bawasa_meter_reader table
  assigned_to: string | null // UUID of assigned consumer from consumers table
  assigned_consumer?: {
    id: string
    water_meter_no: string
    account?: {
      full_name: string | null
      email: string | null
    }
  } | null
}

export interface CreateMeterReaderData {
  email: string
  password: string
  full_name: string
  mobile_no?: string
  full_address?: string
}

export class MeterReaderService {
  /**
   * Fetch all meter reader users
   */
  static async getAllMeterReaders(): Promise<{ data: MeterReaderUser[] | null; error: any }> {
    try {
      console.log('🔍 Fetching meter reader users from accounts and bawasa_meter_reader tables...')
      
      // First, get all meter reader accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_type', 'meter_reader')
        .order('created_at', { ascending: false })

      if (accountsError) {
        console.error('❌ Error fetching accounts:', accountsError)
        return { data: null, error: accountsError }
      }

      if (!accounts || accounts.length === 0) {
        console.log('📭 No meter reader accounts found')
        return { data: [], error: null }
      }

      // Then, get meter reader records for these accounts
      const accountIds = accounts.map(acc => acc.id)
      const { data: meterReaders, error: meterReadersError } = await supabase
        .from('bawasa_meter_reader')
        .select('*')
        .in('reader_id', accountIds)

      if (meterReadersError) {
        console.error('❌ Error fetching meter readers:', meterReadersError)
        return { data: null, error: meterReadersError }
      }

      // Get assigned consumers if any
      const assignedConsumerIds = meterReaders
        ?.filter(mr => mr.assigned_to)
        .map(mr => mr.assigned_to) || []

      let consumers: any[] = []
      if (assignedConsumerIds.length > 0) {
        const { data: consumersData, error: consumersError } = await supabase
          .from('consumers')
          .select(`
            id,
            water_meter_no,
            consumer_id,
            accounts!consumer_id (
              full_name,
              email
            )
          `)
          .in('id', assignedConsumerIds)

        if (consumersError) {
          console.error('❌ Error fetching consumers:', consumersError)
          // Don't return error, just continue without consumer data
        } else {
          consumers = consumersData || []
        }
      }

      // Transform the data to match the interface
      const transformedData = accounts.map(account => {
        const meterReader = meterReaders?.find(mr => mr.reader_id === account.id)
        const assignedConsumer = meterReader?.assigned_to 
          ? consumers.find(c => c.id === meterReader.assigned_to)
          : null
        
        return {
          id: account.id,
          created_at: account.created_at,
          full_name: account.full_name,
          email: account.email,
          password: account.password,
          mobile_no: account.mobile_no,
          full_address: account.full_address,
          last_signed_in: account.last_signed_in,
          user_type: account.user_type,
          meter_reader_id: meterReader?.id || null,
          status: meterReader?.status || null,
          assigned_to: meterReader?.assigned_to || null,
          assigned_consumer: assignedConsumer ? {
            id: assignedConsumer.id as string,
            water_meter_no: assignedConsumer.water_meter_no as string,
            account: assignedConsumer.accounts ? {
              full_name: assignedConsumer.accounts.full_name as string | null,
              email: assignedConsumer.accounts.email as string | null
            } : undefined
          } : null
        }
      })

      console.log('✅ Successfully fetched meter readers:', transformedData.length)
      return { data: transformedData, error: null }
    } catch (error) {
      console.error('💥 Unexpected error fetching meter reader users:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch a single meter reader by ID
   */
  static async getMeterReaderById(id: string): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      // Get the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .eq('user_type', 'meter_reader')
        .single()

      if (accountError) {
        return { data: null, error: accountError }
      }

      // Get the meter reader record
      const { data: meterReader, error: meterReaderError } = await supabase
        .from('bawasa_meter_reader')
        .select('*')
        .eq('reader_id', id)
        .single()

      if (meterReaderError) {
        console.error('Error fetching meter reader record:', meterReaderError)
        // Continue without meter reader data
      }

      // Get assigned consumer if any
      let assignedConsumer = null
      if (meterReader?.assigned_to) {
        const { data: consumerData, error: consumerError } = await supabase
          .from('consumers')
          .select(`
            id,
            water_meter_no,
            consumer_id,
            accounts!consumer_id (
              full_name,
              email
            )
          `)
          .eq('id', meterReader.assigned_to)
          .single()

        if (consumerError) {
          console.error('Error fetching assigned consumer:', consumerError)
        } else {
          assignedConsumer = consumerData
        }
      }

      // Transform the data to match the interface
      const transformedData = {
        id: account.id,
        created_at: account.created_at,
        full_name: account.full_name,
        email: account.email,
        password: account.password,
        mobile_no: account.mobile_no,
        full_address: account.full_address,
        last_signed_in: account.last_signed_in,
        user_type: account.user_type,
        meter_reader_id: meterReader?.id || null,
        status: meterReader?.status || null,
        assigned_to: meterReader?.assigned_to || null,
        assigned_consumer: assignedConsumer ? {
          id: assignedConsumer.id as string,
          water_meter_no: assignedConsumer.water_meter_no as string,
          account: assignedConsumer.accounts ? {
            full_name: (assignedConsumer.accounts as any).full_name as string | null,
            email: (assignedConsumer.accounts as any).email as string | null
          } : undefined
        } : null
      }

      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error fetching meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Create a new meter reader user
   */
  static async createMeterReader(meterReaderData: CreateMeterReaderData): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      console.log('🚀 Creating new meter reader via API...', meterReaderData)
      
      const response = await fetch('/api/meter-readers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meterReaderData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API request failed:', result.error)
        return { data: null, error: { message: result.error } }
      }

      console.log('✅ Meter reader creation completed successfully')
      return { data: result.data, error: null }

    } catch (error) {
      console.error('💥 Unexpected error creating meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Update meter reader user information
   */
  static async updateMeterReader(id: string, updates: Partial<MeterReaderUser>): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      // Separate account updates from meter reader updates
      const accountUpdates: any = {}
      const meterReaderUpdates: any = {}
      
      // Map fields to appropriate tables
      if (updates.email !== undefined) accountUpdates.email = updates.email
      if (updates.full_name !== undefined) accountUpdates.full_name = updates.full_name
      if (updates.full_address !== undefined) accountUpdates.full_address = updates.full_address
      if (updates.mobile_no !== undefined) accountUpdates.mobile_no = updates.mobile_no
      if (updates.password !== undefined) accountUpdates.password = updates.password
      if (updates.status !== undefined) meterReaderUpdates.status = updates.status

      // Update account first
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .update(accountUpdates)
        .eq('id', id)
        .eq('user_type', 'meter_reader')
        .select()
        .single()

      if (accountError) {
        return { data: null, error: accountError }
      }

      // Update meter reader record if needed
      if (Object.keys(meterReaderUpdates).length > 0) {
        const { data: meterReaderData, error: meterReaderError } = await supabase
          .from('bawasa_meter_reader')
          .update(meterReaderUpdates)
          .eq('reader_id', id)
          .select()
          .single()

        if (meterReaderError) {
          return { data: null, error: meterReaderError }
        }

        // Combine the data
        const combinedData = {
          ...accountData,
          meter_reader_id: meterReaderData.id,
          status: meterReaderData.status
        }

        return { data: combinedData, error: null }
      }

      return { data: accountData, error: null }
    } catch (error) {
      console.error('Error updating meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a meter reader user
   */
  static async deleteMeterReader(id: string): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      // First delete the meter reader record
      const { data: meterReaderData, error: meterReaderError } = await supabase
        .from('bawasa_meter_reader')
        .delete()
        .eq('reader_id', id)
        .select()
        .single()

      if (meterReaderError) {
        console.error('Error deleting meter reader record:', meterReaderError)
        return { data: null, error: meterReaderError }
      }

      // Then delete the account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_type', 'meter_reader')
        .select()
        .single()

      if (accountError) {
        console.error('Error deleting account:', accountError)
        return { data: null, error: accountError }
      }

      // Combine the data for response
      const combinedData = {
        ...accountData,
        meter_reader_id: meterReaderData.id,
        status: meterReaderData.status
      }

      return { data: combinedData, error: null }
    } catch (error) {
      console.error('Error deleting meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Suspend a meter reader (sets status to 'suspended')
   */
  static async suspendMeterReader(id: string): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      // Update the meter reader status to 'suspended'
      const { data: meterReaderData, error: meterReaderError } = await supabase
        .from('bawasa_meter_reader')
        .update({ status: 'suspended' })
        .eq('reader_id', id)
        .select()
        .single()

      if (meterReaderError) {
        // If meter reader record doesn't exist, create it
        if (meterReaderError.code === 'PGRST116') {
          const { data: newMeterReader, error: createError } = await supabase
            .from('bawasa_meter_reader')
            .insert({ reader_id: id, status: 'suspended' })
            .select()
            .single()

          if (createError) {
            return { data: null, error: createError }
          }

          // Get the account data
          const { data: accountData } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single()

          return {
            data: {
              ...accountData,
              meter_reader_id: newMeterReader.id,
              status: 'suspended'
            } as MeterReaderUser,
            error: null
          }
        }
        return { data: null, error: meterReaderError }
      }

      // Get the account data
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single()

      return {
        data: {
          ...accountData,
          meter_reader_id: meterReaderData.id,
          status: 'suspended'
        } as MeterReaderUser,
        error: null
      }
    } catch (error) {
      console.error('Error suspending meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Unsuspend a meter reader (sets status to 'active' or null)
   */
  static async unsuspendMeterReader(id: string): Promise<{ data: MeterReaderUser | null; error: any }> {
    try {
      // Update the meter reader status to 'active'
      const { data: meterReaderData, error: meterReaderError } = await supabase
        .from('bawasa_meter_reader')
        .update({ status: 'active' })
        .eq('reader_id', id)
        .select()
        .single()

      if (meterReaderError) {
        // If meter reader record doesn't exist, create it
        if (meterReaderError.code === 'PGRST116') {
          const { data: newMeterReader, error: createError } = await supabase
            .from('bawasa_meter_reader')
            .insert({ reader_id: id, status: 'active' })
            .select()
            .single()

          if (createError) {
            return { data: null, error: createError }
          }

          // Get the account data
          const { data: accountData } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single()

          return {
            data: {
              ...accountData,
              meter_reader_id: newMeterReader.id,
              status: 'active'
            } as MeterReaderUser,
            error: null
          }
        }
        return { data: null, error: meterReaderError }
      }

      // Get the account data
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single()

      return {
        data: {
          ...accountData,
          meter_reader_id: meterReaderData.id,
          status: 'active'
        } as MeterReaderUser,
        error: null
      }
    } catch (error) {
      console.error('Error unsuspending meter reader:', error)
      return { data: null, error }
    }
  }

  /**
   * Search meter readers by name or email
   */
  static async searchMeterReaders(query: string): Promise<{ data: MeterReaderUser[] | null; error: any }> {
    try {
      // Search accounts first
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_type', 'meter_reader')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (accountsError) {
        return { data: null, error: accountsError }
      }

      if (!accounts || accounts.length === 0) {
        return { data: [], error: null }
      }

      // Get meter reader records for these accounts
      const accountIds = accounts.map(acc => acc.id)
      const { data: meterReaders, error: meterReadersError } = await supabase
        .from('bawasa_meter_reader')
        .select('*')
        .in('reader_id', accountIds)

      if (meterReadersError) {
        console.error('Error fetching meter readers:', meterReadersError)
        // Continue without meter reader data
      }

      // Get assigned consumers if any
      const assignedConsumerIds = meterReaders
        ?.filter(mr => mr.assigned_to)
        .map(mr => mr.assigned_to) || []

      let consumers: any[] = []
      if (assignedConsumerIds.length > 0) {
        const { data: consumersData, error: consumersError } = await supabase
          .from('consumers')
          .select(`
            id,
            water_meter_no,
            consumer_id,
            accounts!consumer_id (
              full_name,
              email
            )
          `)
          .in('id', assignedConsumerIds)

        if (consumersError) {
          console.error('Error fetching consumers:', consumersError)
        } else {
          consumers = consumersData || []
        }
      }

      // Transform the data to match the interface
      const transformedData = accounts.map(account => {
        const meterReader = meterReaders?.find(mr => mr.reader_id === account.id)
        const assignedConsumer = meterReader?.assigned_to 
          ? consumers.find(c => c.id === meterReader.assigned_to)
          : null
        
        return {
          id: account.id,
          created_at: account.created_at,
          full_name: account.full_name,
          email: account.email,
          password: account.password,
          mobile_no: account.mobile_no,
          full_address: account.full_address,
          last_signed_in: account.last_signed_in,
          user_type: account.user_type,
          meter_reader_id: meterReader?.id || null,
          status: meterReader?.status || null,
          assigned_to: meterReader?.assigned_to || null,
          assigned_consumer: assignedConsumer ? {
            id: assignedConsumer.id as string,
            water_meter_no: assignedConsumer.water_meter_no as string,
            account: assignedConsumer.accounts ? {
              full_name: assignedConsumer.accounts.full_name as string | null,
              email: assignedConsumer.accounts.email as string | null
            } : undefined
          } : null
        }
      })

      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error searching meter readers:', error)
      return { data: null, error }
    }
  }
}
