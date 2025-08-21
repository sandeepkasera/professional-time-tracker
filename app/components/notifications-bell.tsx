import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Badge } from "@/app/components/ui/badge";
import { apiRequest, queryClient } from "@/app/lib/queryClient";
import { useAuth } from "@/app/hooks/useAuth";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  timesheetId?: number;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest("PATCH", `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest("DELETE", `/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setOpen(false);
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  if (!user) return null;

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const hasUnread = unreadCount.count > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount.count > 9 ? "9+" : unreadCount.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer p-3 ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-sm">{notification.title}</div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {notification.message}
                  </div>
                  {notification.actionRequired && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      {notification.actionText || "Action Required"}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}