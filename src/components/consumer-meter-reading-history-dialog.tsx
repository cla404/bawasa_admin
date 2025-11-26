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
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Image as ImageIcon, Droplets, Download } from "lucide-react"
import { MeterReadingsService, MeterReadingWithUser } from "@/lib/meter-readings-service"
import { ConsumerWithStatus } from "@/lib/consumer-service"
import { convertToCSV, downloadCSV } from "@/lib/export-utils"

interface ConsumerMeterReadingHistoryDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConsumerMeterReadingHistoryDialog({
  consumer,
  open,
  onOpenChange,
}: ConsumerMeterReadingHistoryDialogProps) {
  const [readings, setReadings] = useState<MeterReadingWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  const loadReadings = useCallback(async () => {
    if (!consumer?.id) return

    try {
      setLoading(true)
      setError(null)
      const consumerReadings = await MeterReadingsService.getMeterReadingsByConsumerId(consumer.id)
      setReadings(consumerReadings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meter readings')
    } finally {
      setLoading(false)
    }
  }, [consumer?.id])

  useEffect(() => {
    if (open && consumer?.id) {
      loadReadings()
    }
  }, [open, consumer?.id, loadReadings])

  useEffect(() => {
    if (selectedImageUrl) {
      setImageError(false)
    }
  }, [selectedImageUrl])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case "unpaid":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>
      case "partial":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>
      case "overdue":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExport = () => {
    if (readings.length === 0) return

    const consumerName = consumer?.account?.full_name || 'Consumer'
    const waterMeterNo = consumer?.water_meter_no || 'N/A'
    const sanitizedName = consumerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const sanitizedMeterNo = waterMeterNo.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    
    const exportData = readings.map(reading => ({
      'Reading Date': new Date(reading.reading_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      'Previous Reading': reading.previous_reading?.toLocaleString() || '0',
      'Present Reading': reading.present_reading?.toLocaleString() || '0',
      'Consumption (cu.m)': reading.consumption_cubic_meters?.toLocaleString() || '0',
      'Payment Status': reading.payment_status,
      'Billing Month': reading.billing_month || 'N/A',
      'Submitted Date': formatDate(reading.created_at),
      'Image URL': reading.meter_image || 'No image'
    }))

    const headers = ['Reading Date', 'Previous Reading', 'Present Reading', 'Consumption (cu.m)', 'Payment Status', 'Billing Month', 'Submitted Date', 'Image URL']
    const csvContent = convertToCSV(exportData, headers)
    const filename = `meter_reading_history_${sanitizedName}_${sanitizedMeterNo}_${new Date().toISOString().split('T')[0]}.csv`
    
    downloadCSV(csvContent, filename)
  }

  if (!consumer) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Droplets className="h-5 w-5" />
              <span>Meter Reading History</span>
            </DialogTitle>
            <DialogDescription>
              Complete meter readings history for {consumer.account?.full_name || 'Consumer'} ({consumer.water_meter_no})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
                <Button variant="outline" size="sm" onClick={loadReadings} className="ml-auto">
                  Retry
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading meter readings...</span>
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No meter readings found for this consumer.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reading Date</TableHead>
                    <TableHead>Previous Reading</TableHead>
                    <TableHead>Present Reading</TableHead>
                    <TableHead>Consumption</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell>{new Date(reading.reading_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell className="font-mono">{reading.previous_reading?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="font-mono">{reading.present_reading?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="font-mono font-semibold text-blue-600">
                        {reading.consumption_cubic_meters?.toLocaleString() || '0'} cu.m
                      </TableCell>
                      <TableCell>{getStatusBadge(reading.payment_status)}</TableCell>
                      <TableCell>
                        {reading.meter_image ? (
                          <button
                            onClick={() => setSelectedImageUrl(reading.meter_image || null)}
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-sm"
                          >
                            <ImageIcon className="h-4 w-4" />
                            View Image
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No image</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(reading.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total readings: {readings.length}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={readings.length === 0}
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

      {/* Image Modal */}
      {selectedImageUrl && (
        <Dialog open={!!selectedImageUrl} onOpenChange={(open) => !open && setSelectedImageUrl(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh]">
            <DialogHeader>
              <DialogTitle>Meter Reading Image</DialogTitle>
              <DialogDescription>
                {(() => {
                  const reading = readings.find(r => r.meter_image === selectedImageUrl)
                  return reading ? `Image for reading submitted on ${formatDate(reading.created_at)}` : 'Meter reading image'
                })()}
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex items-center justify-center">
              {!imageError ? (
                <img
                  src={selectedImageUrl}
                  alt="Meter reading image"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg border flex flex-col items-center justify-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>Image failed to load</p>
                  <p className="text-xs mt-1 text-gray-400 break-all px-4 text-center">
                    {selectedImageUrl}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedImageUrl(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

