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
  "status": "active",
  "variants": [
    {
      "label": "14.2kg",
      "unit": "kg",
      "price": 950.00,
      "stock": 50
    },
    {
      "label": "19kg",
      "unit": "kg", 
      "price": 1200.00,
      "stock": 30
    }
  ],
  "images": [
    "https://res.cloudinary.com/your-cloud/image1.jpg",
    "https://res.cloudinary.com/your-cloud/image2.jpg"
  ],
  "agencies": [
    {
      "name": "Delhi Gas Agency",
      "email": "delhi@example.com",
      "phone": "9876543210",
      "addressTitle": "Main Office",
      "address": "123 Main Street, Connaught Place",
      "city": "Delhi",
      "pincode": "110001",
      "landmark": "Near Metro Station"
    },
    {
      "name": "Mumbai Gas Agency", 
      "email": "mumbai@example.com",
      "phone": "9876543211",
      "addressTitle": "Branch Office",
      "address": "456 Marine Drive",
      "city": "Mumbai",
      "pincode": "400001",
      "landmark": "Near Gateway of India"
    }
  ]
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
      "variants": [
        {
          "label": "14.2kg",
          "unit": "kg",
          "price": 950.00,
          "stock": 50
        },
        {
          "label": "19kg",
          "unit": "kg", 
          "price": 1200.00,
          "stock": 30
        }
      ],
      "images": [
        "https://res.cloudinary.com/your-cloud/image1.jpg",
        "https://res.cloudinary.com/your-cloud/image2.jpg"
      ],
      "agencies": [
        {
          "name": "Delhi Gas Agency",
          "email": "delhi@example.com",
          "phone": "9876543210",
          "addressTitle": "Main Office",
          "address": "123 Main Street, Connaught Place",
          "city": "Delhi",
          "pincode": "110001",
          "landmark": "Near Metro Station"
        },
        {
          "name": "Mumbai Gas Agency", 
          "email": "mumbai@example.com",
          "phone": "9876543211",
          "addressTitle": "Branch Office",
          "address": "456 Marine Drive",
          "city": "Mumbai",
          "pincode": "400001",
          "landmark": "Near Gateway of India"
        }
      ],
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
- **description**: 3-2000 characters
- **variants**: Array of variant objects (at least 1 required)
- **agencies**: Array of agency objects (at least 1 required)

### Optional Fields:
- **unit**: 1-50 characters
- **price**: Positive number with max 2 decimal places
- **stock**: Integer, minimum 0 (default: 0)
- **lowStockThreshold**: Integer, minimum 0 (default: 10)
- **status**: "active" or "inactive" (default: "active")
- **images**: Array of image URLs
- **category**: "lpg" or "accessories" (default: "lpg")

### Variant Object Structure:
```json
{
  "label": "14.2kg",           // Required: 1-50 characters
  "unit": "kg",               // Optional: 1-20 characters
  "price": 950.00,            // Required: Positive number with 2 decimal places
  "stock": 50                 // Optional: Integer, minimum 0 (default: 0)
}
```

### Agency Object Structure:
```json
{
  "name": "Delhi Gas Agency",           // Required: 2-150 characters
  "email": "delhi@example.com",         // Required: Valid email
  "phone": "9876543210",                // Required: 10-15 digits
  "addressTitle": "Main Office",        // Required: 2-50 characters
  "address": "123 Main Street",         // Required: 5-500 characters
  "city": "Delhi",                      // Required: 2-50 characters
  "pincode": "110001",                  // Required: 6 digits
  "landmark": "Near Metro Station"      // Optional: Max 100 characters
}
```

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
    status: 'active',
    variants: [{ label: '', unit: '', price: '', stock: 0 }],
    agencies: [{ 
      name: '', 
      email: '', 
      phone: '', 
      addressTitle: '', 
      address: '', 
      city: '', 
      pincode: '', 
      landmark: '' 
    }]
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

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { label: '', unit: '', price: '', stock: 0 }]
    });
  };

  const addAgency = () => {
    setFormData({
      ...formData,
      agencies: [...formData.agencies, { 
        name: '', 
        email: '', 
        phone: '', 
        addressTitle: '', 
        address: '', 
        city: '', 
        pincode: '', 
        landmark: '' 
      }]
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({...formData, variants: newVariants});
  };

  const updateAgency = (index, field, value) => {
    const newAgencies = [...formData.agencies];
    newAgencies[index][field] = value;
    setFormData({...formData, agencies: newAgencies});
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Product Name"
        value={formData.productName}
        onChange={(e) => setFormData({...formData, productName: e.target.value})}
        required
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
        required
      />
      
      {/* Variants Section */}
      <h3>Product Variants</h3>
      {formData.variants.map((variant, index) => (
        <div key={index}>
          <input
            type="text"
            placeholder="Variant Label (e.g., 14.2kg)"
            value={variant.label}
            onChange={(e) => updateVariant(index, 'label', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Unit (e.g., kg)"
            value={variant.unit}
            onChange={(e) => updateVariant(index, 'unit', e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            value={variant.price}
            onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value))}
            required
          />
          <input
            type="number"
            placeholder="Stock"
            value={variant.stock}
            onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value))}
          />
        </div>
      ))}
      <button type="button" onClick={addVariant}>Add Variant</button>

      {/* Agencies Section */}
      <h3>Associated Agencies</h3>
      {formData.agencies.map((agency, index) => (
        <div key={index}>
          <input
            type="text"
            placeholder="Agency Name"
            value={agency.name}
            onChange={(e) => updateAgency(index, 'name', e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Agency Email"
            value={agency.email}
            onChange={(e) => updateAgency(index, 'email', e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={agency.phone}
            onChange={(e) => updateAgency(index, 'phone', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Address Title"
            value={agency.addressTitle}
            onChange={(e) => updateAgency(index, 'addressTitle', e.target.value)}
            required
          />
          <textarea
            placeholder="Full Address"
            value={agency.address}
            onChange={(e) => updateAgency(index, 'address', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="City"
            value={agency.city}
            onChange={(e) => updateAgency(index, 'city', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Pincode"
            value={agency.pincode}
            onChange={(e) => updateAgency(index, 'pincode', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Landmark (optional)"
            value={agency.landmark}
            onChange={(e) => updateAgency(index, 'landmark', e.target.value)}
          />
        </div>
      ))}
      <button type="button" onClick={addAgency}>Add Agency</button>

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
