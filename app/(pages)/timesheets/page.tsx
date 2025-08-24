"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Save, Send, Clock, ChevronLeft, ChevronRight, AlertTriangle, Plus, CheckCircle, Trash2, XCircle, RotateCcw } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { useToast } from "@/app/hooks/use-toast";
import { apiRequest } from "@/app/lib/queryClient";
import { useAuth } from "@/app/hooks/useAuth";

interface ProjectEntry {
  projectId?: number;
  hours: number;
  description: string;
  forecasted?: number;
  isOverForecast?: boolean;
  isSaved?: boolean;
  timesheetId?: number;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
  isEditable?: boolean;
}

interface DayEntry {
  status: string;
  day: string;
  date: string;
  projects: ProjectEntry[];
  isSubmitted: boolean;
}

interface WeeklyTimesheet {
  weekCommencing: string;
  days: DayEntry[];
  totalHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
  canEdit: boolean;
}

export default function Timesheets() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [weeklyData, setWeeklyData] = useState<WeeklyTimesheet>({
    weekCommencing: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    days: [],
    totalHours: 0,
    status: 'draft',
    canEdit: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Initialize days for the week
  const initializeWeekDays = (weekStart: Date) => {
    const days: DayEntry[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      days.push({
        day: dayNames[i],
        date: format(date, 'yyyy-MM-dd'),
        projects: [{
          hours: 0,
          description: '',
          isSaved: false,
          isEditable: true
        }],
        isSubmitted: false,
        status: ""
      });
    }
    return days;
  };
interface Project {
    id: number;
    name: string;
}

const { data: projects = [] } = useQuery<Project[]>({
  queryKey: ["/api/projects"],
  queryFn: async () => {
    const res = await fetch("/api/projects");
    return res.json();
  },
});

  const { data: submittedTimesheets } = useQuery({
    queryKey: ["/api/timesheets/submitted"],
    queryFn: () => apiRequest("GET", "/api/timesheets/submitted").then(res => res.json()),
  });

  const { data: weekTimesheets, isLoading } = useQuery({
    queryKey: ["/api/timesheets", format(currentWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      const response = await fetch(`/api/timesheets?startDate=${weekStart}&endDate=${weekEnd}`);
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 0, // Consider data stale immediately to ensure fresh data
  });

  const saveTimesheetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/timesheets/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet saved successfully",
      });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save timesheet",
        variant: "destructive",
      });
    },
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/timesheets/submit", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet submitted for approval",
      });
      loadWeekData(currentWeek);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit timesheet",
        variant: "destructive",
      });
    },
  });

  const revertTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await apiRequest("PATCH", `/api/timesheets/${timesheetId}/revert`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet reverted to draft for editing",
      });
      loadWeekData(currentWeek);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revert timesheet",
        variant: "destructive",
      });
    },
  });

  // Load week data when week changes
  useEffect(() => {
    loadWeekData(currentWeek);
  }, [currentWeek, weekTimesheets]);

  const loadWeekData = (weekStart: Date) => {
    const weekCommencing = format(weekStart, 'yyyy-MM-dd');
    let days = initializeWeekDays(weekStart);
    let status: 'draft' | 'submitted' | 'approved' | 'rejected' = 'draft';
    let rejectionReason = '';
    let canEdit = true;

    // Load existing timesheet data for the week
    if (weekTimesheets && Array.isArray(weekTimesheets)) {
      // Group timesheets by date and project
      const timesheetsByDate = weekTimesheets.reduce((acc: any, timesheet: any) => {
        if (!acc[timesheet.date]) {
          acc[timesheet.date] = [];
        }
        acc[timesheet.date].push(timesheet);
        return acc;
      }, {});

      days.forEach((day, dayIndex) => {
        const dayTimesheets = timesheetsByDate[day.date] || [];
        if (dayTimesheets.length > 0) {
          // Convert individual timesheets to project entries
          const timesheetEntries = dayTimesheets.map((timesheet: any) => ({
            hours: parseFloat(timesheet.hours) || 0,
            description: timesheet.description || '',
            projectId: timesheet.projectId,
            timesheetId: timesheet.id,
            status: timesheet.status,
            rejectionReason: timesheet.rejectionReason,
            isSaved: true,
            isEditable: timesheet.status === 'rejected' || timesheet.status === 'draft'
          }));
          
          // Update day-level status based on timesheet statuses
          const hasRejected = dayTimesheets.some((t: any) => t.status === 'rejected');
          const hasSubmitted = dayTimesheets.some((t: any) => t.status === 'submitted');
          const hasApproved = dayTimesheets.some((t: any) => t.status === 'approved');
          
          if (hasRejected) {
            days[dayIndex].status = 'rejected';
            // For rejected timesheets, show only the existing entries (they're already editable)
            days[dayIndex].projects = timesheetEntries;
          } else if (hasSubmitted || hasApproved) {
            days[dayIndex].status = hasSubmitted ? 'submitted' : 'approved';
            days[dayIndex].isSubmitted = true;
            // For submitted/approved timesheets, show only the existing entries (read-only)
            days[dayIndex].projects = timesheetEntries;
          } else {
            // Draft status - show existing entries only
            days[dayIndex].projects = timesheetEntries;
          }
        }
      });
    }

    const totalHours = days.reduce((sum, day) => 
      sum + day.projects.reduce((daySum, project) => daySum + (parseFloat(project.hours as any) || 0), 0), 0);

    setWeeklyData({
      weekCommencing,
      days,
      totalHours,
      status,
      rejectionReason,
      canEdit
    });
  };

  const updateProjectEntry = (dayIndex: number, projectIndex: number, field: keyof ProjectEntry, value: any) => {
    const project = weeklyData.days[dayIndex].projects[projectIndex];
    
    console.log(`[DEBUG] updateProjectEntry called: day ${dayIndex}, project ${projectIndex}, field ${field}, value ${value}`);
    console.log(`[DEBUG] Current project status: ${project.status}, timesheetId: ${project.timesheetId}`);
    
    // Block editing of submitted/approved entries, but allow editing of draft/rejected entries
    if ((project.status === 'submitted' || project.status === 'approved') && project.isEditable === false) {
      console.log(`[DEBUG] Blocked edit - project status is ${project.status}, isEditable: ${project.isEditable}`);
      return; // Cannot edit submitted or approved entries unless explicitly marked as editable
    }

    const newDays = [...weeklyData.days];
    const newProjects = [...newDays[dayIndex].projects];
    newProjects[projectIndex] = { ...newProjects[projectIndex], [field]: value };
    
    console.log(`[DEBUG] Updated project entry:`, newProjects[projectIndex]);
    
    // Allow entering hours without immediate validation
    // Validation will happen only during submission
    
    newDays[dayIndex] = { ...newDays[dayIndex], projects: newProjects };
    
    const totalHours = newDays.reduce((sum, day) => 
      sum + day.projects.reduce((daySum, project) => daySum + (parseFloat(project.hours as any) || 0), 0), 0);
    
    setWeeklyData({
      ...weeklyData,
      days: newDays,
      totalHours
    });
    
    console.log(`[DEBUG] State updated, new total hours: ${totalHours}`);
  };

  const addProjectToDay = (dayIndex: number) => {
    const newDays = [...weeklyData.days];
    newDays[dayIndex].projects.push({
      hours: 0,
      description: '',
      isSaved: false,
      isEditable: true
    });
    setWeeklyData({...weeklyData, days: newDays});
  };

  const removeProjectFromDay = (dayIndex: number, projectIndex: number) => {
    const newDays = [...weeklyData.days];
    const projectToRemove = newDays[dayIndex].projects[projectIndex];
    
    // If this project was saved to the database, delete it immediately
    if (projectToRemove.timesheetId) {
      fetch(`/api/timesheets/${projectToRemove.timesheetId}`, {
        method: 'DELETE',
      }).then(() => {
        // Refresh timesheet data after deletion
        queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      }).catch((error) => {
        console.error('Failed to delete timesheet entry:', error);
        toast({
          title: "Error",
          description: "Failed to delete timesheet entry",
          variant: "destructive",
        });
      });
    }
    
    newDays[dayIndex].projects.splice(projectIndex, 1);
    if (newDays[dayIndex].projects.length === 0) {
      newDays[dayIndex].projects.push({
        hours: 0,
        description: '',
        isSaved: false,
        isEditable: true
      });
    }
    setWeeklyData({...weeklyData, days: newDays});
  };

  // Legacy function for backward compatibility with the table view
  const updateDayEntry = (dayIndex: number, field: string, value: any) => {
    if (!weeklyData.canEdit && weeklyData.days[dayIndex].isSubmitted) {
      return;
    }

    const newDays = [...weeklyData.days];
    const day = newDays[dayIndex];
    
    // Update the first project in the day (legacy single project per day)
    if (day.projects.length === 0) {
      day.projects.push({
        hours: 0,
        description: '',
        isSaved: false
      });
    }

    if (field === 'hours') {
      day.projects[0].hours = value;
      console.log(`[DEBUG] Updated hours for day ${dayIndex} to ${value}`);
      // Allow entering hours - validation happens during submission
    } else if (field === 'projectId') {
      day.projects[0].projectId = value;
      console.log(`[DEBUG] Updated projectId for day ${dayIndex} to ${value}`);
    } else if (field === 'description') {
      day.projects[0].description = value;
      console.log(`[DEBUG] Updated description for day ${dayIndex} to ${value}`);
    }

    const totalHours = newDays.reduce((sum, d) => 
      sum + d.projects.reduce((daySum, project) => daySum + (parseFloat(project.hours as any) || 0), 0), 0);
    
    setWeeklyData({
      ...weeklyData,
      days: newDays,
      totalHours
    });
  };

  const handleSave = () => {
    // Check if there are any valid entries before saving
    if (!hasEditableEntries()) {
      toast({
        title: "No Data to Save",
        description: "Please add new timesheet entries with hours, project, and description before saving.",
        variant: "destructive",
      });
      return;
    }

    const timesheetData = {
      weekCommencing: format(weeklyData.weekCommencing, 'yyyy-MM-dd'),
      days: weeklyData.days.map(day => ({
        date: format(new Date(day.date), 'yyyy-MM-dd'),
        // Send all projects, including those with 0 hours so server can handle deletions
        projects: day.projects.map(project => ({
          projectId: project.projectId,
          hours: project.hours,
          description: project.description || '',
          timesheetId: project.timesheetId // Include ID for updates/deletes
        }))
      }))
    };
    
    console.log('Saving timesheet data:', timesheetData);
    saveTimesheetMutation.mutate(timesheetData);
  };

  // Helper function to check if a project entry has validation issues
  const getValidationIssues = (project: ProjectEntry) => {
    const issues = [];
    if (project.hours > 0) {
      if (!project.projectId) {
        issues.push('project');
      }
      if (!project.description.trim()) {
        issues.push('description');
      }
    }
    return issues;
  };

  // Check if there are any valid timesheet entries that can be saved/submitted
  const hasValidEntries = () => {
    return weeklyData.days.some(day => 
      day.projects.some(project => 
        project.hours > 0 && 
        project.projectId && 
        project.description.trim() &&
        (!project.status || project.status === 'draft') // Only count draft or new entries
      )
    );
  };

  // Check if there are any editable/new entries (not submitted or approved)
  const hasEditableEntries = () => {
    return weeklyData.days.some(day => 
      day.projects.some(project => 
        project.hours > 0 && 
        project.projectId && 
        project.description.trim() &&
        (!project.status || project.status === 'draft' || project.status === 'rejected')
      )
    );
  };

  const handleSubmit = async () => {
    // Validate that all entries with hours have required fields
    const invalidEntries: string[] = [];
    weeklyData.days.forEach((day) => {
      day.projects.forEach((project) => {
        if (project.hours > 0) {
          if (!project.projectId) {
            invalidEntries.push(`${day.day}: Missing project selection`);
          }
          if (!project.description.trim()) {
            invalidEntries.push(`${day.day}: Missing work description`);
          }
        }
      });
    });

    if (invalidEntries.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fix:\n${invalidEntries.slice(0, 3).join('\n')}${invalidEntries.length > 3 ? '\n...' : ''}`,
        variant: "destructive",
      });
      return;
    }

    // Save changes first to ensure they're persisted before submission
    const saveData = {
      weekCommencing: format(weeklyData.weekCommencing, 'yyyy-MM-dd'),
      days: weeklyData.days.map(day => ({
        date: format(new Date(day.date), 'yyyy-MM-dd'),
        projects: day.projects.map(project => ({
          projectId: project.projectId,
          hours: project.hours,
          description: project.description || '',
          timesheetId: project.timesheetId
        }))
      }))
    };
    
    try {
      await saveTimesheetMutation.mutateAsync(saveData);
      
      // Now submit with the saved data - only include draft records and exclude approved ones
      const timesheetData = {
        weekCommencing: weeklyData.weekCommencing,
        days: weeklyData.days.map(day => ({
          date: day.date,
          projects: day.projects.filter(project => 
            project.hours > 0 && 
            project.status !== 'approved' && 
            project.status !== 'submitted'
          )
        })).filter(day => day.projects.length > 0), // Only include days with submittable projects
        status: 'submitted'
      };

      // Validate that there are actually submittable records
      const submittableHours = timesheetData.days.reduce((total, day) => {
        return total + day.projects.reduce((dayTotal, project) => dayTotal + (parseFloat(project.hours as any) || 0), 0);
      }, 0);

      if (submittableHours === 0) {
        toast({
          title: "Nothing to Submit",
          description: "All timesheet entries are already submitted or approved. Only draft entries can be submitted.",
          variant: "destructive",
        });
        return;
      }

      console.log('Submitting timesheet with submittable hours:', submittableHours);
      submitTimesheetMutation.mutate(timesheetData);
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save changes before submission",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(currentWeek, 1) 
      : addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
  };

  const revertTimesheetToDraft = (timesheetId?: number) => {
    if (!timesheetId) return;
    revertTimesheetMutation.mutate(timesheetId);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Timesheets</h1>
            <p className="text-muted-foreground">Track your weekly hours</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-muted-foreground">Track your weekly hours</p>
        </div>
      </div>



      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>
              <div className="text-center">
                <CardTitle className="text-lg">
                  Week Commencing: {format(currentWeek, 'MMMM dd, yyyy')}
                </CardTitle>
                <CardDescription>
                  {format(currentWeek, 'MMM dd')} - {format(addDays(currentWeek, 6), 'MMM dd, yyyy')}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(weeklyData.status)}
              <span className="text-sm text-muted-foreground">
                Total: {weeklyData.totalHours} hours
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Rejection Notice */}
      {weeklyData.status === 'rejected' && weeklyData.rejectionReason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Timesheet Rejected:</strong> {weeklyData.rejectionReason}
            <br />
            Please make the required adjustments and resubmit.
          </AlertDescription>
        </Alert>
      )}

      {/* Weekly Timesheet Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Hours
          </CardTitle>
          <CardDescription>
            Enter your hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Day</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-32">Hours</TableHead>
                <TableHead className="w-48">Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyData.days.map((day, dayIndex) => (
                <>
                  {day.projects.map((project, projectIndex) => (
                    <TableRow key={`${day.date}-${projectIndex}`}>
                      {projectIndex === 0 && (
                        <>
                          <TableCell className="font-medium" rowSpan={day.projects.length + 1}>
                            {day.day}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" rowSpan={day.projects.length + 1}>
                            {format(new Date(day.date), 'MMM dd')}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          value={project.hours || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (value <= 24) {
                              updateProjectEntry(dayIndex, projectIndex, 'hours', value);
                            }
                          }}
                          disabled={!project.isEditable && project.status !== 'rejected'}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={project.projectId?.toString() || ''}
                          onValueChange={(value) => updateProjectEntry(dayIndex, projectIndex, 'projectId', parseInt(value))}
                          disabled={!project.isEditable && project.status !== 'rejected'}
                        >
                          <SelectTrigger className={getValidationIssues(project).includes('project') ? 'border-red-500 ring-red-500' : ''}>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects?.map((proj: any) => (
                              <SelectItem key={proj.id} value={proj.id.toString()}>
                                {proj.name}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                        {getValidationIssues(project).includes('project') && (
                          <p className="text-xs text-red-600 mt-1">Project required when hours entered</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={project.description || ''}
                          onChange={(e) => updateProjectEntry(dayIndex, projectIndex, 'description', e.target.value)}
                          disabled={!project.isEditable && project.status !== 'rejected'}
                          placeholder="Describe work performed (required when hours entered)"
                          className={`min-h-[60px] resize-none ${getValidationIssues(project).includes('description') ? 'border-red-500 ring-red-500' : ''}`}
                        />
                        {getValidationIssues(project).includes('description') && (
                          <p className="text-xs text-red-600 mt-1">Description required when hours entered</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {project.status && getStatusBadge(project.status)}
                          {project.status === 'rejected' && project.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1" title={project.rejectionReason}>
                              {project.rejectionReason.length > 30 ? 
                                `${project.rejectionReason.substring(0, 30)}...` : 
                                project.rejectionReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {project.status === 'submitted' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revertTimesheetToDraft(project.timesheetId)}
                              className="h-6 w-6 p-0"
                              title="Revert to draft for editing"
                            >
                              <RotateCcw className="h-3 w-3 text-blue-500" />
                            </Button>
                          ) : project.status === 'approved' ? (
                            // No actions for approved timesheets
                            null
                          ) : (
                            // Draft and rejected timesheets can be deleted
                            // Show delete button if entry has data OR if there are multiple entries for the day
                            (project.hours > 0 || project.description || project.projectId || day.projects.length > 1) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProjectFromDay(dayIndex, projectIndex)}
                                className="h-6 w-6 p-0"
                                title="Delete entry"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Add another project row */}
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addProjectToDay(dayIndex)}
                        disabled={!weeklyData.canEdit}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add another project
                      </Button>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              {weeklyData.status === 'submitted' && 'Timesheet submitted for approval'}
              {weeklyData.status === 'approved' && 'Timesheet approved - no further changes allowed'}
              {weeklyData.status === 'rejected' && 'Make changes and resubmit'}
              {weeklyData.status === 'draft' && 'Save your progress or submit for approval'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={
                  saveTimesheetMutation.isPending || 
                  weeklyData.status === 'approved' || 
                  !hasEditableEntries()
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {saveTimesheetMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitTimesheetMutation.isPending || 
                  weeklyData.totalHours === 0 || 
                  weeklyData.status === 'approved' ||
                  (weeklyData.status === 'submitted' && weeklyData.rejectionReason === '') ||
                  !hasEditableEntries()
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {submitTimesheetMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Submissions
          </CardTitle>
          <CardDescription>View your submitted timesheets grouped by week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submittedTimesheets?.length > 0 ? (
              (() => {
                // Group timesheets by week
                const groupedByWeek = submittedTimesheets.reduce((acc: any, timesheet: any) => {
                  const weekStart = timesheet.weekCommencing || timesheet.date;
                  if (!weekStart) return acc;
                  
                  const weekKey = format(startOfWeek(new Date(weekStart)), 'yyyy-MM-dd');
                  if (!acc[weekKey]) {
                    acc[weekKey] = {
                      weekStart: weekKey,
                      timesheets: [],
                      totalHours: 0,
                      status: 'draft'
                    };
                  }
                  
                  acc[weekKey].timesheets.push(timesheet);
                  acc[weekKey].totalHours += parseFloat(timesheet.hours) || 0;
                  
                  // Set the most recent status (prioritizing rejected > submitted > approved > draft)
                  const statusPriority = { rejected: 4, submitted: 3, approved: 2, draft: 1 };
                  const currentPriority = statusPriority[acc[weekKey].status as keyof typeof statusPriority] || 0;
                  const newPriority = statusPriority[timesheet.status as keyof typeof statusPriority] || 0;
                  if (newPriority > currentPriority) {
                    acc[weekKey].status = timesheet.status;
                  }
                  
                  return acc;
                }, {});

                // Sort weeks by most recent first
                const sortedWeeks = Object.values(groupedByWeek).sort((a: any, b: any) => 
                  new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
                );

                return sortedWeeks.slice(0, 8).map((week: any) => (
                  <div key={week.weekStart} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">
                          Week commencing {format(new Date(week.weekStart), 'dd MMM yyyy')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {week.totalHours.toFixed(1)} hours total • {week.timesheets.length} entries
                        </p>
                      </div>
                      <Badge 
                        variant={
                          week.status === 'approved' ? 'default' :
                          week.status === 'rejected' ? 'destructive' :
                          week.status === 'submitted' ? 'secondary' :
                          'outline'
                        }
                      >
                        {week.status === 'submitted' ? 'Pending Approval' : 
                         week.status.charAt(0).toUpperCase() + week.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {/* Show project breakdown for the week */}
                    <div className="space-y-2">
                      {week.timesheets.slice(0, 3).map((timesheet: any, index: number) => (
                        <div key={`${week.weekStart}-${index}`} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {timesheet.project?.name || 'Unknown Project'}
                          </span>
                          <span className="font-medium">{timesheet.hours}h</span>
                        </div>
                      ))}
                      {week.timesheets.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          + {week.timesheets.length - 3} more entries
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submitted timesheets yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your weekly hours above and submit for approval
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}