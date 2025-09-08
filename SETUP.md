# Quick Setup Guide

## Step 1: Environment Setup

1. Copy the environment file:
   ```bash
   cp env.example .env
   ```

2. Update `.env` file with your credentials:
   ```env
   # Your login credentials
   DEFAULT_EMAIL=ramnishbase2brand@gmail.com
   DEFAULT_PASSWORD=Ramnish@123
   
   # Database settings (update if needed)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=lpg_gas_db
   DB_USER=postgres
   DB_PASSWORD=12345
   
   # JWT secret (change this in production)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Database Setup

1. Make sure PostgreSQL is running
2. Create database (if not exists):
   ```sql
   CREATE DATABASE lpg_gas_db;
   ```

## Step 4: Start Server

```bash
npm run dev
```

## Step 5: Setup User (First Time Only)

```bash
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d "{}"
```

This will create a user with your credentials from `.env` file.

## Step 6: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramnishbase2brand@gmail.com",
    "password": "Ramnish@123"
  }'
```

## API Endpoints

- `POST /api/auth/setup` - Create initial user (first time only)
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/profile` - Get profile (requires token)
- `POST /api/auth/logout` - Logout (requires token)
- `GET /health` - Health check

## Your Login Credentials

- **Email**: ramnishbase2brand@gmail.com
- **Password**: Ramnish@123

The system will automatically use these credentials when you call the setup endpoint without providing any data.
