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
  CreditCard,
  DollarSign,
  Receipt,
  TrendingUp
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserService, UserWithStatus } from "@/lib/user-service"
import { CashierService, CashierWithStatus } from "@/lib/cashier-service"
import { AddCashierDialog } from "@/components/add-cashier-dialog"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"

export default function CashierManagementPage() {
  const [cashiers, setCashiers] = useState<CashierWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredCashiers, setFilteredCashiers] = useState<CashierWithStatus[]>([])

  // Fetch cashiers from Supabase
  const fetchCashiers = async () => {
    try {
      console.log('🚀 Starting to fetch cashiers...')
      setLoading(true)
      setError(null)
      
      const { data, error } = await CashierService.getAllCashiers()
      
      console.log('📋 Fetch result:', { data, error })
      
      if (error) {
        console.error('💥 Error in fetchCashiers:', error)
        setError(error.message || 'Failed to fetch cashiers')
        return
      }
      
      if (data) {
        console.log('✨ Formatted cashiers:', data)
        setCashiers(data)
        setFilteredCashiers(data)
      } else {
        console.log('📭 No data returned from Supabase')
        setCashiers([])
        setFilteredCashiers([])
      }
    } catch (err) {
      console.error('💥 Unexpected error in fetchCashiers:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle cashier status update
  const handleStatusUpdate = async (cashierId: string, isActive: boolean) => {
    try {
      const { error } = await CashierService.updateCashierStatus(cashierId, isActive)
      if (error) {
        setError(error.message || 'Failed to update cashier status')
        return
      }
      // Refresh the cashiers list
      await fetchCashiers()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error updating cashier status:', err)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredCashiers(cashiers)
      return
    }
    
    const filtered = cashiers.filter(cashier => 
      cashier.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      cashier.email?.toLowerCase().includes(query.toLowerCase()) ||
      cashier.phone?.toLowerCase().includes(query.toLowerCase()) ||
      cashier.employee_id?.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredCashiers(filtered)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "suspended":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Load cashiers on component mount
  useEffect(() => {
    console.log('🎯 Component mounted, starting cashier fetch...')
    fetchCashiers()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cashiers</h1>
            <p className="text-muted-foreground">
              Manage cashiers and billing operations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchCashiers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <AddCashierDialog onCashierAdded={fetchCashiers} />
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

        {/* Cashiers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cashier Accounts</CardTitle>
            <CardDescription>
              Manage cashiers and their billing operations for water service payments
            </CardDescription>
            <div className="flex items-center space-x-2 pt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search cashiers..." 
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
                <span>Loading cashiers...</span>
              </div>
            ) : filteredCashiers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No cashiers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No cashiers have been registered yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCashiers.map((cashier) => (
                    <TableRow key={cashier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-green-600" />
                          <span>{cashier.full_name || 'No name provided'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {cashier.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{cashier.email || 'No email provided'}</div>
                          <div className="text-sm text-muted-foreground">
                            {cashier.phone || 'No phone provided'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(cashier.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(cashier.hire_date)}
                        </div>
                      </TableCell>
                      <TableCell>{formatLastLogin(cashier.last_login_at)}</TableCell>
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
                            
                            
                         
                            {cashier.is_active ? (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(cashier.id, false)}
                                className="text-orange-600"
                              >
                                Suspend Access
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(cashier.id, true)}
                                className="text-green-600"
                              >
                                Activate Access
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
    </AdminLayout>
  )
}
