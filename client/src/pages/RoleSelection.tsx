import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { toast } = useToast();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return apiRequest("POST", "/api/auth/role", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role updated successfully",
        description: "You can now access your dashboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    updateRoleMutation.mutate(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-red-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-6">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Welcome to Lifeline</h1>
          <p className="text-xl text-blue-100 mb-8">
            Please select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <CardHeader className="p-0">
                <CardTitle className="text-xl font-semibold text-white mb-3">
                  Hospital Staff
                </CardTitle>
              </CardHeader>
              <p className="text-blue-100 mb-6">
                Submit blood requests, track status, and manage patient needs efficiently
              </p>
              <Button
                onClick={() => handleRoleSelect("hospital_staff")}
                disabled={updateRoleMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateRoleMutation.isPending && selectedRole === "hospital_staff" ? "Selecting..." : "Select Role"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <CardHeader className="p-0">
                <CardTitle className="text-xl font-semibold text-white mb-3">
                  Blood Bank Staff
                </CardTitle>
              </CardHeader>
              <p className="text-blue-100 mb-6">
                Manage inventory, process requests, and coordinate with hospitals
              </p>
              <Button
                onClick={() => handleRoleSelect("blood_bank_staff")}
                disabled={updateRoleMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {updateRoleMutation.isPending && selectedRole === "blood_bank_staff" ? "Selecting..." : "Select Role"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <CardHeader className="p-0">
                <CardTitle className="text-xl font-semibold text-white mb-3">
                  Donor
                </CardTitle>
              </CardHeader>
              <p className="text-blue-100 mb-6">
                Track donations, check eligibility, and respond to urgent needs
              </p>
              <Button
                onClick={() => handleRoleSelect("donor")}
                disabled={updateRoleMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {updateRoleMutation.isPending && selectedRole === "donor" ? "Selecting..." : "Select Role"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}