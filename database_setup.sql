-- Lifeline Blood Donation Management System Database Setup
-- This file contains the complete database schema for the Lifeline system
-- Run this file after creating your database to set up all required tables

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE role AS ENUM ('donor', 'blood_bank_staff', 'hospital_staff');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE gender AS ENUM ('Male', 'Female');
CREATE TYPE priority AS ENUM ('Emergency', 'Urgent', 'Routine');
CREATE TYPE request_status AS ENUM ('Pending', 'Pending_Crossmatch', 'Escalated_To_Donors', 'Allocated', 'Issued', 'Fulfilled', 'Partially_Fulfilled', 'Cancelled_By_Hospital', 'Rejected_By_Bloodbank');
CREATE TYPE bag_status AS ENUM ('Pending Testing', 'Available', 'Reserved', 'Crossmatched', 'Issued', 'Used', 'Discarded');

-- Session storage table (required for authentication)
CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index for session expiration
CREATE INDEX IDX_session_expire ON sessions (expire);

-- Blood banks table
CREATE TABLE blood_banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (required for authentication)
CREATE TABLE users (
    id VARCHAR PRIMARY KEY NOT NULL,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url VARCHAR(500),
    role role,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donor profiles table
CREATE TABLE donor_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    blood_type blood_type,
    date_of_birth DATE,
    gender gender,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    medications TEXT,
    last_donation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff details table
CREATE TABLE staff_details (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    staff_id VARCHAR(50) UNIQUE,
    hospital_id INTEGER REFERENCES hospitals(id),
    blood_bank_id INTEGER REFERENCES blood_banks(id),
    department VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health screenings table
CREATE TABLE health_screenings (
    id SERIAL PRIMARY KEY,
    donor_id VARCHAR NOT NULL REFERENCES users(id),
    screening_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(5,2),
    blood_pressure VARCHAR(20),
    temperature DECIMAL(4,1),
    pulse_rate INTEGER,
    hemoglobin_level DECIMAL(4,1),
    eligible_to_donate BOOLEAN DEFAULT FALSE,
    notes TEXT,
    screened_by VARCHAR NOT NULL REFERENCES users(id)
);

-- Blood bags table
CREATE TABLE blood_bags (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id VARCHAR NOT NULL REFERENCES users(id),
    blood_bank_id INTEGER NOT NULL REFERENCES blood_banks(id),
    blood_type blood_type NOT NULL,
    volume_ml INTEGER NOT NULL,
    collection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date DATE NOT NULL,
    status bag_status DEFAULT 'Pending Testing',
    test_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood requests table
CREATE TABLE blood_requests (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    staff_id VARCHAR NOT NULL REFERENCES users(id),
    patient_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(100),
    blood_type blood_type NOT NULL,
    units_requested INTEGER NOT NULL,
    priority priority DEFAULT 'Routine',
    required_by TIMESTAMP,
    indication TEXT,
    physician_name VARCHAR(255),
    status request_status DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood request items table (for tracking individual bag assignments)
CREATE TABLE blood_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    blood_bag_id VARCHAR REFERENCES blood_bags(id),
    status request_status NOT NULL DEFAULT 'Pending',
    cross_match_date TIMESTAMP,
    cross_match_result VARCHAR(50),
    issued_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for blood banks
INSERT INTO blood_banks (name, address, phone, email, license_number) VALUES
('Central Blood Bank', '123 Main St, City Center', '+1-555-0101', 'info@centralbloodbank.org', 'BB-001'),
('Regional Blood Center', '456 Oak Ave, Medical District', '+1-555-0102', 'contact@regionalblood.org', 'BB-002'),
('Community Blood Services', '789 Pine Rd, Community Plaza', '+1-555-0103', 'help@communityblood.org', 'BB-003');

-- Insert sample data for hospitals
INSERT INTO hospitals (name, address, phone, email, license_number) VALUES
('City General Hospital', '100 Hospital Dr, Medical Center', '+1-555-0201', 'admin@citygeneral.org', 'H-001'),
('Regional Medical Center', '200 Health Blvd, University District', '+1-555-0202', 'info@regionalmedical.org', 'H-002'),
('Community Hospital', '300 Care St, Downtown', '+1-555-0203', 'contact@communityhospital.org', 'H-003'),
('Emergency Care Center', '400 Emergency Ln, Suburban Area', '+1-555-0204', 'emergency@carecenters.org', 'H-004');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_blood_bags_blood_type ON blood_bags(blood_type);
CREATE INDEX idx_blood_bags_status ON blood_bags(status);
CREATE INDEX idx_blood_bags_expiration ON blood_bags(expiration_date);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_hospital ON blood_requests(hospital_id);
CREATE INDEX idx_blood_requests_blood_type ON blood_requests(blood_type);
CREATE INDEX idx_staff_details_user_id ON staff_details(user_id);
CREATE INDEX idx_donor_profiles_user_id ON donor_profiles(user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_banks_updated_at BEFORE UPDATE ON blood_banks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donor_profiles_updated_at BEFORE UPDATE ON donor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_details_updated_at BEFORE UPDATE ON staff_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_bags_updated_at BEFORE UPDATE ON blood_bags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON blood_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_request_items_updated_at BEFORE UPDATE ON blood_request_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_database_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_database_user;

-- Database setup complete
-- Updated: July 05, 2025 - Added comprehensive workflow status enums and improved schema
-- The database is now ready for the Lifeline Blood Donation Management System