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
import { Loader2, AlertCircle, Wrench, Calendar, Download } from "lucide-react"
import { IssueService, IssueReportWithUser } from "@/lib/issue-service"
import { ConsumerWithStatus } from "@/lib/consumer-service"
import { convertToCSV, downloadCSV } from "@/lib/export-utils"

interface ConsumerMaintenanceReportHistoryDialogProps {
  consumer: ConsumerWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConsumerMaintenanceReportHistoryDialog({
  consumer,
  open,
  onOpenChange,
}: ConsumerMaintenanceReportHistoryDialogProps) {
  const [issues, setIssues] = useState<IssueReportWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadIssues = useCallback(async () => {
    if (!consumer?.id) return

    try {
      setLoading(true)
      setError(null)
      const result = await IssueService.getIssuesByConsumerId(consumer.id)
      
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : 'Failed to load maintenance reports')
        return
      }
      
      setIssues(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance reports')
    } finally {
      setLoading(false)
    }
  }, [consumer?.id])

  useEffect(() => {
    if (open && consumer?.id) {
      loadIssues()
    }
  }, [open, consumer?.id, loadIssues])

  const getPriorityBadge = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{priority || 'N/A'}</Badge>
    }
  }

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case "resolved":
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolved</Badge>
      case "assigned":
      case "in_progress":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExport = () => {
    if (issues.length === 0) return

    const consumerName = consumer?.account?.full_name || 'Consumer'
    const waterMeterNo = consumer?.water_meter_no || 'N/A'
    const sanitizedName = consumerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const sanitizedMeterNo = waterMeterNo.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    
    const exportData = issues.map(issue => ({
      'Issue ID': issue.id.toString(),
      'Issue Type': issue.issue_type || 'N/A',
      'Priority': issue.priority || 'N/A',
      'Title': issue.issue_title || 'No title',
      'Description': issue.description || 'No description',
      'Status': issue.status || 'Pending',
      'Created Date': formatDate(issue.created_at),
      'Scheduled Fix Date': formatDate(issue.scheduled_fix_date || null),
      'Assigned Technician': issue.assigned_technician || 'Not assigned'
    }))

    const headers = [
      'Issue ID',
      'Issue Type', 
      'Priority', 
      'Title', 
      'Description', 
      'Status', 
      'Created Date', 
      'Scheduled Fix Date',
      'Assigned Technician'
    ]
    const csvContent = convertToCSV(exportData, headers)
    const filename = `maintenance_report_history_${sanitizedName}_${sanitizedMeterNo}_${new Date().toISOString().split('T')[0]}.csv`
    
    downloadCSV(csvContent, filename)
  }

  if (!consumer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Maintenance Report History</span>
          </DialogTitle>
          <DialogDescription>
            Complete maintenance and issue report history for {consumer.account?.full_name || 'Consumer'} ({consumer.water_meter_no})
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <Button variant="outline" size="sm" onClick={loadIssues} className="ml-auto">
                Retry
              </Button>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading maintenance reports...</span>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No maintenance reports found for this consumer.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Scheduled Fix Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.issue_type || 'N/A'}</TableCell>
                    <TableCell>{getPriorityBadge(issue.priority)}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={issue.issue_title || ''}>
                        {issue.issue_title || 'No title'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="truncate" title={issue.description || ''}>
                        {issue.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>{formatDate(issue.created_at)}</TableCell>
                    <TableCell>{formatDate(issue.scheduled_fix_date || null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total reports: {issues.length} | 
            Pending: {issues.filter(i => !i.status || i.status.toLowerCase() === 'pending').length} | 
            Resolved: {issues.filter(i => i.status?.toLowerCase() === 'resolved' || i.status?.toLowerCase() === 'completed').length}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={issues.length === 0}
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

