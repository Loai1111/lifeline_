import { useQuery } from "@tanstack/react-query";
import type { User, StaffDetails, DonorProfile } from "@shared/schema";

interface AuthUser extends User {
  roleDetails?: StaffDetails | DonorProfile | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
