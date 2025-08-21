"use client";

import { usePathname } from "next/navigation";
import { NotificationsBell } from "@/app/components/notifications-bell";

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const pathname = usePathname();

  const getPageInfo = () => {
    switch (pathname) {
      case "/":
        return { title: "Dashboard" };
      case "/timesheets":
        return { title: "Timesheets" };
      case "/projects":
        return { title: "Projects" };
      case "/approvals":
        return { title: "Approvals" };
      case "/clients":
        return { title: "Clients" };
      case "/reports":
        return { title: "Reports" };
      case "/admin":
        return { title: "User Management" };
      case "/client-portal":
        return { title: "Client Portal" };
      default:
        return { title: title || "Phoenix PSA" };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page title */}
        <div>
          <h1 className="text-lg font-semibold">{pageInfo.title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* Right side - Notifications */}
        <div className="flex items-center space-x-4">
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
