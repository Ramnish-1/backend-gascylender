# Delivery Agent API Documentation

## Base URL
```
http://localhost:5000/api/delivery-agents
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Create Delivery Agent
**POST** `/api/delivery-agents`

### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "vehicleNumber": "MH12AB1234",
  "panCardNumber": "ABCDE1234F",
  "aadharCardNumber": "123456789012",
  "drivingLicence": "DL1234567890123",
  "bankDetails": "Bank Name: HDFC Bank\nAccount Number: 1234567890\nIFSC Code: HDFC0001234\nBranch: Mumbai Main",
  "status": "offline"
}
```

### Response
```json
{
  "success": true,
  "message": "Delivery agent created successfully",
  "data": {
    "agent": {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "vehicleNumber": "MH12AB1234",
      "panCardNumber": "ABCDE1234F",
      "aadharCardNumber": "123456789012",
      "drivingLicence": "DL1234567890123",
      "bankDetails": "Bank Name: HDFC Bank\nAccount Number: 1234567890\nIFSC Code: HDFC0001234\nBranch: Mumbai Main",
      "status": "offline",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:30:00.000Z"
    }
  }
}
```

---

## 2. Get Delivery Agents (Comprehensive Endpoint)
**GET** `/api/delivery-agents`

### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ("online" or "offline")
- `search` (optional): Search in name, email, phone, or vehicle number
- `id` (optional): Get specific agent by ID

### Example Requests

#### Get All Agents (with pagination)
```
GET /api/delivery-agents
GET /api/delivery-agents?page=1&limit=5
```

#### Get Agents by Status
```
GET /api/delivery-agents?status=online
GET /api/delivery-agents?status=offline
```

#### Search Agents
```
GET /api/delivery-agents?search=john
GET /api/delivery-agents?search=9876543210
```

#### Get Specific Agent by ID
```
GET /api/delivery-agents?id=uuid-here
```

#### Combined Filters
```
GET /api/delivery-agents?status=online&search=john&page=1&limit=10
```

### Response Examples

#### For Multiple Agents
```json
{
  "success": true,
  "message": "Delivery agents retrieved successfully",
  "data": {
    "agents": [
      {
        "id": "uuid-here",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "9876543210",
        "vehicleNumber": "MH12AB1234",
        "panCardNumber": "ABCDE1234F",
        "aadharCardNumber": "123456789012",
        "drivingLicence": "DL1234567890123",
        "bankDetails": "Bank Name: HDFC Bank\nAccount Number: 1234567890\nIFSC Code: HDFC0001234\nBranch: Mumbai Main",
        "status": "online",
        "createdAt": "2025-08-29T08:30:00.000Z",
        "updatedAt": "2025-08-29T08:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

#### For Single Agent (when ID is provided)
```json
{
  "success": true,
  "message": "Delivery agent retrieved successfully",
  "data": {
    "agent": {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "vehicleNumber": "MH12AB1234",
      "panCardNumber": "ABCDE1234F",
      "aadharCardNumber": "123456789012",
      "drivingLicence": "DL1234567890123",
      "bankDetails": "Bank Name: HDFC Bank\nAccount Number: 1234567890\nIFSC Code: HDFC0001234\nBranch: Mumbai Main",
      "status": "online",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:30:00.000Z"
    }
  }
}
```

---

## 3. Update Delivery Agent
**PUT** `/api/delivery-agents/:id`

### Request Body (all fields optional)
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "9876543211",
  "vehicleNumber": "MH12AB1235",
  "panCardNumber": "ABCDE1235F",
  "aadharCardNumber": "123456789013",
  "drivingLicence": "DL1234567890124",
  "bankDetails": "Bank Name: SBI Bank\nAccount Number: 1234567891\nIFSC Code: SBIN0001234\nBranch: Delhi Main",
  "status": "online"
}
```

### Example Request
```
PUT /api/delivery-agents/uuid-here
```

### Response
```json
{
  "success": true,
  "message": "Delivery agent updated successfully",
  "data": {
    "agent": {
      "id": "uuid-here",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "phone": "9876543211",
      "vehicleNumber": "MH12AB1235",
      "panCardNumber": "ABCDE1235F",
      "aadharCardNumber": "123456789013",
      "drivingLicence": "DL1234567890124",
      "bankDetails": "Bank Name: SBI Bank\nAccount Number: 1234567891\nIFSC Code: SBIN0001234\nBranch: Delhi Main",
      "status": "online",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:35:00.000Z"
    }
  }
}
```

---

## 4. Update Agent Status Only
**PATCH** `/api/delivery-agents/:id/status`

### Request Body
```json
{
  "status": "online"
}
```

### Example Request
```
PATCH /api/delivery-agents/uuid-here/status
```

### Response
```json
{
  "success": true,
  "message": "Agent status updated successfully",
  "data": {
    "agent": {
      "id": "uuid-here",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "phone": "9876543211",
      "vehicleNumber": "MH12AB1235",
      "panCardNumber": "ABCDE1235F",
      "aadharCardNumber": "123456789013",
      "drivingLicence": "DL1234567890124",
      "bankDetails": "Bank Name: SBI Bank\nAccount Number: 1234567891\nIFSC Code: SBIN0001234\nBranch: Delhi Main",
      "status": "online",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:40:00.000Z"
    }
  }
}
```

---

## 5. Delete Delivery Agent
**DELETE** `/api/delivery-agents/:id`

### Example Request
```
DELETE /api/delivery-agents/uuid-here
```

### Response
```json
{
  "success": true,
  "message": "Delivery agent deleted successfully"
}
```

---

## Field Validation Rules

### Required Fields for Creation:
- **name**: 2-100 characters
- **email**: Valid email format, must be unique
- **phone**: 10-15 digits
- **vehicleNumber**: 5-20 characters
- **panCardNumber**: Exactly 10 characters (format: ABCDE1234F)
- **aadharCardNumber**: Exactly 12 digits
- **drivingLicence**: 10-20 characters
- **bankDetails**: Minimum 10 characters (textarea)

### Optional Fields:
- **status**: "online" or "offline" (default: "offline")

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access denied. No token provided",
  "statusCode": 401
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Delivery agent not found",
  "statusCode": 404
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server Error",
  "statusCode": 500
}
```

---

## Frontend Integration Examples

### JavaScript/Fetch Example
```javascript
// Create delivery agent
const createAgent = async (agentData) => {
  const response = await fetch('http://localhost:5000/api/delivery-agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(agentData)
  });
  return await response.json();
};

// Get all agents with pagination
const getAgents = async (page = 1, limit = 10) => {
  const response = await fetch(`http://localhost:5000/api/delivery-agents?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Get specific agent by ID
const getAgentById = async (id) => {
  const response = await fetch(`http://localhost:5000/api/delivery-agents?id=${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Get online agents
const getOnlineAgents = async () => {
  const response = await fetch('http://localhost:5000/api/delivery-agents?status=online', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Search agents
const searchAgents = async (searchTerm) => {
  const response = await fetch(`http://localhost:5000/api/delivery-agents?search=${searchTerm}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### React Example
```jsx
import React, { useState, useEffect } from 'react';

const DeliveryAgentList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`http://localhost:5000/api/delivery-agents?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      setAgents(result.data.agents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [searchTerm, statusFilter]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div>
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {agents.map(agent => (
            <div key={agent.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h3>{agent.name}</h3>
              <p><strong>Email:</strong> {agent.email}</p>
              <p><strong>Phone:</strong> {agent.phone}</p>
              <p><strong>Vehicle:</strong> {agent.vehicleNumber}</p>
              <p><strong>Status:</strong> <span style={{ color: agent.status === 'online' ? 'green' : 'red' }}>
                {agent.status}
              </span></p>
              <p><strong>Joined:</strong> {formatDate(agent.createdAt)}</p>
              <p><strong>Last Updated:</strong> {formatDate(agent.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Summary of GET Endpoint Features

The single GET `/api/delivery-agents` endpoint now handles:

1. **Get All Agents**: `GET /api/delivery-agents`
2. **Pagination**: `GET /api/delivery-agents?page=1&limit=10`
3. **Status Filter**: `GET /api/delivery-agents?status=online`
4. **Search**: `GET /api/delivery-agents?search=john`
5. **Get by ID**: `GET /api/delivery-agents?id=uuid-here`
6. **Combined Filters**: `GET /api/delivery-agents?status=online&search=john&page=1`

All responses include the join date and time in the `createdAt` field and last update time in the `updatedAt` field.
