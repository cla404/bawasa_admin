import { supabase } from './supabase'

export interface IssueReport {
  id: number
  issue_type: string | null
  priority: string | null
  issue_title: string | null
  description: string | null
  issue_images: any | null
  created_at: string
  consumer_id: string | null
  status?: string | null
  scheduled_fix_date?: string | null
  assigned_technician?: string | null
}

export interface IssueReportWithUser extends IssueReport {
  user_name: string | null
  user_email: string | null
  user_phone: number | null
}

export class IssueService {
  /**
   * Fetch all issue reports with user information
   */
  static async getAllIssues(): Promise<{ data: IssueReportWithUser[] | null; error: any }> {
    try {
      console.log('🔍 Fetching issue reports from Supabase...')
      
      const { data: issues, error } = await supabase
        .from('issue_report')
        .select(`
          id,
          issue_type,
          priority,
          issue_title,
          description,
          issue_images,
          created_at,
          consumer_id,
          status,
          scheduled_fix_date,
          assigned_technician,
          consumers!consumer_id (
            accounts!consumer_id (
              full_name,
              email,
              mobile_no
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Issues fetch failed:', error)
        return { data: null, error }
      }

      // Transform the data to include user information
      const transformedData = (issues || []).map(issue => {
        const account = (issue.consumers as any)?.accounts
        return {
          ...issue,
          user_name: account?.full_name || 'Unknown User',
          user_email: account?.email || null,
          user_phone: account?.mobile_no || null
        }
      })

      console.log('✅ Successfully fetched issue reports:', transformedData.length, 'issues')
      return { data: transformedData, error: null }
    } catch (error) {
      console.error('💥 Unexpected error fetching issue reports:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch a single issue report by ID
   */
  static async getIssueById(id: number): Promise<{ data: IssueReportWithUser | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('issue_report')
        .select(`
          id,
          issue_type,
          priority,
          issue_title,
          description,
          issue_images,
          created_at,
          consumer_id,
          status,
          scheduled_fix_date,
          assigned_technician,
          consumers!consumer_id (
            accounts!consumer_id (
              full_name,
              email,
              mobile_no
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Issue fetch failed:', error)
        return { data: null, error }
      }

      // Transform the data to include user information
      const account = (data.consumers as any)?.accounts
      const transformedData = {
        ...data,
        user_name: account?.full_name || 'Unknown User',
        user_email: account?.email || null,
        user_phone: account?.mobile_no || null
      }

      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error fetching issue report:', error)
      return { data: null, error }
    }
  }

  /**
   * Search issue reports by title, description, or user name
   */
  static async searchIssues(query: string): Promise<{ data: IssueReportWithUser[] | null; error: any }> {
    try {
      const { data: issues, error } = await supabase
        .from('issue_report')
        .select(`
          id,
          issue_type,
          priority,
          issue_title,
          description,
          issue_images,
          created_at,
          consumer_id,
          status,
          scheduled_fix_date,
          assigned_technician,
          consumers!consumer_id (
            accounts!consumer_id (
              full_name,
              email,
              mobile_no
            )
          )
        `)
        .or(`issue_title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Issues search failed:', error)
        return { data: null, error }
      }

      // Transform the data to include user information
      const transformedData = (issues || []).map(issue => {
        const account = (issue.consumers as any)?.accounts
        return {
          ...issue,
          user_name: account?.full_name || 'Unknown User',
          user_email: account?.email || null,
          user_phone: account?.mobile_no || null
        }
      })

      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error searching issue reports:', error)
      return { data: null, error }
    }
  }

  /**
   * Filter issue reports by priority
   */
  static async getIssuesByPriority(priority: string): Promise<{ data: IssueReportWithUser[] | null; error: any }> {
    try {
      const { data: issues, error } = await supabase
        .from('issue_report')
        .select(`
          id,
          issue_type,
          priority,
          issue_title,
          description,
          issue_images,
          created_at,
          consumer_id,
          status,
          scheduled_fix_date,
          assigned_technician,
          consumers!consumer_id (
            accounts!consumer_id (
              full_name,
              email,
              mobile_no
            )
          )
        `)
        .eq('priority', priority)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Issues filter failed:', error)
        return { data: null, error }
      }

      // Transform the data to include user information
      const transformedData = (issues || []).map(issue => {
        const account = (issue.consumers as any)?.accounts
        return {
          ...issue,
          user_name: account?.full_name || 'Unknown User',
          user_email: account?.email || null,
          user_phone: account?.mobile_no || null
        }
      })

      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error filtering issue reports:', error)
      return { data: null, error }
    }
  }

  /**
   * Get issue statistics
   */
  static async getIssueStats(): Promise<{
    total: number
    high: number
    medium: number
    low: number
    byType: Record<string, number>
  }> {
    try {
      const { data, error } = await supabase
        .from('issue_report')
        .select('priority, issue_type')

      if (error) {
        console.error('❌ Issue stats fetch failed:', error)
        return { total: 0, high: 0, medium: 0, low: 0, byType: {} }
      }

      const stats = {
        total: data?.length || 0,
        high: data?.filter(issue => issue.priority === 'high').length || 0,
        medium: data?.filter(issue => issue.priority === 'medium').length || 0,
        low: data?.filter(issue => issue.priority === 'low').length || 0,
        byType: {} as Record<string, number>
      }

      // Count by issue type
      data?.forEach(issue => {
        const type = issue.issue_type || 'Unknown'
        stats.byType[type] = (stats.byType[type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error fetching issue stats:', error)
      return { total: 0, high: 0, medium: 0, low: 0, byType: {} }
    }
  }

  /**
   * Update issue status
   */
  static async updateIssueStatus(
    issueId: number,
    status: string
  ): Promise<{ data: any; error: any }> {
    try {
      console.log(`🔄 Updating issue #${issueId} status to: ${status}...`)
      
      const updateData: any = { status }

      // Update the issue
      const { error: updateError } = await supabase
        .from('issue_report')
        .update(updateData)
        .eq('id', issueId)

      if (updateError) {
        console.error('❌ Error updating issue status:', updateError)
        return { data: null, error: updateError }
      }

      console.log('✅ Issue status updated successfully')
      return { data: { success: true }, error: null }
    } catch (error) {
      console.error('💥 Unexpected error updating issue status:', error)
      return { data: null, error }
    }
  }

  /**
   * Update issue scheduling information
   */
  static async scheduleIssue(
    issueId: number,
    scheduledDate: string,
    technician?: string,
    notes?: string
  ): Promise<{ data: any; error: any }> {
    try {
      console.log(`📅 Scheduling issue #${issueId}...`)
      
      // Prepare the schedule note to append to description
      const scheduleNote = `\n\n---\nSCHEDULED FIX:\nDate: ${new Date(scheduledDate).toLocaleDateString('en-US', { dateStyle: 'full' })}\nTime: ${new Date(scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\nTechnician: ${technician || 'Not assigned'}${notes ? `\nNotes: ${notes}` : ''}`

      // Get current issue to append schedule note
      const { data: currentIssue, error: fetchError } = await supabase
        .from('issue_report')
        .select('description, scheduled_fix_date, assigned_technician, status')
        .eq('id', issueId)
        .single()

      if (fetchError) {
        console.error('❌ Error fetching issue:', fetchError)
        return { data: null, error: fetchError }
      }

      const updateData: any = {}

      // Try to update the status column if it exists
      try {
        updateData.status = 'assigned'
      } catch (e) {
        console.log('Note: status column may not exist in the table')
      }

      // Try to update the scheduled_fix_date column if it exists
      try {
        updateData.scheduled_fix_date = scheduledDate
      } catch (e) {
        console.log('Note: scheduled_fix_date column may not exist in the table')
      }

      // Try to update the assigned_technician column if it exists
      if (technician) {
        try {
          updateData.assigned_technician = technician
        } catch (e) {
          console.log('Note: assigned_technician column may not exist in the table')
        }
      }

      // Append schedule information to description
      updateData.description = currentIssue?.description 
        ? `${currentIssue.description}${scheduleNote}`
        : scheduleNote.trim()

      // Update the issue
      const { error: updateError } = await supabase
        .from('issue_report')
        .update(updateData)
        .eq('id', issueId)

      if (updateError) {
        console.error('❌ Error updating issue:', updateError)
        return { data: null, error: updateError }
      }

      console.log('✅ Issue scheduled successfully')
      return { data: { success: true }, error: null }
    } catch (error) {
      console.error('💥 Unexpected error scheduling issue:', error)
      return { data: null, error }
    }
  }

  /**
   * Fetch issue reports for a specific consumer by consumer_id
   */
  static async getIssuesByConsumerId(consumerId: string): Promise<{ data: IssueReportWithUser[] | null; error: any }> {
    try {
      console.log('🔍 Fetching issue reports for consumer:', consumerId)
      
      const { data: issues, error } = await supabase
        .from('issue_report')
        .select(`
          id,
          issue_type,
          priority,
          issue_title,
          description,
          issue_images,
          created_at,
          consumer_id,
          status,
          scheduled_fix_date,
          assigned_technician,
          consumers!consumer_id (
            accounts!consumer_id (
              full_name,
              email,
              mobile_no
            )
          )
        `)
        .eq('consumer_id', consumerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Issues fetch failed:', error)
        return { data: null, error }
      }

      // Transform the data to include user information
      const transformedData = (issues || []).map(issue => {
        const account = (issue.consumers as any)?.accounts
        return {
          ...issue,
          user_name: account?.full_name || 'Unknown User',
          user_email: account?.email || null,
          user_phone: account?.mobile_no || null
        }
      })

      console.log('✅ Successfully fetched issue reports:', transformedData.length, 'issues')
      return { data: transformedData, error: null }
    } catch (error) {
      console.error('💥 Unexpected error fetching issue reports:', error)
      return { data: null, error }
    }
  }
}
