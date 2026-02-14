"use client";

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  BarChart3,
} from "lucide-react"

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tactical Board", href: "/dashboard/tactics", icon: ClipboardList },
  { name: "Players", href: "/dashboard/players", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex h-full w-64 flex-col bg-slate-800 border-r border-slate-700", className)}>
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <h1 className="text-xl font-bold text-white">SMFC Manager</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
