"use client"

import { useEffect, useState } from "react"
import { CashierLayout } from "@/components/cashier-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase,
  Edit2,
  Save,
  X,
  Loader2,
  AlertCircle,
  MapPin
} from "lucide-react"
import { CashierAuthService } from "@/lib/cashier-auth-service"
import { CashierService, CashierWithStatus } from "@/lib/cashier-service"
import { supabase } from "@/lib/supabase"

export default function CashierProfilePage() {
  const [cashier, setCashier] = useState<CashierWithStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    mobile_no: "",
    full_address: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current cashier
        const response = await CashierAuthService.getCurrentCashier()
        
        if (!response.success || !response.cashier) {
          setError("Not authenticated")
          return
        }

        const cashierData = response.cashier
        setCashier(cashierData)

        // Set form data
        setFormData({
          full_name: cashierData.full_name || "",
          mobile_no: cashierData.mobile_no?.toString() || "",
          full_address: cashierData.full_address || "",
        })
      } catch (err) {
        console.error('Error loading profile:', err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleEdit = () => {
    // Check if cashier is suspended
    if (cashier?.status === 'suspended') {
      setError('Your account has been suspended. You cannot edit your profile. Please contact the administrator.')
      return
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (cashier) {
      setFormData({
        full_name: cashier.full_name || "",
        mobile_no: cashier.mobile_no?.toString() || "",
        full_address: cashier.full_address || "",
      })
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!cashier) return

    // Check if cashier is suspended
    if (cashier.status === 'suspended') {
      setError('Your account has been suspended. You cannot edit your profile. Please contact the administrator.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Update account information
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .update({
          full_name: formData.full_name || null,
          mobile_no: formData.mobile_no ? parseInt(formData.mobile_no) : null,
          full_address: formData.full_address || null,
        })
        .eq('id', cashier.account_id)
        .select()
        .single()

      if (accountError) {
        throw new Error(accountError.message)
      }

      // Refresh cashier data
      const response = await CashierAuthService.getCurrentCashier()
      if (response.success && response.cashier) {
        setCashier(response.cashier)
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const getUserInitials = (fullName?: string | null) => {
    if (fullName) {
      const names = fullName.split(" ")
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
      }
      return fullName.substring(0, 2).toUpperCase()
    }
    return "C"
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <CashierLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </CashierLayout>
    )
  }

  return (
    <CashierLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your cashier account information
          </p>
        </div>

        {/* Suspended Status Banner */}
        {cashier?.status === 'suspended' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">
                  Your account has been suspended. You cannot edit your profile. Please contact the administrator.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your account details and preferences
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  disabled={cashier?.status === 'suspended'}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src="" 
                  alt={cashier?.full_name || "Cashier"} 
                />
                <AvatarFallback className="text-2xl">
                  {getUserInitials(cashier?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {cashier?.full_name || "Cashier"}
                </h3>
                <p className="text-muted-foreground">{cashier?.email}</p>
                <Badge variant="default" className="mt-2">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Cashier
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                    {cashier?.full_name || "Not set"}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {cashier?.email || "Not available"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Employee ID */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employee ID
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {cashier?.employee_id || "Not available"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Employee ID cannot be changed
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="mobile_no" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="mobile_no"
                    value={formData.mobile_no}
                    onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                    placeholder="Enter your phone number"
                    type="tel"
                  />
                ) : (
                  <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                    {cashier?.mobile_no || "Not set"}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                {isEditing ? (
                  <Input
                    id="full_address"
                    value={formData.full_address}
                    onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                    placeholder="Enter your full address"
                  />
                ) : (
                  <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                    {cashier?.full_address || "Not set"}
                  </p>
                )}
              </div>

              {/* Hire Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hire Date
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {formatDate(cashier?.hire_date)}
                </p>
              </div>

              {/* Last Login */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last Login
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {formatDate(cashier?.last_login_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Your account status and employment information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${cashier?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium">
                    {cashier?.is_active ? "Active" : "Inactive"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your account is {cashier?.is_active ? "active and operational" : "currently inactive"}
                  </p>
                </div>
              </div>
              <Badge variant={cashier?.is_active ? "default" : "secondary"}>
                {cashier?.status || "Unknown"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </CashierLayout>
  )
}

