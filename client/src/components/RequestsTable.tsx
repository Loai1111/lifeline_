import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Check, X } from "lucide-react";
import { format } from "date-fns";
import type { BloodRequest } from "@shared/schema";

interface RequestsTableProps {
  requests?: BloodRequest[];
  showActions?: boolean;
}

export default function RequestsTable({ requests: propRequests, showActions = false }: RequestsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<BloodRequest[]>({
    queryKey: ['/api/blood-requests'],
    enabled: !propRequests,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PUT", `/api/blood-requests/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/requests'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    },
  });

  const displayRequests = propRequests || requests || [];

  const getBloodTypeColor = (bloodType: string) => {
    const colors: { [key: string]: string } = {
      'A+': 'bg-blue-600',
      'A-': 'bg-blue-500',
      'B+': 'bg-green-600',
      'B-': 'bg-green-500',
      'AB+': 'bg-purple-600',
      'AB-': 'bg-purple-500',
      'O+': 'bg-orange-600',
      'O-': 'bg-red-600',
    };
    return colors[bloodType] || 'bg-gray-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Emergency': return 'bg-red-100 text-red-800';
      case 'Urgent': return 'bg-orange-100 text-orange-800';
      case 'Routine': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Cross-matched': return 'bg-blue-100 text-blue-800';
      case 'Fulfilled': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (displayRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blood Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No blood requests found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showActions ? "Incoming Requests" : "Blood Requests"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Blood Type</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Required By</TableHead>
              {showActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  #REQ-{request.id.toString().padStart(6, '0')}
                </TableCell>
                <TableCell>{request.patientName}</TableCell>
                <TableCell>
                  <Badge className={`${getBloodTypeColor(request.bloodType)} text-white`}>
                    {request.bloodType}
                  </Badge>
                </TableCell>
                <TableCell>{request.unitsRequested}</TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(request.requiredBy), 'MMM d, yyyy HH:mm')}
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex space-x-2">
                      {request.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'Approved' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'Rejected' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
