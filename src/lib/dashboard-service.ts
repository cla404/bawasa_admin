// Dashboard API service for fetching admin dashboard data
export interface DashboardStats {
  totalUsers: number
  totalMeterReadings: number
  pendingBills: number
  openIssues: number
}

export interface MeterReading {
  id: string
  user: string
  value: string
  status: string
  date: string
}

export interface Issue {
  id: string
  user: string
  issue: string
  priority: string
  status: string
}

export interface RevenueData {
  month: string
  revenue: number
  billsCount: number
}

export interface RevenueStats {
  totalRevenue: number
  paidBills: number
  pendingBills: number
  overdueBills: number
  monthlyRevenue: RevenueData[]
}

export class DashboardService {
  private static baseUrl = '/api/dashboard'

  static async getStats(): Promise<{ data?: DashboardStats; error?: Error }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return { data: result.data }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return { error: error as Error }
    }
  }

  static async getRecentMeterReadings(): Promise<{ data?: MeterReading[]; error?: Error }> {
    try {
      const response = await fetch(`${this.baseUrl}/meter-readings`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return { data: result.data }
    } catch (error) {
      console.error('Error fetching meter readings:', error)
      return { error: error as Error }
    }
  }

  static async getRecentIssues(): Promise<{ data?: Issue[]; error?: Error }> {
    try {
      const response = await fetch(`${this.baseUrl}/issues`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return { data: result.data }
    } catch (error) {
      console.error('Error fetching issues:', error)
      return { error: error as Error }
    }
  }

  static async getRevenueStats(year?: number): Promise<{ data?: RevenueStats; error?: Error }> {
    try {
      const url = year 
        ? `${this.baseUrl}/revenue?year=${year}`
        : `${this.baseUrl}/revenue`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return { data: result.data }
    } catch (error) {
      console.error('Error fetching revenue stats:', error)
      return { error: error as Error }
    }
  }
}
