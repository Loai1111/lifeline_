import {
  users,
  bloodRequests,
  bloodBags,
  healthScreenings,
  hospitals,
  bloodBanks,
  staffDetails,
  donorProfiles,
  bloodRequestItems,
  type User,
  type UpsertUser,
  type BloodRequest,
  type InsertBloodRequest,
  type BloodBag,
  type InsertBloodBag,
  type HealthScreening,
  type InsertHealthScreening,
  type Hospital,
  type BloodBank,
  type StaffDetails,
  type DonorProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;
  
  // Blood request operations
  createBloodRequest(request: InsertBloodRequest): Promise<BloodRequest>;
  getBloodRequests(hospitalId?: number): Promise<BloodRequest[]>;
  getBloodRequestById(id: number): Promise<BloodRequest | undefined>;
  updateBloodRequestStatus(id: number, status: string): Promise<void>;
  
  // Workflow operations
  findSuitableBags(bloodType: string, count: number): Promise<BloodBag[]>;
  allocateBagToRequest(requestId: number, bagId: string): Promise<void>;
  confirmCrossmatch(requestId: number, bagId: string, successful: boolean): Promise<void>;
  dispatchAllocatedBag(requestId: number, bagId: string): Promise<void>;
  
  // Blood bag operations
  createBloodBag(bag: InsertBloodBag): Promise<BloodBag>;
  getBloodBags(bankId?: number): Promise<BloodBag[]>;
  getAvailableBloodBags(bloodType?: string): Promise<BloodBag[]>;
  updateBloodBagStatus(id: string, status: string): Promise<void>;
  
  // Health screening operations
  createHealthScreening(screening: InsertHealthScreening): Promise<HealthScreening>;
  getHealthScreenings(donorId?: string): Promise<HealthScreening[]>;
  
  // Hospital operations
  getHospitals(): Promise<Hospital[]>;
  getHospitalById(id: number): Promise<Hospital | undefined>;
  
  // Blood bank operations
  getBloodBanks(): Promise<BloodBank[]>;
  getBloodBankById(id: number): Promise<BloodBank | undefined>;
  
  // Staff operations
  getStaffDetails(userId: string): Promise<StaffDetails | undefined>;
  createStaffDetails(details: typeof staffDetails.$inferInsert): Promise<StaffDetails>;
  
  // Donor operations
  getDonorProfile(userId: string): Promise<DonorProfile | undefined>;
  createDonorProfile(profile: typeof donorProfiles.$inferInsert): Promise<DonorProfile>;
  
  // Statistics
  getBloodInventoryStats(bankId?: number): Promise<Array<{ bloodType: string; count: number; status: string }>>;
  getRequestStats(hospitalId?: number): Promise<{ pending: number; approved: number; total: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Blood request operations
  async createBloodRequest(request: InsertBloodRequest): Promise<BloodRequest> {
    const [bloodRequest] = await db
      .insert(bloodRequests)
      .values(request)
      .returning();
    return bloodRequest;
  }

  async getBloodRequests(hospitalId?: number): Promise<BloodRequest[]> {
    if (hospitalId) {
      return await db
        .select()
        .from(bloodRequests)
        .where(eq(bloodRequests.hospitalId, hospitalId))
        .orderBy(desc(bloodRequests.createdAt));
    }
    
    return await db
      .select()
      .from(bloodRequests)
      .orderBy(desc(bloodRequests.createdAt));
  }

  async getBloodRequestById(id: number): Promise<BloodRequest | undefined> {
    const [request] = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.id, id));
    return request;
  }

  async updateBloodRequestStatus(id: number, status: string): Promise<void> {
    await db
      .update(bloodRequests)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bloodRequests.id, id));
  }

  // Blood bag operations
  async createBloodBag(bag: InsertBloodBag): Promise<BloodBag> {
    const [bloodBag] = await db
      .insert(bloodBags)
      .values(bag)
      .returning();
    return bloodBag;
  }

  async getBloodBags(bankId?: number): Promise<BloodBag[]> {
    if (bankId) {
      return await db
        .select()
        .from(bloodBags)
        .where(eq(bloodBags.bankId, bankId))
        .orderBy(asc(bloodBags.expiryDate));
    }
    
    return await db
      .select()
      .from(bloodBags)
      .orderBy(asc(bloodBags.expiryDate));
  }

  async getAvailableBloodBags(bloodType?: string): Promise<BloodBag[]> {
    if (bloodType) {
      return await db
        .select()
        .from(bloodBags)
        .where(and(
          eq(bloodBags.status, "Available"),
          eq(bloodBags.bloodType, bloodType as any)
        ))
        .orderBy(asc(bloodBags.expiryDate));
    }
    
    return await db
      .select()
      .from(bloodBags)
      .where(eq(bloodBags.status, "Available"))
      .orderBy(asc(bloodBags.expiryDate));
  }

  async updateBloodBagStatus(id: string, status: string): Promise<void> {
    await db
      .update(bloodBags)
      .set({ status: status as any })
      .where(eq(bloodBags.id, id));
  }

  // Health screening operations
  async createHealthScreening(screening: InsertHealthScreening): Promise<HealthScreening> {
    const [healthScreening] = await db
      .insert(healthScreenings)
      .values(screening)
      .returning();
    return healthScreening;
  }

  async getHealthScreenings(donorId?: string): Promise<HealthScreening[]> {
    const query = db
      .select()
      .from(healthScreenings)
      .orderBy(desc(healthScreenings.screeningDate));
    
    if (donorId) {
      return await query.where(eq(healthScreenings.donorId, donorId));
    }
    return await query;
  }

  // Hospital operations
  async getHospitals(): Promise<Hospital[]> {
    return await db.select().from(hospitals);
  }

  async getHospitalById(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, id));
    return hospital;
  }

  // Blood bank operations
  async getBloodBanks(): Promise<BloodBank[]> {
    return await db.select().from(bloodBanks);
  }

  async getBloodBankById(id: number): Promise<BloodBank | undefined> {
    const [bank] = await db
      .select()
      .from(bloodBanks)
      .where(eq(bloodBanks.id, id));
    return bank;
  }

  // Staff operations
  async getStaffDetails(userId: string): Promise<StaffDetails | undefined> {
    const [staff] = await db
      .select()
      .from(staffDetails)
      .where(eq(staffDetails.userId, userId));
    return staff;
  }

  async createStaffDetails(details: typeof staffDetails.$inferInsert): Promise<StaffDetails> {
    const [staff] = await db
      .insert(staffDetails)
      .values(details)
      .returning();
    return staff;
  }

  // Donor operations
  async getDonorProfile(userId: string): Promise<DonorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, userId));
    return profile;
  }

  async createDonorProfile(profile: typeof donorProfiles.$inferInsert): Promise<DonorProfile> {
    const [donorProfile] = await db
      .insert(donorProfiles)
      .values(profile)
      .returning();
    return donorProfile;
  }

  // Statistics
  async getBloodInventoryStats(bankId?: number): Promise<Array<{ bloodType: string; count: number; status: string }>> {
    const query = db
      .select({
        bloodType: bloodBags.bloodType,
        count: count(),
        status: bloodBags.status,
      })
      .from(bloodBags)
      .groupBy(bloodBags.bloodType, bloodBags.status);
    
    if (bankId) {
      return await query.where(eq(bloodBags.bankId, bankId));
    }
    return await query;
  }

  async getRequestStats(hospitalId?: number): Promise<{ pending: number; approved: number; total: number }> {
    const query = db
      .select({
        status: bloodRequests.status,
        count: count(),
      })
      .from(bloodRequests)
      .groupBy(bloodRequests.status);
    
    const results = hospitalId 
      ? await query.where(eq(bloodRequests.hospitalId, hospitalId))
      : await query;
    
    const stats = {
      pending: 0,
      approved: 0,
      total: 0,
    };
    
    results.forEach(result => {
      stats.total += result.count;
      if (result.status === "Pending") {
        stats.pending = result.count;
      } else if (["Allocated", "Issued", "Fulfilled"].includes(result.status)) {
        stats.approved += result.count;
      }
    });
    
    return stats;
  }

  async findSuitableBags(bloodType: string, count: number): Promise<BloodBag[]> {
    const bags = await db.select()
      .from(bloodBags)
      .where(and(
        eq(bloodBags.bloodType, bloodType as any),
        eq(bloodBags.status, 'Available')
      ))
      .limit(count);
    
    return bags;
  }

  async allocateBagToRequest(requestId: number, bagId: string): Promise<void> {
    await db.update(bloodBags)
      .set({ status: 'Reserved' })
      .where(eq(bloodBags.id, bagId));
  }

  async confirmCrossmatch(requestId: number, bagId: string, successful: boolean): Promise<void> {
    if (successful) {
      await db.update(bloodBags)
        .set({ status: 'Crossmatched' })
        .where(eq(bloodBags.id, bagId));
      
      await db.update(bloodRequests)
        .set({ status: 'Allocated' })
        .where(eq(bloodRequests.id, requestId));
    } else {
      await db.update(bloodBags)
        .set({ status: 'Available' })
        .where(eq(bloodBags.id, bagId));
      
      await db.update(bloodRequests)
        .set({ status: 'Escalated_To_Donors' })
        .where(eq(bloodRequests.id, requestId));
    }
  }

  async dispatchAllocatedBag(requestId: number, bagId: string): Promise<void> {
    await db.update(bloodBags)
      .set({ status: 'Issued' })
      .where(eq(bloodBags.id, bagId));
    
    await db.update(bloodRequests)
      .set({ status: 'Issued' })
      .where(eq(bloodRequests.id, requestId));
  }
}

export const storage = new DatabaseStorage();
