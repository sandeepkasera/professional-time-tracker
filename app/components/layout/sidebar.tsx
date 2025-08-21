"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  LayoutDashboard,
  Clock,
  FolderOpen,
  CheckCircle,
  Users,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  BriefcaseBusiness,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";

type UserRole = "admin" | "project_manager" | "standard_user" | "director" | string;

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: UserRole;
  profileImageUrl?: string;
}

interface ManagerMetrics {
  pendingApprovals: number;
  totalProjects: number;
  totalTeamHours: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean;
  badge?: number;
  showBadge?: boolean;
  roleRestricted?: boolean;
  allowedRoles?: UserRole[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth() as { user: User | null };

  const { data: managerMetrics } = useQuery<ManagerMetrics>({
    queryKey: ["/api/analytics/manager"],
    enabled: user?.role === "project_manager" || user?.role === "admin",
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const navigation: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "Timesheets",
      href: "/timesheets",
      icon: Clock,
      current: pathname?.startsWith("/timesheets") ?? false,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      current: pathname?.startsWith("/projects") ?? false,
    },
    {
      name: "Approvals",
      href: "/approvals",
      icon: CheckCircle,
      current: pathname?.startsWith("/approvals") ?? false,
      badge: managerMetrics?.pendingApprovals ?? 0,
      showBadge:
        (user?.role === "project_manager" || user?.role === "admin") &&
        (managerMetrics?.pendingApprovals ?? 0) > 0,
    },
    {
      name: "Resource Forecast",
      href: "/resource-forecast",
      icon: Calendar,
      current: pathname?.startsWith("/resource-forecast") ?? false,
      roleRestricted: true,
      allowedRoles: ["project_manager", "director", "admin"],
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
      current: pathname?.startsWith("/clients") ?? false,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
      current: pathname?.startsWith("/reports") ?? false,
    },
    {
      name: "Financial Dashboard",
      href: "/financial-dashboard",
      icon: DollarSign,
      current: pathname?.startsWith("/financial-dashboard") ?? false,
      roleRestricted: true,
      allowedRoles: ["admin"],
    },
  ];

  const adminNavigation: NavItem[] = [
    {
      name: "User Management",
      href: "/user-management",
      icon: UserCog,
      current: pathname?.startsWith("/user-management") ?? false,
    },
    {
      name: "Admin Tools",
      href: "/admin",
      icon: Settings,
      current: pathname?.startsWith("/admin") ?? false,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: pathname?.startsWith("/settings") ?? false,
    },
  ];

  const getUserInitials = (u: User | null) => {
    if (u?.firstName && u?.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    if (u?.email) {
      return u.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (u: User | null) => {
    if (u?.firstName && u?.lastName) {
      return `${u.firstName} ${u.lastName}`;
    }
    return u?.email ?? "User";
  };

  const getUserRole = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "project_manager":
        return "Project Manager";
      case "standard_user":
        return "Consultant";
      case "director":
        return "Director";
      default:
        return "User";
    }
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo & Branding */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BriefcaseBusiness className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Phoenix PSA</h1>
            <p className="text-sm text-gray-500">Professional Services</p>
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl} alt={getUserDisplayName(user)} />
            <AvatarFallback className="bg-primary-100 text-primary-700">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{getUserDisplayName(user)}</p>
            <p className="text-xs text-gray-500 truncate">{getUserRole(user?.role ?? "standard_user")}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="space-y-1 px-3">
          {navigation
            .filter((item) => {
              if (item.roleRestricted && item.allowedRoles) {
                return item.allowedRoles.includes(user?.role ?? "");
              }
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-item flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    item.current ? "active" : ""
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.showBadge && (
                    <Badge className="ml-auto bg-warning-500 text-white text-xs px-2 py-1">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
        </div>

        {/* Admin Section */}
        {user?.role === "admin" && (
          <div className="mt-8 px-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Administration</p>
            <div className="space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                      item.current ? "active" : ""
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
