# Address Management Endpoints

This document describes the customer address management endpoints for the Kenteandbobs backend.

## Overview

These endpoints allow authenticated customers to manage their saved addresses for shipping and billing purposes.

**Base URL:** `/store/addresses`

**Authentication:** Required for all endpoints

---

## Endpoints

### 1. Get All Addresses

**Endpoint:** `GET /store/addresses`

**Authentication:** Required

**Description:** Retrieve all saved addresses for the authenticated customer.

**Request:**
```bash
curl -X GET http://localhost:9000/store/addresses \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"
```

**Response:** `200 OK`

```json
{
  "addresses": [
    {
      "id": "addr_01HZABC123",
      "customer_id": "cus_01HZABC456",
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main Street",
      "address_2": "Apt 4",
      "city": "Accra",
      "province": "Greater Accra Region",
      "postal_code": "GA001",
      "country_code": "gh",
      "phone": "+233241234567",
      "company": "",
      "is_default_shipping": true,
      "is_default_billing": false,
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: User is not authenticated
- `404 Not Found`: Customer not found
- `500 Internal Server Error`: Server error

---

### 2. Get Single Address

**Endpoint:** `GET /store/addresses/[id]`

**Authentication:** Required

**Description:** Retrieve a specific address by ID.

**Request:**
```bash
curl -X GET http://localhost:9000/store/addresses/addr_01HZABC123 \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"
```

**Response:** `200 OK`

```json
{
  "address": {
    "id": "addr_01HZABC123",
    "customer_id": "cus_01HZABC456",
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "address_2": "Apt 4",
    "city": "Accra",
    "province": "Greater Accra Region",
    "postal_code": "GA001",
    "country_code": "gh",
    "phone": "+233241234567",
    "company": "",
    "is_default_shipping": true,
    "is_default_billing": false,
    "metadata": {},
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User is not authenticated
- `403 Forbidden`: Address belongs to another customer
- `404 Not Found`: Address not found
- `500 Internal Server Error`: Server error

---

### 3. Create Address

**Endpoint:** `POST /store/addresses`

**Authentication:** Required

**Description:** Create a new address for the authenticated customer.

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "address_1": "123 Main Street",
  "address_2": "Apt 4",
  "city": "Accra",
  "province": "Greater Accra Region",
  "postal_code": "GA001",
  "country_code": "GH",
  "phone": "+233241234567",
  "company": "Acme Inc",
  "is_default_shipping": false,
  "is_default_billing": false,
  "metadata": {
    "notes": "Delivery instructions here"
  }
}
```

**Required Fields:**
- `first_name` (string): First name
- `last_name` (string): Last name
- `address_1` (string): Primary address line
- `city` (string): City name
- `country_code` (string): Two-letter country code (e.g., "GH")
- `phone` (string): Phone number in format +233XXXXXXXXX

**Optional Fields:**
- `address_2` (string): Secondary address line (apartment, suite, etc.)
- `province` (string): State/region
- `postal_code` (string): Postal/ZIP code
- `company` (string): Company name
- `is_default_shipping` (boolean): Set as default shipping address
- `is_default_billing` (boolean): Set as default billing address
- `metadata` (object): Additional metadata

**Request:**
```bash
curl -X POST http://localhost:9000/store/addresses \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "city": "Accra",
    "country_code": "GH",
    "phone": "+233241234567"
  }'
```

**Response:** `201 Created`

```json
{
  "address": {
    "id": "addr_01HZNEW789",
    "customer_id": "cus_01HZABC456",
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "address_2": "",
    "city": "Accra",
    "province": "",
    "postal_code": "",
    "country_code": "gh",
    "phone": "+233241234567",
    "company": "",
    "is_default_shipping": false,
    "is_default_billing": false,
    "metadata": {},
    "created_at": "2024-01-15T10:35:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid phone format
- `401 Unauthorized`: User is not authenticated
- `404 Not Found`: Customer not found
- `500 Internal Server Error`: Server error

---

### 4. Update Address

**Endpoint:** `PATCH /store/addresses/[id]`

**Authentication:** Required

**Description:** Update an existing address. Only the fields you want to update need to be included.

**Request Body:**

```json
{
  "address_1": "456 New Street",
  "city": "Kumasi",
  "is_default_shipping": true
}
```

**Request:**
```bash
curl -X PATCH http://localhost:9000/store/addresses/addr_01HZABC123 \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "address_1": "456 New Street",
    "city": "Kumasi"
  }'
```

**Response:** `200 OK`

```json
{
  "address": {
    "id": "addr_01HZABC123",
    "customer_id": "cus_01HZABC456",
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "456 New Street",
    "address_2": "Apt 4",
    "city": "Kumasi",
    "province": "Greater Accra Region",
    "postal_code": "GA001",
    "country_code": "gh",
    "phone": "+233241234567",
    "company": "",
    "is_default_shipping": true,
    "is_default_billing": false,
    "metadata": {},
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:40:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid phone format (if phone is being updated)
- `401 Unauthorized`: User is not authenticated
- `403 Forbidden`: Address belongs to another customer
- `404 Not Found`: Address not found
- `500 Internal Server Error`: Server error

---

### 5. Delete Address

**Endpoint:** `DELETE /store/addresses/[id]`

**Authentication:** Required

**Description:** Delete a specific address.

**Request:**
```bash
curl -X DELETE http://localhost:9000/store/addresses/addr_01HZABC123 \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"
```

**Response:** `200 OK`

```json
{
  "id": "addr_01HZABC123",
  "deleted": true,
  "message": "Address deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Address ID is required
- `401 Unauthorized`: User is not authenticated
- `403 Forbidden`: Address belongs to another customer
- `404 Not Found`: Address not found
- `500 Internal Server Error`: Server error

---

## Frontend Usage Examples

### React/TypeScript Example

```typescript
// Address interface
interface Address {
  id?: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  phone: string;
  company?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
  metadata?: Record<string, any>;
}

// Fetch all addresses
async function fetchAddresses(): Promise<Address[]> {
  const response = await fetch('http://localhost:9000/store/addresses', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch addresses');
  }

  const data = await response.json();
  return data.addresses;
}

// Create a new address
async function createAddress(address: Address): Promise<Address> {
  const response = await fetch('http://localhost:9000/store/addresses', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(address),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create address');
  }

  const data = await response.json();
  return data.address;
}

// Update an address
async function updateAddress(id: string, updates: Partial<Address>): Promise<Address> {
  const response = await fetch(`http://localhost:9000/store/addresses/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update address');
  }

  const data = await response.json();
  return data.address;
}

// Delete an address
async function deleteAddress(id: string): Promise<void> {
  const response = await fetch(`http://localhost:9000/store/addresses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete address');
  }
}
```

### React Component Example

```typescript
import { useState, useEffect } from 'react';

function AddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load addresses on component mount
  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      setLoading(true);
      const data = await fetchAddresses();
      setAddresses(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAddress(address: Address) {
    try {
      const newAddress = await createAddress(address);
      setAddresses([...addresses, newAddress]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAddress(id: string) {
    try {
      await deleteAddress(id);
      setAddresses(addresses.filter(addr => addr.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div>Loading addresses...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Addresses</h2>
      {addresses.length === 0 ? (
        <p>No addresses saved yet.</p>
      ) : (
        <ul>
          {addresses.map((address) => (
            <li key={address.id}>
              <div>
                {address.first_name} {address.last_name}
              </div>
              <div>{address.address_1}</div>
              {address.address_2 && <div>{address.address_2}</div>}
              <div>
                {address.city}, {address.province} {address.postal_code}
              </div>
              <div>{address.phone}</div>
              <button onClick={() => handleDeleteAddress(address.id!)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Validation Rules

### Phone Number
- **Format:** `+233XXXXXXXXX` (Ghana format)
- **Example:** `+233241234567`
- Must start with `+233` followed by exactly 9 digits

### Country Code
- **Format:** Two-letter ISO country code
- **Example:** `GH`, `US`, `GB`
- Will be automatically converted to lowercase

### Required Fields
When creating an address, the following fields are mandatory:
- `first_name`
- `last_name`
- `address_1`
- `city`
- `country_code`
- `phone`

---

## Security Considerations

1. **Authentication Required**: All endpoints require valid session authentication
2. **Authorization**: Users can only access their own addresses
3. **HTTPS**: Use HTTPS in production for secure data transmission
4. **CORS**: Ensure CORS is properly configured for your frontend domain
5. **Session Security**: Sessions should have secure, httpOnly cookies
6. **Input Validation**: All fields are validated server-side

---

## Common Use Cases

### 1. Address Book Feature
Allow customers to save multiple addresses for faster checkout.

### 2. Default Addresses
Set default shipping and billing addresses using `is_default_shipping` and `is_default_billing` flags.

### 3. Checkout Integration
Use saved addresses during checkout to populate shipping/billing forms.

```typescript
// During checkout, fetch addresses and let user choose
async function selectAddressForCheckout() {
  const addresses = await fetchAddresses();
  const defaultShipping = addresses.find(a => a.is_default_shipping);
  
  // Use defaultShipping or show address selection UI
  return defaultShipping || addresses[0];
}
```

### 4. Address Validation
Always validate address data on the frontend before submitting:

```typescript
function validateAddress(address: Address): string[] {
  const errors: string[] = [];
  
  if (!address.first_name) errors.push('First name is required');
  if (!address.last_name) errors.push('Last name is required');
  if (!address.address_1) errors.push('Address is required');
  if (!address.city) errors.push('City is required');
  if (!address.country_code) errors.push('Country is required');
  if (!address.phone) errors.push('Phone number is required');
  
  // Validate Ghana phone number format
  if (address.phone && !address.phone.match(/^\+233\d{9}$/)) {
    errors.push('Phone number must be in format: +233XXXXXXXXX');
  }
  
  return errors;
}
```

---

## Testing

### Manual Testing with cURL

1. **Login first** to get session cookie:
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

2. **Create an address**:
```bash
curl -X POST http://localhost:9000/store/addresses \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "city": "Accra",
    "country_code": "GH",
    "phone": "+233241234567"
  }'
```

3. **Get all addresses**:
```bash
curl -X GET http://localhost:9000/store/addresses \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

4. **Delete an address** (replace ADDRESS_ID):
```bash
curl -X DELETE http://localhost:9000/store/addresses/ADDRESS_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Errors

| Status Code | Error | Description |
|------------|-------|-------------|
| 400 | Bad Request | Missing required fields or invalid data |
| 401 | Not authenticated | User is not logged in |
| 403 | Forbidden | User doesn't have permission for this resource |
| 404 | Not Found | Address or customer not found |
| 500 | Internal Server Error | Server error occurred |

---

## Notes

- All addresses are linked to the authenticated customer
- Customers can only access their own addresses
- Phone numbers are validated to match Ghana format (+233XXXXXXXXX)
- Country codes are automatically converted to lowercase
- Timestamps (`created_at`, `updated_at`) are managed automatically
- The `metadata` field can store any additional custom data as JSON

