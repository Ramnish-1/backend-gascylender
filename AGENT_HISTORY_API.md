# Agent History API Documentation

This document describes the API endpoints for agents to view their delivery history and statistics.

## Base URL
`/api/orders/agent/`

## Authentication
- **Required:** Bearer token authentication
- **Role:** Only agents can access these endpoints

---

## 1. Get Agent Delivery History

**GET** `/api/orders/agent/history`

### Description
Retrieves the complete delivery history for the authenticated agent, including delivered and cancelled orders.

### Headers
```
Authorization: Bearer <agent-token>
Content-Type: application/json
```

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Number of items per page |
| `status` | String | No | - | Filter by status: `delivered` or `cancelled` |
| `startDate` | String | No | - | Start date filter (YYYY-MM-DD) |
| `endDate` | String | No | - | End date filter (YYYY-MM-DD) |
| `customerName` | String | No | - | Search by customer name |

### Example Request
```bash
curl -X GET "http://localhost:5000/api/orders/agent/history?page=1&limit=5&status=delivered&startDate=2024-01-01" \
  -H "Authorization: Bearer your-agent-token"
```

### Response Format
```json
{
  "success": true,
  "message": "Agent delivery history retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-123456-ABC123",
        "customerName": "John Doe",
        "customerEmail": "john@example.com",
        "customerPhone": "9876543210",
        "customerAddress": "123 Main St, City",
        "items": [
          {
            "productName": "LPG Gas Cylinder",
            "variantLabel": "12kg",
            "quantity": 1,
            "variantPrice": 500,
            "total": 500
          }
        ],
        "subtotal": "500.00",
        "totalAmount": "500.00",
        "paymentMethod": "cash_on_delivery",
        "paymentStatus": "paid",
        "status": "delivered",
        "adminNotes": "Order completed successfully",
        "agentNotes": "Delivered on time",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z",
        "deliveredAt": "2024-01-01T12:00:00.000Z",
        "assignedAgent": {
          "id": "agent-uuid",
          "name": "Shubham Kumar",
          "phone": "8580764425",
          "vehicleNumber": "HP 19 F 4344"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10
    },
    "summary": {
      "totalDelivered": 10,
      "totalCancelled": 2,
      "totalEarnings": 5000.00,
      "totalOrders": 12
    },
    "agent": {
      "id": "agent-uuid",
      "name": "Shubham Kumar",
      "phone": "8580764425",
      "vehicleNumber": "HP 19 F 4344"
    }
  }
}
```

---

## 2. Get Agent Delivery Statistics

**GET** `/api/orders/agent/stats`

### Description
Retrieves delivery statistics for the authenticated agent for a specific time period.

### Headers
```
Authorization: Bearer <agent-token>
Content-Type: application/json
```

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | String | No | month | Time period: `day`, `week`, `month`, `year` |

### Example Request
```bash
curl -X GET "http://localhost:5000/api/orders/agent/stats?period=month" \
  -H "Authorization: Bearer your-agent-token"
```

### Response Format
```json
{
  "success": true,
  "message": "Agent delivery statistics retrieved successfully",
  "data": {
    "period": "month",
    "periodStart": "2024-01-01T00:00:00.000Z",
    "periodEnd": "2024-01-31T23:59:59.999Z",
    "stats": {
      "delivered": 15,
      "cancelled": 3,
      "earnings": 7500.00,
      "totalOrders": 18
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-15",
        "count": "3",
        "earnings": "1500.00"
      },
      {
        "date": "2024-01-14",
        "count": "2",
        "earnings": "1000.00"
      }
    ]
  }
}
```

---

## Usage Examples

### 1. Get All Delivery History
```bash
curl -X GET "http://localhost:5000/api/orders/agent/history" \
  -H "Authorization: Bearer your-agent-token"
```

### 2. Get Only Delivered Orders
```bash
curl -X GET "http://localhost:5000/api/orders/agent/history?status=delivered" \
  -H "Authorization: Bearer your-agent-token"
```

### 3. Get History for Date Range
```bash
curl -X GET "http://localhost:5000/api/orders/agent/history?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer your-agent-token"
```

### 4. Search by Customer Name
```bash
curl -X GET "http://localhost:5000/api/orders/agent/history?customerName=John" \
  -H "Authorization: Bearer your-agent-token"
```

### 5. Get Weekly Statistics
```bash
curl -X GET "http://localhost:5000/api/orders/agent/stats?period=week" \
  -H "Authorization: Bearer your-agent-token"
```

### 6. Get Daily Statistics
```bash
curl -X GET "http://localhost:5000/api/orders/agent/stats?period=day" \
  -H "Authorization: Bearer your-agent-token"
```

---

## Error Responses

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
  "message": "Access denied. Only agents can view delivery history.",
  "error": "ForbiddenError"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Agent profile not properly linked. Please contact admin.",
  "error": "BadRequestError"
}
```

---

## Features

### History API Features:
- ✅ **Complete Delivery History** - Shows all delivered and cancelled orders
- ✅ **Pagination Support** - Handle large datasets efficiently
- ✅ **Status Filtering** - Filter by delivered or cancelled status
- ✅ **Date Range Filtering** - Filter by delivery date range
- ✅ **Customer Search** - Search by customer name
- ✅ **Summary Statistics** - Total delivered, cancelled, earnings
- ✅ **Agent Information** - Agent details included

### Statistics API Features:
- ✅ **Multiple Time Periods** - Day, week, month, year
- ✅ **Period Statistics** - Orders and earnings for the period
- ✅ **Daily Breakdown** - Day-wise delivery statistics
- ✅ **Earnings Tracking** - Total earnings calculation
- ✅ **Performance Metrics** - Delivered vs cancelled ratio

### Security Features:
- ✅ **Role-based Access** - Only agents can access
- ✅ **Agent Validation** - Checks if agent profile is linked
- ✅ **Data Isolation** - Agents only see their own data
- ✅ **Authentication Required** - Bearer token mandatory

---

## Integration Notes

1. **Authentication**: Always include the Bearer token in the Authorization header
2. **Pagination**: Use page and limit parameters for large datasets
3. **Date Format**: Use YYYY-MM-DD format for date parameters
4. **Error Handling**: Check the success field in response
5. **Rate Limiting**: Consider implementing rate limiting for production use

---

## Testing

To test these APIs:

1. **Login as an agent** to get the Bearer token
2. **Use the token** in Authorization header
3. **Test different query parameters** to verify filtering
4. **Check pagination** with different page/limit values
5. **Verify date filtering** with startDate/endDate parameters
