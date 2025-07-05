import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

interface RoleSwitcherProps {
  currentRole?: string;
}

export default function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return await apiRequest("POST", "/api/auth/role", { role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      // Refresh the page to reload with new role
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      console.error("Role update error:", error);
    },
  });

  const handleRoleChange = () => {
    if (selectedRole && selectedRole !== currentRole) {
      updateRoleMutation.mutate(selectedRole);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Switch Role (Testing)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Current Role: {currentRole}</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hospital_staff">Hospital Staff</SelectItem>
                <SelectItem value="blood_bank_staff">Blood Bank Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleRoleChange}
            disabled={!selectedRole || selectedRole === currentRole || updateRoleMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateRoleMutation.isPending ? "Switching..." : "Switch Role"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}