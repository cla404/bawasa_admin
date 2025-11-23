"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Receipt,
  RefreshCw,
  Loader2
} from "lucide-react"
import { CashierLayout } from "@/components/cashier-sidebar"
import { supabase } from "@/lib/supabase"
import { RevenueChart } from "@/components/revenue-chart"
import { DashboardService, RevenueStats } from "@/lib/dashboard-service"

interface DashboardStats {
  allTransactions: number
  allRevenue: number
  pendingBills: number
  completedBills: number
}

interface RecentTransaction {
  id: string
  consumer_name: string
  water_meter_no: string
  amount: number
  payment_date: string
  status: string
}

interface BillingTransaction {
  id: string
  amount_paid: number | null
  payment_date: string | null
  payment_status: string | null
  consumers?: {
    water_meter_no: string | null
    accounts?: {
      full_name: string | null
    } | null
  } | null
}

export default function CashierDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    allTransactions: 0,
    allRevenue: 0,
    pendingBills: 0,
    completedBills: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      const result = await DashboardService.getRevenueStats()
      if (result.data) {
        setRevenueStats(result.data)
      } else if (result.error) {
        console.error('Error fetching revenue stats:', result.error)
      }
    } catch (error) {
      console.error('Error fetching revenue stats:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all transactions (not filtered by date)
      const { data: transactions, error: transactionsError } = await supabase
        .from('bawasa_billings')
        .select(`
          id,
          amount_paid,
          payment_date,
          payment_status,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              full_name
            )
          )
        `)
        .not('payment_date', 'is', null)
        .order('payment_date', { ascending: false })

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError)
        setError('Failed to fetch transaction data')
        return
      }

      // Fetch pending bills count
      const { count: pendingBillsCount, error: pendingError } = await supabase
        .from('bawasa_billings')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'unpaid')

      if (pendingError) {
        console.error('Error fetching pending bills:', pendingError)
      }

      // Calculate stats
      const allTransactions = transactions?.length || 0
      const allRevenue = transactions?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0
      const pendingBills = pendingBillsCount || 0
      const completedBills = transactions?.filter(t => t.payment_status === 'paid').length || 0

      setStats({
        allTransactions,
        allRevenue,
        pendingBills,
        completedBills
      })

      // Format recent transactions
      const formattedTransactions = (transactions as unknown as BillingTransaction[] | null)?.slice(0, 5).map((t) => ({
        id: t.id,
        consumer_name: t.consumers?.accounts?.full_name || 'Unknown',
        water_meter_no: t.consumers?.water_meter_no || 'N/A',
        amount: t.amount_paid || 0,
        payment_date: t.payment_date || '',
        status: t.payment_status || 'unknown'
      })) || []

      setRecentTransactions(formattedTransactions)

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'unpaid':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>
      case 'partial':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <CashierLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </CashierLayout>
    )
  }

  return (
    <CashierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your cashier activities</p>
          </div>
          <Button onClick={fetchDashboardData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Transactions</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.allTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Total payments processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.allRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Total collected amount
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBills}</div>
              <p className="text-xs text-muted-foreground">
                Bills awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Bills</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedBills}</div>
              <p className="text-xs text-muted-foreground">
                Total bills paid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Report */}
        <RevenueChart revenueStats={revenueStats} loading={loading} />

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest payments processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-500">No payments have been processed yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.consumer_name}</p>
                        <p className="text-sm text-gray-500">Meter: {transaction.water_meter_no}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.payment_date)}</p>
                    </div>
                    <div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </CashierLayout>
  )
}
