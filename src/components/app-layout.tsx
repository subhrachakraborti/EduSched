
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DatabaseZap, GraduationCap, LayoutGrid, QrCode, LogOut } from "lucide-react"

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
} from "@/components/ui/sidebar"
import { useSchedule } from "@/context/schedule-context"
import { Button } from "./ui/button"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useSchedule()
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <SidebarProvider>
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
              >
                <Link href="/qr">
                  <QrCode />
                  <span>QR Tools</span>
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
                  <p>{user?.id}</p>
                </div>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:hidden">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">EduSched</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
