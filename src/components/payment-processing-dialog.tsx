"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard, 
  Loader2, 
  Search, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Calendar,
  User
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { CashierAuthService } from "@/lib/cashier-auth-service"

interface BillingRecord {
  id: string
  consumer_id: string
  billing_month: string
  total_amount_due: number
  due_date: string
  payment_status: string
  consumer: {
    water_meter_no: string
    accounts: {
      full_name: string
      email: string
    }
  }
}

interface PaymentProcessingDialogProps {
  onPaymentProcessed: () => void
}

export function PaymentProcessingDialog({ onPaymentProcessed }: PaymentProcessingDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<BillingRecord[]>([])
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const response = await CashierAuthService.getCurrentCashier()
      if (response.success && response.cashier) {
        setIsSuspended(response.cashier.status === 'suspended')
      }
    }
    checkStatus()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('bawasa_billings')
        .select(`
          *,
          consumers!consumer_id (
            water_meter_no,
            accounts!consumer_id (
              full_name,
              email
            )
          )
        `)
        .or(`consumers.water_meter_no.ilike.%${query}%,consumers.accounts.full_name.ilike.%${query}%`)
        .eq('payment_status', 'unpaid')
        .limit(10)

      if (error) {
        console.error('Search error:', error)
        setError('Failed to search bills')
        return
      }

      setSearchResults(data || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search bills')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleBillSelect = (bill: BillingRecord) => {
    setSelectedBill(bill)
    setPaymentAmount(bill.total_amount_due.toString())
    setSearchResults([])
    setSearchQuery("")
  }

  const handlePayment = async () => {
    // Check if cashier is suspended
    const cashierResponse = await CashierAuthService.getCurrentCashier()
    if (!cashierResponse.success || !cashierResponse.cashier) {
      setError('Authentication failed. Please sign in again.')
      return
    }

    if (cashierResponse.cashier.status === 'suspended') {
      setError('Your account has been suspended. You cannot process payments. Please contact the administrator.')
      return
    }

    if (!selectedBill || !paymentAmount) {
      setError('Please select a bill and enter payment amount')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (amount > selectedBill.total_amount_due) {
      setError('Payment amount cannot exceed the total amount due')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const paymentStatus = amount === selectedBill.total_amount_due ? 'paid' : 'partial'
      
      const { error } = await supabase
        .from('bawasa_billings')
        .update({
          payment_status: paymentStatus,
          amount_paid: amount,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBill.id)

      if (error) {
        console.error('Payment error:', error)
        setError('Failed to process payment')
        return
      }

      // Reset form
      setSelectedBill(null)
      setPaymentAmount("")
      setOpen(false)
      onPaymentProcessed()
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to process payment')
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const [isSuspended, setIsSuspended] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const response = await CashierAuthService.getCurrentCashier()
      if (response.success && response.cashier) {
        setIsSuspended(response.cashier.status === 'suspended')
      }
    }
    checkStatus()
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="h-20 flex flex-col items-center justify-center space-y-2"
          disabled={isSuspended}
        >
          <CreditCard className="h-6 w-6" />
          <span>Process Payment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Search for a customer bill and process their payment
          </DialogDescription>
        </DialogHeader>

        {isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Your account has been suspended. You cannot process payments. Please contact the administrator.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Search Section */}
          {!selectedBill && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or water meter number..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    disabled={searchLoading || isSuspended}
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Bill</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((bill) => (
                      <Card 
                        key={bill.id} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleBillSelect(bill)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{bill.consumer.accounts.full_name}</div>
                              <div className="text-sm text-gray-500">
                                Meter: {bill.consumer.water_meter_no} • {bill.billing_month}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(bill.total_amount_due)}</div>
                              <div className="text-sm text-gray-500">Due: {formatDate(bill.due_date)}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Bill Section */}
          {selectedBill && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Selected Bill</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Customer Name</Label>
                      <p className="text-sm">{selectedBill.consumer.accounts.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Water Meter</Label>
                      <p className="text-sm font-mono">{selectedBill.consumer.water_meter_no}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Billing Month</Label>
                      <p className="text-sm">{selectedBill.billing_month}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Due Date</Label>
                      <p className="text-sm">{formatDate(selectedBill.due_date)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Total Amount Due</Label>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(selectedBill.total_amount_due)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedBill.total_amount_due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-8"
                    placeholder="Enter payment amount"
                    disabled={isSuspended}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Maximum: {formatCurrency(selectedBill.total_amount_due)}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBill(null)
                  setPaymentAmount("")
                }}
                className="w-full"
              >
                Select Different Bill
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setSelectedBill(null)
              setPaymentAmount("")
              setSearchQuery("")
              setSearchResults([])
              setError(null)
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={loading || !selectedBill || !paymentAmount || isSuspended}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSuspended ? 'Cannot Process - Suspended' : 'Process Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
