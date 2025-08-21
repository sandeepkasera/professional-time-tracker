import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimesheetSchema } from "@/db/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/hooks/use-toast";
import { apiRequest } from "@/app/lib/queryClient";
import { format } from "date-fns";
import type { z } from "zod";

type TimesheetFormData = z.infer<typeof insertTimesheetSchema>;

interface TimesheetFormProps {
  projects: any[];
  timesheet?: any;
  onSuccess: () => void;
}

export default function TimesheetForm({ projects, timesheet, onSuccess }: TimesheetFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(insertTimesheetSchema),
    defaultValues: {
      projectId: timesheet?.projectId || undefined,
      date: timesheet?.date || format(new Date(), "yyyy-MM-dd"),
      hours: timesheet?.hours || "",
      description: timesheet?.description || "",
      type: timesheet?.type || "billable",
      status: timesheet?.status || "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      const response = await apiRequest("POST", "/api/timesheets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet created successfully",
      });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create timesheet",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      const response = await apiRequest("PATCH", `/api/timesheets/${timesheet.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update timesheet",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimesheetFormData) => {
    if (timesheet) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name} {project.client && `(${project.client.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.5" 
                    min="0" 
                    max="24" 
                    placeholder="8.0" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ?? undefined}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="billable">Billable</SelectItem>
                    <SelectItem value="non_billable">Non-Billable</SelectItem>
                    <SelectItem value="admin">Administrative</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
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
                <Textarea 
                  rows={3} 
                  placeholder="Describe the work performed..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (timesheet ? "Updating..." : "Creating...") : (timesheet ? "Update Entry" : "Save Entry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
