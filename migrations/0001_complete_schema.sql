-- Complete schema migration for Lifeline Blood Donation Management System
-- Generated on: 2025-01-05

-- Create custom types
DO $$ BEGIN
  CREATE TYPE "public"."role" AS ENUM('donor', 'blood_bank_staff', 'hospital_staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."gender" AS ENUM('Male', 'Female');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."priority" AS ENUM('Emergency', 'Urgent', 'Routine');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."request_status" AS ENUM(
    'Pending', 
    'Pending_Crossmatch', 
    'Escalated_To_Donors', 
    'Allocated', 
    'Issued', 
    'Fulfilled', 
    'Partially_Fulfilled',
    'Cancelled_By_Hospital', 
    'Rejected_By_Bloodbank'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."bag_status" AS ENUM(
    'Pending Testing', 
    'Available', 
    'Reserved', 
    'Crossmatched', 
    'Issued', 
    'Used', 
    'Discarded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sessions table (required for authentication)
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);

-- Create index on sessions expire
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Create blood banks table
CREATE TABLE IF NOT EXISTS "blood_banks" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "license_number" varchar(100) UNIQUE NOT NULL
);

-- Create hospitals table
CREATE TABLE IF NOT EXISTS "hospitals" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "phone" varchar(20) NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "profile_image_url" text,
  "role" "role" NOT NULL,
  "phone" varchar(20),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- Create donor profiles table
CREATE TABLE IF NOT EXISTS "donor_profiles" (
  "user_id" text PRIMARY KEY NOT NULL,
  "date_of_birth" date NOT NULL,
  "gender" "gender" NOT NULL,
  "blood_type" "blood_type" NOT NULL,
  "city" varchar(100) NOT NULL,
  "last_donation_date" date,
  "donation_count" integer DEFAULT 0 NOT NULL,
  "health_notes" text,
  "emergency_contact" varchar(20)
);

-- Create staff details table
CREATE TABLE IF NOT EXISTS "staff_details" (
  "user_id" text PRIMARY KEY NOT NULL,
  "hospital_id" integer,
  "bank_id" integer,
  "job_title" varchar(100) NOT NULL,
  "department" varchar(100),
  "is_admin" boolean DEFAULT false NOT NULL
);

-- Create health screenings table
CREATE TABLE IF NOT EXISTS "health_screenings" (
  "id" serial PRIMARY KEY NOT NULL,
  "donor_id" text NOT NULL,
  "screening_date" timestamp DEFAULT now() NOT NULL,
  "hemoglobin_level" real NOT NULL,
  "blood_pressure" varchar(20) NOT NULL,
  "weight" real NOT NULL,
  "temperature" real NOT NULL,
  "pulse_rate" integer NOT NULL,
  "has_infections" boolean NOT NULL,
  "has_medications" boolean NOT NULL,
  "has_recent_surgery" boolean NOT NULL,
  "is_eligible" boolean NOT NULL
);

-- Create blood bags table
CREATE TABLE IF NOT EXISTS "blood_bags" (
  "id" varchar(100) PRIMARY KEY NOT NULL,
  "donor_id" text NOT NULL,
  "bank_id" integer NOT NULL,
  "blood_type" "blood_type" NOT NULL,
  "collection_date" timestamp DEFAULT now() NOT NULL,
  "expiry_date" timestamp NOT NULL,
  "volume_ml" integer NOT NULL,
  "status" "bag_status" DEFAULT 'Pending Testing' NOT NULL,
  "test_results" jsonb
);

-- Create blood requests table
CREATE TABLE IF NOT EXISTS "blood_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "hospital_id" integer NOT NULL,
  "staff_id" text NOT NULL,
  "patient_name" varchar(255) NOT NULL,
  "patient_age" integer NOT NULL,
  "blood_type" "blood_type" NOT NULL,
  "units_requested" integer NOT NULL,
  "priority" "priority" NOT NULL,
  "diagnosis" text,
  "required_by" timestamp NOT NULL,
  "status" "request_status" DEFAULT 'Pending' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create blood request items table
CREATE TABLE IF NOT EXISTS "blood_request_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_id" integer NOT NULL,
  "bag_id" varchar(100) NOT NULL,
  "allocated_at" timestamp DEFAULT now() NOT NULL,
  "crossmatch_result" boolean,
  "crossmatched_at" timestamp,
  "issued_at" timestamp,
  "notes" text
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_hospital_id_hospitals_id_fk" 
    FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_bank_id_blood_banks_id_fk" 
    FOREIGN KEY ("bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_donor_id_users_id_fk" 
    FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_bags" ADD CONSTRAINT "blood_bags_donor_id_users_id_fk" 
    FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_bags" ADD CONSTRAINT "blood_bags_bank_id_blood_banks_id_fk" 
    FOREIGN KEY ("bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_hospital_id_hospitals_id_fk" 
    FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_staff_id_users_id_fk" 
    FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_request_items" ADD CONSTRAINT "blood_request_items_request_id_blood_requests_id_fk" 
    FOREIGN KEY ("request_id") REFERENCES "public"."blood_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "blood_request_items" ADD CONSTRAINT "blood_request_items_bag_id_blood_bags_id_fk" 
    FOREIGN KEY ("bag_id") REFERENCES "public"."blood_bags"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;