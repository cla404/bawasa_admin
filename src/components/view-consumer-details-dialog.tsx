"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  XCircle,
  Home,
  Mail,
  Vote,
  Loader2,
  Percent
} from "lucide-react"
import { ConsumerWithStatus } from "@/lib/consumer-service"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { BAWASABillingCalculator } from "@/lib/bawasa-billing-calculator"

interface ViewConsumerDetailsDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConsumerUpdated?: () => void
}

export function ViewConsumerDetailsDialog({ 
  consumer, 
  open, 
  onOpenChange,
  onConsumerUpdated
}: ViewConsumerDetailsDialogProps) {
  const [isRegisteredVoter, setIsRegisteredVoter] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync state when consumer changes
  useEffect(() => {
    if (consumer) {
      setIsRegisteredVoter(consumer.registered_voter === true)
    }
  }, [consumer])

  if (!consumer) return null

  const handleVoterStatusChange = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('consumers')
        .update({ registered_voter: checked })
        .eq('id', consumer.id)

      if (error) {
        throw error
      }

      setIsRegisteredVoter(checked)
      toast.success(
        checked 
          ? "Consumer marked as registered voter" 
          : "Consumer marked as non-voter",
        {
          description: checked 
            ? "Discount will now apply based on years of service"
            : "No discount will be applied"
        }
      )

      // Notify parent to refresh data
      if (onConsumerUpdated) {
        onConsumerUpdated()
      }
    } catch (error) {
      console.error('Error updating voter status:', error)
      toast.error("Failed to update voter status")
      // Revert the switch
      setIsRegisteredVoter(!checked)
    } finally {
      setIsUpdating(false)
    }
  }

  // Get discount info
  const getDiscountInfo = () => {
    if (!isRegisteredVoter) {
      return { percentage: 0, text: 'No discount', yearsOfService: 0 }
    }
    
    const accountCreatedAt = consumer.account?.created_at || consumer.created_at
    const discountInfo = BAWASABillingCalculator.getDiscountInfo({
      isRegisteredVoter: true,
      accountCreatedAt
    })
    
    return {
      percentage: discountInfo.discountPercentage * 100,
      text: discountInfo.discountText,
      yearsOfService: discountInfo.yearsOfService
    }
  }

  const discountInfo = getDiscountInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span>Consumer Details</span>
          </DialogTitle>
          <DialogDescription>
            Complete information for {consumer.account?.full_name || 'Consumer'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Consumer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="h-5 w-5" />
                <span>Consumer Information</span>
              </CardTitle>
              <CardDescription>
                Personal and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <div className="flex items-center space-x-2">
                    <Home className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{consumer.account?.full_name || 'Not provided'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Email Address</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{consumer.account?.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <div className="flex items-start space-x-2">
                  <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-sm">{consumer.account?.full_address || 'Not provided'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Water Meter Number</label>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {consumer.water_meter_no}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voter Status & Discount Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Vote className="h-5 w-5 text-blue-600" />
                <span>Voter Status & Discount</span>
              </CardTitle>
              <CardDescription>
                Registered voters are eligible for progressive discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voter Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Vote className={`h-5 w-5 ${isRegisteredVoter ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <Label htmlFor="voter-status" className="text-sm font-medium">
                      Registered Voter in Banadero
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRegisteredVoter 
                        ? "Eligible for discount based on years of service" 
                        : "Not eligible for voter discount"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  <Switch
                    id="voter-status"
                    checked={isRegisteredVoter}
                    onCheckedChange={handleVoterStatusChange}
                    disabled={isUpdating}
                  />
                </div>
              </div>

              {/* Discount Info */}
              {isRegisteredVoter && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Current Discount</span>
                    </div>
                    <Badge className={
                      discountInfo.percentage === 100 
                        ? "bg-green-600 text-white" 
                        : discountInfo.percentage > 0 
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                    }>
                      {discountInfo.percentage === 100 
                        ? "FREE" 
                        : discountInfo.percentage > 0 
                          ? `${discountInfo.percentage}% off`
                          : "Year 1 (0%)"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Year {discountInfo.yearsOfService} of service</p>
                    <p className="text-xs text-green-600 mt-1">
                      Discount applies to first 10 m³ of consumption
                    </p>
                  </div>
                </div>
              )}

              {!isRegisteredVoter && (
                <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">No Discount Applied</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Mark this consumer as a registered voter to enable progressive discounts.
                  </p>
                </div>
              )}

              {/* Discount Schedule Info */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p className="font-medium">Discount Schedule (Registered Voters Only):</p>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium">Yr 1</div>
                    <div>0%</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium">Yr 2</div>
                    <div>25%</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium">Yr 3</div>
                    <div>50%</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium">Yr 4</div>
                    <div>75%</div>
                  </div>
                  <div className="text-center p-2 bg-green-100 rounded">
                    <div className="font-medium">Yr 5+</div>
                    <div className="text-green-700">FREE</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
