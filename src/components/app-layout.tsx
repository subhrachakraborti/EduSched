
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DatabaseZap, GraduationCap, LayoutGrid, QrCode, LogOut, Library } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar"
import { useSchedule } from "@/context/schedule-context"
import { Button } from "./ui/button"

function BottomNavBar() {
  const pathname = usePathname()
  const { user } = useSchedule()
  
  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutGrid },
    ...(user?.type === 'admin' ? [{ href: "/data", label: "Data", icon: DatabaseZap }] : []),
    { href: "/qr", label: "QR Tools", icon: QrCode },
    { href: "/library", label: "Library", icon: Library },
  ]

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md p-2 text-xs font-medium transition-colors",
              isActive(href)
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()
  const { user, logout } = useSchedule()
  const router = useRouter()
  const { setOpenMobile } = useSidebar()

  const handleLogout = () => {
    logout()
    router.push('/login')
    setOpenMobile(false)
  }

  const handleLinkClick = () => {
    setOpenMobile(false)
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-primary">EduSched</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/")}
              tooltip={{ children: "Dashboard" }}
              onClick={handleLinkClick}
            >
              <Link href="/">
                <LayoutGrid />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {user?.type === 'admin' && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/data")}
                tooltip={{ children: "Data Management" }}
                onClick={handleLinkClick}
              >
                <Link href="/data">
                  <DatabaseZap />
                  <span>Data Management</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/qr")}
              tooltip={{ children: "QR Tools" }}
              onClick={handleLinkClick}
            >
              <Link href="/qr">
                <QrCode />
                <span>QR Tools</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/library")}
              tooltip={{ children: "Library" }}
              onClick={handleLinkClick}
            >
              <Link href="/library">
                <Library />
                <span>Library</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
          <div className="flex flex-col p-2">
              <Button variant="ghost" onClick={handleLogout} className="justify-start gap-2">
                  <LogOut />
                  <span>Logout</span>
              </Button>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                <p className="font-semibold">{user?.name}</p>
                <p className="truncate">{user?.id}</p>
              </div>
          </div>
      </SidebarFooter>
    </Sidebar>
  )
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DesktopSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:hidden">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">EduSched</h1>
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
      </SidebarInset>
      <BottomNavBar />
    </SidebarProvider>
  )
}
