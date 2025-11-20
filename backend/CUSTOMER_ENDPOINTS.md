# Customer Endpoints Documentation

This document describes the customer endpoints available in the store API.

## Authentication

All customer endpoints require authentication. Users must be logged in with a valid session to access their customer information.

## Endpoints

### 1. Get Current Customer Details

**Endpoint:** `GET /store/customers/me`

**Description:** Retrieves detailed information for the currently authenticated customer.

**Authentication:** Required

**Example Request:**
```bash
curl -X GET http://localhost:9000/store/customers/me \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -b "connect.sid=your-session-cookie"
```

**Example Response:**
```json
{
  "customer": {
    "id": "cus_01JCXXX",
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+233123456789",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-20T14:45:00.000Z",
    "metadata": {
      "preferences": {
        "newsletter": true,
        "notifications": true
      }
    }
  }
}
```

**Response Fields:**
- `id` (string) - Unique customer identifier
- `email` (string) - Customer email address
- `first_name` (string, nullable) - Customer's first name
- `last_name` (string, nullable) - Customer's last name
- `phone` (string, nullable) - Customer's phone number
- `created_at` (string) - ISO 8601 timestamp of when the customer account was created
- `updated_at` (string) - ISO 8601 timestamp of when the customer record was last updated
- `metadata` (object, nullable) - Additional customer metadata (custom fields)

**Status Codes:**
- `200 OK` - Customer details retrieved successfully
- `401 Unauthorized` - User is not authenticated
- `404 Not Found` - Customer record not found
- `500 Internal Server Error` - Server error occurred

---

## Error Responses

### 401 Unauthorized
Returned when the user is not authenticated.

```json
{
  "error": "Not authenticated"
}
```

### 404 Not Found
Returned when the customer record cannot be found. This can happen if:
- The customer record was deleted
- The customer_id in the auth metadata doesn't match any customer
- The email associated with the auth identity doesn't match any customer

```json
{
  "error": "Customer not found"
}
```

Or when the auth identity itself is not found:

```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
Returned when there's a server error.

```json
{
  "error": "Failed to get customer details",
  "message": "Detailed error message"
}
```

---

## How It Works

The endpoint retrieves customer information using the following process:

1. **Authentication Check**: Verifies that the user has a valid session with an `auth_context`
2. **Auth Identity Retrieval**: Fetches the auth identity using the `auth_identity_id` from the session
3. **Customer Lookup**: Attempts to find the customer using one of two methods:
   - **Primary Method**: Uses the `customer_id` from the auth identity's `app_metadata` (if available)
   - **Fallback Method**: Searches for a customer by email address if the customer_id lookup fails
4. **Response**: Returns the customer details in a formatted response

This dual-lookup approach ensures compatibility with different authentication flows and handles edge cases where the customer_id might not be set in the auth metadata.

---

## Integration Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Get current customer details
async function getCustomerDetails() {
  const response = await fetch(
    'http://localhost:9000/store/customers/me',
    {
      method: 'GET',
      credentials: 'include', // Important: includes cookies
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': 'YOUR_PUBLISHABLE_KEY',
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated');
    }
    if (response.status === 404) {
      throw new Error('Customer not found');
    }
    throw new Error('Failed to fetch customer details');
  }
  
  const data = await response.json();
  return data.customer;
}

// Usage
try {
  const customer = await getCustomerDetails();
  console.log('Customer:', customer);
  console.log('Email:', customer.email);
  console.log('Name:', `${customer.first_name} ${customer.last_name}`);
} catch (error) {
  console.error('Error:', error.message);
}
```

### React Example

```tsx
import { useEffect, useState } from 'react';

interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any> | null;
}

function CustomerProfile() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const response = await fetch('http://localhost:9000/store/customers/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': process.env.REACT_APP_PUBLISHABLE_KEY || '',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please log in to view your profile');
          }
          throw new Error('Failed to load customer details');
        }
        
        const data = await response.json();
        setCustomer(data.customer);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomer();
  }, []);

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!customer) return <div>No customer data available</div>;

  return (
    <div className="customer-profile">
      <h1>My Profile</h1>
      <div>
        <p><strong>Email:</strong> {customer.email}</p>
        <p><strong>Name:</strong> {customer.first_name} {customer.last_name}</p>
        {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
        <p><strong>Member since:</strong> {new Date(customer.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default CustomerProfile;
```

### React Hook Example

```tsx
import { useState, useEffect } from 'react';

function useCustomer() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const response = await fetch('/store/customers/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': process.env.REACT_APP_PUBLISHABLE_KEY || '',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch customer');
        }
        
        const data = await response.json();
        setCustomer(data.customer);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomer();
  }, []);

  return { customer, loading, error, refetch: () => {
    setLoading(true);
    setError(null);
    // Re-run the effect
    fetchCustomer();
  }};
}

// Usage in component
function MyComponent() {
  const { customer, loading, error } = useCustomer();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>Welcome, {customer?.first_name}!</div>;
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9000',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': 'YOUR_PUBLISHABLE_KEY',
  },
});

// Get customer details
async function getCustomerDetails() {
  try {
    const response = await api.get('/store/customers/me');
    return response.data.customer;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Not authenticated');
    }
    if (error.response?.status === 404) {
      throw new Error('Customer not found');
    }
    throw error;
  }
}
```

---

## Testing with curl

### Prerequisites
1. Get your publishable API key:
```bash
curl http://localhost:9000/api/key-exchange
```

2. Login to get a session cookie:
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"yourpassword"}'
```

### Get Customer Details
```bash
curl -X GET http://localhost:9000/store/customers/me \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -b cookies.txt
```

---

## Testing with Postman

### Step 1: Get Your API Key
1. Create a new GET request to: `http://localhost:9000/api/key-exchange`
2. Send the request
3. Copy the `publishableApiKey` from the response

### Step 2: Login (to get session cookie)
1. Method: `POST`
2. URL: `http://localhost:9000/store/auth/login`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-publishable-api-key`: `{{publishable_key}}`
4. Body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "yourpassword"
   }
   ```
5. Postman will automatically save the session cookie

### Step 3: Get Customer Details
1. Method: `GET`
2. URL: `http://localhost:9000/store/customers/me`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-publishable-api-key`: `{{publishable_key}}`
4. Cookies are automatically included by Postman
5. Send the request

---

## Use Cases

### 1. Display User Profile
Use this endpoint to populate a user profile page with their account information.

### 2. Pre-fill Forms
Retrieve customer details to pre-fill checkout forms, shipping address forms, or account update forms.

### 3. Personalization
Use customer information (name, preferences from metadata) to personalize the shopping experience.

### 4. Account Dashboard
Display account summary information including account creation date, email, and other details.

### 5. Verification
Verify that a user session corresponds to a valid customer record before performing sensitive operations.

---

## Notes

- **Session-based Authentication**: This endpoint uses session cookies for authentication. Make sure to include credentials in your requests (`credentials: 'include'` in fetch, `withCredentials: true` in axios).

- **Publishable API Key**: All store endpoints require the `x-publishable-api-key` header. Get this key from the `/api/key-exchange` endpoint.

- **Customer Lookup**: The endpoint uses a two-step lookup process (by customer_id, then by email) to ensure compatibility with different authentication flows.

- **Metadata Field**: The `metadata` field can store custom customer data. This is useful for storing preferences, custom attributes, or integration-specific data.

- **Null Fields**: Some fields like `first_name`, `last_name`, and `phone` may be `null` if they weren't provided during registration or haven't been updated.

- **Date Format**: All timestamps are returned in ISO 8601 format (e.g., `2024-01-15T10:30:00.000Z`).

---

## Related Endpoints

- `GET /store/auth/me` - Get authentication identity information (different from customer details)
- `GET /store/orders` - Get customer's orders
- `GET /store/wishlist` - Get customer's wishlist
- `POST /store/auth/signup` - Register a new customer
- `POST /store/auth/login` - Authenticate and create a session

---

## Security Considerations

1. **Authentication Required**: This endpoint requires a valid authenticated session. Unauthenticated requests will be rejected.

2. **Customer Isolation**: The endpoint only returns the customer details for the authenticated user. It cannot be used to access other customers' information.

3. **Session Validation**: The session is validated on every request, ensuring that expired or invalid sessions are rejected.

4. **No Sensitive Data**: The endpoint does not return sensitive information like passwords or payment details.

---

## Future Enhancements

Potential features to add:
- `PUT /store/customers/me` - Update customer details
- `PATCH /store/customers/me` - Partial update of customer details
- `GET /store/customers/me/addresses` - Get customer addresses
- `POST /store/customers/me/addresses` - Add customer address
- `GET /store/customers/me/orders` - Get customer orders (already exists at `/store/orders`)
- `GET /store/customers/me/statistics` - Get customer statistics (order count, total spent, etc.)

