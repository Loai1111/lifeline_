import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Clock, Send, X, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BloodRequest {
  id: number;
  hospitalId: number;
  staffId: string;
  patientName: string;
  bloodType: string;
  unitsRequested: number;
  priority: string;
  status: string;
  requiredBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BloodRequestWorkflowProps {
  request: BloodRequest;
  userRole: string;
}

const statusConfig = {
  'Pending': { 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: Clock, 
    description: 'Waiting for blood bank processing' 
  },
  'Pending_Crossmatch': { 
    color: 'bg-blue-100 text-blue-800', 
    icon: Clock, 
    description: 'Suitable bags found, awaiting crossmatch' 
  },
  'Escalated_To_Donors': { 
    color: 'bg-orange-100 text-orange-800', 
    icon: AlertTriangle, 
    description: 'No suitable bags available or crossmatch failed' 
  },
  'Allocated': { 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle, 
    description: 'Crossmatch successful, bags allocated' 
  },
  'Issued': { 
    color: 'bg-purple-100 text-purple-800', 
    icon: Send, 
    description: 'Bags dispatched to hospital' 
  },
  'Fulfilled': { 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle, 
    description: 'Blood received by hospital' 
  },
  'Cancelled_By_Hospital': { 
    color: 'bg-gray-100 text-gray-800', 
    icon: X, 
    description: 'Request cancelled by hospital' 
  },
  'Rejected_By_Bloodbank': { 
    color: 'bg-red-100 text-red-800', 
    icon: X, 
    description: 'Request rejected by blood bank' 
  }
};

export default function BloodRequestWorkflow({ request, userRole }: BloodRequestWorkflowProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processRequest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/process`, 'POST');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Request processed", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const confirmCrossmatch = useMutation({
    mutationFn: async (successful: boolean) => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/crossmatch`, 'POST', { bagId: 'BAG001', successful });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Crossmatch confirmed", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const dispatchBag = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/dispatch`, 'POST', { bagId: 'BAG001' });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Bag dispatched", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/reject`, 'POST', { reason: rejectReason });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Request rejected", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
      setShowRejectForm(false);
      setRejectReason('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const cancelRequest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/cancel`, 'POST');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Request cancelled", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const confirmReceived = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/blood-requests/${request.id}/received`, 'POST');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Blood received", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/blood-requests'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const statusInfo = statusConfig[request.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || AlertCircle;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Request #{request.id}</CardTitle>
          <Badge className={statusInfo?.color}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {request.status.replace('_', ' ')}
          </Badge>
        </div>
        <CardDescription>
          {request.patientName} • {request.bloodType} • {request.unitsRequested} units • {request.priority}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          {statusInfo?.description}
        </div>
        
        <div className="text-sm">
          <strong>Required by:</strong> {new Date(request.requiredBy).toLocaleDateString()}
        </div>

        {userRole === 'blood_bank_staff' && (
          <div className="space-y-2">
            {request.status === 'Pending' && (
              <Button 
                onClick={() => processRequest.mutate()}
                disabled={processRequest.isPending}
                className="w-full"
              >
                {processRequest.isPending ? 'Processing...' : 'Process Request'}
              </Button>
            )}
            
            {request.status === 'Pending_Crossmatch' && (
              <div className="space-y-2">
                <Button 
                  onClick={() => confirmCrossmatch.mutate(true)}
                  disabled={confirmCrossmatch.isPending}
                  className="w-full"
                >
                  {confirmCrossmatch.isPending ? 'Confirming...' : 'Confirm Crossmatch Success'}
                </Button>
                <Button 
                  onClick={() => confirmCrossmatch.mutate(false)}
                  disabled={confirmCrossmatch.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {confirmCrossmatch.isPending ? 'Confirming...' : 'Confirm Crossmatch Failed'}
                </Button>
              </div>
            )}
            
            {request.status === 'Allocated' && (
              <Button 
                onClick={() => dispatchBag.mutate()}
                disabled={dispatchBag.isPending}
                className="w-full"
              >
                {dispatchBag.isPending ? 'Dispatching...' : 'Dispatch Bag'}
              </Button>
            )}
            
            {['Pending', 'Pending_Crossmatch', 'Allocated'].includes(request.status) && (
              <div className="space-y-2">
                {!showRejectForm ? (
                  <Button 
                    onClick={() => setShowRejectForm(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    Reject Request
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => rejectRequest.mutate()}
                        disabled={rejectRequest.isPending || !rejectReason}
                        variant="destructive"
                        className="flex-1"
                      >
                        {rejectRequest.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                      </Button>
                      <Button 
                        onClick={() => setShowRejectForm(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {userRole === 'hospital_staff' && (
          <div className="space-y-2">
            {request.status === 'Issued' && (
              <Button 
                onClick={() => confirmReceived.mutate()}
                disabled={confirmReceived.isPending}
                className="w-full"
              >
                {confirmReceived.isPending ? 'Confirming...' : 'Confirm Received'}
              </Button>
            )}
            
            {['Pending', 'Pending_Crossmatch'].includes(request.status) && (
              <Button 
                onClick={() => cancelRequest.mutate()}
                disabled={cancelRequest.isPending}
                variant="outline"
                className="w-full"
              >
                {cancelRequest.isPending ? 'Cancelling...' : 'Cancel Request'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}