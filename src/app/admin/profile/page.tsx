"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
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
  Shield, 
  Edit2,
  Save,
  X,
  Loader2,
  AlertCircle
} from "lucide-react"
import { auth } from "@/lib/supabase"
import { UserService, User as UserType } from "@/lib/user-service"
import { supabase } from "@/lib/supabase"

interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    avatar_url?: string
  }
}

export default function AdminProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get authenticated user
        const { data: { user: authUser } } = await auth.getCurrentUser()
        if (!authUser) {
          setError("Not authenticated")
          return
        }

        setUser(authUser)

        // Get user profile from users table
        const { data: profile, error: profileError } = await UserService.getUserByAuthUserId(authUser.id)
        
        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setError("Failed to load profile")
          return
        }

        if (profile) {
          setUserProfile(profile)
          setFormData({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            email: profile.email || "",
          })
        }
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
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || "",
        phone: userProfile.phone || "",
        email: userProfile.email || "",
      })
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (data) {
        setUserProfile(data)
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const getUserInitials = (email: string, fullName?: string | null) => {
    if (fullName) {
      const names = fullName.split(" ")
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
      }
      return fullName.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
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
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your admin account information
          </p>
        </div>

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
                <Button variant="outline" onClick={handleEdit}>
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
                  src={userProfile?.avatar_url || user?.user_metadata?.avatar_url || ""} 
                  alt={userProfile?.full_name || "Admin"} 
                />
                <AvatarFallback className="text-2xl">
                  {getUserInitials(user?.email || "", userProfile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {userProfile?.full_name || "Admin User"}
                </h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <Badge variant="default" className="mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Administrator
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
                    {userProfile?.full_name || "Not set"}
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
                  {user?.email || "Not available"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    type="tel"
                  />
                ) : (
                  <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                    {userProfile?.phone || "Not set"}
                  </p>
                )}
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Account Type
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50 capitalize">
                  {userProfile?.account_type || "admin"}
                </p>
              </div>

              {/* Last Login */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last Login
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {formatDate(userProfile?.last_login_at)}
                </p>
              </div>

              {/* Account Created */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Created
                </Label>
                <p className="text-sm py-2 px-3 border rounded-md bg-muted/50">
                  {formatDate(userProfile?.created_at)}
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
              Your account status and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${userProfile?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium">
                    {userProfile?.is_active ? "Active" : "Inactive"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your account is {userProfile?.is_active ? "active and operational" : "currently inactive"}
                  </p>
                </div>
              </div>
              <Badge variant={userProfile?.is_active ? "default" : "secondary"}>
                {userProfile?.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

