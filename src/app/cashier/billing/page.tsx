"use client"

import { useState, useEffect } from "react"
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
  CreditCard, 
  Search, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CashierLayout } from "@/components/cashier-sidebar"
import { BillingService, BillingWithDetails } from "@/lib/billing-service"
import { ViewBillingDetailsDialog } from "@/components/view-billing-details-dialog"
import { PrintableBill } from "@/components/printable-bill"
import { Printer } from "lucide-react"
import { PaymentTransactionsService } from "@/lib/payment-transactions-service"
import { CashierAuthService } from "@/lib/cashier-auth-service"

export default function CashierBillingPage() {
  const [billings, setBillings] = useState<BillingWithDetails[]>([])
  const [filteredBillings, setFilteredBillings] = useState<BillingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedBilling, setSelectedBilling] = useState<BillingWithDetails | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [billingToPrint, setBillingToPrint] = useState<BillingWithDetails | null>(null)
  const [cashierId, setCashierId] = useState<string | null>(null)
  const [isSuspended, setIsSuspended] = useState(false)

  useEffect(() => {
    fetchBillings()
    fetchCashierId()
    checkSuspendedStatus()
  }, [])

  const checkSuspendedStatus = async () => {
    try {
      const response = await CashierAuthService.getCurrentCashier()
      if (response.success && response.cashier) {
        setIsSuspended(response.cashier.status === 'suspended')
      }
    } catch (err) {
      console.error('Error checking suspended status:', err)
    }
  }

  const fetchCashierId = async () => {
    try {
      const response = await CashierAuthService.getCurrentCashier()
      if (response.success && response.cashier) {
        setCashierId(response.cashier.id)
      }
    } catch (err) {
      console.error('Error fetching cashier ID:', err)
    }
  }

  useEffect(() => {
    handleSearch(searchQuery)
  }, [billings, searchQuery, statusFilter])

  const fetchBillings = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await BillingService.getAllBillings()

      if (error) {
        console.error('Error fetching billings:', error)
        setError('Failed to fetch billing data')
        return
      }

      setBillings(data || [])
    } catch (err) {
      console.error('Billing fetch error:', err)
      setError('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    let filtered = billings

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(billing => 
        billing.consumer?.accounts?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        billing.consumer?.water_meter_no?.toLowerCase().includes(query.toLowerCase()) ||
        billing.consumer?.accounts?.email?.toLowerCase().includes(query.toLowerCase())
      )
    }

    // Filter by status - exclude paid bills by default
    if (statusFilter === "all") {
      // Show all except paid bills
      filtered = filtered.filter(billing => billing.payment_status !== 'paid')
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(billing => billing.payment_status === statusFilter)
    }

    setFilteredBillings(filtered)
  }

  const handleStatusUpdate = async (billingId: string, newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue') => {
    // Check if cashier is suspended
    if (isSuspended) {
      setError('Your account has been suspended. You cannot update billing status. Please contact the administrator.')
      return
    }

    try {
      // If marking as paid, get the billing data first to get the total amount
      let totalAmount = 0
      if (newStatus === 'paid') {
        const billing = billings.find(b => b.id === billingId)
        if (billing) {
          totalAmount = billing.total_amount_due
        }
      }

      const { data: billingData, error } = await BillingService.updateBillingStatus(billingId, newStatus)

      if (error) {
        console.error('Error updating billing status:', error)
        setError('Failed to update billing status')
        return
      }

      // If marking as paid and we have a cashier ID, create a payment transaction
      if (newStatus === 'paid' && cashierId && totalAmount > 0) {
        const { error: transactionError } = await PaymentTransactionsService.createPaymentTransaction({
          billing_id: billingId,
          cashier_id: cashierId,
          amount_paid: totalAmount
        })

        if (transactionError) {
          console.error('Error creating payment transaction:', transactionError)
          // Don't show error to user as the payment was still processed
        } else {
          console.log('Payment transaction recorded successfully')
        }
      }

      // Refresh the billings list
      await fetchBillings()
    } catch (err) {
      console.error('Status update error:', err)
      setError('Failed to update billing status')
    }
  }

  const handleViewDetails = (billing: BillingWithDetails) => {
    setSelectedBilling(billing)
    setIsDetailsDialogOpen(true)
  }

  const handlePrintBill = (billing: BillingWithDetails) => {
    setBillingToPrint(billing)
    // Trigger print after a short delay to ensure state update
    setTimeout(() => {
      window.print()
    }, 100)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      case 'overdue':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid') return false
    const due = new Date(dueDate)
    const today = new Date()
    return today > due
  }

  return (
    <CashierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
            <p className="text-gray-600">Manage customer bills and payments</p>
          </div>
          <Button onClick={fetchBillings} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Suspended Status Banner */}
        {isSuspended && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">
                  Your account has been suspended. You cannot process payments or update billing status. Please contact the administrator.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
            <CardTitle>Bills</CardTitle>
            <CardDescription>
              Search and filter customer bills
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search bills..." 
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
                <span>Loading bills...</span>
              </div>
            ) : filteredBillings.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No bills found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No bills have been created yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Water Meter</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBillings.map((billing) => (
                      <TableRow key={billing.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="font-medium">{billing.consumer?.accounts?.full_name || 'Unknown Customer'}</div>
                            <div className="text-sm text-muted-foreground">{billing.consumer?.accounts?.email || 'No email'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {billing.consumer?.water_meter_no || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{billing.billing_month}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(billing.total_amount_due)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(billing.due_date)}
                            {isOverdue(billing.due_date, billing.payment_status) && (
                              <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(billing.payment_status)}</TableCell>
                        <TableCell>
                          {billing.payment_date ? formatDate(billing.payment_date) : "N/A"}
                        </TableCell>
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
                              <DropdownMenuItem onClick={() => handleViewDetails(billing)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintBill(billing)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Receipt
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {billing.payment_status === 'unpaid' ? (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(billing.id, 'paid')}
                                  className="text-green-600"
                                  disabled={isSuspended}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(billing.id, 'unpaid')}
                                  className="text-orange-600"
                                  disabled={isSuspended}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark as Unpaid
                                </DropdownMenuItem>
                              )}
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
