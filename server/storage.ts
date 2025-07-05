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
    // Priority-based ordering: Emergency > Urgent > Routine, then by creation time (earliest first)
    const orderByClauses = [
      sql`CASE 
        WHEN ${bloodRequests.priority} = 'Emergency' THEN 1
        WHEN ${bloodRequests.priority} = 'Urgent' THEN 2  
        WHEN ${bloodRequests.priority} = 'Routine' THEN 3
        ELSE 4
      END`,
      bloodRequests.createdAt // Then by timestamp (earliest first)
    ];

    if (hospitalId) {
      return await db
        .select()
        .from(bloodRequests)
        .where(eq(bloodRequests.hospitalId, hospitalId))
        .orderBy(...orderByClauses);
    }
    
    return await db
      .select()
      .from(bloodRequests)
      .orderBy(...orderByClauses);
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
    // FEFO (First Expired, First Out) - sort by expiry date ascending
    const bags = await db.select()
      .from(bloodBags)
      .where(and(
        eq(bloodBags.bloodType, bloodType as any),
        eq(bloodBags.status, 'Available')
      ))
      .orderBy(bloodBags.expiryDate) // FEFO - earliest expiry first
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

// In-memory storage for development
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private bloodRequests: Map<number, BloodRequest> = new Map();
  private bloodBags: Map<string, BloodBag> = new Map();
  private healthScreenings: Map<number, HealthScreening> = new Map();
  private hospitals: Hospital[] = [];
  private bloodBanks: BloodBank[] = [];
  private staffDetails: Map<string, StaffDetails> = new Map();
  private donorProfiles: Map<string, DonorProfile> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample hospitals
    this.hospitals = [
      { id: 1, name: 'General Hospital', address: '123 Main St', city: 'Springfield', contactPhone: '555-0101' },
      { id: 2, name: 'Regional Medical Center', address: '456 Oak Ave', city: 'Springfield', contactPhone: '555-0102' }
    ];

    // Sample blood banks
    this.bloodBanks = [
      { id: 1, name: 'Central Blood Bank', address: '789 Pine St', city: 'Springfield', contactPhone: '555-0201', operatingHours: '24/7' },
      { id: 2, name: 'Community Blood Center', address: '321 Elm St', city: 'Springfield', contactPhone: '555-0202', operatingHours: '9AM-5PM' }
    ];

    // Sample blood bags
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    bloodTypes.forEach((type, idx) => {
      for (let i = 0; i < 3; i++) {
        const bagId = `BAG-${type}-${i + 1}`;
        this.bloodBags.set(bagId, {
          id: bagId,
          donorId: `donor-${idx}-${i}`,
          healthScreeningId: 1,
          bankId: 1,
          bloodType: type as any,
          componentType: 'Whole Blood',
          collectionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Available'
        });
      }
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: any): Promise<User> {
    const user = {
      ...userData,
      createdAt: this.users.get(userData.id)?.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.role = role as any;
      user.updatedAt = new Date();
    }
  }

  async createBloodRequest(request: any): Promise<BloodRequest> {
    const newRequest = {
      id: this.nextId++,
      ...request,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.bloodRequests.set(newRequest.id, newRequest);
    return newRequest;
  }

  async getBloodRequests(hospitalId?: number): Promise<BloodRequest[]> {
    const requests = Array.from(this.bloodRequests.values());
    if (hospitalId) {
      return requests.filter(r => r.hospitalId === hospitalId);
    }
    return requests;
  }

  async getBloodRequestById(id: number): Promise<BloodRequest | undefined> {
    return this.bloodRequests.get(id);
  }

  async updateBloodRequestStatus(id: number, status: string): Promise<void> {
    const request = this.bloodRequests.get(id);
    if (request) {
      request.status = status as any;
      request.updatedAt = new Date();
    }
  }

  async createBloodBag(bag: any): Promise<BloodBag> {
    const newBag = {
      ...bag,
      collectionDate: new Date()
    };
    this.bloodBags.set(bag.id, newBag);
    return newBag;
  }

  async getBloodBags(bankId?: number): Promise<BloodBag[]> {
    const bags = Array.from(this.bloodBags.values());
    if (bankId) {
      return bags.filter(b => b.bankId === bankId);
    }
    return bags;
  }

  async getAvailableBloodBags(bloodType?: string): Promise<BloodBag[]> {
    const bags = Array.from(this.bloodBags.values()).filter(b => b.status === 'Available');
    if (bloodType) {
      return bags.filter(b => b.bloodType === bloodType);
    }
    return bags;
  }

  async updateBloodBagStatus(id: string, status: string): Promise<void> {
    const bag = this.bloodBags.get(id);
    if (bag) {
      bag.status = status as any;
    }
  }

  async createHealthScreening(screening: any): Promise<HealthScreening> {
    const newScreening = {
      id: this.nextId++,
      ...screening,
      screeningDate: new Date()
    };
    this.healthScreenings.set(newScreening.id, newScreening);
    return newScreening;
  }

  async getHealthScreenings(donorId?: string): Promise<HealthScreening[]> {
    const screenings = Array.from(this.healthScreenings.values());
    if (donorId) {
      return screenings.filter(s => s.donorId === donorId);
    }
    return screenings;
  }

  async getHospitals(): Promise<Hospital[]> {
    return this.hospitals;
  }

  async getHospitalById(id: number): Promise<Hospital | undefined> {
    return this.hospitals.find(h => h.id === id);
  }

  async getBloodBanks(): Promise<BloodBank[]> {
    return this.bloodBanks;
  }

  async getBloodBankById(id: number): Promise<BloodBank | undefined> {
    return this.bloodBanks.find(b => b.id === id);
  }

  async getStaffDetails(userId: string): Promise<StaffDetails | undefined> {
    return this.staffDetails.get(userId);
  }

  async createStaffDetails(details: any): Promise<StaffDetails> {
    this.staffDetails.set(details.userId, details);
    return details;
  }

  async getDonorProfile(userId: string): Promise<DonorProfile | undefined> {
    return this.donorProfiles.get(userId);
  }

  async createDonorProfile(profile: any): Promise<DonorProfile> {
    this.donorProfiles.set(profile.userId, profile);
    return profile;
  }

  async getBloodInventoryStats(bankId?: number): Promise<Array<{ bloodType: string; count: number; status: string }>> {
    const bags = Array.from(this.bloodBags.values());
    const filteredBags = bankId ? bags.filter(b => b.bankId === bankId) : bags;
    
    const stats: { [key: string]: { [status: string]: number } } = {};
    filteredBags.forEach(bag => {
      if (!stats[bag.bloodType]) stats[bag.bloodType] = {};
      if (!stats[bag.bloodType][bag.status]) stats[bag.bloodType][bag.status] = 0;
      stats[bag.bloodType][bag.status]++;
    });

    const result: Array<{ bloodType: string; count: number; status: string }> = [];
    Object.entries(stats).forEach(([bloodType, statuses]) => {
      Object.entries(statuses).forEach(([status, count]) => {
        result.push({ bloodType, count, status });
      });
    });

    return result;
  }

  async getRequestStats(hospitalId?: number): Promise<{ pending: number; approved: number; total: number }> {
    const requests = Array.from(this.bloodRequests.values());
    const filteredRequests = hospitalId ? requests.filter(r => r.hospitalId === hospitalId) : requests;
    
    const pending = filteredRequests.filter(r => r.status === 'Pending').length;
    const approved = filteredRequests.filter(r => r.status === 'Fulfilled').length;
    const total = filteredRequests.length;

    return { pending, approved, total };
  }

  async findSuitableBags(bloodType: string, count: number): Promise<BloodBag[]> {
    const availableBags = await this.getAvailableBloodBags(bloodType);
    return availableBags.slice(0, count);
  }

  async allocateBagToRequest(requestId: number, bagId: string): Promise<void> {
    await this.updateBloodBagStatus(bagId, 'Reserved');
  }

  async confirmCrossmatch(requestId: number, bagId: string, successful: boolean): Promise<void> {
    if (successful) {
      await this.updateBloodBagStatus(bagId, 'Crossmatched');
    } else {
      await this.updateBloodBagStatus(bagId, 'Available');
    }
  }

  async dispatchAllocatedBag(requestId: number, bagId: string): Promise<void> {
    await this.updateBloodBagStatus(bagId, 'Issued');
    await this.updateBloodRequestStatus(requestId, 'Completed');
  }
}

// Use database storage now that we have proper credentials
export const storage = new DatabaseStorage();
