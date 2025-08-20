"use client";
import { Button } from "@/app/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/ui/card";
import { Briefcase, Clock, BarChart3, CheckCircle } from "lucide-react";

const handleLogin = () => {
  // window.location.href = "/api/login";
  console.log("Login button clicked");
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
              <Briefcase className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">PSA Pro</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional Services Automation platform designed for consulting organizations. 
            Streamline timesheet management, project tracking, and team collaboration.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-3">
            Sign In to Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Clock className="text-blue-500 w-10 h-10 mb-4" />
              <CardTitle>Timesheet Management</CardTitle>
              <CardDescription>
                Easy-to-use timesheet entry with project tracking and approval workflows
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="text-green-500 w-10 h-10 mb-4" />
              <CardTitle>Approval Workflows</CardTitle>
              <CardDescription>
                Streamlined approval process for project managers with real-time notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="text-orange-500 w-10 h-10 mb-4" />
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive dashboards and reports for utilization tracking and insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Why Choose PSA Pro?</CardTitle>
            <CardDescription>
              Built specifically for consulting teams who need powerful project and time management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Multi-role Access</h4>
                    <p className="text-sm text-gray-600">Role-based permissions for consultants, project managers, and administrators</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Real-time Tracking</h4>
                    <p className="text-sm text-gray-600">Live updates on project progress and team utilization rates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Flexible Reporting</h4>
                    <p className="text-sm text-gray-600">Customizable reports and data export capabilities</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Project Management</h4>
                    <p className="text-sm text-gray-600">Complete project lifecycle management with client integration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Mobile Responsive</h4>
                    <p className="text-sm text-gray-600">Access your timesheets and projects from any device</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Secure & Reliable</h4>
                    <p className="text-sm text-gray-600">Enterprise-grade security with automatic backups</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
