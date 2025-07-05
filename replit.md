# Lifeline - Blood Donation Management System

## Overview

Lifeline is a comprehensive blood donation management system designed to connect hospitals, blood banks, and donors. The application facilitates blood requests, inventory management, and health screening processes through a modern web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Integrated with Replit Auth using OpenID Connect

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store
- **Authentication**: Passport.js with OpenID Connect strategy

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend server
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
├── attached_assets/ # Reference documents and specifications
├── database_setup.sql    # Complete database schema setup
└── DATABASE_SETUP.md     # Database setup instructions
```

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed session store
- **Role-Based Access**: Three user roles (donor, hospital_staff, blood_bank_staff)
- **Middleware**: Authentication middleware for protected routes

### Database Schema
- **Users**: Core user information with role-based access
- **Hospitals & Blood Banks**: Institutional entities
- **Blood Requests**: Hospital requests for blood units
- **Blood Bags**: Inventory management for blood units
- **Health Screenings**: Donor health assessments
- **Staff Details**: Role-specific user information

### Frontend Components
- **Dashboard Views**: Role-specific dashboards for hospitals and blood banks
- **Forms**: Blood request forms with validation
- **Tables**: Data display for requests and inventory
- **Inventory Grid**: Visual blood type availability display
- **Sidebar Navigation**: Role-based navigation menus

## Data Flow

### Request Workflow
1. Hospital staff creates blood request through form
2. Request stored in database with pending status
3. Blood bank staff receives notification of new request
4. Blood bank staff can approve/reject requests
5. Approved requests trigger inventory allocation
6. Status updates propagate through the system

### Inventory Management
1. Blood bags registered in system with metadata
2. Inventory tracked by blood type and status
3. Real-time availability displayed to hospital staff
4. Automatic stock level monitoring and alerts

### Authentication Flow
1. User redirects to Replit Auth endpoint
2. Successful authentication returns user claims
3. User record created/updated in database
4. Session established with role-based permissions
5. Role-specific dashboard presented

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection**: WebSocket-based connection for serverless compatibility

### Authentication
- **Replit Auth**: OpenID Connect provider
- **Session Store**: PostgreSQL-backed session persistence

### UI Components
- **Radix UI**: Headless UI components for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Icon library for consistent iconography

### Development Tools
- **TypeScript**: Type safety across the application
- **Vite**: Development server and build tool
- **ESBuild**: Fast JavaScript bundler for production
- **Drizzle Kit**: Database migration and schema management

## Deployment Strategy

### Build Process
1. Frontend built with Vite to static assets
2. Backend bundled with ESBuild for Node.js runtime
3. Database migrations applied via Drizzle Kit
4. Environment variables configured for database and auth

### Production Configuration
- **Database**: Neon PostgreSQL with connection pooling
- **Authentication**: Replit Auth with secure session handling
- **Static Assets**: Served directly from Express in production
- **Environment**: NODE_ENV-based configuration switching

### Development Setup
- **Hot Reloading**: Vite middleware for instant updates
- **Database**: Automatic connection with development credentials
- **Authentication**: Replit Auth integration with local development

## Changelog

```
Changelog:
- July 05, 2025. Initial setup
- July 05, 2025. Migration completed from Replit Agent to Replit environment
  - Added PostgreSQL database configuration
  - Created sample data for hospitals, blood banks, donors, and blood inventory
  - Implemented proper blood request status workflow logic
  - Fixed import errors and runtime issues
  - Added workflow routes for crossmatch, allocation, and dispatch
- July 05, 2025. Added database setup automation
  - Created database_setup.sql with complete schema definition
  - Added DATABASE_SETUP.md with setup instructions
  - Included sample data and proper indexing for performance
  - Automated setup for cloning and deployment scenarios
- July 05, 2025. Successfully migrated to Replit environment
  - Configured PostgreSQL database with Neon serverless connection
  - Migrated from MemoryStorage to DatabaseStorage implementation
  - Populated database with comprehensive sample data (14 users, 8 blood bags, 3 hospitals, 3 blood banks)
  - Verified authentication system and database connectivity
  - All systems operational and ready for development
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```