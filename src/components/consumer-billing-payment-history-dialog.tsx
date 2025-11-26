"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Receipt, DollarSign, Download } from "lucide-react"
import { BillingService, BillingWithDetails } from "@/lib/billing-service"
import { ConsumerWithStatus } from "@/lib/consumer-service"
import { convertToCSV, downloadCSV } from "@/lib/export-utils"

interface ConsumerBillingPaymentHistoryDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConsumerBillingPaymentHistoryDialog({
  consumer,
  open,
  onOpenChange,
}: ConsumerBillingPaymentHistoryDialogProps) {
  const [billings, setBillings] = useState<BillingWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBillings = useCallback(async () => {
    if (!consumer?.id) return

    try {
      setLoading(true)
      setError(null)
      const result = await BillingService.getBillingsByConsumerId(consumer.id)
      
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : 'Failed to load billing history')
        return
      }
      
      setBillings(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }, [consumer?.id])

  useEffect(() => {
    if (open && consumer?.id) {
      loadBillings()
    }
  }, [open, consumer?.id, loadBillings])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case "unpaid":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>
      case "partial":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>
      case "overdue":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleExport = () => {
    if (billings.length === 0) return

    const consumerName = consumer?.account?.full_name || 'Consumer'
    const waterMeterNo = consumer?.water_meter_no || 'N/A'
    const sanitizedName = consumerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const sanitizedMeterNo = waterMeterNo.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    
    const exportData = billings.map(billing => ({
      'Billing Month': billing.billing_month,
      'Due Date': formatDate(billing.due_date),
      'Amount Due': billing.total_amount_due.toFixed(2),
      'Amount Paid': billing.amount_paid.toFixed(2),
      'Payment Status': billing.payment_status,
      'Payment Date': formatDate(billing.payment_date),
      'Consumption (≤10 cu.m)': billing.consumption_10_or_below?.toFixed(2) || '0.00',
      'Amount (≤10 cu.m)': billing.amount_10_or_below?.toFixed(2) || '0.00',
      'Consumption (>10 cu.m)': billing.consumption_over_10?.toFixed(2) || '0.00',
      'Amount (>10 cu.m)': billing.amount_over_10?.toFixed(2) || '0.00',
      'Arrears': billing.arrears_to_be_paid?.toFixed(2) || '0.00',
      'Arrears After Due Date': billing.arrears_after_due_date?.toFixed(2) || '0.00'
    }))

    const headers = [
      'Billing Month', 
      'Due Date', 
      'Amount Due', 
      'Amount Paid', 
      'Payment Status', 
      'Payment Date',
      'Consumption (≤10 cu.m)',
      'Amount (≤10 cu.m)',
      'Consumption (>10 cu.m)',
      'Amount (>10 cu.m)',
      'Arrears',
      'Arrears After Due Date'
    ]
    const csvContent = convertToCSV(exportData, headers)
    const filename = `billing_payment_history_${sanitizedName}_${sanitizedMeterNo}_${new Date().toISOString().split('T')[0]}.csv`
    
    downloadCSV(csvContent, filename)
  }

  if (!consumer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Billing & Payment History</span>
          </DialogTitle>
          <DialogDescription>
            Complete billing and payment history for {consumer.account?.full_name || 'Consumer'} ({consumer.water_meter_no})
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <Button variant="outline" size="sm" onClick={loadBillings} className="ml-auto">
                Retry
              </Button>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading billing history...</span>
            </div>
          ) : billings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No billing history found for this consumer.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Billing Month</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell className="font-medium">{billing.billing_month}</TableCell>
                    <TableCell>{formatDate(billing.due_date)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(billing.total_amount_due)}</TableCell>
                    <TableCell className={billing.amount_paid > 0 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                      {billing.amount_paid > 0 ? formatCurrency(billing.amount_paid) : '₱0.00'}
                    </TableCell>
                    <TableCell>{getStatusBadge(billing.payment_status)}</TableCell>
                    <TableCell>{formatDate(billing.payment_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total bills: {billings.length} | 
            Total paid: {formatCurrency(billings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.amount_paid, 0))}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={billings.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

