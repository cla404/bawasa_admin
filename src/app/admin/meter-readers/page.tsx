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
  Filter, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Loader2,
  RefreshCw,
  Droplets,
  MapPin,
  Calendar,
  Activity
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MeterReaderService, MeterReaderUser } from "@/lib/meter-reader-service"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { AddMeterReaderDialog } from "@/components/add-meter-reader-dialog"
import { AssignConsumersDialog } from "@/components/assign-consumers-dialog"
import { ViewAssignedConsumersDialog } from "@/components/view-assigned-consumers-dialog"

export default function MeterReaderManagementPage() {
  const [meterReaders, setMeterReaders] = useState<MeterReaderUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMeterReaders, setFilteredMeterReaders] = useState<MeterReaderUser[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedMeterReaderForAssignment, setSelectedMeterReaderForAssignment] = useState<{id: number, name: string} | null>(null)
  const [viewAssignedDialogOpen, setViewAssignedDialogOpen] = useState(false)
  const [selectedMeterReaderForViewing, setSelectedMeterReaderForViewing] = useState<{id: number, name: string} | null>(null)
  const [assignmentCounts, setAssignmentCounts] = useState<Record<number, number>>({})
  const [completedCounts, setCompletedCounts] = useState<Record<number, number>>({})

  // Fetch meter readers from Supabase
  const fetchMeterReaders = async () => {
    try {
      console.log('🚀 Starting to fetch meter readers...')
      setLoading(true)
      setError(null)
      
      const { data, error } = await MeterReaderService.getAllMeterReaders()
      
      console.log('📋 Fetch result:', { data, error })
      
      if (error) {
        console.error('💥 Error in fetchMeterReaders:', error)
        setError(error.message || 'Failed to fetch meter readers')
        return
      }
      
      if (data) {
        console.log('✨ Meter readers fetched:', data)
        setMeterReaders(data)
        setFilteredMeterReaders(data)
        
        // Fetch assignment counts and completed readings counts for each meter reader
        const meterReaderIds = data.map(reader => reader.meter_reader_id).filter(Boolean)
        fetchAssignmentCounts(meterReaderIds)
        fetchCompletedCounts(meterReaderIds)
      } else {
        console.log('📭 No data returned from Supabase')
        setMeterReaders([])
        setFilteredMeterReaders([])
      }
    } catch (err) {
      console.error('💥 Unexpected error in fetchMeterReaders:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch assignment counts for meter readers
  const fetchAssignmentCounts = async (meterReaderIds: (number | null)[]) => {
    try {
      const counts: Record<number, number> = {}
      
      for (const meterReaderId of meterReaderIds) {
        if (!meterReaderId) continue
        
        // Get count from junction table if it exists
        const { count, error } = await supabase
          .from('meter_reader_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('meter_reader_id', meterReaderId)
          .in('status', ['assigned', 'ongoing'])
        
        if (!error) {
          counts[meterReaderId] = count || 0
        } else if (error.code === '42P01') {
          // Table doesn't exist yet, use old field
          counts[meterReaderId] = 0
        }
      }
      
      setAssignmentCounts(counts)
    } catch (err) {
      console.error('Error fetching assignment counts:', err)
    }
  }

  // Fetch completed readings counts for meter readers
  const fetchCompletedCounts = async (meterReaderIds: (number | null)[]) => {
    try {
      const counts: Record<number, number> = {}
      
      for (const meterReaderId of meterReaderIds) {
        if (!meterReaderId) continue
        
        // Get count of completed assignments (which indicates completed readings)
        const { count, error } = await supabase
          .from('meter_reader_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('meter_reader_id', meterReaderId)
          .eq('status', 'completed')
        
        if (!error) {
          counts[meterReaderId] = count || 0
        } else if (error.code === '42P01') {
          // Table doesn't exist yet
          counts[meterReaderId] = 0
        }
      }
      
      setCompletedCounts(counts)
    } catch (err) {
      console.error('Error fetching completed counts:', err)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredMeterReaders(meterReaders)
      return
    }
    
    const filtered = meterReaders.filter(reader => 
      reader.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      reader.email?.toLowerCase().includes(query.toLowerCase()) ||
      reader.mobile_no?.toString().includes(query)
    )
    setFilteredMeterReaders(filtered)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format last login date
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load meter readers on component mount
  useEffect(() => {
    console.log('🎯 Component mounted, starting meter reader fetch...')
    fetchMeterReaders()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meter Readers</h1>
            <p className="text-muted-foreground">
              Manage meter readers and their assigned routes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchMeterReaders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <AddMeterReaderDialog onMeterReaderAdded={fetchMeterReaders} />
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

        {/* Meter Readers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Meter Reader Accounts</CardTitle>
            <CardDescription>
              Manage meter readers and their assigned routes for water meter readings
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search meter readers..." 
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
                <span>Loading meter readers...</span>
              </div>
            ) : filteredMeterReaders.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No meter readers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No meter readers have been registered yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeterReaders.map((reader) => (
                    <TableRow key={reader.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>{reader.full_name || 'No name provided'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{reader.email || 'No email provided'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {reader.mobile_no ? reader.mobile_no.toString() : 'No phone provided'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Users className="h-3 w-3 mr-1" />
                            {assignmentCounts[reader.meter_reader_id] || 0} consumer{assignmentCounts[reader.meter_reader_id] !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {completedCounts[reader.meter_reader_id] || 0} reading{completedCounts[reader.meter_reader_id] !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(reader.created_at)}
                        </div>
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedMeterReaderForViewing({id: reader.id, name: reader.full_name || 'Unknown'})
                              setViewAssignedDialogOpen(true)
                            }}>
                              <Users className="h-4 w-4 mr-2" />
                              View Assigned Consumers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMeterReaderForAssignment({id: reader.id, name: reader.full_name || 'Unknown'})
                              setAssignDialogOpen(true)
                            }}>
                              <Droplets className="h-4 w-4 mr-2" />
                              Assign Consumers
                            </DropdownMenuItem>
                      
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

      {/* Assign Consumers Dialog */}
      {selectedMeterReaderForAssignment && (
        <AssignConsumersDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          meterReaderId={selectedMeterReaderForAssignment.id}
          meterReaderName={selectedMeterReaderForAssignment.name}
        />
      )}

      {/* View Assigned Consumers Dialog */}
      {selectedMeterReaderForViewing && (
        <ViewAssignedConsumersDialog
          open={viewAssignedDialogOpen}
          onOpenChange={setViewAssignedDialogOpen}
          meterReaderId={selectedMeterReaderForViewing.id}
          meterReaderName={selectedMeterReaderForViewing.name}
        />
      )}
    </AdminLayout>
  )
}

