"use client"
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Check, X, Eye, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/app/hooks/use-toast";
import { apiRequest } from "@/app/lib/queryClient";
import { useAuth } from "@/app/hooks/useAuth";

export default function Approvals() {
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showGroupRejectModal, setShowGroupRejectModal] = useState(false);
  const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [groupToReject, setGroupToReject] = useState<any>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingTimesheets, isLoading, refetch } = useQuery({
    queryKey: ["/api/timesheets/pending"],
    queryFn: () => apiRequest("GET", "/api/timesheets/pending").then(res => res.json()),
    enabled: user?.role === "project_manager" || user?.role === "admin",
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Consider data stale immediately to ensure fresh data
  });

  // Refetch data when component mounts or becomes visible
  useEffect(() => {
    if (user?.role === "project_manager" || user?.role === "admin") {
      refetch();
    }
  }, [user?.role, refetch]);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/timesheets/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/manager"] });
      toast({
        title: "Success",
        description: "Timesheet approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve timesheet",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/timesheets/${id}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/manager"] });
      toast({
        title: "Success",
        description: "Timesheet rejected successfully",
      });
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedTimesheet(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject timesheet",
        variant: "destructive",
      });
    },
  });

  const groupApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map(id => 
        apiRequest("POST", `/api/timesheets/${id}/approve`).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/manager"] });
      toast({
        title: "Success",
        description: `${ids.length} timesheets approved successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve timesheets",
        variant: "destructive",
      });
    },
  });

  const groupRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[]; reason: string }) => {
      const promises = ids.map(id => 
        apiRequest("POST", `/api/timesheets/${id}/reject`, { reason }).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/manager"] });
      toast({
        title: "Success",
        description: `${ids.length} timesheets rejected successfully`,
      });
      setShowGroupRejectModal(false);
      setRejectionReason("");
      setGroupToReject(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject timesheets",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (timesheet: any) => {
    setSelectedTimesheet(timesheet);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ id: selectedTimesheet.id, reason: rejectionReason });
  };

  const handleBulkApprove = () => {
    if (selectedTimesheets.length === 0) return;
    groupApproveMutation.mutate(selectedTimesheets);
    setSelectedTimesheets([]);
  };

  const handleBulkReject = () => {
    if (selectedTimesheets.length === 0) return;
    setShowBulkRejectModal(true);
  };

  // const confirmBulkReject = () => {
  //   if (!rejectionReason.trim()) {
  //     toast({
  //       title: "Error",
  //       description: "Please provide a reason for rejection",
  //       variant: "destructive",
  //     });
  //     return;
  //   }
  //   bulkRejectMutation.mutate({ ids: selectedTimesheets, reason: rejectionReason });
  // };

  const handleSelectTimesheet = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedTimesheets([...selectedTimesheets, id]);
    } else {
      setSelectedTimesheets(selectedTimesheets.filter(tsId => tsId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = pendingTimesheets?.map((ts: any) => ts.id) || [];
      setSelectedTimesheets(allIds);
    } else {
      setSelectedTimesheets([]);
    }
  };



  const getTypeBadge = (type: string) => {
    const colors = {
      billable: "bg-primary-100 text-primary-800",
      non_billable: "bg-gray-100 text-gray-800",
      admin: "bg-purple-100 text-purple-800",
      training: "bg-blue-100 text-blue-800",
    } as const;

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  // Check if user has permission to approve timesheets
  if (user?.role !== "project_manager" && user?.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">You don't have permission to access this page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPendingHours = pendingTimesheets?.reduce((sum: number, ts: any) => sum + parseFloat(ts.hours || 0), 0) || 0;



  // Group timesheets by user
  const groupedTimesheets = pendingTimesheets?.reduce((groups: any, timesheet: any) => {
    const userId = timesheet.userId;
    if (!groups[userId]) {
      groups[userId] = {
        user: timesheet.user,
        timesheets: [],
        totalHours: 0,
      };
    }
    groups[userId].timesheets.push(timesheet);
    groups[userId].totalHours += parseFloat(timesheet.hours || 0);
    return groups;
  }, {}) || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timesheet Approvals</h1>
        <p className="text-gray-500 mt-1">Review and approve pending timesheet submissions</p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning-500" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            {pendingTimesheets?.length || 0} timesheets waiting for your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning-600">
            {totalPendingHours.toFixed(1)} hours
          </div>
          <p className="text-sm text-gray-500">Total pending hours</p>
        </CardContent>
      </Card>



      {/* Pending Timesheets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Timesheet Submissions
                {isLoading && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                    Refreshing...
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Review team timesheet entries and provide approvals. Data refreshes automatically every 30 seconds and when switching tabs.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkApprove}
                disabled={selectedTimesheets.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve All ({selectedTimesheets.length})
              </Button>
              <Button
                onClick={handleBulkReject}
                disabled={selectedTimesheets.length === 0}
                variant="destructive"
                className="disabled:bg-gray-300 disabled:text-gray-500"
              >
                <X className="h-4 w-4 mr-2" />
                Reject All ({selectedTimesheets.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !pendingTimesheets || pendingTimesheets.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-12 w-12 text-success-500 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No pending approvals</p>
              <p className="text-sm text-gray-400">All timesheets have been processed</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTimesheets).map(([userId, group]: [string, any]) => {
                const userTimesheetIds = group.timesheets.map((ts: any) => ts.id);
                const isGroupSelected = userTimesheetIds.every((id: number) => selectedTimesheets.includes(id));
                const isGroupPartiallySelected = userTimesheetIds.some((id: number) => selectedTimesheets.includes(id)) && !isGroupSelected;

                const handleGroupSelect = (checked: boolean) => {
                  if (checked) {
                    const newSelected = [...selectedTimesheets, ...userTimesheetIds.filter((id: number) => !selectedTimesheets.includes(id))];
                    setSelectedTimesheets(newSelected);
                  } else {
                    setSelectedTimesheets(selectedTimesheets.filter((id: number) => !userTimesheetIds.includes(id)));
                  }
                };

                return (
                  <Card key={userId} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isGroupSelected}
                            onCheckedChange={handleGroupSelect}
                            className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                            style={{
                              backgroundColor: isGroupPartiallySelected && !isGroupSelected ? 'var(--primary)' : undefined,
                            }}
                          />
                          <div>
                            <h3 className="text-lg font-semibold">
                              {group.user?.firstName} {group.user?.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">{group.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{group.totalHours.toFixed(1)} hours</p>
                            <p className="text-sm text-gray-500">{group.timesheets.length} entries</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const groupIds = group.timesheets.map((ts: any) => ts.id);
                                groupApproveMutation.mutate(groupIds);
                              }}
                              disabled={groupApproveMutation.isPending}
                              className="bg-success-600 hover:bg-success-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve All
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setGroupToReject(group);
                                setShowGroupRejectModal(true);
                              }}
                              disabled={groupRejectMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject All
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.timesheets.map((timesheet: any) => (
                            <TableRow key={timesheet.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedTimesheets.includes(timesheet.id)}
                                  onCheckedChange={(checked) => handleSelectTimesheet(timesheet.id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {format(new Date(timesheet.date), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{timesheet.project?.name}</p>
                                  {timesheet.project?.client && (
                                    <p className="text-sm text-gray-500">{timesheet.project.client.name}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{timesheet.hours}</TableCell>
                              <TableCell>{getTypeBadge(timesheet.type)}</TableCell>
                              <TableCell className="max-w-xs">
                                <p className="truncate" title={timesheet.description}>
                                  {timesheet.description}
                                </p>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(timesheet.id)}
                                    disabled={approveMutation.isPending}
                                    className="text-success-600 border-success-200 hover:bg-success-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(timesheet)}
                                    disabled={rejectMutation.isPending}
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Rejection</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a clear reason for rejecting this timesheet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Timesheet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Reject Modal */}
      <Dialog open={showGroupRejectModal} onOpenChange={setShowGroupRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject All Timesheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to reject {groupToReject?.timesheets?.length || 0} timesheet{groupToReject?.timesheets?.length !== 1 ? 's' : ''} for {groupToReject?.user?.firstName} {groupToReject?.user?.lastName}. 
              Please provide a reason for rejection:
            </p>
            <div className="space-y-2">
              <Label htmlFor="group-rejection-reason">Reason for rejection</Label>
              <Textarea
                id="group-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why these timesheets are being rejected..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupRejectModal(false);
                  setRejectionReason("");
                  setGroupToReject(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (groupToReject) {
                    const groupIds = groupToReject.timesheets.map((ts: any) => ts.id);
                    groupRejectMutation.mutate({ ids: groupIds, reason: rejectionReason });
                  }
                }}
                disabled={groupRejectMutation.isPending || !rejectionReason.trim()}
              >
                {groupRejectMutation.isPending ? "Rejecting..." : "Reject Timesheets"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Approval Confirmation Dialog */}
      <Dialog open={showBulkApprovalModal} onOpenChange={setShowBulkApprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to approve {selectedTimesheets.length} timesheet{selectedTimesheets.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkApprovalModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedTimesheets.length === 0) return;
                  groupApproveMutation.mutate(selectedTimesheets);
                  setSelectedTimesheets([]);
                  setShowBulkApprovalModal(false);
                }}
                disabled={groupApproveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {groupApproveMutation.isPending ? "Approving..." : "Approve All"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Rejection Confirmation Dialog */}
      <Dialog open={showBulkRejectModal} onOpenChange={setShowBulkRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Rejection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to reject {selectedTimesheets.length} timesheet{selectedTimesheets.length !== 1 ? 's' : ''}?
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-rejection-reason">Reason for rejection</Label>
              <Textarea
                id="bulk-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting these timesheets..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast({
                      title: "Error",
                      description: "Please provide a reason for rejection",
                      variant: "destructive",
                    });
                    return;
                  }
                  groupRejectMutation.mutate({ ids: selectedTimesheets, reason: rejectionReason });
                  setSelectedTimesheets([]);
                  setRejectionReason("");
                  setShowBulkRejectModal(false);
                }}
                disabled={groupRejectMutation.isPending || !rejectionReason.trim()}
              >
                {groupRejectMutation.isPending ? "Rejecting..." : "Reject All"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
