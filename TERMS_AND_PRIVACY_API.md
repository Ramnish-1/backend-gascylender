# Terms & Conditions and Privacy Policy API Documentation

This document describes the API endpoints for managing Terms & Conditions and Privacy Policy content in the LPG Gas Backend system.

## Base URLs

- **Admin Routes**: `/api/admin/terms-and-conditions` and `/api/admin/privacy-policies`
- **Public Routes**: `/api/public/terms-and-conditions` and `/api/public/privacy-policies`

## Authentication

- **Admin Routes**: Require Bearer token authentication and admin role
- **Public Routes**: No authentication required

---

## Terms & Conditions API

### 1. Create Terms & Conditions (Admin Only)

**POST** `/api/admin/terms-and-conditions`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Terms and Conditions - LPG Gas Service",
  "description": "These terms and conditions govern the use of our LPG gas delivery service...",
  "status": "active",
  "version": "1.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Terms & Conditions created successfully",
  "data": {
    "termsAndConditions": {
      "id": "uuid",
      "title": "Terms and Conditions - LPG Gas Service",
      "description": "These terms and conditions govern...",
      "status": "active",
      "version": "1.0",
      "lastUpdatedBy": "user-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Get All Terms & Conditions (Admin Only)

**GET** `/api/admin/terms-and-conditions`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (active/inactive)
- `search` (optional): Search in title and description
- `id` (optional): Get specific Terms & Conditions by ID

**Response:**
```json
{
  "success": true,
  "message": "Terms & Conditions retrieved successfully",
  "data": {
    "termsAndConditions": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10
    }
  }
}
```

### 3. Get Terms & Conditions by ID (Admin Only)

**GET** `/api/admin/terms-and-conditions/:id`

**Response:**
```json
{
  "success": true,
  "message": "Terms & Conditions retrieved successfully",
  "data": {
    "termsAndConditions": {
      "id": "uuid",
      "title": "Terms and Conditions - LPG Gas Service",
      "description": "These terms and conditions govern...",
      "status": "active",
      "version": "1.0",
      "lastUpdatedBy": "user-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Update Terms & Conditions (Admin Only)

**PUT** `/api/admin/terms-and-conditions/:id`

**Request Body:**
```json
{
  "title": "Updated Terms and Conditions",
  "description": "Updated description...",
  "version": "1.1"
}
```

### 5. Update Terms & Conditions Status (Admin Only)

**PATCH** `/api/admin/terms-and-conditions/:id/status`

**Request Body:**
```json
{
  "status": "inactive"
}
```

### 6. Delete Terms & Conditions (Admin Only)

**DELETE** `/api/admin/terms-and-conditions/:id`

**Response:**
```json
{
  "success": true,
  "message": "Terms & Conditions deleted successfully"
}
```

### 7. Get Terms & Conditions by Status (Admin Only)

**GET** `/api/admin/terms-and-conditions/status/:status`

Where `:status` is either `active` or `inactive`.

### 8. Get Active Terms & Conditions (Public)

**GET** `/api/public/terms-and-conditions`

**Response:**
```json
{
  "success": true,
  "message": "Active Terms & Conditions retrieved successfully",
  "data": {
    "termsAndConditions": [...]
  }
}
```

---

## Privacy Policy API

### 1. Create Privacy Policy (Admin Only)

**POST** `/api/admin/privacy-policies`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Privacy Policy - LPG Gas Service",
  "description": "This privacy policy explains how we collect, use, and protect your personal information...",
  "status": "active",
  "version": "1.0"
}
```

### 2. Get All Privacy Policies (Admin Only)

**GET** `/api/admin/privacy-policies`

**Query Parameters:** Same as Terms & Conditions

### 3. Get Privacy Policy by ID (Admin Only)

**GET** `/api/admin/privacy-policies/:id`

### 4. Update Privacy Policy (Admin Only)

**PUT** `/api/admin/privacy-policies/:id`

### 5. Update Privacy Policy Status (Admin Only)

**PATCH** `/api/admin/privacy-policies/:id/status`

### 6. Delete Privacy Policy (Admin Only)

**DELETE** `/api/admin/privacy-policies/:id`

### 7. Get Privacy Policies by Status (Admin Only)

**GET** `/api/admin/privacy-policies/status/:status`

### 8. Get Active Privacy Policies (Public)

**GET** `/api/public/privacy-policies`

---

## Field Validation

### Terms & Conditions / Privacy Policy Fields

| Field | Type | Required | Min Length | Max Length | Description |
|-------|------|----------|------------|------------|-------------|
| title | String | Yes | 2 | 200 | Title of the document |
| description | String | Yes | 10 | 10000 | Main content of the document |
| status | Enum | No | - | - | active/inactive (default: active) |
| version | String | No | 1 | 20 | Version number (default: 1.0) |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Title must be at least 2 characters long",
  "error": "ValidationError"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required",
  "error": "UnauthorizedError"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions",
  "error": "ForbiddenError"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Terms & Conditions not found",
  "error": "NotFoundError"
}
```

---

## Usage Examples

### Creating Terms & Conditions
```bash
curl -X POST http://localhost:3000/api/admin/terms-and-conditions \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Terms and Conditions - LPG Gas Service",
    "description": "These terms and conditions govern the use of our LPG gas delivery service. By using our service, you agree to be bound by these terms.",
    "status": "active",
    "version": "1.0"
  }'
```

### Getting Active Terms & Conditions (Public)
```bash
curl -X GET http://localhost:3000/api/public/terms-and-conditions
```

### Updating Privacy Policy
```bash
curl -X PUT http://localhost:3000/api/admin/privacy-policies/uuid-here \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Privacy Policy",
    "description": "Updated privacy policy content...",
    "version": "1.1"
  }'
```

---

## Database Setup

To create the required database tables, run:

```bash
node scripts/syncTermsAndPrivacyTables.js
```

This will create the following tables:
- `terms_and_conditions`
- `privacy_policies`

Both tables include:
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text, Required)
- `status` (Enum: active/inactive)
- `version` (String)
- `lastUpdatedBy` (UUID, Foreign Key to users table)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
