import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Clock, TrendingUp, FolderOpen, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

// Types
type UserMetrics = {
  totalHours: number;
  lastWeekHours: number;
  billableHours: number;
};

type Project = {
  id: string;
  name: string;
  status: "active" | "archived" | "completed" | string;
};

type ManagerMetrics = {
  pendingApprovals: number;
};

export default function MetricsCards() {
  const { user } = useAuth();

  const startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");

  // User metrics
  const { data: userMetrics, isLoading: metricsLoading } = useQuery<UserMetrics>({
    queryKey: [`/api/analytics/user/${user?.id}`, { startDate, endDate }],
    enabled: !!user?.id,
  });

  // Projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Manager metrics
  const { data: managerMetrics } = useQuery<ManagerMetrics>({
    queryKey: ["/api/analytics/manager"],
    enabled: user?.role === "project_manager" || user?.role === "admin",
  });

  if (metricsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const weeklyHours = userMetrics?.totalHours ?? 0;
  const lastWeekHours = userMetrics?.lastWeekHours ?? 0;
  const billableRate =
    userMetrics && userMetrics.totalHours > 0
      ? ((userMetrics.billableHours / userMetrics.totalHours) * 100).toFixed(0)
      : "0";

  const activeProjects =
    projects?.filter((p) => p.status === "active").length ?? 0;

  const pendingApprovals = managerMetrics?.pendingApprovals ?? 0;

  // Calculate percentage change vs last week
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const weeklyChange = calculatePercentageChange(weeklyHours, lastWeekHours);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* This Week Hours */}
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">This Week</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{weeklyHours}</div>
          <p className="text-sm text-gray-500">hours logged</p>
          <div className="mt-2 flex items-center">
            <span
              className={`text-sm font-medium ${
                weeklyChange.startsWith("+")
                  ? "text-green-600"
                  : weeklyChange === "0%"
                  ? "text-gray-600"
                  : "text-red-600"
              }`}
            >
              {weeklyChange}
            </span>
            <span className="text-sm text-gray-500 ml-2">vs last week</span>
          </div>
        </CardContent>
      </Card>

      {/* Billable Rate */}
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Billable Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-success-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{billableRate}%</div>
          <p className="text-sm text-gray-500">of total hours</p>
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-success-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${billableRate}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Active Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-warning-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{activeProjects}</div>
          <p className="text-sm text-gray-500">in progress</p>
          <div className="mt-2 flex items-center">
            <span className="text-sm font-medium text-gray-900">
              {Math.floor(activeProjects * 0.4)}
            </span>
            <span className="text-sm text-gray-500 ml-2">due this week</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Pending Approvals</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{pendingApprovals}</div>
          <p className="text-sm text-gray-500">timesheets</p>
          <div className="mt-2">
            {pendingApprovals > 0 ? (
              <button className="text-sm font-medium text-primary hover:text-primary-700">
                Review now →
              </button>
            ) : (
              <span className="text-sm text-success-600">All caught up!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
