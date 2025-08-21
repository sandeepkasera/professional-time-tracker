import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, MoreVertical } from "lucide-react";

export default function Charts() {
  const { user } = useAuth();

  const { data: projectMetrics } = useQuery({
    queryKey: ["/api/analytics/projects"],
    enabled: user?.role === "admin" || user?.role === "project_manager",
  });

  // Prepare project hours data for chart
  const projectHoursData = Array.isArray(projectMetrics) ? projectMetrics.slice(0, 5).map((project: any) => ({
    name: project.projectName?.length > 15 ? 
      project.projectName.substring(0, 15) + '...' : 
      project.projectName || 'Unknown',
    totalHours: parseFloat(project.totalHours || 0),
    billableHours: parseFloat(project.billableHours || 0),
  })) : [];

  // Mock weekly utilization data (in a real app, this would come from an API)
  const weeklyUtilizationData = [
    { week: 'Week 1', hours: 42, target: 40, utilization: 87 },
    { week: 'Week 2', hours: 38, target: 40, utilization: 82 },
    { week: 'Week 3', hours: 45, target: 40, utilization: 91 },
    { week: 'Week 4', hours: 41, target: 40, utilization: 89 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hours by Project Chart */}
      <Card className="chart-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Hours by Project</CardTitle>
            <CardDescription>Time distribution across your projects</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {projectHoursData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="totalHours" 
                  fill="hsl(207, 90%, 54%)" 
                  name="Total Hours"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="billableHours" 
                  fill="hsl(120, 61%, 34%)" 
                  name="Billable Hours"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No project data available</p>
                <p className="text-sm text-gray-400">Start logging hours to see your project breakdown</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Utilization Trend */}
      <Card className="chart-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Weekly Utilization</CardTitle>
            <CardDescription>Hours vs target over time</CardDescription>
          </div>
          <Select defaultValue="last_4_weeks">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_4_weeks">Last 4 weeks</SelectItem>
              <SelectItem value="last_8_weeks">Last 8 weeks</SelectItem>
              <SelectItem value="last_12_weeks">Last 12 weeks</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyUtilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="hsl(207, 90%, 54%)" 
                strokeWidth={3}
                name="Actual Hours"
                dot={{ fill: 'hsl(207, 90%, 54%)', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(36, 100%, 50%)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target Hours"
                dot={{ fill: 'hsl(36, 100%, 50%)', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
