import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import HospitalDashboard from "@/pages/HospitalDashboard";
import BloodBankDashboard from "@/pages/BloodBankDashboard";
import DonorDashboard from "@/pages/DonorDashboard";
import RoleSelection from "@/pages/RoleSelection";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={() => {
            if (user?.role === 'hospital_staff') {
              return <HospitalDashboard />;
            } else if (user?.role === 'blood_bank_staff') {
              return <BloodBankDashboard />;
            } else {
              // For donors or users without a role, show role selection
              // Since donors are mobile-only, web users need to select hospital/blood bank
              return <RoleSelection />;
            }
          }} />
          <Route path="/role-selection" component={RoleSelection} />
          <Route path="/hospital/*" component={HospitalDashboard} />
          <Route path="/blood-bank/*" component={BloodBankDashboard} />
          <Route path="/donor/*" component={DonorDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
