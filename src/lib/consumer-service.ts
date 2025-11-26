import { supabase } from './supabase'

export interface Consumer {
  id: string
  water_meter_no: string
  consumer_id: number | null
  registered_voter: boolean | null
  created_at: string
  updated_at: string
}

export interface Account {
  id: number
  email: string | null
  password: string | null
  created_at: string
  full_name: string | null
  full_address: string | null
  mobile_no: number | null
  user_type: string | null
  status?: string | null
}

export interface MeterReading {
  id: string
  consumer_id: string
  reading_date: string
  previous_reading: number
  present_reading: number
  consumption_cubic_meters: number
  created_at: string
  updated_at: string
}

export interface Billing {
  id: string
  consumer_id: string
  meter_reading_id: string | null
  billing_month: string
  consumption_10_or_below: number
  amount_10_or_below: number
  amount_10_or_below_with_discount: number
  consumption_over_10: number
  amount_over_10: number
  amount_current_billing: number
  arrears_to_be_paid: number
  total_amount_due: number
  due_date: string
  arrears_after_due_date: number | null
  payment_status: string
  payment_date: string | null
  amount_paid: number
  created_at: string
  updated_at: string
}

export interface ConsumerWithAccount extends Consumer {
  account?: Account
  latest_meter_reading?: MeterReading
  latest_billing?: Billing
}

export interface ConsumerWithStatus extends ConsumerWithAccount {
  status: 'paid' | 'unpaid' | 'partial' | 'overdue'
}

export class ConsumerService {
  /**
   * Fetch all consumers from the new table structure with account, meter reading, and billing information
   */
  static async getAllConsumers(): Promise<{ data: ConsumerWithAccount[] | null; error: any }> {
    try {
      console.log('🔍 Fetching consumers from new table structure...')
      
      // Fetch consumers with account information
      const { data: consumers, error: consumersError } = await supabase
        .from('consumers')
        .select(`
          *,
          accounts!consumer_id (
            *
          )
        `)
        .order('created_at', { ascending: false })

      if (consumersError) {
        console.error('❌ Consumers fetch failed:', consumersError)
        return { data: null, error: consumersError }
      }

      if (!consumers || consumers.length === 0) {
        console.log('📭 No consumers found')
        return { data: [], error: null }
      }

      // For each consumer, get their latest meter reading and billing
      const consumersWithDetails = await Promise.all(
        consumers.map(async (consumer) => {
          const account = consumer.accounts as any
          
          // Get latest meter reading for this consumer
          const { data: latestMeterReading } = await supabase
            .from('bawasa_meter_readings')
            .select('*')
            .eq('consumer_id', consumer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Get latest billing for this consumer
          const { data: latestBilling } = await supabase
            .from('bawasa_billings')
            .select('*')
            .eq('consumer_id', consumer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...consumer,
            account: account || null,
            latest_meter_reading: latestMeterReading || null,
            latest_billing: latestBilling || null
          }
        })
      )

      console.log('✅ Successfully fetched consumers:', consumersWithDetails.length, 'consumers')
      return { data: consumersWithDetails, error: null }
    } catch (error) {
      console.error('💥 Unexpected error fetching consumers:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch a single consumer by ID
   */
  static async getConsumerById(id: string): Promise<{ data: ConsumerWithAccount | null; error: any }> {
    try {
      const { data: consumer, error: consumerError } = await supabase
        .from('consumers')
        .select(`
          *,
          accounts!consumer_id (
            *
          )
        `)
        .eq('id', id)
        .single()

      if (consumerError) {
        return { data: null, error: consumerError }
      }

      if (!consumer) {
        return { data: null, error: null }
      }

      // Get latest meter reading and billing
      const { data: latestMeterReading } = await supabase
        .from('bawasa_meter_readings')
        .select('*')
        .eq('consumer_id', consumer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { data: latestBilling } = await supabase
        .from('bawasa_billings')
        .select('*')
        .eq('consumer_id', consumer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const account = consumer.accounts as any
      const result = {
        ...consumer,
        account: account || null,
        latest_meter_reading: latestMeterReading || null,
        latest_billing: latestBilling || null
      }

      return { data: result, error: null }
    } catch (error) {
      console.error('Error fetching consumer:', error)
      return { data: null, error }
    }
  }

  /**
   * Update consumer payment status (updates the billing record)
   */
  static async updateConsumerPaymentStatus(id: string, paymentStatus: string): Promise<{ data: Billing | null; error: any }> {
    try {
      // Update the latest billing record for this consumer
      const { data, error } = await supabase
        .from('bawasa_billings')
        .update({ 
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('consumer_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating consumer payment status:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a consumer (cascades to meter readings and billings)
   */
  static async deleteConsumer(id: string): Promise<{ data: Consumer | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('consumers')
        .delete()
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error deleting consumer:', error)
      return { data: null, error }
    }
  }

  /**
   * Search consumers by water meter number or account details
   */
  static async searchConsumers(query: string): Promise<{ data: ConsumerWithAccount[] | null; error: any }> {
    try {
      // Search consumers by water meter number
      const { data: consumers, error: consumersError } = await supabase
        .from('consumers')
        .select(`
          *,
          accounts!consumer_id (
            *
          )
        `)
        .ilike('water_meter_no', `%${query}%`)
        .order('created_at', { ascending: false })

      if (consumersError) {
        console.error('❌ Consumers search failed:', consumersError)
        return { data: null, error: consumersError }
      }

      // Also search by account details
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          consumers!consumer_id (
            *
          )
        `)
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,full_address.ilike.%${query}%`)

      if (accountsError) {
        console.error('❌ Accounts search failed:', accountsError)
        return { data: null, error: accountsError }
      }

      // Combine results
      const consumerResults = consumers || []
      const accountResults = accounts?.map(account => ({
        ...account.consumers,
        account: account
      })) || []

      // Merge and deduplicate
      const allResults = [...consumerResults, ...accountResults]
      const uniqueResults = allResults.filter((consumer, index, self) => 
        index === self.findIndex(c => c.id === consumer.id)
      )

      // Get latest meter reading and billing for each consumer
      const consumersWithDetails = await Promise.all(
        uniqueResults.map(async (consumer) => {
          const { data: latestMeterReading } = await supabase
            .from('bawasa_meter_readings')
            .select('*')
            .eq('consumer_id', consumer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const { data: latestBilling } = await supabase
            .from('bawasa_billings')
            .select('*')
            .eq('consumer_id', consumer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...consumer,
            latest_meter_reading: latestMeterReading || null,
            latest_billing: latestBilling || null
          }
        })
      )

      return { data: consumersWithDetails, error: null }
    } catch (error) {
      console.error('Error searching consumers:', error)
      return { data: null, error }
    }
  }

  /**
   * Helper function to determine consumer status based on payment status
   */
  static getConsumerStatus(consumer: ConsumerWithAccount): 'paid' | 'unpaid' | 'partial' | 'overdue' {
    return (consumer.latest_billing?.payment_status as 'paid' | 'unpaid' | 'partial' | 'overdue') || 'unpaid'
  }

  /**
   * Format consumer data for display
   */
  static formatConsumerForDisplay(consumer: ConsumerWithAccount): ConsumerWithStatus {
    return {
      ...consumer,
      status: this.getConsumerStatus(consumer)
    }
  }

  /**
   * Suspend a consumer (sets status to 'suspended' in accounts table)
   */
  static async suspendConsumer(accountId: number): Promise<{ data: Account | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ status: 'suspended' })
        .eq('id', accountId)
        .eq('user_type', 'consumer')
        .select()
        .single()

      if (error) {
        console.error('Error suspending consumer:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error suspending consumer:', error)
      return { data: null, error }
    }
  }

  /**
   * Unsuspend a consumer (sets status to 'active' in accounts table)
   */
  static async unsuspendConsumer(accountId: number): Promise<{ data: Account | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ status: 'active' })
        .eq('id', accountId)
        .eq('user_type', 'consumer')
        .select()
        .single()

      if (error) {
        console.error('Error unsuspending consumer:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error unsuspending consumer:', error)
      return { data: null, error }
    }
  }
}
