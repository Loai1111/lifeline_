# Database Setup Instructions

This document explains how to set up the database for the Lifeline Blood Donation Management System.

## Quick Setup

1. **Create a new PostgreSQL database:**
   ```bash
   createdb lifeline_db
   ```

2. **Run the database setup script:**
   ```bash
   psql -d lifeline_db -f database_setup.sql
   ```

3. **Set your DATABASE_URL environment variable:**
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/lifeline_db"
   ```

## What the Setup Script Does

The `database_setup.sql` file contains:

- **Complete schema definition** - All tables, relationships, and constraints
- **Enums and types** - Blood types, user roles, request statuses, etc.
- **Sample data** - Initial hospitals and blood banks for testing
- **Indexes** - For optimal query performance
- **Triggers** - Automatic timestamp updates
- **Session storage** - Required for authentication

## Database Structure

### Core Tables
- `users` - User accounts and authentication
- `hospitals` - Hospital information
- `blood_banks` - Blood bank facilities
- `blood_requests` - Blood requests from hospitals
- `blood_bags` - Blood inventory management
- `health_screenings` - Donor health assessments

### User Roles
- `donor` - Blood donors
- `hospital_staff` - Hospital employees
- `blood_bank_staff` - Blood bank employees

### Blood Types Supported
- A+, A-, B+, B-, AB+, AB-, O+, O-

## Environment Variables

After setting up the database, configure these environment variables:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/lifeline_db
SESSION_SECRET=your-secure-session-secret
```

## For AI Agents

When cloning this repository, AI agents should:

1. Check if `database_setup.sql` exists in the root directory
2. Create a new PostgreSQL database
3. Run the SQL file to set up the complete schema
4. Configure the DATABASE_URL environment variable
5. Start the application - it will automatically connect to the database

## Development vs Production

- **Development**: Use local PostgreSQL with the provided setup script
- **Production**: Use managed database services (like Neon, Supabase, or AWS RDS)

The same `database_setup.sql` file works for both environments.