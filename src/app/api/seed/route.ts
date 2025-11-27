import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BAWASABillingCalculator } from '@/lib/bawasa-billing-calculator'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role key if available for admin operations, otherwise use anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
const supabase = createClient(supabaseUrl, supabaseKey)

interface SeedOptions {
  dryRun?: boolean // If true, don't actually insert data
  years?: number[] // Years to seed (default: [2022, 2023, 2024, 2025])
}

interface MonthlyReading {
  previous: number
  present: number
  amount: number
  remarks?: string // For special cases like meter changes, resets, etc.
}

interface ConsumerReadingData {
  name: string // Consumer name to match in database
  meterNo?: string // Optional meter number for verification
  address?: string // Optional address for verification
  email?: string // Optional email (will be generated if not provided)
  phone?: string // Optional phone number
  2022?: { [month: string]: MonthlyReading }
  2023?: { [month: string]: MonthlyReading }
  2024: { [month: string]: MonthlyReading }
  2025: { [month: string]: MonthlyReading }
}

// Actual data from the image - 2022, 2023, 2024 and 2025 readings
// Format: "PreviousReading-PresentReading=Consumption (Amount)"
// Blank months are omitted (Jan-Apr 2023, Dec 2023, Nov-Dec 2025)
const CONSUMER_READINGS_DATA: ConsumerReadingData[] = [
  {
    name: 'SILVESTRE MARCELITO',
    address: 'P-2, Brgy. 6 Bañadero, Legazpi City',
    2022: {
      // 2022: May to November only (Jan-Apr, Dec blank)
      May: { previous: 0, present: 17, amount: 510 },
      June: { previous: 17, present: 35, amount: 540 },
      July: { previous: 35, present: 56, amount: 630 },
      August: { previous: 56, present: 68, amount: 360 },
      September: { previous: 68, present: 78, amount: 300 },
      October: { previous: 78, present: 85, amount: 300 },
      November: { previous: 85, present: 93, amount: 300 }
      // December is blank
    },
    2023: {
      // 2023: July to December only (Jan-Jun blank)
      // Using exact data from image: July starts at 342 (where June ended), October ends at 428
      // November-December set to maintain continuity with 2024 January (428)
      July: { previous: 328, present: 333, amount: 225, remarks: '25%' },
      August: { previous: 333, present: 342, amount: 225, remarks: '25%' },
      September: { previous: 342, present: 356, amount: 345, remarks: '25%' },
      October: { previous: 356, present: 382, amount: 705, remarks: '25%' },
      November: { previous: 382, present: 395, amount: 315, remarks: '25%' },
      December: { previous: 395, present: 428, amount: 915, remarks: '25%' },
      // November: { previous: 428, present: 428, amount: 0, remarks: '25%' },
      // December: { previous: 428, present: 428, amount: 0, remarks: '25%' }
    },
    2024: {
      January: { previous: 428, present: 444, amount: 330 },
      February: { previous: 444, present: 467, amount: 540 },
      March: { previous: 467, present: 497, amount: 750 },
      April: { previous: 497, present: 515, amount: 390 },
      May: { previous: 515, present: 534, amount: 420 },
      June: { previous: 534, present: 549, amount: 300 },
      July: { previous: 549, present: 564, amount: 300 },
      August: { previous: 564, present: 589, amount: 600 },
      September: { previous: 589, present: 619, amount: 750 },
      October: { previous: 619, present: 660, amount: 1830 },
      November: { previous: 660, present: 681, amount: 480 },
      December: { previous: 681, present: 710, amount: 720 }
    },
    2025: {
      January: { previous: 710, present: 724, amount: 220, remarks: '75%' },
      February: { previous: 724, present: 739, amount: 250 },
      March: { previous: 739, present: 753, amount: 220 },
      April: { previous: 753, present: 764, amount: 190 },
      May: { previous: 766, present: 755, amount: 100 },
      June: { previous: 775, present: 782, amount: 100 },
      July: { previous: 782, present: 791, amount: 100 },
      August: { previous: 791, present: 808, amount: 310 },
      September: { previous: 808, present: 832, amount: 520 },
      October: { previous: 832, present: 873, amount: 1155 }
      // November and December are blank
    }
  },
  {
    name: 'OCAMPO ENRICO',
    address: 'P-2, Brgy. 6 Bañadero, Legazpi City',
    2022: {
      // 2022: May to November only (Jan-Apr, Dec blank)
      May: { previous: 0, present: 11, amount: 330 },
      June: { previous: 11, present: 22, amount: 330 },
      July: { previous: 22, present: 38, amount: 480 },
      August: { previous: 38, present: 48, amount: 300 },
      September: { previous: 48, present: 62, amount: 420 },
      October: { previous: 62, present: 73, amount: 330 },
      November: { previous: 73, present: 85, amount: 360 }
      // December is blank
    },
    2023: {
      // 2023: July to December only (Jan-Jun blank)
      // Using exact data from image: July-October, then November-December to flow into 2024 January (273)
      July: { previous: 162, present: 179, amount: 510 },
      August: { previous: 179, present: 196, amount: 510 },
      September: { previous: 196, present: 220, amount: 720 },
      October: { previous: 220, present: 238, amount: 465 },
      November: { previous: 238, present: 255, amount: 510 },
      December: { previous: 255, present: 273, amount: 465 },
      // November: { previous: 273, present: 273, amount: 0 },
      // December: { previous: 273, present: 273, amount: 0 }
    },
    2024: {
      January: { previous: 273, present: 289, amount: 480 },
      February: { previous: 289, present: 305, amount: 480 },
      March: { previous: 305, present: 322, amount: 510 },
      April: { previous: 322, present: 341, amount: 570 },
      May: { previous: 341, present: 364, amount: 690 },
      June: { previous: 364, present: 384, amount: 600 },
      July: { previous: 384, present: 403, amount: 570 },
      August: { previous: 403, present: 424, amount: 630 },
      September: { previous: 424, present: 444, amount: 600 },
      October: { previous: 444, present: 469, amount: 750 },
      November: { previous: 469, present: 492, amount: 690 },
      December: { previous: 492, present: 514, amount: 660 }
    },
    2025: {
      January: { previous: 514, present: 0, amount: 660 },
      February: { previous: 0, present: 22, amount: 660 },
      March: { previous: 22, present: 42, amount: 600 },
      April: { previous: 42, present: 77, amount: 1050 },
      May: { previous: 77, present: 96, amount: 570 },
      June: { previous: 96, present: 120, amount: 720 },
      July: { previous: 120, present: 140, amount: 600 },
      August: { previous: 140, present: 160, amount: 600 },
      September: { previous: 160, present: 184, amount: 720 },
      October: { previous: 184, present: 204, amount: 725 }
      // November and December are blank
    }
  }
  // Add new consumers here following this template:
  // {
  //   name: 'CONSUMER FULL NAME',
  //   address: 'Full address here',
  //   meterNo: 'OPTIONAL_METER_NUMBER', // Optional - will be auto-generated if not provided
  //   email: 'optional@email.com', // Optional - will be auto-generated if not provided
  //   phone: '09123456789', // Optional
  //   2022: {
  //     // Add months with readings, e.g.:
  //     May: { previous: 0, present: 10, amount: 300 },
  //     June: { previous: 10, present: 25, amount: 450 },
  //     // ... other months
  //   },
  //   2023: {
  //     // Add months with readings
  //   },
  //   2024: {
  //     // At least 2024 is required
  //     January: { previous: 100, present: 120, amount: 600 },
  //     February: { previous: 120, present: 140, amount: 600 },
  //     // ... other months
  //   },
  //   2025: {
  //     // Add months with readings
  //   }
  // }
]


/**
 * Get month name from month number (0-11)
 */
function getMonthName(monthIndex: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[monthIndex]
}

/**
 * Calculate due date (30 days after the first day of billing month)
 */
function calculateDueDate(year: number, monthIndex: number): string {
  const dueDate = new Date(year, monthIndex + 1, 1) // First day of next month
  return dueDate.toISOString().split('T')[0]
}

/**
 * Generate payment status with realistic distribution
 */
function generatePaymentStatus(monthIndex: number): 'unpaid' | 'partial' | 'paid' | 'overdue' {
  // More recent months are more likely to be unpaid
  const isRecent = monthIndex < 2
  const random = Math.random()
  
  if (isRecent) {
    // Recent months: 60% unpaid, 20% partial, 15% paid, 5% overdue
    if (random < 0.60) return 'unpaid'
    if (random < 0.80) return 'partial'
    if (random < 0.95) return 'paid'
    return 'overdue'
  } else {
    // Older months: 20% unpaid, 10% partial, 65% paid, 5% overdue
    if (random < 0.20) return 'unpaid'
    if (random < 0.30) return 'partial'
    if (random < 0.95) return 'paid'
    return 'overdue'
  }
}

/**
 * Calculate amount paid based on payment status
 */
function calculateAmountPaid(
  totalAmount: number,
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue'
): number {
  switch (paymentStatus) {
    case 'paid':
      return totalAmount
    case 'partial':
      return Math.round(totalAmount * (0.3 + Math.random() * 0.5) * 100) / 100 // 30-80% paid
    case 'unpaid':
    case 'overdue':
      return 0
  }
}

interface MeterReadingData {
  consumer_id: string
  previous_reading: number
  present_reading: number
  created_at: string
  updated_at: string
  reading_assigned: boolean
  remarks: string | null
  meter_image: string | null
}

interface BillingData {
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
  due_date: string
  arrears_after_due_date: number | null
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_date: string | null
  amount_paid: number
  created_at: string
  updated_at: string
  reading_assigned: boolean
}

/**
 * Generate email from name
 */
function generateEmail(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
  return `${normalized}@bawasa.local`
}

/**
 * Find consumer reading data by name (case-insensitive partial match)
 */
function findConsumerReadingData(consumerName: string): ConsumerReadingData | null {
  const normalizedName = consumerName.toUpperCase().trim()
  
  // Try exact match first
  let match = CONSUMER_READINGS_DATA.find(data => 
    data.name.toUpperCase() === normalizedName
  )
  
  // Try partial match - check if consumer name contains data name or vice versa
  if (!match) {
    match = CONSUMER_READINGS_DATA.find(data => {
      const dataName = data.name.toUpperCase()
      // Check if either name contains the other (for variations like "SILVESTRE MARCELITO" vs "MARCELITO SILVESTRE")
      return normalizedName.includes(dataName) || dataName.includes(normalizedName) ||
             // Check if key parts match (first and last name)
             normalizedName.split(' ').some(part => dataName.includes(part)) &&
             dataName.split(' ').some(part => normalizedName.includes(part))
    })
  }
  
  return match || null
}

/**
 * Create account and consumer if they don't exist
 */
async function ensureAccountAndConsumer(
  consumerData: ConsumerReadingData
): Promise<{ accountId: number; consumerId: string } | null> {
  const email = consumerData.email || generateEmail(consumerData.name)
  
  // Check if account already exists
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('id, full_name')
    .eq('email', email)
    .maybeSingle()
  
  if (existingAccount) {
    console.log(`✅ Account already exists for ${consumerData.name}: ${email}`)
    
    // Find consumer linked to this account
    const { data: existingConsumer } = await supabase
      .from('consumers')
      .select('id')
      .eq('consumer_id', existingAccount.id)
      .maybeSingle()
    
    if (existingConsumer) {
      return {
        accountId: existingAccount.id,
        consumerId: existingConsumer.id
      }
    }
    
    // Account exists but no consumer - create consumer
    const { data: newConsumer, error: consumerError } = await supabase
      .from('consumers')
      .insert({
        consumer_id: existingAccount.id,
        water_meter_no: consumerData.meterNo || undefined, // Let DB generate if not provided
        registered_voter: false
      })
      .select('id')
      .single()
    
    if (consumerError) {
      console.error(`❌ Failed to create consumer for ${consumerData.name}:`, consumerError)
      return null
    }
    
    return {
      accountId: existingAccount.id,
      consumerId: newConsumer.id
    }
  }
  
  // Account doesn't exist - create both account and consumer
  console.log(`📝 Creating account and consumer for ${consumerData.name}...`)
  
  // Hash password (default password)
  const defaultPassword = 'BAWASA2022!ChangeMe'
  const saltRounds = 12
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds)
  
  // Create account
  const { data: newAccount, error: accountError } = await supabase
    .from('accounts')
    .insert({
      email,
      password: hashedPassword,
      full_name: consumerData.name,
      full_address: consumerData.address || null,
      mobile_no: consumerData.phone ? parseInt(consumerData.phone.replace(/\D/g, '')) : null,
      user_type: 'consumer',
      created_at: new Date('2022-01-01').toISOString() // Default creation date
    })
    .select('id')
    .single()
  
  if (accountError) {
    console.error(`❌ Failed to create account for ${consumerData.name}:`, accountError)
    return null
  }
  
  console.log(`✅ Account created: ${newAccount.id}`)
  
  // Create consumer
  const { data: newConsumer, error: consumerError } = await supabase
    .from('consumers')
    .insert({
      consumer_id: newAccount.id,
      water_meter_no: consumerData.meterNo || undefined, // Let DB generate if not provided
      registered_voter: false
    })
    .select('id')
    .single()
  
  if (consumerError) {
    console.error(`❌ Failed to create consumer for ${consumerData.name}:`, consumerError)
    // Try to clean up account
    await supabase.from('accounts').delete().eq('id', newAccount.id)
    return null
  }
  
  console.log(`✅ Consumer created: ${newConsumer.id}`)
  
  return {
    accountId: newAccount.id,
    consumerId: newConsumer.id
  }
}

/**
 * Parse reading value from string (handles special cases)
 */
function parseReadingValue(value: number | string | undefined, defaultValue: number = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

/**
 * Generate meter readings and billings for a consumer using actual data from image
 */
async function generateConsumerData(
  consumerId: string,
  consumerName: string,
  options: SeedOptions
): Promise<{
  meterReadings: MeterReadingData[]
  billings: BillingData[]
  errors: string[]
}> {
  const yearsToSeed = options.years || [2022, 2023, 2024, 2025]
  
  const meterReadings: MeterReadingData[] = []
  const billings: BillingData[] = []
  const errors: string[] = []
  
  // Find consumer data from the image
  const consumerData = findConsumerReadingData(consumerName)
  
  if (!consumerData) {
    errors.push(`No reading data found for consumer: ${consumerName}`)
    return { meterReadings, billings, errors }
  }
  
  console.log(`📝 Found data for consumer: ${consumerName} (matched: ${consumerData.name})`)
  
  // Get existing meter readings for this consumer to avoid duplicates
  const { data: existingReadings } = await supabase
    .from('bawasa_meter_readings')
    .select('id, created_at, present_reading')
    .eq('consumer_id', consumerId)
    .order('created_at', { ascending: false })
  
  // Create a map of existing readings by year-month to check for duplicates
  const existingReadingsMap = new Map<string, boolean>()
  if (existingReadings) {
    existingReadings.forEach(reading => {
      const date = new Date(reading.created_at)
      const year = date.getFullYear()
      const month = date.getMonth()
      const key = `${year}-${month}`
      existingReadingsMap.set(key, true)
    })
  }
  
  // Get the last meter reading for this consumer to use as starting point
  const lastReading = existingReadings && existingReadings.length > 0 ? existingReadings[0] : null
  
  // Start from the last reading or use data from consumerData
  // If last reading exists and is from 2023 or earlier, use it
  let currentReading = 0
  if (lastReading?.created_at) {
    const lastReadingDate = new Date(lastReading.created_at)
    const lastReadingYear = lastReadingDate.getFullYear()
    if (lastReadingYear < Math.min(...yearsToSeed)) {
      currentReading = lastReading.present_reading || 0
    }
  }
  
  // Generate readings for each year and each month
  let monthIndex = 0
  for (const year of yearsToSeed.sort()) {
    const yearData = consumerData?.[year as keyof ConsumerReadingData] as { [month: string]: MonthlyReading } | undefined
    
    for (let month = 0; month < 12; month++) {
      const monthName = getMonthName(month)
      const monthData = yearData?.[monthName]
      
      // Check if reading already exists for this month/year
      const readingKey = `${year}-${month}`
      if (existingReadingsMap.has(readingKey)) {
        console.log(`⏭️ Skipping ${monthName} ${year} - reading already exists`)
        monthIndex++
        continue
      }
      
      let previousReading: number
      let presentReading: number
      let consumption: number
      let remarks: string | null = null
      
      if (monthData) {
        // Use actual data from image
        // If previous is 0 or missing, use the last known reading (currentReading)
        const parsedPrevious = parseReadingValue(monthData.previous, currentReading)
        previousReading = parsedPrevious === 0 && monthData.previous === 0 ? currentReading : parsedPrevious
        
        // If present reading is 0 or missing, use previous reading (no change)
        const parsedPresent = parseReadingValue(monthData.present, previousReading)
        presentReading = parsedPresent === 0 && monthData.present === 0 ? previousReading : parsedPresent
        
        consumption = Math.max(0, presentReading - previousReading)
        remarks = monthData.remarks || `Seeded reading for ${monthName} ${year}`
        currentReading = presentReading
      } else {
        // No data for this month - skip or use default
        // Skip months without data to match the image exactly
        monthIndex++
        continue
      }
      
      // Create meter reading (first day of the month)
      const createdAt = new Date(year, month, Math.floor(Math.random() * 28) + 1).toISOString()
      
      const meterReading: MeterReadingData = {
        consumer_id: consumerId,
        previous_reading: Math.round(previousReading * 100) / 100, // Ensure 2 decimal places for numeric(10,2)
        present_reading: Math.round(presentReading * 100) / 100, // Ensure 2 decimal places for numeric(10,2)
        created_at: createdAt,
        updated_at: createdAt,
        reading_assigned: true,
        remarks: remarks,
        meter_image: null
      }
      
      meterReadings.push(meterReading)
      
      // Calculate billing - use amount from data if available, otherwise calculate
      // For seed data, we use the provided amounts (no consumer discount info needed)
      let billingCalc = BAWASABillingCalculator.calculateBilling(consumption)
      const amountFromData = monthData?.amount
      
      if (amountFromData && amountFromData > 0) {
        // Override amount_current_billing with the actual amount from data
        billingCalc.amount_current_billing = amountFromData
      }
      
      // Generate payment status (more recent months more likely unpaid)
      const paymentStatus = generatePaymentStatus(monthIndex)
      const dueDate = calculateDueDate(year, month)
      const isOverdue = paymentStatus === 'overdue' || (paymentStatus === 'unpaid' && new Date(dueDate) < new Date())
      
      // Calculate arrears (for older unpaid bills)
      const arrearsToBePaid = monthIndex > 0 && paymentStatus !== 'paid' 
        ? Math.round(billingCalc.amount_current_billing * 0.1 * 100) / 100
        : 0
      
      const totalAmountDue = billingCalc.amount_current_billing + arrearsToBePaid
      const amountPaid = calculateAmountPaid(totalAmountDue, paymentStatus)
      const paymentDate = paymentStatus === 'paid' || paymentStatus === 'partial'
        ? new Date(year, month, Math.floor(Math.random() * 28) + 1).toISOString()
        : null
      
      const billing: BillingData = {
        consumer_id: consumerId,
        meter_reading_id: null, // Will be set after reading is inserted
        billing_month: monthName,
        consumption_10_or_below: Math.round(billingCalc.consumption_10_or_below * 100) / 100,
        amount_10_or_below: Math.round(billingCalc.amount_10_or_below * 100) / 100,
        amount_10_or_below_with_discount: Math.round(billingCalc.amount_10_or_below_with_discount * 100) / 100,
        consumption_over_10: Math.round(billingCalc.consumption_over_10 * 100) / 100,
        amount_over_10: Math.round(billingCalc.amount_over_10 * 100) / 100,
        amount_current_billing: Math.round(billingCalc.amount_current_billing * 100) / 100,
        arrears_to_be_paid: Math.round(arrearsToBePaid * 100) / 100,
        due_date: dueDate, // Already in YYYY-MM-DD format
        arrears_after_due_date: isOverdue ? Math.round(totalAmountDue * 0.05 * 100) / 100 : null,
        payment_status: paymentStatus,
        payment_date: paymentDate,
        amount_paid: Math.round(amountPaid * 100) / 100,
        created_at: createdAt,
        updated_at: createdAt,
        reading_assigned: true
      }
      
      billings.push(billing)
      monthIndex++
    }
  }
  
  return { meterReadings, billings, errors }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const options: SeedOptions = {
      dryRun: body.dryRun || false,
      years: body.years || [2022, 2023, 2024, 2025] // Default to 2022, 2023, 2024 and 2025
    }
    
    // Validate years
    if (!Array.isArray(options.years) || options.years.length === 0) {
      return NextResponse.json(
        { error: 'Years must be a non-empty array' },
        { status: 400 }
      )
    }
    
    console.log('🌱 Starting database seeding...', { 
      years: options.years,
      dryRun: options.dryRun 
    })
    
    // Process all consumers from CONSUMER_READINGS_DATA
    // Create accounts and consumers if they don't exist
    console.log(`📋 Processing ${CONSUMER_READINGS_DATA.length} consumers from data structure...`)
    
    const stats = {
      accountsCreated: 0,
      consumersCreated: 0,
      consumersProcessed: 0,
      meterReadingsCreated: 0,
      billingsCreated: 0,
      errors: [] as string[]
    }
    
    // First, ensure all accounts and consumers exist
    const consumerIds: string[] = []
    for (const consumerData of CONSUMER_READINGS_DATA) {
      try {
        if (!options.dryRun) {
          const result = await ensureAccountAndConsumer(consumerData)
          if (result) {
            consumerIds.push(result.consumerId)
            // Check if this was a new account/consumer
            const { data: consumer } = await supabase
              .from('consumers')
              .select('created_at')
              .eq('id', result.consumerId)
              .single()
            
            // If created within last 2 seconds, it's new
            if (consumer && new Date(consumer.created_at).getTime() > Date.now() - 2000) {
              stats.consumersCreated++
              stats.accountsCreated++
            }
          } else {
            stats.errors.push(`Failed to create account/consumer for ${consumerData.name}`)
          }
        } else {
          // In dry run, just check if they exist
          const email = consumerData.email || generateEmail(consumerData.name)
          const { data: existingAccount } = await supabase
            .from('accounts')
            .select('id')
            .eq('email', email)
            .maybeSingle()
          
          if (existingAccount) {
            const { data: existingConsumer } = await supabase
              .from('consumers')
              .select('id')
              .eq('consumer_id', existingAccount.id)
              .maybeSingle()
            
            if (existingConsumer) {
              consumerIds.push(existingConsumer.id)
            }
          } else {
            stats.accountsCreated++ // Would create
            stats.consumersCreated++ // Would create
          }
        }
      } catch (error) {
        const errorMsg = `Error creating account/consumer for ${consumerData.name}: ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }
    
    if (consumerIds.length === 0 && !options.dryRun) {
      return NextResponse.json({
        success: false,
        message: 'No consumers available to seed (failed to create accounts/consumers)',
        stats
      })
    }
    
    console.log(`✅ ${consumerIds.length} consumers ready for seeding`)
    
    // Fetch consumers with account info
    const { data: consumers, error: consumersError } = await supabase
      .from('consumers')
      .select(`
        id, 
        water_meter_no,
        accounts!consumer_id (
          full_name
        )
      `)
      .in('id', consumerIds.length > 0 ? consumerIds : ['00000000-0000-0000-0000-000000000000']) // Dummy ID if dry run
      .order('created_at', { ascending: true })
    
    if (consumersError) {
      console.error('❌ Error fetching consumers:', consumersError)
      return NextResponse.json(
        { error: `Failed to fetch consumers: ${consumersError.message}` },
        { status: 500 }
      )
    }
    
    if (!consumers || consumers.length === 0) {
      console.log('ℹ️ No consumers found to seed')
      return NextResponse.json({
        success: false,
        message: 'No consumers found in database',
        stats
      })
    }
    
    console.log(`📋 Found ${consumers.length} consumers to process`)
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be inserted')
    }
    
    // Process consumers in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < consumers.length; i += batchSize) {
      const batch = consumers.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} consumers)...`)
      
      for (const consumer of batch) {
        try {
          // Get consumer name from account
          const consumerData = consumer as {
            id: string
            water_meter_no: string
            accounts?: { full_name: string } | { full_name: string }[] | null
          }
          
          // Handle accounts as single object or array
          let account: { full_name: string } | null = null
          if (Array.isArray(consumerData.accounts)) {
            account = consumerData.accounts[0] || null
          } else {
            account = consumerData.accounts || null
          }
          
          const consumerName = account?.full_name || consumerData.water_meter_no || 'Unknown'
          
          console.log(`🔍 Processing consumer: ${consumerName} (Meter: ${consumerData.water_meter_no})`)
          
          // Generate data for this consumer using actual data from image
          const { meterReadings, billings, errors } = await generateConsumerData(
            consumerData.id, 
            consumerName,
            options
          )
          
          if (errors.length > 0) {
            console.log(`⚠️ Errors for ${consumerName}:`, errors)
            stats.errors.push(...errors.map(e => `Consumer ${consumerData.water_meter_no} (${consumerName}): ${e}`))
          }
          
          if (meterReadings.length === 0) {
            console.log(`⏭️ Skipping ${consumerName} - no new meter readings to insert (all may already exist)`)
            continue
          }
          
          // Check for existing billings to avoid duplicates
          const { data: existingBillings } = await supabase
            .from('bawasa_billings')
            .select('billing_month, created_at')
            .eq('consumer_id', consumerData.id)
          
          const existingBillingsMap = new Map<string, boolean>()
          if (existingBillings) {
            existingBillings.forEach(billing => {
              const date = new Date(billing.created_at)
              const year = date.getFullYear()
              const key = `${year}-${billing.billing_month}`
              existingBillingsMap.set(key, true)
            })
          }
          
          // Filter out billings that already exist
          const newBillings = billings.filter((billing, index) => {
            const meterReading = meterReadings[index]
            if (!meterReading) return false
            const date = new Date(meterReading.created_at)
            const year = date.getFullYear()
            const key = `${year}-${billing.billing_month}`
            return !existingBillingsMap.has(key)
          })
          
          // Only keep meter readings that correspond to new billings
          const newMeterReadings = meterReadings.filter((reading, index) => {
            const billing = billings[index]
            if (!billing) return false
            const date = new Date(reading.created_at)
            const year = date.getFullYear()
            const key = `${year}-${billing.billing_month}`
            return !existingBillingsMap.has(key)
          })
          
          if (newMeterReadings.length === 0) {
            console.log(`⏭️ Skipping ${consumerName} - all readings/billings already exist`)
            continue
          }
          
          if (options.dryRun) {
            // In dry run, just count what would be created
            stats.meterReadingsCreated += newMeterReadings.length
            stats.billingsCreated += newBillings.length
            stats.consumersProcessed++
            console.log(`✅ Would create ${newMeterReadings.length} readings and ${newBillings.length} billings for ${consumerName}`)
            continue
          }
          
          // Log what we're about to insert
          console.log(`📤 Preparing to insert ${newMeterReadings.length} meter readings and ${newBillings.length} billings for ${consumerName}`)
          console.log(`   Sample meter reading:`, JSON.stringify(newMeterReadings[0], null, 2))
          
          // Insert meter readings first
          const { data: insertedReadings, error: readingsError } = await supabase
            .from('bawasa_meter_readings')
            .insert(newMeterReadings)
            .select('id, consumer_id, previous_reading, present_reading, created_at')
          
          if (readingsError) {
            const errorMsg = `Failed to insert meter readings for consumer ${consumerData.water_meter_no}: ${readingsError.message}`
            console.error(`❌ ${errorMsg}`)
            console.error(`   Error details:`, readingsError)
            stats.errors.push(errorMsg)
            continue
          }
          
          if (!insertedReadings || insertedReadings.length === 0) {
            const errorMsg = `No meter readings were inserted for consumer ${consumerData.water_meter_no} (${consumerName}) - ${newMeterReadings.length} were prepared`
            console.error(`❌ ${errorMsg}`)
            stats.errors.push(errorMsg)
            continue
          }
          
          console.log(`✅ Successfully inserted ${insertedReadings.length} meter readings`)
          console.log(`   Sample inserted reading:`, JSON.stringify(insertedReadings[0], null, 2))
          
          // Link billings to meter readings (only new billings)
          const billingsToInsert = newBillings.map((billing, index) => ({
            ...billing,
            meter_reading_id: insertedReadings[index]?.id || null
          }))
          
          console.log(`📤 Preparing to insert ${billingsToInsert.length} billings`)
          console.log(`   Sample billing:`, JSON.stringify(billingsToInsert[0], null, 2))
          
          // Insert billings
          const { data: insertedBillings, error: billingsError } = await supabase
            .from('bawasa_billings')
            .insert(billingsToInsert)
            .select('id, consumer_id, meter_reading_id, billing_month, amount_current_billing, created_at')
          
          if (billingsError) {
            const errorMsg = `Failed to insert billings for consumer ${consumerData.water_meter_no}: ${billingsError.message}`
            console.error(`❌ ${errorMsg}`)
            console.error(`   Error details:`, billingsError)
            stats.errors.push(errorMsg)
            // Continue to next consumer even if billings fail
          } else {
            console.log(`✅ Successfully inserted ${insertedBillings?.length || 0} billings`)
            if (insertedBillings && insertedBillings.length > 0) {
              console.log(`   Sample inserted billing:`, JSON.stringify(insertedBillings[0], null, 2))
            }
            stats.billingsCreated += insertedBillings?.length || 0
          }
          
          stats.meterReadingsCreated += insertedReadings.length
          stats.consumersProcessed++
          
          console.log(`✅ Processed consumer ${consumerData.water_meter_no}: ${insertedReadings.length} new readings, ${insertedBillings?.length || 0} new billings`)

        } catch (error) {
          const errorMsg = `Error processing consumer ${(consumer as { water_meter_no: string }).water_meter_no}: ${error instanceof Error ? error.message : String(error)}`
          console.error(`❌ ${errorMsg}`)
          stats.errors.push(errorMsg)
        }
      }
    }
    
    console.log('✅ Seeding completed!')
    console.log('📊 Statistics:', stats)
    
    // Verify data was actually saved (if not dry run)
    let verificationStats = null
    if (!options.dryRun && (stats.meterReadingsCreated > 0 || stats.billingsCreated > 0)) {
      console.log('🔍 Verifying saved data...')
      
      // Count meter readings for the seeded years
      const { count: meterReadingsCount } = await supabase
        .from('bawasa_meter_readings')
        .select('*', { count: 'exact', head: true })
        .in('consumer_id', consumers.map(c => c.id))
        .gte('created_at', `${Math.min(...(options.years || [2022, 2023, 2024, 2025]))}-01-01`)
        .lte('created_at', `${Math.max(...(options.years || [2022, 2023, 2024, 2025]))}-12-31`)
      
      // Count billings for the seeded years
      const { count: billingsCount } = await supabase
        .from('bawasa_billings')
        .select('*', { count: 'exact', head: true })
        .in('consumer_id', consumers.map(c => c.id))
        .gte('created_at', `${Math.min(...(options.years || [2022, 2023, 2024, 2025]))}-01-01`)
        .lte('created_at', `${Math.max(...(options.years || [2022, 2023, 2024, 2025]))}-12-31`)
      
      verificationStats = {
        meterReadingsInDatabase: meterReadingsCount || 0,
        billingsInDatabase: billingsCount || 0
      }
      
      console.log('✅ Verification:', verificationStats)
    }
    
    const yearsText = options.years?.join(', ') || '2022, 2023, 2024 and 2025'
    return NextResponse.json({
      success: true,
      message: options.dryRun 
        ? `Dry run completed. Would create ${stats.meterReadingsCreated} meter readings and ${stats.billingsCreated} billings for ${stats.consumersProcessed} consumers (years: ${yearsText}).`
        : `Successfully seeded ${stats.meterReadingsCreated} meter readings and ${stats.billingsCreated} billings for ${stats.consumersProcessed} consumers (years: ${yearsText}).`,
      stats: {
        accountsCreated: stats.accountsCreated,
        consumersCreated: stats.consumersCreated,
        consumersProcessed: stats.consumersProcessed,
        totalConsumers: consumers.length,
        meterReadingsCreated: stats.meterReadingsCreated,
        billingsCreated: stats.billingsCreated,
        years: options.years,
        errors: stats.errors,
        errorCount: stats.errors.length,
        verification: verificationStats
      }
    })
    
  } catch (error) {
    console.error('💥 Unexpected error in seeding API:', error)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

