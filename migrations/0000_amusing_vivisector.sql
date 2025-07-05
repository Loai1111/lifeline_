CREATE TYPE "public"."bag_status" AS ENUM('Pending Testing', 'Available', 'Reserved', 'Crossmatched', 'Issued', 'Used', 'Discarded');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('Male', 'Female');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('Emergency', 'Urgent', 'Routine');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('Pending', 'Pending_Crossmatch', 'Escalated_To_Donors', 'Allocated', 'Issued', 'Fulfilled', 'Partially_Fulfilled', 'Cancelled_By_Hospital', 'Rejected_By_Bloodbank');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('donor', 'blood_bank_staff', 'hospital_staff');--> statement-breakpoint
CREATE TABLE "blood_bags" (
	"id" varchar PRIMARY KEY NOT NULL,
	"donor_id" varchar NOT NULL,
	"health_screening_id" integer NOT NULL,
	"bank_id" integer NOT NULL,
	"blood_type" "blood_type" NOT NULL,
	"component_type" varchar(50) DEFAULT 'Whole Blood' NOT NULL,
	"collection_date" timestamp DEFAULT now(),
	"expiry_date" date NOT NULL,
	"status" "bag_status" DEFAULT 'Pending Testing' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"contact_phone" varchar(20),
	"operating_hours" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "blood_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"blood_bag_id" varchar,
	"status" "request_status" DEFAULT 'Pending' NOT NULL,
	"cross_match_date" timestamp,
	"cross_match_result" varchar(50),
	"issued_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blood_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"staff_id" varchar NOT NULL,
	"patient_name" varchar(255) NOT NULL,
	"patient_id" varchar(100) NOT NULL,
	"blood_type" "blood_type" NOT NULL,
	"units_requested" integer NOT NULL,
	"priority" "priority" NOT NULL,
	"required_by" timestamp NOT NULL,
	"clinical_notes" text,
	"special_requirements" jsonb,
	"status" "request_status" DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donor_profiles" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"blood_type" "blood_type",
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"last_donation_date" date,
	"next_eligible_donation_date" date,
	"is_eligible" boolean DEFAULT true,
	"notes" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_screenings" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_id" varchar NOT NULL,
	"bank_id" integer NOT NULL,
	"staff_id" varchar NOT NULL,
	"screening_date" timestamp DEFAULT now(),
	"weight" real,
	"blood_pressure" varchar(20),
	"hemoglobin_level" real,
	"temperature" real,
	"questionnaire_summary" jsonb,
	"deferral_reason" varchar(255),
	"is_eligible_on_day" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"contact_phone" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_details" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"hospital_id" integer,
	"bank_id" integer,
	"job_title" varchar(100),
	"is_admin" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"contact_phone" varchar(20),
	"role" "role" NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "blood_bags" ADD CONSTRAINT "blood_bags_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_bags" ADD CONSTRAINT "blood_bags_health_screening_id_health_screenings_id_fk" FOREIGN KEY ("health_screening_id") REFERENCES "public"."health_screenings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_bags" ADD CONSTRAINT "blood_bags_bank_id_blood_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_request_items" ADD CONSTRAINT "blood_request_items_request_id_blood_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."blood_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_request_items" ADD CONSTRAINT "blood_request_items_blood_bag_id_blood_bags_id_fk" FOREIGN KEY ("blood_bag_id") REFERENCES "public"."blood_bags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_bank_id_blood_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_details" ADD CONSTRAINT "staff_details_bank_id_blood_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");