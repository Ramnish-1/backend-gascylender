# Product API Documentation

## Base URL
```
http://localhost:5000/api/products
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Create Product
**POST** `/api/products`

### Request Body
```json
{
  "productName": "LPG Gas Cylinder",
  "unit": "Cylinder",
  "description": "Standard 14.2 kg LPG gas cylinder for domestic use",
  "price": 950.00,
  "stock": 50,
  "lowStockThreshold": 10,
  "status": "active"
}
```

### Response
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": "uuid-here",
      "productName": "LPG Gas Cylinder",
      "unit": "Cylinder",
      "description": "Standard 14.2 kg LPG gas cylinder for domestic use",
      "price": "950.00",
      "stock": 50,
      "lowStockThreshold": 10,
      "status": "active",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:30:00.000Z"
    }
  }
}
```

---

## 2. Get All Products (Comprehensive Endpoint)
**GET** `/api/products`

### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ("active" or "inactive")
- `search` (optional): Search in product name, description, or unit
- `id` (optional): Get specific product by ID

### Example Requests

#### Get All Products (with pagination)
```
GET /api/products
GET /api/products?page=1&limit=5
```

#### Get Products by Status
```
GET /api/products?status=active
GET /api/products?status=inactive
```

#### Search Products
```
GET /api/products?search=cylinder
GET /api/products?search=lpg
```

#### Get Specific Product by ID
```
GET /api/products?id=uuid-here
```

#### Combined Filters
```
GET /api/products?status=active&search=cylinder&page=1&limit=10
```

### Response
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "uuid-here",
        "productName": "LPG Gas Cylinder",
        "unit": "Cylinder",
        "description": "Standard 14.2 kg LPG gas cylinder for domestic use",
        "price": "950.00",
        "stock": 50,
        "lowStockThreshold": 10,
        "status": "active",
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

---

## 3. Get Products by Status
**GET** `/api/products/status/:status`

### Example Requests
```
GET /api/products/status/active
GET /api/products/status/inactive
```

### Response
```json
{
  "success": true,
  "message": "active products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "uuid-here",
        "productName": "LPG Gas Cylinder",
        "unit": "Cylinder",
        "description": "Standard 14.2 kg LPG gas cylinder for domestic use",
        "price": "950.00",
        "stock": 50,
        "lowStockThreshold": 10,
        "status": "active",
        "createdAt": "2025-08-29T08:30:00.000Z",
        "updatedAt": "2025-08-29T08:30:00.000Z"
      }
    ]
  }
}
```

---

## 4. Update Product
**PUT** `/api/products/:id`

### Request Body (all fields optional)
```json
{
  "productName": "Premium LPG Gas Cylinder",
  "unit": "Cylinder",
  "description": "Premium 14.2 kg LPG gas cylinder with enhanced safety features",
  "price": 1050.00,
  "stock": 75,
  "lowStockThreshold": 15,
  "status": "active"
}
```

### Example Request
```
PUT /api/products/uuid-here
```

### Response
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {
      "id": "uuid-here",
      "productName": "Premium LPG Gas Cylinder",
      "unit": "Cylinder",
      "description": "Premium 14.2 kg LPG gas cylinder with enhanced safety features",
      "price": "1050.00",
      "stock": 75,
      "lowStockThreshold": 15,
      "status": "active",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:35:00.000Z"
    }
  }
}
```

---

## 5. Update Product Status Only
**PATCH** `/api/products/:id/status`

### Request Body
```json
{
  "status": "inactive"
}
```

### Example Request
```
PATCH /api/products/uuid-here/status
```

### Response
```json
{
  "success": true,
  "message": "Product status updated successfully",
  "data": {
    "product": {
      "id": "uuid-here",
      "productName": "Premium LPG Gas Cylinder",
      "unit": "Cylinder",
      "description": "Premium 14.2 kg LPG gas cylinder with enhanced safety features",
      "price": "1050.00",
      "stock": 75,
      "lowStockThreshold": 15,
      "status": "inactive",
      "createdAt": "2025-08-29T08:30:00.000Z",
      "updatedAt": "2025-08-29T08:40:00.000Z"
    }
  }
}
```

---

## 6. Delete Product
**DELETE** `/api/products/:id`

### Example Request
```
DELETE /api/products/uuid-here
```

### Response
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Field Validation Rules

### Required Fields for Creation:
- **productName**: 2-200 characters, must be unique
- **unit**: 1-50 characters
- **description**: 10-1000 characters
- **price**: Positive number with max 2 decimal places

### Optional Fields:
- **stock**: Integer, minimum 0 (default: 0)
- **lowStockThreshold**: Integer, minimum 0 (default: 10)
- **status**: "active" or "inactive" (default: "active")

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
  "error": "Product not found",
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
// Create product
const createProduct = async (productData) => {
  const response = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });
  return await response.json();
};

// Get all products
const getProducts = async (page = 1, limit = 10) => {
  const response = await fetch(`http://localhost:5000/api/products?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Update product status
const updateProductStatus = async (id, status) => {
  const response = await fetch(`http://localhost:5000/api/products/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  return await response.json();
};

// Update product (including stock)
const updateProduct = async (id, productData) => {
  const response = await fetch(`http://localhost:5000/api/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });
  return await response.json();
};
```

### React Example
```jsx
import React, { useState, useEffect } from 'react';

const ProductForm = () => {
  const [formData, setFormData] = useState({
    productName: '',
    unit: '',
    description: '',
    price: '',
    stock: 0,
    lowStockThreshold: 10,
    status: 'active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Product Name"
        value={formData.productName}
        onChange={(e) => setFormData({...formData, productName: e.target.value})}
      />
      <input
        type="text"
        placeholder="Unit"
        value={formData.unit}
        onChange={(e) => setFormData({...formData, unit: e.target.value})}
      />
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Price"
        value={formData.price}
        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
      />
      <input
        type="number"
        placeholder="Stock"
        value={formData.stock}
        onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
      />
      <input
        type="number"
        placeholder="Low Stock Threshold"
        value={formData.lowStockThreshold}
        onChange={(e) => setFormData({...formData, lowStockThreshold: parseInt(e.target.value)})}
      />
      <select
        value={formData.status}
        onChange={(e) => setFormData({...formData, status: e.target.value})}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="submit">Create Product</button>
    </form>
  );
};
```

---

## Summary of GET Endpoint Features

The single GET `/api/products` endpoint handles:

1. **Get All Products**: `GET /api/products`
2. **Pagination**: `GET /api/products?page=1&limit=10`
3. **Status Filter**: `GET /api/products?status=active`
4. **Search**: `GET /api/products?search=cylinder`
5. **Get by ID**: `GET /api/products?id=uuid-here`
6. **Combined Filters**: `GET /api/products?status=active&search=cylinder&page=1`

All responses include creation and update timestamps.

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/products` | Create new product |
| **GET** | `/api/products` | Get all products (comprehensive) |
| **GET** | `/api/products/status/:status` | Get products by status |
| **PUT** | `/api/products/:id` | Update product |
| **PATCH** | `/api/products/:id/status` | Update status only |
| **DELETE** | `/api/products/:id` | Delete product |
