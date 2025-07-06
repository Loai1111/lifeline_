import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const roleEnum = pgEnum("role", ["donor", "blood_bank_staff", "hospital_staff"]);
export const bloodTypeEnum = pgEnum("blood_type", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export const genderEnum = pgEnum("gender", ["Male", "Female"]);
export const priorityEnum = pgEnum("priority", ["Emergency", "Urgent", "Routine"]);
export const requestStatusEnum = pgEnum("request_status", [
  "Pending", 
  "Pending_Crossmatch", 
  "Escalated_To_Donors", 
  "Allocated", 
  "Issued", 
  "Fulfilled", 
  "Partially_Fulfilled",
  "Cancelled_By_Hospital", 
  "Rejected_By_Bloodbank"
]);
export const bagStatusEnum = pgEnum("bag_status", ["Pending Testing", "Available", "Reserved", "Crossmatched", "Issued", "Used", "Discarded"]);

// Core entities
export const bloodBanks = pgTable("blood_banks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }),
  operatingHours: varchar("operating_hours", { length: 255 }),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }),
});

// Unified Users table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: text("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  contactPhone: varchar("contact_phone", { length: 20 }),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role-specific profile tables
export const donorProfiles = pgTable("donor_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bloodType: bloodTypeEnum("blood_type"),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: genderEnum("gender").notNull(),
  lastDonationDate: date("last_donation_date"),
  nextEligibleDonationDate: date("next_eligible_donation_date"),
  isEligible: boolean("is_eligible").default(true),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const staffDetails = pgTable("staff_details", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  hospitalId: integer("hospital_id").references(() => hospitals.id, { onDelete: "set null" }),
  bankId: integer("bank_id").references(() => bloodBanks.id, { onDelete: "set null" }),
  jobTitle: varchar("job_title", { length: 100 }),
  isAdmin: boolean("is_admin").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Operational tables
export const healthScreenings = pgTable("health_screenings", {
  id: serial("id").primaryKey(),
  donorId: varchar("donor_id").notNull().references(() => users.id),
  bankId: integer("bank_id").notNull().references(() => bloodBanks.id),
  staffId: varchar("staff_id").notNull().references(() => users.id),
  screeningDate: timestamp("screening_date").defaultNow(),
  weight: real("weight"),
  bloodPressure: varchar("blood_pressure", { length: 20 }),
  hemoglobinLevel: real("hemoglobin_level"),
  temperature: real("temperature"),
  questionnaireSummary: jsonb("questionnaire_summary"),
  deferralReason: varchar("deferral_reason", { length: 255 }),
  isEligibleOnDay: boolean("is_eligible_on_day").notNull(),
});

export const bloodBags = pgTable("blood_bags", {
  id: varchar("id").primaryKey(),
  donorId: varchar("donor_id").notNull().references(() => users.id),
  healthScreeningId: integer("health_screening_id").notNull().references(() => healthScreenings.id),
  bankId: integer("bank_id").notNull().references(() => bloodBanks.id),
  bloodType: bloodTypeEnum("blood_type").notNull(),
  componentType: varchar("component_type", { length: 50 }).notNull().default("Whole Blood"),
  collectionDate: timestamp("collection_date").defaultNow(),
  expiryDate: date("expiry_date").notNull(),
  status: bagStatusEnum("status").notNull().default("Pending Testing"),
});

export const bloodRequests = pgTable("blood_requests", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  staffId: varchar("staff_id").notNull().references(() => users.id),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientId: varchar("patient_id", { length: 100 }).notNull(),
  bloodType: bloodTypeEnum("blood_type").notNull(),
  unitsRequested: integer("units_requested").notNull(),
  priority: priorityEnum("priority").notNull(),
  requiredBy: timestamp("required_by").notNull(),
  clinicalNotes: text("clinical_notes"),
  specialRequirements: jsonb("special_requirements"),
  status: requestStatusEnum("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bloodRequestItems = pgTable("blood_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => bloodRequests.id, { onDelete: "cascade" }),
  bloodBagId: varchar("blood_bag_id").references(() => bloodBags.id),
  status: requestStatusEnum("status").notNull().default("Pending"),
  crossMatchDate: timestamp("cross_match_date"),
  crossMatchResult: varchar("cross_match_result", { length: 50 }),
  issuedDate: timestamp("issued_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  donorProfile: one(donorProfiles, { fields: [users.id], references: [donorProfiles.userId] }),
  staffDetails: one(staffDetails, { fields: [users.id], references: [staffDetails.userId] }),
  bloodRequests: many(bloodRequests),
  healthScreenings: many(healthScreenings),
  bloodBags: many(bloodBags),
}));

export const bloodBanksRelations = relations(bloodBanks, ({ many }) => ({
  staff: many(staffDetails),
  healthScreenings: many(healthScreenings),
  bloodBags: many(bloodBags),
}));

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  staff: many(staffDetails),
  bloodRequests: many(bloodRequests),
}));

export const bloodRequestsRelations = relations(bloodRequests, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [bloodRequests.hospitalId], references: [hospitals.id] }),
  staff: one(users, { fields: [bloodRequests.staffId], references: [users.id] }),
  items: many(bloodRequestItems),
}));

export const bloodBagsRelations = relations(bloodBags, ({ one, many }) => ({
  donor: one(users, { fields: [bloodBags.donorId], references: [users.id] }),
  healthScreening: one(healthScreenings, { fields: [bloodBags.healthScreeningId], references: [healthScreenings.id] }),
  bank: one(bloodBanks, { fields: [bloodBags.bankId], references: [bloodBanks.id] }),
  requestItems: many(bloodRequestItems),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(users);

export const insertBloodRequestSchema = createInsertSchema(bloodRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const selectBloodRequestSchema = createSelectSchema(bloodRequests);

export const insertBloodBagSchema = createInsertSchema(bloodBags).omit({ collectionDate: true });
export const selectBloodBagSchema = createSelectSchema(bloodBags);

export const insertHealthScreeningSchema = createInsertSchema(healthScreenings).omit({ id: true, screeningDate: true });
export const selectHealthScreeningSchema = createSelectSchema(healthScreenings);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type BloodRequest = typeof bloodRequests.$inferSelect;
export type InsertBloodRequest = typeof bloodRequests.$inferInsert;
export type BloodBag = typeof bloodBags.$inferSelect;
export type InsertBloodBag = typeof bloodBags.$inferInsert;
export type HealthScreening = typeof healthScreenings.$inferSelect;
export type InsertHealthScreening = typeof healthScreenings.$inferInsert;
export type DonorProfile = typeof donorProfiles.$inferSelect;
export type StaffDetails = typeof staffDetails.$inferSelect;
export type Hospital = typeof hospitals.$inferSelect;
export type BloodBank = typeof bloodBanks.$inferSelect;
