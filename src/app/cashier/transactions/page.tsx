"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  History, 
  Search, 
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Printer,
  Eye,
  Download
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CashierLayout } from "@/components/cashier-sidebar"
import { supabase } from "@/lib/supabase"
import { ViewBillingDetailsDialog } from "@/components/view-billing-details-dialog"
import { BillingWithDetails } from "@/lib/billing-service"
import { PrintableBill } from "@/components/printable-bill"
import { convertToCSV, downloadCSV } from "@/lib/export-utils"

export default function CashierTransactionsPage() {
  const [transactions, setTransactions] = useState<BillingWithDetails[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<BillingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBilling, setSelectedBilling] = useState<BillingWithDetails | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [billingToPrint, setBillingToPrint] = useState<BillingWithDetails | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    
    let filtered = transactions

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.consumer?.accounts?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        transaction.consumer?.water_meter_no?.toLowerCase().includes(query.toLowerCase()) ||
        transaction.consumer?.accounts?.email?.toLowerCase().includes(query.toLowerCase())
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions])

  useEffect(() => {
    handleSearch(searchQuery)
  }, [transactions, searchQuery, handleSearch])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('bawasa_billings')
        .select(`
          *,
          consumers!consumer_id (
            *,
            accounts!consumer_id (
              *
            )
          ),
          bawasa_meter_readings!meter_reading_id (
            *
          )
        `)
        .not('payment_date', 'is', null)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        setError('Failed to fetch transaction data')
        return
      }

      // Transform the data to match our BillingWithDetails interface
      interface SupabaseBillingResult {
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
        consumers?: {
          id: string
          water_meter_no: string
          consumer_id: number | null
          registered_voter: boolean | null
          created_at: string
          updated_at: string
          accounts?: {
            id: number
            email: string | null
            password: string | null
            created_at: string
            full_name: string | null
            full_address: string | null
            mobile_no: number | null
            user_type: string | null
          } | null
        } | null
        bawasa_meter_readings?: {
          id: string
          consumer_id: string
          reading_date: string
          previous_reading: number
          present_reading: number
          consumption_cubic_meters: number | null
          meter_image: string | null
          created_at: string
          updated_at: string
        } | null
      }

      const transformedTransactions = (data || []).map((billing: SupabaseBillingResult): BillingWithDetails => {
        const consumer = billing.consumers
        const account = consumer?.accounts
        const meterReading = billing.bawasa_meter_readings

        return {
          ...billing,
          consumer: consumer ? {
            ...consumer,
            accounts: account || undefined
          } : undefined,
          account: account || undefined,
          meter_reading: meterReading || undefined
        } as BillingWithDetails
      })

      setTransactions(transformedTransactions)
    } catch (err) {
      console.error('Transaction fetch error:', err)
      setError('Failed to load transaction data')
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
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
      case 'partial':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewDetails = (transaction: BillingWithDetails) => {
    setSelectedBilling(transaction)
    setIsDetailsDialogOpen(true)
  }

  const handlePrintReceipt = (transaction: BillingWithDetails) => {
    setBillingToPrint(transaction)
    // Trigger print after a short delay to ensure state update
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const handleExportTransactions = () => {
    if (filteredTransactions.length === 0) return

    const exportData = filteredTransactions.map(transaction => ({
      'Transaction ID': transaction.id,
      'Customer Name': transaction.consumer?.accounts?.full_name || 'Unknown',
      'Email': transaction.consumer?.accounts?.email || 'N/A',
      'Water Meter No': transaction.consumer?.water_meter_no || 'N/A',
      'Billing Month': transaction.billing_month,
      'Amount Due': transaction.total_amount_due.toFixed(2),
      'Amount Paid': transaction.amount_paid.toFixed(2),
      'Payment Status': transaction.payment_status,
      'Payment Date': formatDateTime(transaction.payment_date),
      'Consumption (≤10 cu.m)': transaction.consumption_10_or_below?.toFixed(2) || '0.00',
      'Amount (≤10 cu.m)': transaction.amount_10_or_below?.toFixed(2) || '0.00',
      'Consumption (>10 cu.m)': transaction.consumption_over_10?.toFixed(2) || '0.00',
      'Amount (>10 cu.m)': transaction.amount_over_10?.toFixed(2) || '0.00',
      'Arrears': transaction.arrears_to_be_paid?.toFixed(2) || '0.00',
      'Arrears After Due Date': transaction.arrears_after_due_date?.toFixed(2) || '0.00',
      'Created At': formatDateTime(transaction.created_at)
    }))

    const headers = [
      'Transaction ID',
      'Customer Name',
      'Email',
      'Water Meter No',
      'Billing Month',
      'Amount Due',
      'Amount Paid',
      'Payment Status',
      'Payment Date',
      'Consumption (≤10 cu.m)',
      'Amount (≤10 cu.m)',
      'Consumption (>10 cu.m)',
      'Amount (>10 cu.m)',
      'Arrears',
      'Arrears After Due Date',
      'Created At'
    ]

    const csvContent = convertToCSV(exportData, headers)
    const filename = `cashier_transactions_${new Date().toISOString().split('T')[0]}.csv`
    
    downloadCSV(csvContent, filename)
  }

  // Handle print cleanup
  useEffect(() => {
    const handleAfterPrint = () => {
      setBillingToPrint(null)
    }
    
    window.addEventListener('afterprint', handleAfterPrint)
    
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
  }
  }, [])

  return (
    <CashierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-600">View and manage payment transactions</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleExportTransactions} 
              disabled={loading || filteredTransactions.length === 0} 
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchTransactions} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Search payment transactions
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-8" 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No transactions found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No transactions have been recorded yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Water Meter</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        <div className="font-mono text-sm">
                          {transaction.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{transaction.consumer?.accounts?.full_name || 'Unknown Customer'}</div>
                          <div className="text-sm text-muted-foreground">{transaction.consumer?.accounts?.email || 'No email'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {transaction.consumer?.water_meter_no || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.billing_month}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(transaction.total_amount_due)}</TableCell>
                      <TableCell className="font-mono font-semibold text-green-600">
                        {formatCurrency(transaction.amount_paid)}
                      </TableCell>
                      <TableCell>{formatDateTime(transaction.payment_date)}</TableCell>
                      <TableCell>{getStatusBadge(transaction.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintReceipt(transaction)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Billing Details Dialog */}
        <ViewBillingDetailsDialog
          billing={selectedBilling}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />

        {/* Printable Bill - Hidden until print */}
        {billingToPrint && (
          <div className="hidden-print">
            <PrintableBill billing={billingToPrint} />
          </div>
        )}

        {/* Print styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container,
            .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
          }
          @media screen {
            .hidden-print {
              position: absolute;
              left: -9999px;
              top: -9999px;
            }
          }
        `}} />
      </div>
    </CashierLayout>
  )
}
