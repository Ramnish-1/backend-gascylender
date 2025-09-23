# Multi-Agency System Implementation

## Overview

The LPG Gas Backend now supports a multi-agency system where multiple agencies can operate independently while sharing the same platform. Each agency has its own products, delivery agents, and orders, with proper isolation and security.

## Key Features

### 1. Agency-Based Data Isolation
- **Products**: Each product belongs to a specific agency
- **Delivery Agents**: Each agent is associated with one agency
- **Orders**: Orders are automatically routed to the correct agency based on the products ordered
- **Agency Owners**: Can only manage their own agency's data

### 2. Token-Based Authentication & Authorization
- **Admin**: Can see and manage all agencies' data
- **Agency Owner**: Can only see and manage their own agency's data
- **Delivery Agent**: Can only see orders assigned to them from their agency
- **Customer**: Can only see their own orders

### 3. Automatic Order Routing
- Orders are automatically assigned to the correct agency based on the products in the order
- All products in a single order must belong to the same agency
- Agents can only be assigned to orders from their own agency

## Database Schema Changes

### New Columns Added

1. **Products Table**
   ```sql
   ALTER TABLE products ADD COLUMN agency_id UUID REFERENCES agencies(id);
   ```

2. **Delivery Agents Table**
   ```sql
   ALTER TABLE delivery_agents ADD COLUMN agency_id UUID REFERENCES agencies(id);
   ```

3. **Orders Table**
   ```sql
   ALTER TABLE orders ADD COLUMN agency_id UUID REFERENCES agencies(id);
   ```

### Model Associations

```javascript
// Product belongs to Agency
Product.belongsTo(Agency, { foreignKey: 'agencyId', as: 'Agency' });
Agency.hasMany(Product, { foreignKey: 'agencyId', as: 'Products' });

// DeliveryAgent belongs to Agency
DeliveryAgent.belongsTo(Agency, { foreignKey: 'agencyId', as: 'Agency' });
Agency.hasMany(DeliveryAgent, { foreignKey: 'agencyId', as: 'DeliveryAgents' });

// Order belongs to Agency
Order.belongsTo(Agency, { foreignKey: 'agencyId', as: 'Agency' });
Agency.hasMany(Order, { foreignKey: 'agencyId', as: 'Orders' });
```

## API Changes

### Product Management

#### Create Product
- **Agency Owner**: `agencyId` is automatically set from the token
- **Admin**: Can specify `agencyId` in the request body
- **Validation**: Product names must be unique within the same agency

#### Get Products
- **Agency Owner**: Only sees products from their agency
- **Admin**: Sees all products from all agencies
- **Filtering**: Automatic filtering based on user role and token

### Delivery Agent Management

#### Create Delivery Agent
- **Agency Owner**: `agencyId` is automatically set from the token
- **Admin**: Can specify `agencyId` in the request body
- **Validation**: All unique fields (email, phone, vehicle number, etc.) are checked globally

#### Get Delivery Agents
- **Agency Owner**: Only sees agents from their agency
- **Admin**: Sees all agents from all agencies
- **Filtering**: Automatic filtering based on user role and token

### Order Management

#### Create Order
- **Automatic Agency Detection**: Agency is determined from the first product in the order
- **Validation**: All products in an order must belong to the same agency
- **Routing**: Order is automatically assigned to the correct agency

#### Get Orders
- **Agency Owner**: Only sees orders for their agency
- **Admin**: Sees all orders from all agencies
- **Delivery Agent**: Only sees orders assigned to them from their agency
- **Customer**: Only sees their own orders

#### Assign Agent to Order
- **Validation**: Agent must belong to the same agency as the order
- **Security**: Prevents cross-agency agent assignments

## Usage Examples

### For Agency Owners

#### Creating a Product
```javascript
// POST /api/products
// Headers: Authorization: Bearer <agency_owner_token>
{
  "productName": "LPG Cylinder 14.2kg",
  "description": "Standard LPG cylinder",
  "price": 950.00,
  "variants": [
    {
      "label": "14.2kg",
      "unit": "kg", 
      "price": 950.00,
      "stock": 50
    }
  ]
  // agencyId is automatically set from token
}
```

#### Creating a Delivery Agent
```javascript
// POST /api/delivery-agents
// Headers: Authorization: Bearer <agency_owner_token>
{
  "name": "John Doe",
  "email": "john@agency.com",
  "phone": "9876543210",
  "vehicleNumber": "KA01AB1234",
  "panCardNumber": "ABCDE1234F",
  "aadharCardNumber": "123456789012",
  "drivingLicence": "DL123456789",
  "bankDetails": "Bank details here"
  // agencyId is automatically set from token
}
```

### For Admins

#### Creating a Product for Specific Agency
```javascript
// POST /api/products
// Headers: Authorization: Bearer <admin_token>
{
  "productName": "LPG Cylinder 19kg",
  "description": "Large LPG cylinder",
  "price": 1200.00,
  "agencyId": "agency-uuid-here", // Admin can specify agency
  "variants": [
    {
      "label": "19kg",
      "unit": "kg",
      "price": 1200.00,
      "stock": 30
    }
  ]
}
```

### For Customers

#### Creating an Order
```javascript
// POST /api/orders
{
  "customerName": "Customer Name",
  "customerEmail": "customer@email.com",
  "customerPhone": "9876543210",
  "customerAddress": "Customer Address",
  "items": [
    {
      "productId": "product-uuid-here",
      "productName": "LPG Cylinder 14.2kg",
      "variantLabel": "14.2kg",
      "variantPrice": 950.00,
      "quantity": 1,
      "total": 950.00
    }
  ],
  "paymentMethod": "cash_on_delivery"
  // agencyId is automatically determined from products
}
```

## Security Features

### 1. Data Isolation
- Agency owners can only access their own data
- Automatic filtering based on authentication tokens
- No cross-agency data leakage

### 2. Validation
- Product names must be unique within the same agency
- All products in an order must belong to the same agency
- Agents can only be assigned to orders from their agency

### 3. Authorization
- Role-based access control
- Token-based authentication
- Automatic permission checking

## Migration

To apply the database changes, run:

```bash
node scripts/addAgencyColumns.js
```

This will add the necessary columns to the existing tables.

## Testing

The system has been tested with:
- ✅ Agency creation and management
- ✅ Product creation with agency association
- ✅ Delivery agent creation with agency association
- ✅ Order creation with automatic agency routing
- ✅ Agency-based data filtering
- ✅ Cross-agency assignment prevention
- ✅ Token-based authorization

## Benefits

1. **Scalability**: Multiple agencies can operate on the same platform
2. **Isolation**: Each agency's data is completely separate
3. **Security**: Proper authorization and validation
4. **Flexibility**: Admin can manage all agencies, agency owners manage their own
5. **Automation**: Orders are automatically routed to the correct agency
6. **Consistency**: Same APIs work for all agencies with proper filtering

## Future Enhancements

1. **Agency-specific settings**: Each agency can have its own configuration
2. **Inter-agency transfers**: Allow products to be transferred between agencies
3. **Agency analytics**: Separate analytics for each agency
4. **Agency-specific notifications**: Custom notification settings per agency
5. **Multi-tenant billing**: Separate billing for each agency
