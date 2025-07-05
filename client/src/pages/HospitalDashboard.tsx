import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import HospitalSidebar from "@/components/HospitalSidebar";
import BloodRequestForm from "@/components/BloodRequestForm";
import RequestsTable from "@/components/RequestsTable";
import InventoryGrid from "@/components/InventoryGrid";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";

function HospitalDashboardContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats/requests'],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/blood-requests'],
  });

  // Type-safe data access
  const statsData = (stats && typeof stats === 'object') ? stats as { pending: number; approved: number; total: number } : { pending: 0, approved: 0, total: 0 };
  const requestsData = Array.isArray(recentRequests) ? recentRequests : [];

  if (statsLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospital Dashboard</h2>
        <p className="text-gray-600">Welcome back, {user?.firstName}. Manage your blood requests and track inventory.</p>
      </div>
      
      <RoleSwitcher currentRole={user?.role} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-600">{statsData?.pending || 0}</p>
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
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-green-600">{statsData?.approved || 0}</p>
              </div>
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">3</p>
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
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{statsData?.total || 0}</p>
              </div>
              <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestsTable requests={requestsData.slice(0, 5)} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function HospitalDashboard() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'hospital_staff') {
    return null;
  }

  return (
    <Layout sidebar={<HospitalSidebar />}>
      <Switch>
        <Route path="/" component={HospitalDashboardContent} />
        <Route path="/request" component={BloodRequestForm} />
        <Route path="/requests" component={() => <RequestsTable />} />
        <Route path="/inventory" component={() => <InventoryGrid />} />
      </Switch>
    </Layout>
  );
}
