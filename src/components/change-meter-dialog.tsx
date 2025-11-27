"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, Wrench, Calendar, Gauge, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { ConsumerService, ConsumerWithStatus } from "@/lib/consumer-service"

interface ChangeMeterDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMeterChanged?: () => void
}

export function ChangeMeterDialog({
  consumer,
  open,
  onOpenChange,
  onMeterChanged,
}: ChangeMeterDialogProps) {
  const [loading, setLoading] = useState(false)
  const [finalReadingBeforeChange, setFinalReadingBeforeChange] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0]
  })
  const [reason, setReason] = useState("")

  // Pre-fill the final reading with the current meter reading when dialog opens
  useEffect(() => {
    if (open && consumer?.latest_meter_reading) {
      setFinalReadingBeforeChange(consumer.latest_meter_reading.present_reading.toString())
    }
  }, [open, consumer])

  const resetForm = () => {
    setFinalReadingBeforeChange("")
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setReason("")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!consumer) return

    // Validation
    if (!finalReadingBeforeChange || isNaN(parseFloat(finalReadingBeforeChange))) {
      toast.error("Please enter the final reading before the meter change")
      return
    }

    if (!effectiveDate) {
      toast.error("Please select the date when the meter was changed")
      return
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the meter change")
      return
    }

    const readingBeforeChange = parseFloat(finalReadingBeforeChange)
    if (readingBeforeChange < 0) {
      toast.error("Reading cannot be negative")
      return
    }

    try {
      setLoading(true)

      const { error } = await ConsumerService.changeMeter(
        consumer.id,
        0, // New meter always starts at 0
        effectiveDate,
        reason.trim(),
        readingBeforeChange // Pass the final reading before change
      )

      if (error) {
        toast.error("Failed to change meter", {
          description: error.message
        })
        return
      }

      toast.success("Meter changed successfully", {
        description: `Final reading: ${readingBeforeChange} m³. New meter starts at 0 m³.`
      })

      if (onMeterChanged) {
        onMeterChanged()
      }

      handleClose()
    } catch (err) {
      console.error("Error changing meter:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (!consumer) return null

  // Calculate consumption that needs to be paid
  const previousReading = consumer.latest_meter_reading?.previous_reading || 0
  const currentReading = parseFloat(finalReadingBeforeChange) || 0
  const unpaidConsumption = Math.max(0, currentReading - previousReading)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            <span>Change Meter</span>
          </DialogTitle>
          <DialogDescription>
            Record a meter change for this consumer. Enter the final reading on the old meter
            so the consumer can be billed for any unpaid consumption.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-amber-700 mt-1">
                The consumer will need to pay for consumption up to the final reading before the meter change.
                The new meter will start at <strong>0 m³</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Consumer Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Consumer</span>
            <span className="font-medium">{consumer.account?.full_name || "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Water Meter No.</span>
            <Badge variant="outline" className="font-mono">
              {consumer.water_meter_no}
            </Badge>
          </div>
          {consumer.latest_meter_reading && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Recorded Reading</span>
                <span className="font-medium">
                  {consumer.latest_meter_reading.present_reading} m³
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Previous Reading</span>
                <span className="font-medium">
                  {consumer.latest_meter_reading.previous_reading} m³
                </span>
              </div>
            </>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Final Reading Before Change */}
          <div className="space-y-2">
            <Label htmlFor="finalReading" className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-red-500" />
              <span>Final Reading Before Change (m³) *</span>
            </Label>
            <Input
              id="finalReading"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter the final reading on the old meter"
              value={finalReadingBeforeChange}
              onChange={(e) => setFinalReadingBeforeChange(e.target.value)}
              className="border-red-200 focus:border-red-400"
            />
            <p className="text-xs text-muted-foreground">
              The last reading shown on the old meter before it was replaced.
              This will be used to calculate the final billing.
            </p>
          </div>

          {/* Consumption Summary */}
          {finalReadingBeforeChange && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Unpaid Consumption to Bill:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-blue-600">{previousReading} m³</span>
                  <ArrowRight className="h-4 w-4 text-blue-400" />
                  <span className="font-mono text-blue-600">{currentReading} m³</span>
                  <span className="font-bold text-blue-800">= {unpaidConsumption} m³</span>
                </div>
              </div>
            </div>
          )}

          {/* New Meter Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm">
              <Gauge className="h-4 w-4 text-green-600" />
              <span className="text-green-700">New Meter Starting Reading:</span>
              <span className="font-bold text-green-800">0 m³</span>
            </div>
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="effectiveDate" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Date of Meter Change *</span>
            </Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The date when the new meter was installed.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Meter Change *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Old meter malfunctioned, meter upgrade, damaged meter..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Change Meter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

