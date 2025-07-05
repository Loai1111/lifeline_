#!/bin/bash

# Lifeline Blood Donation Management System - Database Setup Script
# This script automatically sets up the database for the Lifeline system

set -e  # Exit on any error

echo "🩸 Setting up Lifeline Blood Donation Management System Database..."

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Database configuration
DB_NAME="lifeline_db"
DB_USER="${DB_USER:-$USER}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "📋 Database Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    else
        echo "❌ Aborted. Database setup cancelled."
        exit 1
    fi
fi

# Create the database
echo "🔨 Creating database '$DB_NAME'..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Run the setup script
echo "📊 Setting up database schema and sample data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database_setup.sql

# Generate DATABASE_URL
DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

echo "✅ Database setup complete!"
echo ""
echo "🔧 Add this to your environment variables:"
echo "export DATABASE_URL=\"$DATABASE_URL\""
echo ""
echo "Or add to your .env file:"
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "🚀 Your Lifeline Blood Donation Management System database is ready!"
echo "   - 3 Blood Banks created"
echo "   - 4 Hospitals created"
echo "   - All tables and indexes set up"
echo "   - Authentication session storage ready"
echo ""
echo "Start your application with: npm run dev"