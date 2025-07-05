import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBloodRequestSchema, insertBloodBagSchema, insertHealthScreeningSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
      
      // Check inventory availability to determine initial status
      const { bloodType, unitsRequested } = req.body;
      const availableBags = await storage.getAvailableBloodBags(bloodType);
      
      let initialStatus = 'Pending';
      if (availableBags.length === 0) {
        // No inventory available
        initialStatus = 'Escalated_To_Donors';
      } else if (availableBags.length < unitsRequested) {
        // Partial inventory available
        initialStatus = 'Escalated_To_Donors';
      } else {
        // Sufficient inventory available
        initialStatus = 'Pending_Crossmatch';
      }
      
      const requestData = {
        ...req.body,
        hospitalId: staffDetails.hospitalId,
        staffId: userId,
        requiredBy: requiredByDate,
        status: initialStatus,
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

  // Blood request workflow routes
  app.post('/api/blood-requests/:id/allocate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { bagId } = req.body;
      
      // Allocate bag to request
      await storage.allocateBagToRequest(requestId, bagId);
      await storage.updateBloodRequestStatus(requestId, 'Pending_Crossmatch');
      
      res.json({ 
        message: "Blood bag allocated successfully",
        status: "Pending Crossmatch"
      });
    } catch (error) {
      console.error("Error allocating blood bag:", error);
      res.status(500).json({ message: "Failed to allocate blood bag" });
    }
  });

  app.post('/api/blood-requests/:id/crossmatch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { bagId, successful } = req.body;
      
      // Confirm crossmatch result
      await storage.confirmCrossmatch(requestId, bagId, successful);
      
      if (successful) {
        await storage.updateBloodRequestStatus(requestId, 'Allocated');
        res.json({ 
          message: "Crossmatch successful, blood allocated",
          status: "Allocated"
        });
      } else {
        await storage.updateBloodRequestStatus(requestId, 'Escalated_To_Donors');
        res.json({ 
          message: "Crossmatch failed, escalated to donors",
          status: "Escalated to Donors"
        });
      }
    } catch (error) {
      console.error("Error confirming crossmatch:", error);
      res.status(500).json({ message: "Failed to confirm crossmatch" });
    }
  });

  app.post('/api/blood-requests/:id/dispatch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { bagId } = req.body;
      
      // Dispatch allocated bag
      await storage.dispatchAllocatedBag(requestId, bagId);
      await storage.updateBloodRequestStatus(requestId, 'Issued');
      
      res.json({ 
        message: "Blood bag dispatched successfully",
        status: "Issued"
      });
    } catch (error) {
      console.error("Error dispatching blood bag:", error);
      res.status(500).json({ message: "Failed to dispatch blood bag" });
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
      
      if (!['Pending_Crossmatch', 'Escalated_To_Donors', 'Allocated', 'Issued', 'Fulfilled', 'Cancelled_By_Hospital'].includes(status)) {
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

  // Workflow management routes with partial fulfillment
  app.post('/api/blood-requests/:id/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const bloodRequest = await storage.getBloodRequestById(requestId);
      
      if (!bloodRequest) {
        return res.status(404).json({ message: "Blood request not found" });
      }
      
      // Check if request is in Pending status
      if (bloodRequest.status !== 'Pending') {
        return res.status(400).json({ message: "Request is not in pending status" });
      }
      
      // Find suitable bags for this request (FEFO implemented)
      const suitableBags = await storage.findSuitableBags(bloodRequest.bloodType, bloodRequest.unitsRequested);
      
      if (suitableBags.length === 0) {
        // No inventory available - escalate to donors
        await storage.updateBloodRequestStatus(requestId, 'Escalated_To_Donors');
        res.json({ 
          message: "No inventory available - escalated to donors", 
          status: "Escalated_To_Donors",
          fulfilledUnits: 0,
          remainingUnits: bloodRequest.unitsRequested
        });
      } else if (suitableBags.length >= bloodRequest.unitsRequested) {
        // Full fulfillment possible
        await storage.updateBloodRequestStatus(requestId, 'Pending_Crossmatch');
        
        // Reserve the bags (atomic transaction)
        for (let i = 0; i < bloodRequest.unitsRequested; i++) {
          await storage.allocateBagToRequest(requestId, suitableBags[i].id);
        }
        
        res.json({ 
          message: "Request fully allocated - moved to crossmatch phase", 
          status: "Pending_Crossmatch",
          allocatedBags: suitableBags.slice(0, bloodRequest.unitsRequested),
          fulfilledUnits: bloodRequest.unitsRequested,
          remainingUnits: 0
        });
      } else {
        // Partial fulfillment - allocate what's available and escalate remainder
        await storage.updateBloodRequestStatus(requestId, 'Partially_Fulfilled');
        
        // Reserve available bags
        for (let i = 0; i < suitableBags.length; i++) {
          await storage.allocateBagToRequest(requestId, suitableBags[i].id);
        }
        
        const remainingUnits = bloodRequest.unitsRequested - suitableBags.length;
        
        res.json({ 
          message: `Partially fulfilled: ${suitableBags.length} units allocated, ${remainingUnits} units escalated to donors`, 
          status: "Partially_Fulfilled",
          allocatedBags: suitableBags,
          fulfilledUnits: suitableBags.length,
          remainingUnits: remainingUnits
        });
      }
    } catch (error) {
      console.error("Error processing blood request:", error);
      res.status(500).json({ message: "Failed to process blood request" });
    }
  });

  app.post('/api/blood-requests/:id/crossmatch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { bagId, successful } = req.body;
      
      await storage.confirmCrossmatch(requestId, bagId, successful);
      
      res.json({ 
        message: successful ? "Crossmatch successful - bag allocated" : "Crossmatch failed - escalated to donors",
        status: successful ? "Allocated" : "Escalated_To_Donors"
      });
    } catch (error) {
      console.error("Error confirming crossmatch:", error);
      res.status(500).json({ message: "Failed to confirm crossmatch" });
    }
  });

  app.post('/api/blood-requests/:id/dispatch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { bagId } = req.body;
      
      await storage.dispatchAllocatedBag(requestId, bagId);
      
      res.json({ 
        message: "Bag dispatched successfully",
        status: "Issued"
      });
    } catch (error) {
      console.error("Error dispatching bag:", error);
      res.status(500).json({ message: "Failed to dispatch bag" });
    }
  });

  app.post('/api/blood-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'blood_bank_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      const { reason } = req.body;
      
      await storage.updateBloodRequestStatus(requestId, 'Rejected_By_Bloodbank');
      
      res.json({ 
        message: "Request rejected",
        status: "Rejected_By_Bloodbank",
        reason
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  app.post('/api/blood-requests/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'hospital_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      await storage.updateBloodRequestStatus(requestId, 'Cancelled_By_Hospital');
      
      res.json({ 
        message: "Request cancelled",
        status: "Cancelled_By_Hospital"
      });
    } catch (error) {
      console.error("Error cancelling request:", error);
      res.status(500).json({ message: "Failed to cancel request" });
    }
  });

  app.post('/api/blood-requests/:id/received', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'hospital_staff') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requestId = parseInt(req.params.id);
      await storage.updateBloodRequestStatus(requestId, 'Fulfilled');
      
      res.json({ 
        message: "Blood received and request fulfilled",
        status: "Fulfilled"
      });
    } catch (error) {
      console.error("Error confirming receipt:", error);
      res.status(500).json({ message: "Failed to confirm receipt" });
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
