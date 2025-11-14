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
  Search, 
  MoreHorizontal,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MeterReadingsService, MeterReadingWithUser, LatestMeterReadingByUser } from "@/lib/meter-readings-service"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { UserMeterReadingsDialog } from "@/components/UserMeterReadingsDialog"

export default function MeterReadingsPage() {
  const [meterReadings, setMeterReadings] = useState<LatestMeterReadingByUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    name: string
    email: string
  } | null>(null)
  const [isCreatingReadings, setIsCreatingReadings] = useState(false)

  // Load meter readings on component mount
  useEffect(() => {
    loadMeterReadings()
    getCurrentUser()
  }, [])

  // Auto-search with debouncing when searchQuery changes
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If search query is empty, load all readings
    if (!searchQuery.trim()) {
      loadMeterReadings()
      return
    }

    // Debounce the search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)
        const readings = await MeterReadingsService.searchMeterReadings(searchQuery)
        // Convert to LatestMeterReadingByUser format by grouping
        const groupedReadings = groupReadingsByUser(readings)
        setMeterReadings(groupedReadings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search meter readings')
      } finally {
        setLoading(false)
      }
    }, 300)

    // Cleanup timeout on unmount or when searchQuery changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const loadMeterReadings = async () => {
    try {
      setLoading(true)
      setError(null)
      const readings = await MeterReadingsService.getLatestMeterReadingsByUser()
      setMeterReadings(readings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meter readings')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    } catch (err) {
      console.error('Error getting current user:', err)
    }
  }

  const handleStatusUpdate = async (readingId: string, newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue') => {
    if (!currentUser) return

    try {
      await MeterReadingsService.updateMeterReadingStatus(readingId, newStatus, currentUser.id)
      // Reload readings to reflect the change
      await loadMeterReadings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reading status')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadMeterReadings()
      return
    }

    try {
      setLoading(true)
      setError(null)
      const readings = await MeterReadingsService.searchMeterReadings(searchQuery)
      // Convert to LatestMeterReadingByUser format by grouping
      const groupedReadings = groupReadingsByUser(readings)
      setMeterReadings(groupedReadings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search meter readings')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterByStatus = async (status: string) => {
    setStatusFilter(status)
    
    try {
      setLoading(true)
      setError(null)
      
      if (status === 'all') {
        await loadMeterReadings()
      } else {
        const readings = await MeterReadingsService.getMeterReadingsByStatus(status as 'unpaid' | 'partial' | 'paid' | 'overdue')
        // Convert to LatestMeterReadingByUser format by grouping
        const groupedReadings = groupReadingsByUser(readings)
        setMeterReadings(groupedReadings)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter meter readings')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to group readings by user and get latest
  const groupReadingsByUser = (readings: MeterReadingWithUser[]): LatestMeterReadingByUser[] => {
    const userGroups = new Map<string, MeterReadingWithUser[]>()
    
    // Group readings by consumer_id
    readings.forEach(reading => {
      if (!userGroups.has(reading.consumer_id)) {
        userGroups.set(reading.consumer_id, [])
      }
      userGroups.get(reading.consumer_id)!.push(reading)
    })

    // Get latest reading for each user and add total count
    const latestReadings: LatestMeterReadingByUser[] = []
    userGroups.forEach((userReadings, userId) => {
      const latestReading = userReadings[0] // Already sorted by created_at desc
      latestReadings.push({
        ...latestReading,
        total_readings: userReadings.length
      })
    })

    // Sort by latest reading date
    return latestReadings.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  const handleViewDetails = (reading: LatestMeterReadingByUser) => {
    setSelectedUser({
      id: reading.consumer_id,
      name: reading.user_name,
      email: reading.user_email
    })
    setDialogOpen(true)
  }

  // Filter readings based on current filters
  const filteredReadings = meterReadings.filter(reading => {
    if (statusFilter !== 'all' && reading.payment_status !== statusFilter) {
      return false
    }
    return true
  })

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

  const handleCreateNewMonthReadings = async () => {
    try {
      setIsCreatingReadings(true)
      setError(null)

      // Get current month and year
      const now = new Date()
      const currentMonth = now.toLocaleString('en-US', { month: 'long' })
      const currentYear = now.getFullYear()

      // Check if readings already exist for this month
      const { data: existingReadings } = await supabase
        .from('bawasa_meter_readings')
        .select('id')
        .gte('reading_date', new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0])
        .lt('reading_date', new Date(currentYear, now.getMonth() + 1, 1).toISOString().split('T')[0])

      if (existingReadings && existingReadings.length > 0) {
        alert(`Meter readings already exist for ${currentMonth} ${currentYear}. Please wait until next month to create new readings.`)
        return
      }

      // Call the API to create meter readings for the new month
      const response = await fetch('/api/billing/create-monthly-readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create meter readings')
      }

      // Reload meter readings after successful creation
      await loadMeterReadings()
      
      alert(`Successfully created ${data.count} meter reading records for ${currentMonth} ${currentYear}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meter readings'
      setError(errorMessage)
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsCreatingReadings(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meter Readings Management</h1>
            <p className="text-muted-foreground">
              Review latest meter readings by user - click on user to view complete history
            </p>
          </div>
          {/* <div className="flex items-center space-x-2">
            <Button 
              onClick={handleCreateNewMonthReadings}
              disabled={isCreatingReadings}
              variant="default"
            >
              {isCreatingReadings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Droplets className="h-4 w-4 mr-2" />
                  Create Next Month Readings
                </>
              )}
            </Button>
            
          </div> */}
        </div>

        {/* Meter Readings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Meter Readings by User</CardTitle>
            <CardDescription>
              View the most recent meter reading for each user. Click on a user to see their complete reading history.
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by user name or email..." 
                  className="pl-8" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
                <Button variant="outline" size="sm" onClick={loadMeterReadings} className="ml-auto">
                  Retry
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading meter readings...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Latest Reading ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Total Readings</TableHead>
                    <TableHead>Water Meter No</TableHead>
                    <TableHead>Present Reading</TableHead>
                    <TableHead>Last Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReadings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No meter readings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReadings.map((reading) => (
                      <TableRow key={reading.id}>
                        <TableCell className="font-medium">{reading.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reading.user_name || 'Unknown User'}</div>
                            <div className="text-sm text-muted-foreground">{reading.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {reading.total_readings} reading{reading.total_readings !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{reading.water_meter_no}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{reading.present_reading?.toLocaleString() || '0'}</TableCell>
                        <TableCell>{new Date(reading.created_at).toLocaleDateString()}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleViewDetails(reading)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        
      </div>
      
      {/* User Meter Readings Dialog */}
      {selectedUser && (
        <UserMeterReadingsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
        />
      )}

    </AdminLayout>
  )
}
