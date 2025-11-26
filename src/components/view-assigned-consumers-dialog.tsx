"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Droplets, CheckCircle, Clock, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
import { MeterReaderAssignmentService } from "@/lib/meter-reader-assignment-service"

interface ViewAssignedConsumersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meterReaderId: number
  meterReaderName: string
  onAssignmentRemoved?: () => void
}

interface ConsumerInfo {
  id: string
  water_meter_no: string
  full_name: string
  email: string
  address: string
  status: string
}

export function ViewAssignedConsumersDialog({
  open,
  onOpenChange,
  meterReaderId,
  meterReaderName,
  onAssignmentRemoved,
}: ViewAssignedConsumersDialogProps) {
  const [consumers, setConsumers] = useState<ConsumerInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unassigningIds, setUnassigningIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      loadAssignedConsumers()
    }
  }, [open])

  const loadAssignedConsumers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await MeterReaderAssignmentService.getAssignedConsumers(meterReaderId)

      if (error) {
        console.error('Error loading assigned consumers:', error)
        setError('Failed to load assigned consumers')
        return
      }

      setConsumers(data || [])
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async (consumerId: string, consumerName: string) => {
    if (!confirm(`Are you sure you want to unassign ${consumerName} from ${meterReaderName}?`)) {
      return
    }

    try {
      setUnassigningIds(prev => new Set(prev).add(consumerId))
      setError(null)

      const { data, error } = await MeterReaderAssignmentService.removeAssignment(
        meterReaderId,
        consumerId
      )

      if (error) {
        console.error('Error unassigning consumer:', error)
        toast.error('Failed to unassign consumer', {
          description: error.message || 'An error occurred while unassigning the consumer'
        })
        return
      }

      toast.success('Consumer unassigned successfully', {
        description: `${consumerName} has been unassigned from ${meterReaderName}`
      })

      // Remove from local state
      setConsumers(prev => prev.filter(c => c.id !== consumerId))

      // Notify parent to refresh counts
      if (onAssignmentRemoved) {
        onAssignmentRemoved()
      }
    } catch (err) {
      console.error('Unexpected error unassigning consumer:', err)
      toast.error('An unexpected error occurred')
    } finally {
      setUnassigningIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(consumerId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'ongoing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Ongoing
          </Badge>
        )
      case 'assigned':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Assigned
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Assigned Consumers for {meterReaderName}</span>
          </DialogTitle>
          <DialogDescription>
            View consumers currently assigned to this meter reader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading assigned consumers...</span>
            </div>
          ) : consumers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No consumers assigned</h3>
              <p className="text-sm text-muted-foreground mt-2">
                This meter reader has no assigned consumers yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {consumers.length} consumer{consumers.length > 1 ? 's' : ''} assigned
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAssignedConsumers}
                    disabled={loading}
                  >
                    <Droplets className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {consumers.map((consumer) => (
                  <div
                    key={consumer.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{consumer.full_name}</h4>
                          {getStatusBadge(consumer.status)}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Droplets className="h-4 w-4" />
                            <span className="font-mono">{consumer.water_meter_no}</span>
                          </div>
                          <div>{consumer.email}</div>
                          {consumer.address && (
                            <div>{consumer.address}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassign(consumer.id, consumer.full_name)}
                        disabled={unassigningIds.has(consumer.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                      >
                        {unassigningIds.has(consumer.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Unassign
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

