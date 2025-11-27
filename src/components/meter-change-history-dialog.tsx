"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, History, Wrench, Calendar, Gauge, FileText } from "lucide-react"
import { ConsumerService, ConsumerWithStatus, MeterReading } from "@/lib/consumer-service"

interface MeterChangeHistoryDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MeterChangeHistoryDialog({
  consumer,
  open,
  onOpenChange,
}: MeterChangeHistoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<MeterReading[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && consumer) {
      loadHistory()
    }
  }, [open, consumer])

  const loadHistory = async () => {
    if (!consumer) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await ConsumerService.getMeterChangeHistory(consumer.id)
      
      if (error) {
        setError(error.message)
        return
      }

      setHistory(data || [])
    } catch (err) {
      setError('Failed to load meter change history')
      console.error('Error loading meter change history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Extract reason from remarks
  const extractReason = (remarks: string | null) => {
    if (!remarks) return 'No reason provided'
    
    // Format: "METER CHANGE: [reason]. New meter installed..."
    const match = remarks.match(/METER CHANGE:\s*([^.]+)/)
    return match ? match[1].trim() : remarks
  }

  if (!consumer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-orange-600" />
            <span>Meter Change History</span>
          </DialogTitle>
          <DialogDescription>
            View all meter changes for {consumer.account?.full_name || 'this consumer'}
          </DialogDescription>
        </DialogHeader>

        {/* Consumer Info */}
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{consumer.account?.full_name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{consumer.account?.full_address || 'No address'}</p>
          </div>
          <Badge variant="outline" className="font-mono">
            {consumer.water_meter_no}
          </Badge>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No meter changes recorded</h3>
              <p className="text-muted-foreground">
                This consumer has no meter change history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((change, index) => (
                <div
                  key={change.id}
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="bg-orange-100 rounded-full p-2">
                        <Wrench className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Meter Change #{history.length - index}</p>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(change.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      <Gauge className="h-3 w-3 mr-1" />
                      Start: {change.present_reading} m³
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Previous Reading</p>
                      <p className="font-medium">{change.previous_reading} m³</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">New Starting Reading</p>
                      <p className="font-medium">{change.present_reading} m³</p>
                    </div>
                  </div>

                  {change.remarks && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 text-sm">Reason</p>
                          <p className="text-amber-700 text-sm mt-1">
                            {extractReason(change.remarks)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

