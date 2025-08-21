"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/hooks/useAuth";
import MetricsCards from "@/app/components/dashboard/metrics-cards";
import Charts from "@/app/components/dashboard/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Download } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: timesheets, isLoading: timesheetsLoading } = useQuery({
    queryKey: ["/api/timesheets"],
  });

  const { data: submittedTimesheets, isLoading: submittedTimesheetsLoading } = useQuery({
    queryKey: ["/api/timesheets/submitted"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  type ManagerMetrics = {
    pendingApprovals: number;
    totalProjects: number;
    totalTeamHours: number;
  };

  const { data: managerMetrics } = useQuery<ManagerMetrics>({
    queryKey: ["/api/analytics/manager"],
    enabled: user?.role === "project_manager" || user?.role === "admin",
  });

  const recentTimesheets = (Array.isArray(submittedTimesheets) ? submittedTimesheets : []).slice(0, 3);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      submitted: "outline",
      approved: "default",
      rejected: "destructive",
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-warning-100 text-warning-800",
      approved: "bg-success-100 text-success-800",
      rejected: "bg-red-100 text-red-800",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your consulting activities</p>
        </div>
        <Button onClick={() => router.push("/timesheets")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Timesheet
        </Button>
      </div>

      {/* Metrics Cards */}
      <MetricsCards />

      {/* Charts and Analytics */}
      <Charts />

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Timesheets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Timesheets</CardTitle>
                <CardDescription>Your latest timesheet entries</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => router.push("/timesheets")}>
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {submittedTimesheetsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentTimesheets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No submitted timesheets found</p>
                  <p className="text-sm text-gray-400 mt-2">Submit your timesheets to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTimesheets.map((timesheet: any) => (
                    <div key={timesheet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">
                            {timesheet.project?.name || "Unknown Project"}
                          </h4>
                          {getStatusBadge(timesheet.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {timesheet.weekCommencing ? (
                            <>Week of {format(new Date(timesheet.weekCommencing), "MMM d, yyyy")} • {timesheet.totalHours || 0} hours total</>
                          ) : (
                            <>Timesheet • {timesheet.totalHours || 0} hours total</>
                          )}
                        </p>
                        {timesheet.workDescription && (
                          <p className="text-sm text-gray-600 mt-1 truncate">{timesheet.workDescription}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/timesheets/edit/${timesheet.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/timesheets/view/${timesheet.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4 bg-primary-50 border-primary-200 hover:bg-primary-100"
              onClick={() => router.push("/timesheets")}
            >
              <Plus className="h-5 w-5 mr-3 text-primary-600" />
              <div className="text-left">
                <p className="font-medium text-primary-700">New Timesheet</p>
                <p className="text-xs text-primary-600">Log your hours</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push("/projects")}
            >
              <Eye className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Browse Projects</p>
                <p className="text-xs text-gray-600">View active work</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push("/reports")}
            >
              <Download className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Export Data</p>
                <p className="text-xs text-gray-600">Download reports</p>
              </div>
            </Button>

            {/* Manager-specific quick actions */}
            {(user?.role === "project_manager" || user?.role === "admin") && managerMetrics && (
              <>
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Management</h4>
                  
                  {managerMetrics.pendingApprovals > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-auto p-4 bg-warning-50 border-warning-200"
                      onClick={() => router.push("/approvals")}
                    >
                      <div className="text-left">
                        <p className="font-medium text-warning-700">
                          {managerMetrics.pendingApprovals} Pending Approvals
                        </p>
                        <p className="text-xs text-warning-600">Review timesheets</p>
                      </div>
                    </Button>
                  )}

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Projects</span>
                      <span className="font-medium">{managerMetrics.totalProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Hours (Total)</span>
                      <span className="font-medium">{managerMetrics.totalTeamHours}h</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
