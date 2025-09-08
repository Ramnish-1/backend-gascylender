# Simple Login API Backend

A simple Node.js backend API with login functionality only. This system allows only one user to exist and login at a time.

## Features

- **Simple Login System**: Email and password authentication
- **Single User**: Only one user can exist in the system
- **JWT Authentication**: Secure token-based authentication
- **PostgreSQL Database**: Using Sequelize ORM
- **Input Validation**: Using Joi for request validation
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston logger for application logs

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lpg-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials and login credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=lpg_gas_db
   DB_USER=postgres
   DB_PASSWORD=12345
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   DEFAULT_EMAIL=ramnishbase2brand@gmail.com
   DEFAULT_PASSWORD=Ramnish@123
   ```

4. **Database Setup**
   - Create a PostgreSQL database named `lpg_gas_db`
   - The tables will be automatically created when you start the server

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

#### 1. Setup Initial User (First Time Only)
```http
POST /api/auth/setup
Content-Type: application/json

# Option 1: Use default credentials from .env file
POST /api/auth/setup
{}

# Option 2: Provide custom credentials
POST /api/auth/setup
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Initial user created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "ramnishbase2brand@gmail.com",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ramnishbase2brand@gmail.com",
  "password": "Ramnish@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "ramnishbase2brand@gmail.com",
      "createdAt": "2024-01-01T10:00.00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### 3. Get Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "ramnishbase2brand@gmail.com",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

#### 4. Logout (Protected)
```http
POST /api/auth/logout
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique, Required)
- `password` (VARCHAR, Hashed, Required)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Security Features

- **Password Hashing**: Using bcrypt with 12 rounds
- **JWT Tokens**: Secure authentication tokens
- **Input Validation**: All inputs validated using Joi
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for security
- **Helmet**: Security headers

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400
}
```

## Logging

Application logs are stored in:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## Development

```bash
# Run in development mode with auto-restart
npm run dev

# Run tests
npm test
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up proper logging
5. Use a process manager like PM2

## License

MIT
