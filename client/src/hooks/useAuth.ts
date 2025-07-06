import { useQuery } from "@tanstack/react-query";
import type { User, StaffDetails, DonorProfile } from "@shared/schema";

interface AuthUser extends User {
  roleDetails?: StaffDetails | DonorProfile | null;
}

export function useAuth() {
  // CHOOSE YOUR MOCK USER (hospital_staff or blood_bank_staff)
  const currentUserRole = 'hospital_staff';

  const mockHospitalStaff = {
    id: 'hospital-staff-01',
    email: 'hospital.staff@lifeline.com',
    firstName: 'Hospital',
    lastName: 'Staff',
    role: 'hospital_staff',
    profileImageUrl: 'https://www.w3schools.com/howto/img_avatar.png',
    roleDetails: {
      userId: 'hospital-staff-01',
      hospitalId: 1,
      bankId: null,
      jobTitle: 'Medical Staff',
      isAdmin: false,
    },
  };

  const mockBloodBankStaff = {
    id: 'bb-staff-01',
    email: 'bb.staff@lifeline.com',
    firstName: 'BloodBank',
    lastName: 'Staff',
    role: 'blood_bank_staff',
    profileImageUrl: 'https://www.w3schools.com/howto/img_avatar2.png',
    roleDetails: {
      userId: 'bb-staff-01',
      hospitalId: null,
      bankId: 1,
      jobTitle: 'Lab Technician',
      isAdmin: false,
    },
  };

  const mockUser = currentUserRole === 'hospital_staff' ? mockHospitalStaff : mockBloodBankStaff;

  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    refetch: () => {},
  };
}
