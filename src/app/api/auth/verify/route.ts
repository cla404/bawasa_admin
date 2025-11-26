import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface UserData {
  id: number
  email: string
  full_name: string
  phone: string
  full_address: string
  consumer_id: string | null
  water_meter_no: string | null
  status?: string
  created_at: string
  updated_at: string
  user_type: 'consumer' | 'meter_reader'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('🔐 [Auth API] Attempting authentication for:', email)

    // First, try to find user in accounts table (consumer accounts)
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .single()

    let userData: UserData | null = null
    let userType = ''

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('❌ [Auth API] Error querying accounts:', accountError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }

    if (account) {
      console.log('✅ [Auth API] User found in accounts table (consumer)')
      
      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, account.password)
      
      if (!isPasswordValid) {
        console.log('❌ [Auth API] Invalid password for consumer:', email)
        return NextResponse.json(
          { error: 'Invalid login credentials' },
          { status: 401 }
        )
      }

      console.log('✅ [Auth API] Consumer password verified successfully')

      // Get consumer data from consumers table
      const { data: consumer, error: consumerError } = await supabase
        .from('consumers')
        .select('*')
        .eq('consumer_id', account.id)
        .single()

      if (consumerError) {
        console.error('❌ [Auth API] Error fetching consumer data:', consumerError)
        return NextResponse.json(
          { error: 'Consumer data not found' },
          { status: 500 }
        )
      }

      console.log('✅ [Auth API] Consumer data retrieved')

      // Return consumer user data (without password)
      userData = {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        phone: account.mobile_no || '', // Use mobile_no field from accounts table
        full_address: account.full_address || '',
        consumer_id: consumer.id, // Use the consumers table ID
        water_meter_no: consumer.water_meter_no,
        status: account.status || 'active', // Include status from accounts table
        created_at: account.created_at,
        updated_at: account.updated_at,
        user_type: 'consumer'
      }
      userType = 'consumer'
    } else {
      // If not found as consumer, check if it's a meter reader in accounts table
      console.log('🔍 [Auth API] User not found as consumer, checking if meter reader in accounts table...')
      
      const { data: meterReaderAccount, error: meterReaderError } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', email)
        .eq('user_type', 'meter_reader')
        .single()

      if (meterReaderError && meterReaderError.code !== 'PGRST116') {
        console.error('❌ [Auth API] Error querying accounts for meter reader:', meterReaderError)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        )
      }

      if (!meterReaderAccount) {
        console.log('❌ [Auth API] User not found in any table:', email)
        return NextResponse.json(
          { error: 'Invalid login credentials' },
          { status: 401 }
        )
      }

      console.log('✅ [Auth API] User found as meter reader in accounts table')

      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, meterReaderAccount.password)
      
      if (!isPasswordValid) {
        console.log('❌ [Auth API] Invalid password for meter reader:', email)
        return NextResponse.json(
          { error: 'Invalid login credentials' },
          { status: 401 }
        )
      }

      console.log('✅ [Auth API] Meter reader password verified successfully')

      // Return meter reader user data (without password)
      userData = {
        id: meterReaderAccount.id,
        email: meterReaderAccount.email,
        full_name: meterReaderAccount.full_name,
        phone: meterReaderAccount.mobile_no || '',
        full_address: meterReaderAccount.full_address || '',
        consumer_id: null, // Meter readers don't have consumer_id
        water_meter_no: null, // Meter readers don't have water_meter_no
        created_at: meterReaderAccount.created_at,
        updated_at: meterReaderAccount.updated_at,
        user_type: 'meter_reader'
      }
      userType = 'meter_reader'
    }

    return NextResponse.json({
      success: true,
      user: userData,
      message: `Authentication successful for ${userType}`
    })

  } catch (error) {
    console.error('💥 [Auth API] Unexpected error during authentication:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
