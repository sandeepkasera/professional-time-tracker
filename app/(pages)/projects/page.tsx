"use client";
import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@/db/schema";
import { Plus, Folder, Calendar, DollarSign, User, Trash2, Calculator, Building2, Edit, Users, X, TrendingUp, Lock } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import { useToast } from "@/app/hooks/use-toast";
import { apiRequest } from "@/app/lib/queryClient";
import { useAuth } from "@/app/hooks/useAuth";
import { z } from "zod";

// Extended schema to include roleCards with user assignments
const projectFormSchema = insertProjectSchema.extend({
  roleCards: z.array(z.object({
    roleId: z.string(),
    roleName: z.string(),
    hourlyRate: z.number(),
    currency: z.enum(['USD', 'GBP']),
    totalHours: z.number(),
    totalCost: z.number(),
    assignedUserId: z.string().optional().nullable(),
    assignedUserName: z.string().optional(),
  })).optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface RoleCard {
  roleId: string;
  roleName: string;
  hourlyRate: number;
  currency: 'USD' | 'GBP';
  totalHours: number;
  totalCost: number;
  assignedUserId?: string | null;
  assignedUserName?: string;
}

// Predefined roles that admins can customize
const defaultRoles = [
  { id: 'project_manager', name: 'Project Manager', defaultRate: 150, currency: 'USD' as const },
  { id: 'solution_architect', name: 'Solution Architect', defaultRate: 180, currency: 'USD' as const },
  { id: 'senior_consultant', name: 'Senior Consultant', defaultRate: 120, currency: 'USD' as const },
  { id: 'consultant', name: 'Consultant', defaultRate: 100, currency: 'USD' as const },
  { id: 'junior_consultant', name: 'Junior Consultant', defaultRate: 75, currency: 'USD' as const },
  { id: 'business_analyst', name: 'Business Analyst', defaultRate: 95, currency: 'USD' as const },
  { id: 'technical_lead', name: 'Technical Lead', defaultRate: 140, currency: 'USD' as const },
];

export default function Projects() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectRoles, setProjectRoles] = useState<RoleCard[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isForecastDialogOpen, setIsForecastDialogOpen] = useState(false);
  const [forecastProject, setForecastProject] = useState<any>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [editingProject, setEditingProject] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects").then(res => res.json()),
  });

  type ProjectRole = any;


  interface Client {
  id: number;
  name: string;
  email: string;
  }

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      return res.json();
    },
  });

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

const { data: users = [] } = useQuery<User[]>({
  queryKey: ["/api/admin/users"],
  queryFn: async () => {
    const res = await fetch("/api/admin/users");
    return res.json();
  },
});

  interface Forecast {
  weekStarting: string;
  forecastHours: string;
}

interface ProjectForecast {
  project: { id: number; name: string };
  forecasts: Forecast[];
}

interface ResourceForecast {
  user: { id: string; name: string };
  projects: ProjectForecast[];
}
  // Resource forecasting queries
  const { data: resourceForecasts = [], refetch: refetchForecasts } = useQuery<ResourceForecast[]>({
    queryKey: ["/api/resource-forecast"],
    enabled: false, // Only fetch when needed
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  const editForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProjectFormData }) => {
      console.log("Updating project with data:", data);
      const response = await apiRequest("PATCH", `/api/projects/${id}`, data);
      console.log("Update response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Resource forecast mutation
  const updateForecastMutation = useMutation({
    mutationFn: async (data: { userId: string; projectId: number; weekStarting: string; forecastHours: number }) => {
      const response = await apiRequest("POST", "/api/resource-forecast", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Resource forecast updated" });
      refetchForecasts();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update forecast" });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const onEditSubmit = (data: ProjectFormData) => {
    console.log("Submitting project data:", data);
    console.log("Role cards with assignments:", data.roleCards);
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    
    // Transform role cards from backend format to frontend format
    const transformedRoleCards = (project.roleCards || []).map((roleCard: any) => {
      // Ensure we preserve the totalHours and totalCost from the backend
      const totalHours = parseFloat(roleCard.totalHours) || 0;
      const hourlyRate = parseFloat(roleCard.hourlyRate) || 0;
      const totalCost = parseFloat(roleCard.totalCost) || (hourlyRate * totalHours);
      
      return {
        roleId: roleCard.roleId || "",
        roleName: roleCard.roleName || "",
        hourlyRate: hourlyRate,
        currency: roleCard.currency || "USD",
        totalHours: totalHours,
        totalCost: totalCost,
        assignedUserId: roleCard.assignedUsers && roleCard.assignedUsers.length > 0 ? roleCard.assignedUsers[0].id : null,
        assignedUserName: roleCard.assignedUsers && roleCard.assignedUsers.length > 0 ? roleCard.assignedUsers[0].name : "",
      };
    });

    console.log("Original project role cards:", project.roleCards);
    console.log("Transformed role cards:", transformedRoleCards);
    
    editForm.reset({
      name: project.name || "",
      description: project.description || "",
      clientId: project.clientId || "",
      budget: project.budget ? String(project.budget) : "",
      status: project.status || "active",
      startDate: project.startDate ? project.startDate.split('T')[0] : "",
      endDate: project.endDate ? project.endDate.split('T')[0] : "",
      roleCards: transformedRoleCards,
    });
    setIsEditDialogOpen(true);
  };

  // Resource forecasting functions
  const handleResourceForecast = (project: any) => {
    setForecastProject(project);
    setIsForecastDialogOpen(true);
    refetchForecasts();
  };

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  // Memoize expensive calendar generation - starts from current week
  const weeklyCalendar = useMemo(() => {
    // Always start from the current week (Monday)
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weeks = [];
    
    // Generate 26 weeks (6 months) starting from this week for better performance
    for (let i = 0; i < 26; i++) {
      const weekStart = addWeeks(start, i);
      const weekEnd = addDays(weekStart, 6); // Sunday
      const startDay = parseInt(format(weekStart, 'd'));
      const endDay = parseInt(format(weekEnd, 'd'));
      weeks.push({
        weekStarting: format(weekStart, 'yyyy-MM-dd'),
        weekLabel: `${startDay}-${endDay}`,
        startDay,
        endDay,
        startDayOrdinal: getOrdinalSuffix(startDay),
        endDayOrdinal: getOrdinalSuffix(endDay),
        fullWeekLabel: `${format(weekStart, 'M/d')} - ${format(weekEnd, 'M/d')}`,
        month: format(weekStart, 'MMM'),
        year: format(weekStart, 'yyyy'),
        monthYear: format(weekStart, 'MMM yyyy'),
        isNewMonth: i === 0 || format(weekStart, 'MMM yyyy') !== format(addWeeks(start, i - 1), 'MMM yyyy')
      });
    }
    
    return weeks;
  }, []);

  // Memoize forecast calculations for performance
  const getForecastValue = useCallback((userId: string, projectId: number, weekStarting: string) => {
    if (!resourceForecasts) return 0;
    
    const userForecasts = resourceForecasts.find((rf: any) => rf.user.id === userId);
    if (!userForecasts) return 0;
    
    const projectForecasts = userForecasts.projects?.find((p: any) => p.project.id === projectId);
    if (!projectForecasts) return 0;
    
    const forecast = projectForecasts.forecasts?.find((f: any) => f.weekStarting === weekStarting);
    return forecast ? parseFloat(forecast.forecastHours) : 0;
  }, [resourceForecasts]);

  const updateForecast = (userId: string, projectId: number, weekStarting: string, hours: number) => {
    if (hours < 0 || hours > 40) {
      toast({ title: "Invalid Hours", description: "Please enter between 0 and 40 hours per week", variant: "destructive" });
      return;
    }
    
    updateForecastMutation.mutate({
      userId,
      projectId,
      weekStarting,
      forecastHours: hours
    });
  };

  const canEditProject = (project: any) => {
    if (!user?.role) return false;
    
    // Admin can edit all projects
    if (user.role === 'Administrator' || user.role === 'admin') return true;
    
    // Director can edit all projects
    if (user.role === 'Director' || user.role === 'director') return true;
    
    // Project Manager can edit their own projects
    if ((user.role === 'Project Manager' || user.role === 'project_manager') && project.projectManagerId === user.id) return true;
    
    return false;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-success-100 text-success-800",
      completed: "bg-blue-100 text-blue-800",
      on_hold: "bg-warning-100 text-warning-800",
      cancelled: "bg-red-100 text-red-800",
    } as const;

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const canCreateProject = user?.role === "admin" || user?.role === "project_manager";
  
  const canManageForecasts = user?.role === "Administrator" || user?.role === "admin" || user?.role === "Director" || user?.role === "director" || user?.role === "Project Manager" || user?.role === "project_manager";

  // Check if a week is in the past (locked)
  const isWeekLocked = useCallback((weekStarting: string) => {
    const weekStart = new Date(weekStarting);
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekStart < currentWeekStart;
  }, []);

  // Memoized ResourceRow component for performance
  const ResourceRow = memo(({ role, forecastProject, weeks, resourceForecasts, getForecastValue, updateForecast, isWeekLocked }: any) => {
    const userId = role.assignedUsers[0].id;
    
    // Local state for input values to handle typing
    const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
    
    // Memoize expensive calculations
    const calculations = useMemo(() => {
      const getCapacityColor = (weekStarting: string) => {
        if (!resourceForecasts) return '';
        
        const userForecasts = resourceForecasts.find((rf: any) => rf.user.id === userId);
        if (!userForecasts) return '';
        
        const totalHours = userForecasts.projects?.reduce((sum: number, project: any) => {
          const forecast = project.forecasts?.find((f: any) => f.weekStarting === weekStarting);
          return sum + (forecast ? parseFloat(forecast.forecastHours) : 0);
        }, 0) || 0;
        
        if (totalHours >= 40) return 'bg-red-100 dark:bg-red-900';
        if (totalHours >= 35) return 'bg-green-100 dark:bg-green-900';
        if (totalHours > 0) return 'bg-yellow-100 dark:bg-yellow-900';
        return '';
      };
      
      const getTotalHours = (weekStarting: string) => {
        if (!resourceForecasts) return 0;
        
        const userForecasts = resourceForecasts.find((rf: any) => rf.user.id === userId);
        if (!userForecasts) return 0;
        
        return userForecasts.projects?.reduce((sum: number, project: any) => {
          const forecast = project.forecasts?.find((f: any) => f.weekStarting === weekStarting);
          return sum + (forecast ? parseFloat(forecast.forecastHours) : 0);
        }, 0) || 0;
      };
      
      return { getCapacityColor, getTotalHours };
    }, [userId, resourceForecasts]);

    return (
      <div className="border-b">
        {/* Total capacity row */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="w-48 flex-shrink-0 p-2 border-r">
            <div className="font-medium text-sm">{role.assignedUsers[0].name}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Capacity</div>
          </div>
          {weeks.map((week: any) => {
            const totalHours = calculations.getTotalHours(week.weekStarting);
            
            return (
              <div key={`total-${week.weekStarting}`} className="w-24 flex-shrink-0 p-1 text-center border-r">
                <div className="text-sm font-medium h-6 flex items-center justify-center">
                  {totalHours > 0 ? totalHours.toFixed(0) : ''}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Project-specific row */}
        <div className="flex">
          <div className="w-48 flex-shrink-0 p-2 border-r">
            <div className="text-sm text-gray-700 dark:text-gray-300">{forecastProject.name}</div>
            <div className="text-xs text-gray-500">{role.roleName}</div>
          </div>
          {weeks.map((week: any) => {
            const currentHours = getForecastValue(userId, forecastProject.id, week.weekStarting);
            const capacityColor = calculations.getCapacityColor(week.weekStarting);
            const weekLocked = isWeekLocked(week.weekStarting);
            const inputKey = `${userId}-${forecastProject.id}-${week.weekStarting}`;
            
            // Use local input value if user is typing, otherwise use the stored value
            const displayValue = inputValues[inputKey] !== undefined ? inputValues[inputKey] : (currentHours || '');
            
            return (
              <div key={`project-${week.weekStarting}`} className={`w-24 flex-shrink-0 p-1 text-center border-r ${capacityColor} ${weekLocked ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
                {weekLocked ? (
                  <div className="w-12 text-xs text-center px-1 py-0.5 text-gray-500 dark:text-gray-400" style={{ fontSize: '11px' }}>
                    {currentHours > 0 ? currentHours.toFixed(1) : ''}
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="0.5"
                    value={displayValue}
                    onChange={(e) => {
                      // Update local state immediately for responsive typing
                      setInputValues(prev => ({
                        ...prev,
                        [inputKey]: e.target.value
                      }));
                    }}
                    onBlur={(e) => {
                      // Save to server when user finishes typing
                      const hours = parseFloat(e.target.value) || 0;
                      updateForecast(userId, forecastProject.id, week.weekStarting, hours);
                      // Clear local state after saving
                      setInputValues(prev => {
                        const newValues = { ...prev };
                        delete newValues[inputKey];
                        return newValues;
                      });
                    }}
                    onKeyDown={(e) => {
                      // Save on Enter key
                      if (e.key === 'Enter') {
                        const hours = parseFloat((e.target as HTMLInputElement).value) || 0;
                        updateForecast(userId, forecastProject.id, week.weekStarting, hours);
                        setInputValues(prev => {
                          const newValues = { ...prev };
                          delete newValues[inputKey];
                          return newValues;
                        });
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-12 text-xs text-center border rounded px-1 py-0.5 bg-white dark:bg-gray-700"
                    style={{ fontSize: '11px' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage client projects and assignments</p>
        </div>
        {canCreateProject && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((client: any) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Project description" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Budget</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ""}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ""}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Rate Cards Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">Project Rate Cards</h4>
                        <p className="text-sm text-gray-600">Define roles with their hourly rates and allocated hours</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentRoles = form.getValues("roleCards") || [];
                          form.setValue("roleCards", [
                            ...currentRoles,
                            {
                              roleId: "",
                              roleName: "",
                              hourlyRate: 100,
                              currency: "GBP" as const,
                              totalHours: 0,
                              totalCost: 0,
                              assignedUserId: null,
                              assignedUserName: "TBD"
                            }
                          ]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="roleCards"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-3">
                            {(field.value || []).map((roleCard: RoleCard, index: number) => (
                              <Card key={index} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                  <div>
                                    <Label className="text-sm font-medium">Role</Label>
                                    <Select
                                      value={roleCard.roleId}
                                      onValueChange={(value) => {
                                        const selectedRole = defaultRoles.find(r => r.id === value);
                                        const newRoles = [...(field.value || [])];
                                        newRoles[index] = { 
                                          ...roleCard, 
                                          roleId: value,
                                          roleName: selectedRole?.name || "",
                                          hourlyRate: selectedRole?.defaultRate || roleCard.hourlyRate,
                                          totalCost: (selectedRole?.defaultRate || roleCard.hourlyRate) * roleCard.totalHours
                                        };
                                        field.onChange(newRoles);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {defaultRoles.map((role) => (
                                          <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Assigned User</Label>
                                    <Select
                                      value={roleCard.assignedUserId || "tbd"}
                                      onValueChange={(value) => {
                                        const newRoles = [...(field.value || [])];
                                        newRoles[index] = { 
                                          ...roleCard, 
                                          assignedUserId: value === "tbd" ? null : value,
                                          assignedUserName: value === "tbd" ? "TBD" : users?.find((u: any) => u.id === value)?.firstName + " " + users?.find((u: any) => u.id === value)?.lastName || "Unknown User"
                                        };
                                        field.onChange(newRoles);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="tbd">
                                          <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                            TBD (To Be Determined)
                                          </div>
                                        </SelectItem>
                                        {users?.map((user: any) => (
                                          <SelectItem key={user.id} value={user.id}>
                                            <div className="flex items-center gap-2">
                                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                              {user.firstName && user.lastName 
                                                ? `${user.firstName} ${user.lastName}` 
                                                : user.email}
                                            </div>
                                          </SelectItem>
                                        )) || []}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Hourly Rate</Label>
                                    <div className="flex">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={roleCard.hourlyRate}
                                        onChange={(e) => {
                                          const newRoles = [...(field.value || [])];
                                          const hourlyRate = parseFloat(e.target.value) || 0;
                                          const totalCost = hourlyRate * roleCard.totalHours;
                                          newRoles[index] = { ...roleCard, hourlyRate, totalCost };
                                          field.onChange(newRoles);
                                        }}
                                        className="rounded-r-none"
                                      />
                                      <Select
                                        value={roleCard.currency}
                                        onValueChange={(value) => {
                                          const newRoles = [...(field.value || [])];
                                          newRoles[index] = { ...roleCard, currency: value as 'USD' | 'GBP' };
                                          field.onChange(newRoles);
                                        }}
                                      >
                                        <SelectTrigger className="w-20 rounded-l-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="USD">USD</SelectItem>
                                          <SelectItem value="GBP">GBP</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Total Hours</Label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      placeholder="Enter hours"
                                      value={roleCard.totalHours || ""}
                                      onChange={(e) => {
                                        const newRoles = [...(field.value || [])];
                                        const totalHours = parseFloat(e.target.value) || 0;
                                        const totalCost = roleCard.hourlyRate * totalHours;
                                        newRoles[index] = { ...roleCard, totalHours, totalCost };
                                        field.onChange(newRoles);
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Total Cost</Label>
                                    <div className="flex items-center h-10 px-3 py-2 border border-input bg-gray-50 rounded-md text-sm">
                                      {roleCard.currency === 'GBP' ? '£' : '$'}{roleCard.totalCost.toFixed(2)}
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newRoles = [...(field.value || [])];
                                      newRoles.splice(index, 1);
                                      field.onChange(newRoles);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}

                            {(!field.value || field.value.length === 0) && (
                              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500 mb-2">No rate cards defined</p>
                                <p className="text-sm text-gray-400">Add roles to define project rate cards and budget allocation</p>
                              </div>
                            )}

                            {field.value && field.value.length > 0 && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Total Project Cost:</span>
                                  <span className="text-lg font-bold">
                                    ${field.value.reduce((sum: number, role: ProjectRole) => sum + role.totalCost, 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Total Hours: {field.value.reduce((sum: number, role: ProjectRole) => sum + role.totalHours, 0)} hours
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProjectMutation.isPending}>
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </Form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client: any) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter project description" {...field} value={field.value ?? ""}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />



                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="totalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            placeholder="0" 
                            {...field}
                            value={typeof field.value === "number" ? field.value : 0} // ensures number
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? 0 : val); // always a number
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role Cards Section */}
                <FormField
                  control={editForm.control}
                  name="roleCards"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Resources & Roles</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {(field.value || []).map((roleCard: RoleCard, index: number) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium text-sm">Role {index + 1}</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updatedRoles = [...(field.value || [])];
                                    updatedRoles.splice(index, 1);
                                    field.onChange(updatedRoles);
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Role</label>
                                  <Select
                                    value={roleCard.roleId}
                                    onValueChange={(value) => {
                                      const updatedRoles = [...(field.value || [])];
                                      const selectedRole = defaultRoles?.find(r => r.id === value);
                                      if (selectedRole) {
                                        updatedRoles[index] = {
                                          ...roleCard,
                                          roleId: value,
                                          roleName: selectedRole.name,
                                          hourlyRate: selectedRole.defaultRate,
                                          currency: selectedRole.currency,
                                          totalCost: selectedRole.defaultRate * roleCard.totalHours, // Update total cost when role changes
                                        };
                                        field.onChange(updatedRoles);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={roleCard.roleName || "Select role"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {defaultRoles?.filter(role => !field.value?.some((rc: RoleCard) => rc.roleId === role.id && rc.roleId !== roleCard.roleId)).map((role) => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Hourly Rate</label>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">{roleCard.currency}</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={roleCard.hourlyRate}
                                      onChange={(e) => {
                                        const updatedRoles = [...(field.value || [])];
                                        const newRate = parseFloat(e.target.value) || 0;
                                        updatedRoles[index] = {
                                          ...roleCard,
                                          hourlyRate: newRate,
                                          totalCost: newRate * roleCard.totalHours, // Update total cost when rate changes
                                        };
                                        field.onChange(updatedRoles);
                                      }}
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Hours</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={roleCard.totalHours}
                                    onChange={(e) => {
                                      const updatedRoles = [...(field.value || [])];
                                      const hours = parseFloat(e.target.value) || 0;
                                      updatedRoles[index] = {
                                        ...roleCard,
                                        totalHours: hours,
                                        totalCost: hours * roleCard.hourlyRate,
                                      };
                                      field.onChange(updatedRoles);
                                    }}
                                    className="h-8"
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Cost</label>
                                  <div className="h-8 px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm flex items-center">
                                    {roleCard.currency} {roleCard.totalCost.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              {/* Assigned User with Role Display */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Assigned User</label>
                                <Select
                                  value={roleCard.assignedUserId || "unassigned"}
                                  onValueChange={(value) => {
                                    const updatedRoles = [...(field.value || [])];
                                    const assignedUser = value === "unassigned" ? null : users?.find(u => u.id === Number(value));
                                    updatedRoles[index] = {
                                      ...roleCard,
                                      assignedUserId: value === "unassigned" ? null : value,
                                      assignedUserName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "",
                                    };
                                    field.onChange(updatedRoles);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue>
                                      {roleCard.assignedUserId && roleCard.assignedUserName ? (
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                          <span className="text-sm">{roleCard.assignedUserName}</span>
                                          <span className="text-xs text-gray-500">({roleCard.roleName})</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                          <span className="text-sm text-gray-500">Unassigned</span>
                                          <span className="text-xs text-gray-500">({roleCard.roleName})</span>
                                        </div>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                        Unassigned
                                      </div>
                                    </SelectItem>
                                    {users?.map((user: any) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                          
                          {(!field.value || field.value.length === 0) && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <Users className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm">No resources assigned yet</p>
                              <p className="text-xs">Add roles to manage project resources</p>
                            </div>
                          )}
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const currentRoles = field.value || [];
                              const availableRoles = defaultRoles?.filter(role => 
                                !currentRoles.some((rc: RoleCard) => rc.roleId === role.id)
                              );
                              
                              if (availableRoles && availableRoles.length > 0) {
                                const firstAvailable = availableRoles[0];
                                const newRole: RoleCard = {
                                  roleId: firstAvailable.id,
                                  roleName: firstAvailable.name,
                                  hourlyRate: firstAvailable.defaultRate,
                                  currency: firstAvailable.currency,
                                  totalHours: 0,
                                  totalCost: 0,
                                  assignedUserId: null,
                                  assignedUserName: "",
                                };
                                field.onChange([...currentRoles, newRole]);
                              }
                            }}
                            disabled={!defaultRoles || defaultRoles.length === 0 || (field.value && field.value.length >= defaultRoles.length)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Resource Role
                          </Button>
                          
                          {field.value && field.value.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">Project Summary:</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Total Budget:</span>
                                <span className="font-medium">
                                  ${field.value.reduce((sum: number, role: RoleCard) => sum + (role.totalCost || 0), 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Total Hours:</span>
                                <span>{field.value.reduce((sum: number, role: RoleCard) => sum + (role.totalHours || 0), 0)} hours</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProjectMutation.isPending}>
                    {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Projects List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading projects...</div>
          </CardContent>
        </Card>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No projects found</p>
            {canCreateProject && (
              <Button onClick={() => setIsFormOpen(true)}>
                Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project: any) => {
                  const spentPercentage = project.budget ? Math.min(100, ((project.totalSpent || 0) / parseFloat(project.budget)) * 100) : 0;
                  return (
                    <TableRow key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Folder className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {project.name}
                            </div>
                            {project.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{project.client?.name || "No client"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(project.status)}
                      </TableCell>
                      <TableCell>
                        {project.startDate ? (
                          <div className="text-sm">
                            {format(new Date(project.startDate), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.endDate ? (
                          <div className="text-sm">
                            {format(new Date(project.endDate), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.budget ? (
                          <div className="text-sm font-medium">
                            ${parseFloat(project.budget).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          ${(project.totalSpent || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.budget ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                {Math.round(spentPercentage)}%
                              </span>
                              <span className="text-xs text-gray-500">
                                ${Math.max(0, parseFloat(project.budget) - (project.totalSpent || 0)).toLocaleString()} left
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  spentPercentage > 90 ? 'bg-red-500' : 
                                  spentPercentage > 75 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${spentPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.roleCards && project.roleCards.length > 0 ? (
                          <div className="space-y-1">
                            {project.roleCards.slice(0, 2).map((role: any, index: number) => (
                              <div key={index} className="flex items-center gap-1">
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                  {role.roleName}
                                </span>
                                {role.assignedUserName && (
                                  <span className="text-xs text-gray-500">
                                    {role.assignedUserName}
                                  </span>
                                )}
                              </div>
                            ))}
                            {project.roleCards.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{project.roleCards.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No team assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEditProject(project) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProject(project)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageForecasts && project.startDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResourceForecast(project)}
                              className="h-8 w-8 p-0"
                              title="Manage Resource Forecast"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Resource Forecasting Dialog */}
      <Dialog open={isForecastDialogOpen} onOpenChange={setIsForecastDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resource Forecast - {forecastProject?.name}
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Excel-like resource allocation view (max 40 hours per week)
              <span className="ml-2">
                • Timeline: {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')} - {format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 26), 'MMM d, yyyy')} (Next 6 months)
              </span>
              <span className="ml-2 text-gray-500">
                • Past weeks are locked to maintain data integrity
              </span>
            </p>
          </DialogHeader>

          {forecastProject && (
            <div className="flex-1 overflow-auto border rounded-lg">
              <div className="min-w-max">
                {/* Month-grouped header - Optimized */}
                {(() => {
                  const weeks = weeklyCalendar;
                  const monthGroups = weeks.reduce((acc: any[], week) => {
                    const existingMonth = acc.find(m => m.monthYear === week.monthYear);
                    if (existingMonth) {
                      existingMonth.weeks.push(week);
                    } else {
                      acc.push({
                        monthYear: week.monthYear,
                        month: week.month,
                        year: week.year,
                        weeks: [week]
                      });
                    }
                    return acc;
                  }, []);

                  return (
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800">
                      {/* Month headers */}
                      <div className="flex border-b">
                        <div className="w-48 flex-shrink-0 p-2 font-medium border-r bg-gray-50 dark:bg-gray-900">
                          <div>Resource</div>
                        </div>
                        {monthGroups.map((monthGroup) => (
                          <div key={monthGroup.monthYear} className="flex">
                            <div className={`flex-shrink-0 p-2 text-center font-medium border-r bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300`}
                                 style={{ width: `${monthGroup.weeks.length * 96}px` }}>
                              {monthGroup.monthYear}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Week headers */}
                      <div className="flex border-b bg-gray-50 dark:bg-gray-900">
                        <div className="w-48 flex-shrink-0 border-r"></div>
                        {weeks.map((week) => {
                          const weekLocked = isWeekLocked(week.weekStarting);
                          return (
                            <div key={week.weekStarting} className={`w-24 flex-shrink-0 p-1 text-xs text-center border-r ${weekLocked ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                              <div className={`font-medium flex items-center justify-center gap-1 ${weekLocked ? 'text-gray-500 dark:text-gray-400' : ''}`}>
                                {weekLocked && <Lock className="h-3 w-3" />}
                                <span>
                                  {week.startDay}<sup className="text-[8px]">{week.startDayOrdinal}</sup>-{week.endDay}<sup className="text-[8px]">{week.endDayOrdinal}</sup>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Resource rows - Optimized with memoization */}
                {forecastProject.roleCards?.filter((role: any) => role.assignedUsers && role.assignedUsers.length > 0).map((role: any) => (
                  <ResourceRow
                    key={`${role.roleId}-${role.assignedUsers[0].id}`}
                    role={role}
                    forecastProject={forecastProject}
                    weeks={weeklyCalendar}
                    resourceForecasts={resourceForecasts}
                    getForecastValue={getForecastValue}
                    updateForecast={updateForecast}
                    isWeekLocked={isWeekLocked}
                  />
                ))}

                {/* No assigned team members */}
                {(!forecastProject.roleCards || forecastProject.roleCards.length === 0 || !forecastProject.roleCards.some((role: any) => role.assignedUsers && role.assignedUsers.length > 0)) && (
                  <div className="flex justify-center items-center p-12 border-t">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No team members assigned</p>
                      <p className="text-sm text-gray-400 mb-4">
                        Assign team members to project roles to enable resource forecasting
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsForecastDialogOpen(false);
                          handleEditProject(forecastProject);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Assign Team Members
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsForecastDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
