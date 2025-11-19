"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Loader2, Home, RefreshCw, Eye, EyeOff, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface AddConsumerDialogProps {
  onConsumerAdded?: () => void
}

interface ConsumerFormData {
  // Personal Information
  email: string
  password: string
  full_name: string
  phone: string
  address: string
  registered_voter: string
  created_at: string
}

export function AddConsumerDialog({ onConsumerAdded }: AddConsumerDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ConsumerFormData>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: "",
    registered_voter: "no",
    created_at: ""
  })

  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (field: keyof ConsumerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
    if (passwordValidationError) setPasswordValidationError(null)
  }

  // Check if password already exists
  const checkPassword = async (password: string) => {
    if (!password.trim()) {
      setPasswordValidationError(null)
      return
    }

    try {
      const response = await fetch('/api/consumers/check-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: password,
          email: formData.email // Include email for better validation
        }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.exists) {
          setPasswordValidationError(result.message || `Password already exists. Please choose a different password.`)
        } else {
          setPasswordValidationError(null)
        }
      } else {
        console.error('Error checking password:', result.error)
      }
    } catch (err) {
      console.error('Error checking password:', err)
    }
  }

  // Generate a secure password
  const generatePassword = async () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const allChars = lowercase + uppercase + numbers + symbols
    
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      // Generate a password with at least 8 characters
      let password = ''
      
      // Ensure at least one character from each category
      password += lowercase[Math.floor(Math.random() * lowercase.length)]
      password += uppercase[Math.floor(Math.random() * uppercase.length)]
      password += numbers[Math.floor(Math.random() * numbers.length)]
      password += symbols[Math.floor(Math.random() * symbols.length)]
      
      // Fill the rest randomly
      for (let i = 4; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
      }
      
      // Shuffle the password
      password = password.split('').sort(() => Math.random() - 0.5).join('')
      
      // Check if this password already exists
      try {
        const response = await fetch('/api/consumers/check-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            password: password,
            email: formData.email
          }),
        })

        const result = await response.json()

        if (response.ok && !result.exists) {
          // Password is unique, use it
          handleInputChange("password", password)
          setPasswordValidationError(null)
          return
        }
      } catch (err) {
        console.error('Error checking generated password:', err)
      }
      
      attempts++
    }
    
    // If we couldn't generate a unique password after max attempts
    setPasswordValidationError('Unable to generate a unique password. Please try again.')
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.email || !formData.password || !formData.full_name || !formData.created_at) {
      setError("Please fill in all required fields")
      return
    }

    if (passwordValidationError) {
      setError("Please fix the password error before submitting")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/consumers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create consumer')
      }

      console.log('✅ Consumer created successfully:', result)
      
      // Show success message
      toast.success("Consumer created successfully!", {
        description: `Consumer account has been created for ${formData.full_name}.`,
        duration: 5000,
      })
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: "",
        registered_voter: "no",
        created_at: ""
      })
      
      setOpen(false)
      onConsumerAdded?.()
      
    } catch (err) {
      console.error('❌ Error creating consumer:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Consumer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Consumer</DialogTitle>
          <DialogDescription>
            Create a new consumer account with personal information.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Basic consumer account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter secure password"
                        value={formData.password}
                        onChange={(e) => {
                          handleInputChange("password", e.target.value)
                          // Check password uniqueness when user types
                          if (e.target.value.length >= 8) {
                            checkPassword(e.target.value)
                          }
                        }}
                        required
                        className={`pr-10 ${passwordValidationError ? "border-red-500" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                      className="whitespace-nowrap"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                  {passwordValidationError && (
                    <p className="text-sm text-red-600">{passwordValidationError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+63 912 345 6789"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Select
                  value={formData.address}
                  onValueChange={(value) => handleInputChange("address", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service address" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P-1, Brgy. 6 Bañadero, Legazpi City">
                      P-1, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                    <SelectItem value="P-2, Brgy. 6 Bañadero, Legazpi City">
                      P-2, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                    <SelectItem value="P-3, Brgy. 6 Bañadero, Legazpi City">
                      P-3, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                    <SelectItem value="P-4, Brgy. 6 Bañadero, Legazpi City">
                      P-4, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                    <SelectItem value="P-5, Brgy. 6 Bañadero, Legazpi City">
                      P-5, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                    <SelectItem value="P-6, Brgy. 6 Bañadero, Legazpi City">
                      P-6, Brgy. 6 Bañadero, Legazpi City
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registered_voter">Registered Voter in Banadero</Label>
                <Select
                  value={formData.registered_voter}
                  onValueChange={(value) => handleInputChange("registered_voter", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="created_at" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Account Created Date *</span>
                </Label>
                <Input
                  id="created_at"
                  type="date"
                  value={formData.created_at}
                  onChange={(e) => handleInputChange("created_at", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Consumer Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
