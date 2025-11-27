import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role key for admin operations to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consumerId, newStartingReading, effectiveDate, reason, readingBeforeChange } = body

    // Validate input
    if (!consumerId || typeof consumerId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid consumer ID' },
        { status: 400 }
      )
    }

    if (typeof newStartingReading !== 'number' || newStartingReading < 0) {
      return NextResponse.json(
        { error: 'Invalid starting reading' },
        { status: 400 }
      )
    }

    if (!effectiveDate || typeof effectiveDate !== 'string') {
      return NextResponse.json(
        { error: 'Invalid effective date' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    console.log('🔧 [ChangeMeter API] Changing meter for consumer:', consumerId)
    console.log('📊 [ChangeMeter API] Final reading before change:', readingBeforeChange)
    console.log('📊 [ChangeMeter API] New starting reading:', newStartingReading)
    console.log('📅 [ChangeMeter API] Effective date:', effectiveDate)
    console.log('📝 [ChangeMeter API] Reason:', reason)

    // Get the previous reading to calculate consumption for the final billing
    const { data: lastReading } = await supabase
      .from('bawasa_meter_readings')
      .select('previous_reading, present_reading')
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousReading = lastReading?.present_reading || 0
    const finalReadingBeforeChange = readingBeforeChange ?? previousReading
    const consumptionToBill = Math.max(0, finalReadingBeforeChange - previousReading)

    // Build remarks with all relevant information
    // Include METER_CHANGE_FLAG so the system knows next reading should start from 0
    const remarksText = [
      `METER CHANGE: ${reason}.`,
      `Final reading on old meter: ${finalReadingBeforeChange} m³.`,
      `Previous reading was: ${previousReading} m³.`,
      `Consumption to bill: ${consumptionToBill} m³.`,
      `[METER_CHANGED]` // Flag for the system to know meter was changed
    ].join(' ')

    const createdAt = new Date(effectiveDate).toISOString()

    // Create ONLY the final reading record for the OLD meter
    // The new meter reading will be created when meter reader submits the first reading
    // The system will detect [METER_CHANGED] flag and start from 0
    const { data: finalOldMeterReading, error: oldMeterError } = await supabase
      .from('bawasa_meter_readings')
      .insert({
        consumer_id: consumerId,
        previous_reading: previousReading, // Last recorded reading
        present_reading: finalReadingBeforeChange, // Final reading before meter change
        reading_assigned: true,
        remarks: remarksText,
        meter_image: null,
        created_at: createdAt,
        updated_at: createdAt
      })
      .select()
      .single()

    if (oldMeterError) {
      console.error('❌ [ChangeMeter API] Error creating final old meter reading:', oldMeterError)
      return NextResponse.json(
        { error: oldMeterError.message || 'Failed to create meter reading' },
        { status: 500 }
      )
    }

    console.log('✅ [ChangeMeter API] Meter change recorded successfully')
    console.log('📊 Old meter final reading:', finalOldMeterReading)
    console.log('ℹ️ New meter reading will be created on next reading schedule')
    
    return NextResponse.json({
      success: true,
      data: finalOldMeterReading,
      message: 'Meter changed successfully. New meter reading will appear on next reading schedule.',
      summary: {
        finalReadingBeforeChange,
        previousReading,
        consumptionToBill,
        newMeterStartsAt: 0,
        note: 'Next reading will start from 0 on the new meter'
      }
    })

  } catch (error) {
    console.error('💥 [ChangeMeter API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

