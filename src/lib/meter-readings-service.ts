import { supabase } from './supabase'

export interface MeterReading {
  id: string
  consumer_id: string
  reading_date: string
  previous_reading: number | null
  present_reading: number | null
  consumption_cubic_meters: number | null
  meter_image: string | null
  created_at: string
  updated_at: string
}

export interface MeterReadingWithUser extends MeterReading {
  user_email: string
  user_name: string
  water_meter_no: string
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  meter_reading_date: string // Alias for reading_date for compatibility
  billing_month?: string
}

export interface LatestMeterReadingByUser extends MeterReadingWithUser {
  total_readings: number
}

// Interfaces for Supabase query results
interface SupabaseConsumer {
  water_meter_no: string | null
  accounts?: {
    email: string | null
    full_name: string | null
  } | null
}

interface SupabaseBilling {
  payment_status: string | null
  billing_month: string | null
}

interface SupabaseMeterReadingResult extends MeterReading {
  consumers?: SupabaseConsumer | null
  bawasa_billings?: SupabaseBilling[] | null
}

export class MeterReadingsService {
  /**
   * Fetch latest meter reading for each user
   */
  static async getLatestMeterReadingsByUser(): Promise<LatestMeterReadingByUser[]> {
    try {
      // Get meter readings with consumer and account information
      // Only fetch readings where reading_assigned is true
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('reading_assigned', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching meter readings:', error)
        throw new Error(`Failed to fetch meter readings: ${error.message}`)
      }

      // Group by consumer and get latest reading for each consumer
      const consumerGroups = new Map<string, MeterReadingWithUser[]>()
      
      // Transform and group the data
      const transformedData = (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })

      // Group readings by consumer_id
      transformedData.forEach(reading => {
        if (!consumerGroups.has(reading.consumer_id)) {
          consumerGroups.set(reading.consumer_id, [])
        }
        consumerGroups.get(reading.consumer_id)!.push(reading)
      })

      // Get latest reading for each consumer and add total count
      const latestReadings: LatestMeterReadingByUser[] = []
      consumerGroups.forEach((readings) => {
        const latestReading = readings[0] // Already sorted by created_at desc
        latestReadings.push({
          ...latestReading,
          total_readings: readings.length
        })
      })

      // Sort by latest reading date
      return latestReadings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error) {
      console.error('Error in getLatestMeterReadingsByUser:', error)
      throw error
    }
  }

  /**
   * Fetch all meter readings with user information
   */
  static async getAllMeterReadings(): Promise<MeterReadingWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('reading_assigned', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching meter readings:', error)
        throw new Error(`Failed to fetch meter readings: ${error.message}`)
      }

      // Transform the data to match our interface
      return (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })
    } catch (error) {
      console.error('Error in getAllMeterReadings:', error)
      throw error
    }
  }

  /**
   * Fetch meter readings by status
   */
  static async getMeterReadingsByStatus(status: 'unpaid' | 'partial' | 'paid' | 'overdue'): Promise<MeterReadingWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('reading_assigned', true)
        .eq('bawasa_billings.payment_status', status)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching meter readings by status:', error)
        throw new Error(`Failed to fetch meter readings: ${error.message}`)
      }

      // Transform the data to match our interface
      return (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })
    } catch (error) {
      console.error('Error in getMeterReadingsByStatus:', error)
      throw error
    }
  }

  /**
   * Update meter reading status (updates the billing record)
   * @param readingId - The meter reading ID
   * @param status - The payment status to set
   * @param _confirmedBy - Reserved for future use (who confirmed the status)
   */
  static async updateMeterReadingStatus(
    readingId: string, 
    status: 'unpaid' | 'partial' | 'paid' | 'overdue',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _confirmedBy?: string
  ): Promise<void> {
    try {
      const updateData: {
        payment_status: string
        updated_at: string
      } = {
        payment_status: status,
        updated_at: new Date().toISOString()
      }

      // Update the billing record associated with this meter reading
      const { error } = await supabase
        .from('bawasa_billings')
        .update(updateData)
        .eq('meter_reading_id', readingId)

      if (error) {
        console.error('Error updating meter reading status:', error)
        throw new Error(`Failed to update meter reading: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in updateMeterReadingStatus:', error)
      throw error
    }
  }

  /**
   * Get meter reading statistics
   */
  static async getMeterReadingStats(): Promise<{
    total: number
    unpaid: number
    partial: number
    paid: number
    overdue: number
  }> {
    try {
      const { data, error } = await supabase
        .from('bawasa_billings')
        .select('payment_status')

      if (error) {
        console.error('Error fetching meter reading stats:', error)
        throw new Error(`Failed to fetch meter reading stats: ${error.message}`)
      }

      const stats = {
        total: data?.length || 0,
        unpaid: data?.filter(r => r.payment_status === 'unpaid').length || 0,
        partial: data?.filter(r => r.payment_status === 'partial').length || 0,
        paid: data?.filter(r => r.payment_status === 'paid').length || 0,
        overdue: data?.filter(r => r.payment_status === 'overdue').length || 0,
      }

      return stats
    } catch (error) {
      console.error('Error in getMeterReadingStats:', error)
      throw error
    }
  }

  /**
   * Search meter readings by user name or email
   */
  static async searchMeterReadings(query: string): Promise<MeterReadingWithUser[]> {
    try {
      // First, search for accounts matching the query
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)

      if (accountsError) {
        console.error('Error searching accounts:', accountsError)
        throw new Error(`Failed to search accounts: ${accountsError.message}`)
      }

      // Get consumer_ids for these accounts
      const accountIds = (accounts || []).map(acc => acc.id)
      
      if (accountIds.length === 0) {
        // No matching accounts found, return empty array
        return []
      }

      // Get consumers for these accounts
      const { data: consumers, error: consumersError } = await supabase
        .from('consumers')
        .select('id')
        .in('consumer_id', accountIds)

      if (consumersError) {
        console.error('Error fetching consumers:', consumersError)
        throw new Error(`Failed to fetch consumers: ${consumersError.message}`)
      }

      const consumerIds = (consumers || []).map(cons => cons.id)
      
      if (consumerIds.length === 0) {
        // No matching consumers found, return empty array
        return []
      }

      // Now fetch meter readings for these consumer_ids
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('reading_assigned', true)
        .in('consumer_id', consumerIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching meter readings:', error)
        throw new Error(`Failed to search meter readings: ${error.message}`)
      }

      // Transform the data to match our interface
      return (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })
    } catch (error) {
      console.error('Error in searchMeterReadings:', error)
      throw error
    }
  }

  /**
   * Fetch meter readings for a specific user
   */
  static async getMeterReadingsByUserId(userId: string): Promise<MeterReadingWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            consumer_id,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('consumer_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching meter readings by user ID:', error)
        throw new Error(`Failed to fetch meter readings: ${error.message}`)
      }

      // Transform the data to match our interface
      return (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })
    } catch (error) {
      console.error('Error in getMeterReadingsByUserId:', error)
      throw error
    }
  }

  /**
   * Fetch meter readings for a specific consumer by consumer_id
   */
  static async getMeterReadingsByConsumerId(consumerId: string): Promise<MeterReadingWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('bawasa_meter_readings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            consumer_id,
            accounts!consumer_id (
              email,
              full_name
            )
          ),
          bawasa_billings!meter_reading_id (
            payment_status,
            billing_month
          )
        `)
        .eq('consumer_id', consumerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching meter readings by consumer ID:', error)
        throw new Error(`Failed to fetch meter readings: ${error.message}`)
      }

      // Transform the data to match our interface
      return (data || []).map((reading: SupabaseMeterReadingResult) => {
        const consumer = reading.consumers
        const account = consumer?.accounts
        const billing = reading.bawasa_billings
        
        return {
          id: reading.id,
          consumer_id: reading.consumer_id,
          reading_date: reading.reading_date,
          meter_reading_date: reading.reading_date, // Alias for compatibility
          previous_reading: reading.previous_reading,
          present_reading: reading.present_reading,
          consumption_cubic_meters: reading.consumption_cubic_meters,
          meter_image: reading.meter_image || null,
          created_at: reading.created_at,
          updated_at: reading.updated_at,
          water_meter_no: consumer?.water_meter_no || '',
          user_email: account?.email || '',
          user_name: account?.full_name || 'Unknown User',
          payment_status: (billing?.[0]?.payment_status as 'unpaid' | 'partial' | 'paid' | 'overdue') || 'unpaid',
          billing_month: billing?.[0]?.billing_month || undefined
        }
      })
    } catch (error) {
      console.error('Error in getMeterReadingsByConsumerId:', error)
      throw error
    }
  }

  /**
   * Create empty meter readings for all consumers for a new billing month
   * This is called when transitioning to a new billing month
   * Meter readers will fill in the readings via the mobile app
   */
  static async createEmptyReadingsForNewMonth(month: string, year: number): Promise<{ data: MeterReading[] | null; error: unknown }> {
    try {
      console.log(`🔄 Creating empty meter readings for ${month} ${year}...`)

      // Get all consumers
      const { data: consumers, error: consumersError } = await supabase
        .from('consumers')
        .select('id, water_meter_no')

      if (consumersError) {
        console.error('Error fetching consumers:', consumersError)
        return { data: null, error: consumersError }
      }

      if (!consumers || consumers.length === 0) {
        console.log('No consumers found')
        return { data: [], error: null }
      }

      // Set reading_date to the first day of the month
      const readingDate = new Date(year, getMonthNumber(month), 1).toISOString().split('T')[0]

      // Check if readings already exist for this month
      const { data: existingReadings, error: checkError } = await supabase
        .from('bawasa_meter_readings')
        .select('id, consumer_id, reading_date')
        .eq('reading_date', readingDate)

      if (checkError) {
        console.error('Error checking existing readings:', checkError)
        return { data: null, error: checkError }
      }

      const existingConsumerIds = new Set(existingReadings?.map(r => r.consumer_id) || [])
      
      // Filter out consumers who already have readings for this month
      const consumersToProcess = consumers.filter(c => !existingConsumerIds.has(c.id))

      if (consumersToProcess.length === 0) {
        console.log('All consumers already have meter readings for this month')
        return { data: [], error: null }
      }

      // Get the last reading for each consumer to use as previous_reading
      const readingsToInsert: Array<{
        consumer_id: string
        reading_date: string
        previous_reading: number | null
        present_reading: number | null
      }> = []

      for (const consumer of consumersToProcess) {
        // Get the last meter reading for this consumer
        const { data: lastReading, error: lastReadingError } = await supabase
          .from('bawasa_meter_readings')
          .select('present_reading')
          .eq('consumer_id', consumer.id)
          .order('reading_date', { ascending: false })
          .limit(1)
          .single()

        if (lastReadingError && lastReadingError.code !== 'PGRST116') {
          console.error(`Error fetching last reading for consumer ${consumer.water_meter_no}:`, lastReadingError)
        }

        // Initialize present_reading with previous_reading value
        // Meter reader will update this when they visit the consumer
        const previousReading = lastReading?.present_reading || 0
        const presentReading = previousReading // Initialize with same value
        
        readingsToInsert.push({
          consumer_id: consumer.id,
          reading_date: readingDate,
          previous_reading: previousReading, // Use last reading's present_reading as previous
          present_reading: presentReading // Initialize with previous reading value
        })
      }

      // Insert all readings in batch
      const { data: insertedReadings, error: insertError } = await supabase
        .from('bawasa_meter_readings')
        .insert(readingsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting meter readings:', insertError)
        return { data: null, error: insertError }
      }

      console.log(`✅ Created ${insertedReadings?.length || 0} empty meter readings for ${month} ${year}`)
      return { data: insertedReadings as MeterReading[], error: null }
    } catch (error) {
      console.error('Error in createEmptyReadingsForNewMonth:', error)
      return { data: null, error }
    }
  }
}

/**
 * Helper function to convert month name to number (0-11)
 */
function getMonthNumber(month: string): number {
  const months: { [key: string]: number } = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  }
  return months[month] ?? 0
}
