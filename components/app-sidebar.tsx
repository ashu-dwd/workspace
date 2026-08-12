"use client";

import React from "react";
import {
  Activity,
  BookMarked,
  Calendar,
  CheckSquare,
  Home,
  Inbox,
  Notebook,
  Search,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useAppSelector } from "@/app/redux-toolkit/hooks";

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
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const data = useAppSelector((state) => state.notebook);
  console.log("notebook data in sidebar:", data);
  //means
  return (
    <Sidebar>
      <SidebarContent>
        {/* Logo + branding */}
        <div className="flex items-center gap-2 px-4 py-3 border-b mb-2">
          <img src="/grid.png" alt="Workspace" className="size-7" />
          <span className="font-semibold text-base">Workspace</span>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem
                  className="py-1 mt-3 text-3xl"
                  key={item.title}
                >
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
