import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import HospitalDashboard from "@/pages/HospitalDashboard";
import BloodBankDashboard from "@/pages/BloodBankDashboard";
import DonorDashboard from "@/pages/DonorDashboard";
import RoleSelection from "@/pages/RoleSelection";

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Switch>
        <Route path="/">
          {() => {
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
            if (!isAuthenticated) {
              return <Landing />;
            }
            if (user?.role === 'hospital_staff') {
              return <Redirect to="/hospital" />;
            }
            if (user?.role === 'blood_bank_staff') {
              return <Redirect to="/blood-bank" />;
            }
            if (user?.role === 'donor') {
              return <Redirect to="/donor" />;
            }
            return <RoleSelection />;
          }}
        </Route>
        <Route path="/role-selection" component={RoleSelection} />
        <Route path="/hospital/:rest*" component={HospitalDashboard} />
        <Route path="/blood-bank/:rest*" component={BloodBankDashboard} />
        <Route path="/donor/:rest*" component={DonorDashboard} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}

export default App;
