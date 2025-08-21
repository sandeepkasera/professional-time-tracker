import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/app/lib/queryClient';

export function useRouteRefresh() {
  const [location] = useLocation();

  useEffect(() => {
    // Invalidate specific queries based on the route to ensure fresh data
    if (location === '/approvals') {
      // Fresh data for approvals page
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/manager'] });
    } else if (location === '/timesheets') {
      // Fresh data for timesheets page
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets/submitted'] });
    } else if (location === '/user-management') {
      // Fresh data for user management
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    } else if (location === '/financial-dashboard') {
      // Fresh data for financial dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/financial/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/projects'] });
    }
    
    // Always refresh notifications and user data
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
  }, [location]);
}