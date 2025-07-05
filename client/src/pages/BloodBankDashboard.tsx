import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import BloodBankSidebar from "@/components/BloodBankSidebar";
import BloodRequestWorkflow from "@/components/BloodRequestWorkflow";
import InventoryGrid from "@/components/InventoryGrid";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Clock, AlertTriangle, Users } from "lucide-react";

function BloodRequestWorkflowSection() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/blood-requests'],
    enabled: user?.role === 'blood_bank_staff'
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading requests...</div>;
  }

  const allRequests = requests || [];

  if (allRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No blood requests at the moment
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allRequests.map((request: any) => (
        <BloodRequestWorkflow 
          key={request.id} 
          request={request} 
          userRole={user?.role || ''}
        />
      ))}
    </div>
  );
}

function BloodBankDashboardContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: inventoryStats, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/stats/inventory'],
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const { data: requestStats, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/stats/requests'],
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  if (inventoryLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const totalUnits = inventoryStats?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
  const criticalTypes = inventoryStats?.filter((item: any) => item.count < 50).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Blood Bank Dashboard</h2>
        <p className="text-gray-600">Monitor inventory levels, manage requests, and track donor activities.</p>
      </div>
      
      <RoleSwitcher currentRole={user?.role} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Units</p>
                <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
              </div>
              <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center">
                <Droplets className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-600">{requestStats?.pending || 0}</p>
              </div>
              <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">{criticalTypes}</p>
              </div>
              <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Donors This Month</p>
                <p className="text-2xl font-bold text-green-600">89</p>
              </div>
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blood Type Inventory and Request Workflow */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Blood Type Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryGrid stats={inventoryStats} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Blood Request Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            <BloodRequestWorkflowSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BloodBankDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'blood_bank_staff') {
    return null;
  }

  return (
    <Layout sidebar={<BloodBankSidebar />}>
      <Switch>
        <Route path="/" component={BloodBankDashboardContent} />
        <Route path="/blood-bank" component={BloodBankDashboardContent} />
        <Route path="/blood-bank/requests" component={() => <RequestsTable showActions={true} />} />
        <Route path="/blood-bank/inventory" component={() => <InventoryGrid showActions={true} />} />
      </Switch>
    </Layout>
  );
}
