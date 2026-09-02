"use client";

import React from "react";
import {
  Activity,
  CheckSquare,
  Home,
  Inbox,
  Notebook,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Notebooks",
    url: "/dashboard/your-notebooks",
    icon: Notebook,
  },
  {
    title: "Tasks",
    url: "/dashboard/todos",
    icon: CheckSquare,
  },
  {
    title: "Your Activity",
    url: "/dashboard/your-activity",
    icon: Activity,
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Inbox,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { data: notificationsData } = useQuery<{ unreadCount?: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount ?? 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-between flex-row p-3 border-b">
        <div className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:hidden">
          <img src="/grid.png" alt="Workspace" className="size-6 flex-shrink-0" />
          <span className="font-semibold text-base truncate">Workspace</span>
        </div>
        <SidebarTrigger className="hover:bg-muted transition-colors cursor-pointer group-data-[collapsible=icon]:mx-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.title === "Notifications" && unreadCount > 0 && (
                    <SidebarMenuBadge className="bg-primary text-primary-foreground font-semibold rounded-full px-2">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
