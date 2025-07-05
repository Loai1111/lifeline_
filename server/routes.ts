import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBloodRequestSchema, insertBloodBagSchema, insertHealthScreeningSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get role-specific details
      let roleDetails = null;
      if (user.role === 'hospital_staff' || user.role === 'blood_bank_staff') {
        roleDetails = await storage.getStaffDetails(userId);
      } else if (user.role === 'donor') {
        roleDetails = await storage.getDonorProfile(userId);
      }
      
      res.json({ ...user, roleDetails });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Role update route
  app.post('/api/auth/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['donor', 'hospital_staff', 'blood_bank_staff'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      await storage.updateUserRole(userId, role);
      
      // Create staff details if role is hospital_staff or blood_bank_staff
      if (role === 'hospital_staff' || role === 'blood_bank_staff') {
        const existingStaffDetails = await storage.getStaffDetails(userId);
        if (!existingStaffDetails) {
          // Get a default hospital or blood bank
          if (role === 'hospital_staff') {
            const hospitals = await storage.getHospitals();
            const defaultHospital = hospitals[0]; // Use first available hospital
            if (defaultHospital) {
              await storage.createStaffDetails({
                userId,
                hospitalId: defaultHospital.id,
                bankId: null,
                jobTitle: 'Staff',
                isAdmin: false,
              });
            }
          } else if (role === 'blood_bank_staff') {
            const bloodBanks = await storage.getBloodBanks();
                const defaultBloodBank = bloodBanks[0]; // Use first available blood bank
            if (defaultBloodBank) {
              await storage.createStaffDetails({
                userId,
                hospitalId: null,
                bankId: defaultBloodBank.id,
                jobTitle: 'Staff',
                isAdmin: false,
              });
            }
          }
        }
      }
      
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Blood request routes
  app.post('/api/blood-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'hospital_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const staffDetails = await storage.getStaffDetails(userId);
      if (!staffDetails?.hospitalId) {
        return res.status(400).json({ message: "Hospital staff must be associated with a hospital" });
      }
      
      // Parse and validate the date
      let requiredByDate;
      try {
        requiredByDate = new Date(req.body.requiredBy);
        if (isNaN(requiredByDate.getTime())) {
          return res.status(400).json({ message: "Invalid required by date" });
        }
      } catch (dateError) {
        return res.status(400).json({ message: "Invalid required by date format" });
      }
      
      const requestData = {
        ...req.body,
        hospitalId: staffDetails.hospitalId,
        staffId: userId,
        requiredBy: requiredByDate,
      };
      
      const validatedData = insertBloodRequestSchema.parse(requestData);
      const bloodRequest = await storage.createBloodRequest(validatedData);
      res.json(bloodRequest);
    } catch (error: any) {
      console.error("Error creating blood request:", error);
      if (error && error.name === 'ZodError') {
        console.error("Zod validation errors:", error.issues);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.issues || []
        });
      }
      res.status(500).json({ message: "Failed to create blood request" });
    }
  });

  app.get('/api/blood-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let requests;
      if (user.role === 'hospital_staff') {
        const staffDetails = await storage.getStaffDetails(userId);
        requests = await storage.getBloodRequests(staffDetails?.hospitalId ?? undefined);
      } else if (user.role === 'blood_bank_staff') {
        // Blood bank staff can see all requests
        requests = await storage.getBloodRequests();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching blood requests:", error);
      res.status(500).json({ message: "Failed to fetch blood requests" });
    }
  });

  app.put('/api/blood-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['Pending', 'Approved', 'Cross-matched', 'Fulfilled', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      await storage.updateBloodRequestStatus(parseInt(id), status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating blood request status:", error);
      res.status(500).json({ message: "Failed to update blood request status" });
    }
  });

  // Blood bag routes
  app.post('/api/blood-bags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const staffDetails = await storage.getStaffDetails(userId);
      if (!staffDetails?.bankId) {
        return res.status(400).json({ message: "Blood bank staff must be associated with a blood bank" });
      }
      
      const bagData = insertBloodBagSchema.parse({
        ...req.body,
        bankId: staffDetails.bankId,
      });
      
      const bloodBag = await storage.createBloodBag(bagData);
      res.json(bloodBag);
    } catch (error) {
      console.error("Error creating blood bag:", error);
      res.status(500).json({ message: "Failed to create blood bag" });
    }
  });

  app.get('/api/blood-bags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let bags;
      if (user.role === 'blood_bank_staff') {
        const staffDetails = await storage.getStaffDetails(userId);
        bags = await storage.getBloodBags(staffDetails?.bankId ?? undefined);
      } else if (user.role === 'hospital_staff') {
        // Hospital staff can see available bags
        bags = await storage.getAvailableBloodBags();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(bags);
    } catch (error) {
      console.error("Error fetching blood bags:", error);
      res.status(500).json({ message: "Failed to fetch blood bags" });
    }
  });

  // Health screening routes
  app.post('/api/health-screenings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const staffDetails = await storage.getStaffDetails(userId);
      if (!staffDetails?.bankId) {
        return res.status(400).json({ message: "Blood bank staff must be associated with a blood bank" });
      }
      
      const screeningData = insertHealthScreeningSchema.parse({
        ...req.body,
        bankId: staffDetails.bankId,
        staffId: userId,
      });
      
      const screening = await storage.createHealthScreening(screeningData);
      res.json(screening);
    } catch (error) {
      console.error("Error creating health screening:", error);
      res.status(500).json({ message: "Failed to create health screening" });
    }
  });

  // Statistics routes
  app.get('/api/stats/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let stats;
      if (user.role === 'blood_bank_staff') {
        const staffDetails = await storage.getStaffDetails(userId);
        stats = await storage.getBloodInventoryStats(staffDetails?.bankId ?? undefined);
      } else if (user.role === 'hospital_staff') {
        stats = await storage.getBloodInventoryStats();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
      res.status(500).json({ message: "Failed to fetch inventory stats" });
    }
  });

  app.get('/api/stats/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let stats;
      if (user.role === 'hospital_staff') {
        const staffDetails = await storage.getStaffDetails(userId);
        stats = await storage.getRequestStats(staffDetails?.hospitalId ?? undefined);
      } else if (user.role === 'blood_bank_staff') {
        stats = await storage.getRequestStats();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching request stats:", error);
      res.status(500).json({ message: "Failed to fetch request stats" });
    }
  });

  // Reference data routes
  app.get('/api/hospitals', isAuthenticated, async (req, res) => {
    try {
      const hospitals = await storage.getHospitals();
      res.json(hospitals);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  app.get('/api/blood-banks', isAuthenticated, async (req, res) => {
    try {
      const bloodBanks = await storage.getBloodBanks();
      res.json(bloodBanks);
    } catch (error) {
      console.error("Error fetching blood banks:", error);
      res.status(500).json({ message: "Failed to fetch blood banks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
