"use client"

import { AdminLayout } from "@/components/admin-layout"
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
  Users, 
  Search, 
  MoreHorizontal,
  XCircle,
  Loader2,
  RefreshCw,
  Home,
  Mail,
  Ban,
  CheckCircle2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConsumerService, ConsumerWithStatus } from "@/lib/consumer-service"
import { useEffect, useState } from "react"
import { AddConsumerDialog } from "@/components/add-consumer-dialog"
import { ViewConsumerDetailsDialog } from "@/components/view-consumer-details-dialog"
import { ConsumerMeterReadingHistoryDialog } from "@/components/consumer-meter-reading-history-dialog"
import { ConsumerBillingPaymentHistoryDialog } from "@/components/consumer-billing-payment-history-dialog"
import { ConsumerMaintenanceReportHistoryDialog } from "@/components/consumer-maintenance-report-history-dialog"
import { ChangeMeterDialog } from "@/components/change-meter-dialog"
import { MeterChangeHistoryDialog } from "@/components/meter-change-history-dialog"
import { BAWASABillingCalculator } from "@/lib/bawasa-billing-calculator"
import { Droplets, Receipt, Wrench, RefreshCcw, History, Vote, Percent } from "lucide-react"

export default function ConsumerManagementPage() {
  const [consumers, setConsumers] = useState<ConsumerWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredConsumers, setFilteredConsumers] = useState<ConsumerWithStatus[]>([])
  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerWithStatus | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [meterReadingDialogOpen, setMeterReadingDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [changeMeterDialogOpen, setChangeMeterDialogOpen] = useState(false)
  const [meterChangeHistoryDialogOpen, setMeterChangeHistoryDialogOpen] = useState(false)

  // Fetch consumers from Supabase
  const fetchConsumers = async () => {
    try {
      console.log('🚀 Starting to fetch consumers...')
      setLoading(true)
      setError(null)
      
      const { data, error } = await ConsumerService.getAllConsumers()
      
      console.log('📋 Fetch result:', { data, error })
      
      if (error) {
        console.error('💥 Error in fetchConsumers:', error)
        setError(error.message || 'Failed to fetch consumers')
        return
      }
      
      if (data) {
        console.log('📝 Formatting consumers...')
        const formattedConsumers = data.map(consumer => ConsumerService.formatConsumerForDisplay(consumer))
        console.log('✨ Formatted consumers:', formattedConsumers)
        setConsumers(formattedConsumers)
        setFilteredConsumers(formattedConsumers)
      } else {
        console.log('📭 No data returned from Supabase')
        setConsumers([])
        setFilteredConsumers([])
      }
    } catch (err) {
      console.error('💥 Unexpected error in fetchConsumers:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle opening consumer details
  const handleViewDetails = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setDetailsDialogOpen(true)
  }

  // Handle opening meter reading history
  const handleViewMeterReadingHistory = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setMeterReadingDialogOpen(true)
  }

  // Handle opening billing history
  const handleViewBillingHistory = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setBillingDialogOpen(true)
  }

  // Handle opening maintenance report history
  const handleViewMaintenanceHistory = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setMaintenanceDialogOpen(true)
  }

  // Handle opening change meter dialog
  const handleChangeMeter = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setChangeMeterDialogOpen(true)
  }

  // Handle opening meter change history dialog
  const handleViewMeterChangeHistory = (consumer: ConsumerWithStatus) => {
    setSelectedConsumer(consumer)
    setMeterChangeHistoryDialogOpen(true)
  }

  // Handle suspending a consumer
  const handleSuspendConsumer = async (consumer: ConsumerWithStatus) => {
    if (!consumer.account?.id) {
      setError('Consumer account ID not found')
      return
    }

    try {
      const { error } = await ConsumerService.suspendConsumer(consumer.account.id)
      if (error) {
        setError(error.message || 'Failed to suspend consumer')
        return
      }
      // Refresh the consumers list
      await fetchConsumers()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error suspending consumer:', err)
    }
  }

  // Handle unsuspending a consumer
  const handleUnsuspendConsumer = async (consumer: ConsumerWithStatus) => {
    if (!consumer.account?.id) {
      setError('Consumer account ID not found')
      return
    }

    try {
      const { error } = await ConsumerService.unsuspendConsumer(consumer.account.id)
      if (error) {
        setError(error.message || 'Failed to unsuspend consumer')
        return
      }
      // Refresh the consumers list
      await fetchConsumers()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error unsuspending consumer:', err)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredConsumers(consumers)
      return
    }
    
    const filtered = consumers.filter(consumer => 
      consumer.water_meter_no.toLowerCase().includes(query.toLowerCase()) ||
      consumer.account?.email?.toLowerCase().includes(query.toLowerCase()) ||
      consumer.account?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      consumer.account?.full_address?.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredConsumers(filtered)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get discount info for a consumer
  const getDiscountInfo = (consumer: ConsumerWithStatus) => {
    const isRegisteredVoter = consumer.registered_voter === true
    const accountCreatedAt = consumer.account?.created_at || consumer.created_at
    
    if (!isRegisteredVoter) {
      return {
        hasDiscount: false,
        percentage: 0,
        yearsOfService: 0,
        text: 'No discount',
        color: 'bg-gray-100 text-gray-600'
      }
    }
    
    const discountInfo = BAWASABillingCalculator.getDiscountInfo({
      isRegisteredVoter,
      accountCreatedAt
    })
    
    if (discountInfo.discountPercentage === 0) {
      return {
        hasDiscount: false,
        percentage: 0,
        yearsOfService: discountInfo.yearsOfService,
        text: 'Year 1 (0%)',
        color: 'bg-blue-50 text-blue-600'
      }
    } else if (discountInfo.discountPercentage === 1) {
      return {
        hasDiscount: true,
        percentage: 100,
        yearsOfService: discountInfo.yearsOfService,
        text: 'FREE',
        color: 'bg-green-100 text-green-700'
      }
    } else {
      return {
        hasDiscount: true,
        percentage: discountInfo.discountPercentage * 100,
        yearsOfService: discountInfo.yearsOfService,
        text: `${(discountInfo.discountPercentage * 100).toFixed(0)}% off`,
        color: 'bg-emerald-50 text-emerald-600'
      }
    }
  }

  // Load consumers on component mount
  useEffect(() => {
    console.log('🎯 Component mounted, starting consumer fetch...')
    fetchConsumers()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Consumers</h1>
            <p className="text-muted-foreground">
              Manage consumer accounts and water service connections
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchConsumers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <AddConsumerDialog onConsumerAdded={fetchConsumers} />
          </div>
        </div>


        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consumers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Consumer Accounts</CardTitle>
            <CardDescription>
              Manage all consumer accounts and water service connections
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search consumers..." 
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
                <span>Loading consumers...</span>
              </div>
            ) : filteredConsumers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No consumers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No consumers have been registered yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consumer</TableHead>
                    <TableHead>Water Meter</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date Joined</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsumers.map((consumer) => (
                    <TableRow key={consumer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                          <span>{consumer.account?.full_name || 'No name provided'}</span>
                            {consumer.account?.status === 'suspended' && (
                              <Badge variant="destructive" className="mt-1 w-fit">
                                <Ban className="h-3 w-3 mr-1" />
                                Suspended
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {consumer.water_meter_no}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{consumer.account?.email || 'No email provided'}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {consumer.account?.full_address || 'No address provided'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(consumer.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const discount = getDiscountInfo(consumer)
                          return (
                            <div className="flex flex-col gap-1">
                              {consumer.registered_voter ? (
                                <>
                                  <Badge className={`w-fit ${discount.color}`}>
                                    {discount.percentage === 100 ? (
                                      <span className="flex items-center">
                                        <Percent className="h-3 w-3 mr-1" />
                                        {discount.text}
                                      </span>
                                    ) : discount.percentage > 0 ? (
                                      <span className="flex items-center">
                                        <Percent className="h-3 w-3 mr-1" />
                                        {discount.text}
                                      </span>
                                    ) : (
                                      <span>{discount.text}</span>
                                    )}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center">
                                    <Vote className="h-3 w-3 mr-1 text-green-600" />
                                    Voter · Yr {discount.yearsOfService}
                                  </span>
                                </>
                              ) : (
                                <Badge variant="outline" className="w-fit text-gray-500">
                                  No discount
                                </Badge>
                              )}
                            </div>
                          )
                        })()}
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
                            <DropdownMenuItem onClick={() => handleViewDetails(consumer)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewMeterReadingHistory(consumer)}>
                              <Droplets className="h-4 w-4 mr-2" />
                              Meter Reading History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewBillingHistory(consumer)}>
                              <Receipt className="h-4 w-4 mr-2" />
                              Billing & Payment History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewMaintenanceHistory(consumer)}>
                              <Wrench className="h-4 w-4 mr-2" />
                              Maintenance Report History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleChangeMeter(consumer)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Change Meter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewMeterChangeHistory(consumer)}>
                              <History className="h-4 w-4 mr-2" />
                              Meter Change History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {consumer.account?.status === 'suspended' ? (
                              <DropdownMenuItem 
                                onClick={() => handleUnsuspendConsumer(consumer)}
                                className="text-green-600"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Unsuspend Consumer
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleSuspendConsumer(consumer)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend Consumer
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
      </div>

      {/* Consumer Details Dialog */}
      <ViewConsumerDetailsDialog
        consumer={selectedConsumer}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onConsumerUpdated={fetchConsumers}
      />

      {/* Meter Reading History Dialog */}
      <ConsumerMeterReadingHistoryDialog
        consumer={selectedConsumer}
        open={meterReadingDialogOpen}
        onOpenChange={setMeterReadingDialogOpen}
      />

      {/* Billing & Payment History Dialog */}
      <ConsumerBillingPaymentHistoryDialog
        consumer={selectedConsumer}
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      {/* Maintenance Report History Dialog */}
      <ConsumerMaintenanceReportHistoryDialog
        consumer={selectedConsumer}
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
      />

      {/* Change Meter Dialog */}
      <ChangeMeterDialog
        consumer={selectedConsumer}
        open={changeMeterDialogOpen}
        onOpenChange={setChangeMeterDialogOpen}
        onMeterChanged={fetchConsumers}
      />

      {/* Meter Change History Dialog */}
      <MeterChangeHistoryDialog
        consumer={selectedConsumer}
        open={meterChangeHistoryDialogOpen}
        onOpenChange={setMeterChangeHistoryDialogOpen}
      />
    </AdminLayout>
  )
}
