import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    console.log('🔐 [Reset Password API] Resetting password for:', email)

    // Check if email exists in accounts table
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('❌ [Reset Password API] Error querying accounts:', accountError)
      return NextResponse.json(
        { error: 'Failed to process password reset request' },
        { status: 500 }
      )
    }

    // For security, always return success even if email doesn't exist
    // This prevents email enumeration attacks
    if (!account) {
      console.log('⚠️ [Reset Password API] Email not found (returning success for security):', email)
      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully.'
      })
    }

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    console.log('✅ [Reset Password API] Password hashed successfully')

    // Update the password in the accounts table
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ password: hashedPassword })
      .eq('id', account.id)

    if (updateError) {
      console.error('❌ [Reset Password API] Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    console.log('✅ [Reset Password API] Password updated successfully for:', email)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.'
    })

  } catch (error) {
    console.error('💥 [Reset Password API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

