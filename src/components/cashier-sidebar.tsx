"use client"

import React, { useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Receipt, 
  History, 
  User, 
  LogOut
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CashierWithStatus } from "@/lib/cashier-service"
import { CashierAuthService } from "@/lib/cashier-auth-service"

interface CashierSidebarProps {
  cashier: CashierWithStatus
  onLogout: () => void
}

const navigationItems = [
  {
    title: "Dashboard",
    url: "/cashier/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Billing",
    url: "/cashier/billing",
    icon: Receipt,
  },
  {
    title: "Transactions",
    url: "/cashier/transactions",
    icon: History,
  },
]

export function CashierSidebar({ cashier, onLogout }: CashierSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleNavigation = (url: string) => {
    router.push(url)
  }

  const handleLogout = async () => {
    await CashierAuthService.logout()
    // Navigate to unified sign-in page
    router.push('/')
    onLogout()
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">B</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">BAWASA</span>
            <span className="text-xs text-muted-foreground">Cashier Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.url)}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={cashier.full_name || "Cashier"} />
                    <AvatarFallback>
                      {cashier.full_name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">
                      {cashier.full_name || "Cashier"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {cashier.employee_id}
                    </span>
                  </div>
                </div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/cashier/profile")}
                  isActive={pathname === "/cashier/profile"}
                  tooltip="Profile"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}

interface CashierLayoutProps {
  children: React.ReactNode
}

export function CashierLayout({ children }: CashierLayoutProps) {
  const router = useRouter()
  const [cashier, setCashier] = useState<CashierWithStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      const response = await CashierAuthService.getCurrentCashier()
      
      if (response.success && response.cashier) {
        // Check if cashier is suspended
        if (response.cashier.status === 'suspended') {
          // Still allow access but show warning - don't redirect
          console.warn('Cashier account is suspended')
        }
        setCashier(response.cashier)
        // Update last login
        await CashierAuthService.updateLastLogin(response.cashier.id)
      } else {
        // Redirect to unified sign-in page if not authenticated
        router.push('/')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    setCashier(null)
    router.push('/')
  }

  React.useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!cashier) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <CashierSidebar cashier={cashier} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col">
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Cashier Portal</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {cashier.full_name}
              </p>
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
