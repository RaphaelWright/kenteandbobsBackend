# React Orders Management Dashboard - Project Prompt

## Project Overview
Build a modern React-based orders management dashboard that connects to an existing Medusa e-commerce backend. The dashboard should display all orders with their payment status and provide functionality to mark orders as fulfilled/completed.

---

## Backend API Information

### Base URL
```
http://localhost:9000
```

### Authentication
The backend uses cookie-based authentication. All requests should include:
```javascript
credentials: 'include'
```

---

## Available Backend Endpoints

### 1. **GET /admin/orders** - Fetch All Orders (Admin)
Retrieve all orders with pagination support.

**Query Parameters:**
- `limit` (optional): Number of orders per page (default: 15)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "orders": [
    {
      "id": "order_01HZORDER123",
      "display_id": "1001",
      "status": "pending",
      "email": "customer@example.com",
      "customer_id": "cus_01HZABC456",
      "customer_name": "John Doe",
      "customer_first_name": "John",
      "customer_last_name": "Doe",
      "currency_code": "ghs",
      "total": 10000,
      "subtotal": 10000,
      "tax_total": 0,
      "shipping_total": 0,
      "discount_total": 0,
      "payment_status": "captured",
      "fulfillment_status": "not_fulfilled",
      "metadata": {
        "payment_provider": "paystack",
        "payment_reference": "T123456789",
        "payment_status": "success",
        "payment_captured": true,
        "payment_captured_at": "2024-01-01T00:00:00Z",
        "delivery_option": "delivery",
        "additional_phone": "+233501234567"
      },
      "items": [
        {
          "id": "oi_01HZITEM001",
          "title": "Product Name",
          "subtitle": "Variant Name",
          "thumbnail": "https://example.com/image.jpg",
          "quantity": 2,
          "unit_price": 5000,
          "total": 10000,
          "product": {
            "id": "prod_01HZPROD123",
            "title": "Product Name",
            "thumbnail": "https://example.com/image.jpg"
          }
        }
      ],
      "shipping_address": {
        "first_name": "John",
        "last_name": "Doe",
        "address_1": "123 Main Street",
        "city": "Accra",
        "province": "Greater Accra",
        "postal_code": "GA001",
        "country_code": "GH",
        "phone": "+233241234567"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "total": 50,
  "page": 1,
  "limit": 15,
  "pages": 4
}
```

**⚠️ IMPORTANT: Payment Status from Metadata**

**The payment status MUST be determined by checking the order's `metadata` field directly, not just relying on the backend's computed `payment_status` field.** The metadata is the source of truth for payment information.

**Payment Status Logic (Check in this order):**
1. Check `metadata.payment_collections[0].status` (if available - Medusa standard)
2. Check `metadata.payment_status === "success"` OR `metadata.payment_captured === true` OR `metadata.payment_captured_at` exists → **`captured`**
3. Check `metadata.payment_status === "pending"` OR `metadata.payment_reference` exists → **`awaiting`**
4. Check `metadata.payment_status === "failed"` → **`failed`**
5. Otherwise → **`not_paid`**

**Key Metadata Fields to Check:**
- `payment_provider` - Payment provider (e.g., "paystack")
- `payment_reference` - Payment reference number
- `payment_status` - "success", "pending", or "failed"
- `payment_captured` - Boolean or string "true"/"1"
- `payment_captured_at` - ISO timestamp when payment was captured
- `payment_paid_at` - ISO timestamp when payment was made
- `payment_channel` - Payment method (e.g., "card", "mobile_money")
- `payment_transaction_id` - Transaction ID from payment provider

**Fulfillment Status Values:**
- `fulfilled` - Order has been fulfilled
- `not_fulfilled` - Order not yet fulfilled

---

### 2. **GET /admin/orders/:id** - Fetch Single Order
Get detailed information about a specific order.

**Parameters:**
- `id` (path): Order ID

**Response:** Same structure as single order in the list above.

---

### 3. **GET /admin/orders/:id/payment-status** - Check Payment Status
Get the current payment status for a specific order.

**Parameters:**
- `id` (path): Order ID

**Response:**
```json
{
  "order_id": "order_01HZORDER123",
  "payment_status": "captured",
  "details": {
    "source": "metadata",
    "provider": "paystack",
    "reference": "T123456789",
    "captured_at": "2024-01-01T00:00:00Z",
    "transaction_id": "1234567890",
    "channel": "card"
  }
}
```

---

### 4. **POST /admin/orders/fix-payment-status** - Fix Payment Status Issues
Diagnose and fix payment status issues across all orders.

**Query Parameters:**
- `fix=true` - Actually fix the issues (optional)

**Request Body:** None

**Response:**
```json
{
  "message": "Payment status check completed",
  "total_orders": 50,
  "issues_found": 5,
  "fixed": 5,
  "issues": [...],
  "fixed_orders": [...]
}
```

---

## Endpoint Needed (You Should Create This)

### **PATCH /admin/orders/:id/fulfill** - Mark Order as Fulfilled
Mark an order as fulfilled/completed.

**Implementation Suggestion:**
```typescript
// backend/src/api/admin/orders/[id]/fulfill/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

    // Update order metadata to mark as fulfilled
    await orderModuleService.updateOrders([{
      id: orderId,
      metadata: {
        fulfillment_status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        fulfilled_by: "admin" // or get from auth context
      }
    }]);

    res.status(200).json({
      success: true,
      message: "Order marked as fulfilled"
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fulfill order",
      message: error.message
    });
  }
}
```

---

## Project Requirements

### Tech Stack
- **React** 18+ (with TypeScript preferred)
- **State Management**: React Query (TanStack Query) for data fetching
- **Routing**: React Router v6
- **UI Library**: Your choice (Tailwind CSS, Material-UI, Ant Design, or Shadcn/UI recommended)
- **HTTP Client**: Axios or Fetch API
- **Build Tool**: Vite

### Core Features

#### 1. Orders List Page
- Display all orders in a table/card layout
- Show key information: Order ID, Customer Name, Total, Payment Status, Fulfillment Status, Date
- **Payment status MUST be derived from `order.metadata` using the utility function** (not from `order.payment_status`)
- Implement pagination (15 orders per page)
- Color-coded payment status badges (based on metadata):
  - `captured` → Green
  - `awaiting` → Yellow/Orange
  - `failed` → Red
  - `not_paid` → Gray
- Color-coded fulfillment status badges:
  - `fulfilled` → Green
  - `not_fulfilled` → Gray/Blue
- Clickable rows to view order details
- Tooltip on payment status badge showing payment reference from metadata (if available)

#### 2. Order Details Page
- Show complete order information:
  - Order summary (ID, date, status)
  - Customer information
  - Items ordered (with images, quantities, prices)
  - Shipping address
  - **Payment details section showing ALL metadata fields:**
    - Payment provider (`metadata.payment_provider`)
    - Payment reference (`metadata.payment_reference`)
    - Payment status from metadata (`metadata.payment_status`)
    - Payment captured flag (`metadata.payment_captured`)
    - Payment captured timestamp (`metadata.payment_captured_at` or `metadata.payment_paid_at`)
    - Payment channel (`metadata.payment_channel`)
    - Transaction ID (`metadata.payment_transaction_id`)
    - Payment method (`metadata.payment_method`)
- Display payment status badge (derived from metadata) with verification button
- Button to mark order as fulfilled (only if not already fulfilled)
- Button to check/refresh payment status (compares metadata with endpoint response)
- Show raw metadata JSON in expandable section (for debugging)

#### 3. Payment Status Checker
- **MUST check payment status directly from order metadata** (see utility function below)
- Visual indicator showing current payment status derived from metadata
- "Check Payment Status" button that calls the payment status endpoint (for verification)
- Display all metadata payment details:
  - Payment provider (Paystack)
  - Reference number (`metadata.payment_reference`)
  - Transaction ID (`metadata.payment_transaction_id`)
  - Payment channel (`metadata.payment_channel`)
  - Payment status (`metadata.payment_status`)
  - Payment captured flag (`metadata.payment_captured`)
  - Captured at timestamp (`metadata.payment_captured_at` or `metadata.payment_paid_at`)
- Show raw metadata values for debugging (optional, in dev mode)

#### 4. Fulfillment Action
- "Mark as Done" or "Mark as Fulfilled" button
- Only visible for orders that are `not_fulfilled`
- Show confirmation dialog before marking
- Update UI immediately after successful action
- Show success/error toast notifications

#### 5. Filters and Search (Optional Enhancement)
- Filter by payment status
- Filter by fulfillment status
- Search by order ID, customer name, or email
- Date range filter

---

## Data Models (TypeScript Interfaces)

```typescript
interface Order {
  id: string;
  display_id: string;
  status: string;
  email: string;
  customer_id: string;
  customer_name: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  currency_code: string;
  total: number;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  payment_status: 'captured' | 'awaiting' | 'failed' | 'not_paid';
  fulfillment_status: 'fulfilled' | 'not_fulfilled';
  metadata: OrderMetadata;
  items: OrderItem[];
  shipping_address: Address | null;
  billing_address: Address | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

interface OrderMetadata {
  payment_provider?: string;
  payment_reference?: string;
  payment_status?: string;
  payment_captured?: boolean;
  payment_captured_at?: string;
  payment_paid_at?: string;
  payment_channel?: string;
  payment_transaction_id?: string;
  delivery_option?: 'delivery' | 'pickup';
  additional_phone?: string;
  payment_method?: 'card' | 'mobile_money';
  fulfillment_status?: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
}

interface OrderItem {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  product: {
    id: string;
    title: string;
    thumbnail: string | null;
  } | null;
  variant: {
    id: string;
    title: string;
    sku: string | null;
  } | null;
}

interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  phone: string;
}

interface PaymentStatusDetails {
  order_id: string;
  payment_status: string;
  details: {
    source: string;
    provider?: string;
    reference?: string;
    captured_at?: string;
    transaction_id?: string;
    channel?: string;
  };
}

interface OrdersResponse {
  orders: Order[];
  count: number;
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

---

## API Service Layer Example

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9000',
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ordersApi = {
  // Fetch all orders with pagination
  getOrders: async (page = 1, limit = 15) => {
    const offset = (page - 1) * limit;
    const response = await api.get<OrdersResponse>(
      `/admin/orders?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  // Fetch single order
  getOrder: async (orderId: string) => {
    const response = await api.get<{ order: Order }>(`/admin/orders/${orderId}`);
    return response.data.order;
  },

  // Check payment status
  checkPaymentStatus: async (orderId: string) => {
    const response = await api.get<PaymentStatusDetails>(
      `/admin/orders/${orderId}/payment-status`
    );
    return response.data;
  },

  // Mark order as fulfilled
  fulfillOrder: async (orderId: string) => {
    const response = await api.post(`/admin/orders/${orderId}/fulfill`);
    return response.data;
  },

  // Fix payment status issues
  fixPaymentStatus: async (shouldFix = false) => {
    const response = await api.post(
      `/admin/orders/fix-payment-status${shouldFix ? '?fix=true' : ''}`
    );
    return response.data;
  },
};

export default api;
```

---

## React Query Hooks Example

```typescript
// src/hooks/useOrders.ts
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../services/api';
import { getPaymentStatusFromMetadata, getPaymentDetailsFromMetadata } from '../utils/paymentStatus';
import { Order } from '../types/order';

export const useOrders = (page: number = 1, limit: number = 15) => {
  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: () => ordersApi.getOrders(page, limit),
    keepPreviousData: true,
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const usePaymentStatus = (orderId: string) => {
  return useQuery({
    queryKey: ['paymentStatus', orderId],
    queryFn: () => ordersApi.checkPaymentStatus(orderId),
    enabled: !!orderId,
  });
};

/**
 * Get payment status from order metadata (client-side)
 * This is the primary way to determine payment status
 */
export const usePaymentStatusFromMetadata = (order: Order | undefined) => {
  const paymentStatus = useMemo(() => {
    if (!order) return 'not_paid';
    return getPaymentStatusFromMetadata(order.metadata);
  }, [order?.metadata]);

  const paymentDetails = useMemo(() => {
    if (!order) return null;
    return getPaymentDetailsFromMetadata(order.metadata);
  }, [order?.metadata]);

  return { paymentStatus, paymentDetails };
};

export const useFulfillOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: string) => ordersApi.fulfillOrder(orderId),
    onSuccess: (data, orderId) => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', orderId]);
    },
  });
};
```

---

## UI/UX Guidelines

### Design Principles
1. **Clean and Modern**: Use a clean, minimal design with good spacing
2. **Responsive**: Mobile-first design approach
3. **Accessible**: Proper ARIA labels, keyboard navigation
4. **Fast**: Use loading states, skeleton screens, optimistic updates
5. **Informative**: Clear error messages and success feedback

### Color Coding
- **Payment Status Colors:**
  - Captured: `#10b981` (green)
  - Awaiting: `#f59e0b` (amber)
  - Failed: `#ef4444` (red)
  - Not Paid: `#6b7280` (gray)

- **Fulfillment Status Colors:**
  - Fulfilled: `#10b981` (green)
  - Not Fulfilled: `#3b82f6` (blue)

### Components to Build
1. **OrdersTable** - Main table showing all orders
2. **OrderCard** - Alternative card view for orders
3. **OrderDetails** - Detailed order view component
4. **PaymentStatusBadge** - Badge component for payment status
5. **FulfillmentStatusBadge** - Badge component for fulfillment status
6. **PaymentChecker** - Component to check/verify payment status
7. **FulfillOrder** - Button/dialog to mark order as fulfilled
8. **Pagination** - Pagination component
9. **SearchAndFilter** - Search and filter controls
10. **LoadingState** - Loading skeletons/spinners
11. **ErrorState** - Error display component
12. **EmptyState** - Empty state when no orders

---

## Payment Status Utility Function

**CRITICAL: Always check payment status from metadata, not from the backend's computed field.**

```typescript
// src/utils/paymentStatus.ts
import { OrderMetadata } from '../types/order';

/**
 * Determines payment status by checking order metadata directly
 * This is the source of truth for payment status
 */
export const getPaymentStatusFromMetadata = (metadata: OrderMetadata | null | undefined): 'captured' | 'awaiting' | 'failed' | 'not_paid' => {
  if (!metadata) {
    return 'not_paid';
  }

  // Parse metadata if it's a string (some backends return JSON strings)
  let parsedMetadata: OrderMetadata = metadata;
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return 'not_paid';
    }
  }

  // Check payment_collections first (Medusa standard)
  // Note: This might not be in metadata, but check if available
  if ((parsedMetadata as any).payment_collections?.[0]?.status) {
    const status = (parsedMetadata as any).payment_collections[0].status;
    if (status === 'captured' || status === 'captured') {
      return 'captured';
    }
  }

  // Check if payment is captured/successful
  // Handle all possible truthy variations
  const isCaptured = 
    parsedMetadata.payment_status === 'success' ||
    parsedMetadata.payment_captured === true ||
    parsedMetadata.payment_captured === 'true' ||
    parsedMetadata.payment_captured === 1 ||
    parsedMetadata.payment_captured === '1' ||
    !!parsedMetadata.payment_captured_at ||
    !!parsedMetadata.payment_paid_at;

  if (isCaptured) {
    return 'captured';
  }

  // Check if payment is pending/awaiting
  const isPending = 
    parsedMetadata.payment_status === 'pending' ||
    !!parsedMetadata.payment_reference;

  if (isPending) {
    return 'awaiting';
  }

  // Check if payment failed
  if (parsedMetadata.payment_status === 'failed') {
    return 'failed';
  }

  // Default: not paid
  return 'not_paid';
};

/**
 * Get detailed payment information from metadata
 */
export const getPaymentDetailsFromMetadata = (metadata: OrderMetadata | null | undefined) => {
  if (!metadata) {
    return null;
  }

  let parsedMetadata: OrderMetadata = metadata;
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  return {
    provider: parsedMetadata.payment_provider || null,
    reference: parsedMetadata.payment_reference || null,
    status: parsedMetadata.payment_status || null,
    captured: parsedMetadata.payment_captured || false,
    capturedAt: parsedMetadata.payment_captured_at || parsedMetadata.payment_paid_at || null,
    channel: parsedMetadata.payment_channel || null,
    transactionId: parsedMetadata.payment_transaction_id || null,
    method: parsedMetadata.payment_method || null,
  };
};
```

**Usage in Components:**
```typescript
// In your Order component
import { getPaymentStatusFromMetadata, getPaymentDetailsFromMetadata } from '../utils/paymentStatus';

const OrderCard = ({ order }: { order: Order }) => {
  // Always get payment status from metadata
  const paymentStatus = getPaymentStatusFromMetadata(order.metadata);
  const paymentDetails = getPaymentDetailsFromMetadata(order.metadata);

  return (
    <div>
      <PaymentStatusBadge status={paymentStatus} />
      {paymentDetails?.reference && (
        <div>Reference: {paymentDetails.reference}</div>
      )}
    </div>
  );
};
```

---

## Currency Formatting

Orders use Ghana Cedis (GHS). Prices in the API are in pesewas (smallest unit).

```typescript
// src/utils/currency.ts
export const formatCurrency = (amount: number, currencyCode = 'GHS'): string => {
  // Amount is in pesewas (1 GHS = 100 pesewas)
  const amountInCedis = amount / 100;
  
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amountInCedis);
};

// Usage: formatCurrency(10000) → "GH₵100.00"
```

---

## Project Structure

```
orders-dashboard/
├── src/
│   ├── components/
│   │   ├── orders/
│   │   │   ├── OrdersTable.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   └── OrderActions.tsx
│   │   ├── payment/
│   │   │   ├── PaymentStatusBadge.tsx
│   │   │   ├── PaymentChecker.tsx
│   │   │   └── PaymentDetails.tsx
│   │   ├── fulfillment/
│   │   │   ├── FulfillmentBadge.tsx
│   │   │   └── FulfillOrder.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── OrdersListPage.tsx
│   │   ├── OrderDetailsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/
│   │   ├── useOrders.ts
│   │   ├── useOrder.ts
│   │   ├── usePaymentStatus.ts
│   │   └── useFulfillOrder.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── ordersApi.ts
│   ├── types/
│   │   ├── order.ts
│   │   ├── payment.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Key Features Implementation Notes

### 1. Payment Status Checker
**IMPORTANT: Always display payment status from metadata first, then use the endpoint for verification.**

When user clicks "Check Payment Status":
1. Show loading indicator
2. **First, display current payment status from `order.metadata`** (using `getPaymentStatusFromMetadata` utility)
3. Call `GET /admin/orders/:id/payment-status` to verify/refresh status
4. Display payment details from metadata in a modal or expanded section:
   - Show all metadata fields (reference, transaction ID, channel, etc.)
   - Display raw metadata JSON for debugging (optional, in dev mode)
5. Compare metadata status with endpoint response
6. Update the badge/status indicator based on metadata
7. Show success toast with payment details from metadata

**Payment Status Display Component Example:**
```typescript
// src/components/payment/PaymentStatusChecker.tsx
import { getPaymentStatusFromMetadata, getPaymentDetailsFromMetadata } from '../../utils/paymentStatus';
import { Order } from '../../types/order';

const PaymentStatusChecker = ({ order }: { order: Order }) => {
  const paymentStatus = getPaymentStatusFromMetadata(order.metadata);
  const paymentDetails = getPaymentDetailsFromMetadata(order.metadata);

  return (
    <div>
      <PaymentStatusBadge status={paymentStatus} />
      {paymentDetails && (
        <div>
          <p>Provider: {paymentDetails.provider || 'N/A'}</p>
          <p>Reference: {paymentDetails.reference || 'N/A'}</p>
          <p>Channel: {paymentDetails.channel || 'N/A'}</p>
          <p>Captured: {paymentDetails.captured ? 'Yes' : 'No'}</p>
          {paymentDetails.capturedAt && (
            <p>Captured At: {new Date(paymentDetails.capturedAt).toLocaleString()}</p>
          )}
        </div>
      )}
      {/* Show raw metadata in dev mode */}
      {process.env.NODE_ENV === 'development' && (
        <details>
          <summary>Raw Metadata (Debug)</summary>
          <pre>{JSON.stringify(order.metadata, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
```

### 2. Mark as Done/Fulfilled
When user clicks "Mark as Done":
1. Show confirmation dialog: "Are you sure you want to mark this order as fulfilled?"
2. If confirmed, call `POST /admin/orders/:id/fulfill`
3. Show loading state on button
4. On success:
   - Update local state optimistically
   - Invalidate queries to refetch fresh data
   - Show success toast: "Order marked as fulfilled"
   - Update the fulfillment badge color
5. On error:
   - Show error toast with message
   - Revert optimistic update

### 3. Pagination
- Track current page in URL query params (e.g., `?page=2`)
- Show page numbers, previous/next buttons
- Display "Showing X-Y of Z orders"
- Disable previous button on first page
- Disable next button on last page

### 4. Real-time Updates (Optional)
Consider implementing polling or WebSocket for real-time order updates:
```typescript
// Poll every 30 seconds
useQuery({
  queryKey: ['orders', page],
  queryFn: () => ordersApi.getOrders(page),
  refetchInterval: 30000,
});
```

---

## Error Handling

Implement proper error handling for common scenarios:

1. **Network Errors**: Show retry button
2. **Authentication Errors** (401): Redirect to login
3. **Not Found** (404): Show "Order not found" message
4. **Server Errors** (500): Show friendly error message
5. **Validation Errors** (400): Display specific field errors

```typescript
// Example error handler
const handleError = (error: any) => {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 404:
        toast.error('Order not found');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.response.data?.message || 'An error occurred');
    }
  } else {
    toast.error('Network error. Please check your connection.');
  }
};
```

---

## Testing Considerations

1. **Unit Tests**: Test utility functions (currency formatting, date formatting)
2. **Component Tests**: Test individual components with mock data
3. **Integration Tests**: Test API integration with MSW (Mock Service Worker)
4. **E2E Tests**: Test full user flows (optional, using Playwright or Cypress)

---

## Performance Optimizations

1. **Pagination**: Load only 15 orders at a time
2. **Memoization**: Use `React.memo` for expensive components
3. **Virtual Scrolling**: For long lists (optional)
4. **Image Lazy Loading**: For product thumbnails
5. **Code Splitting**: Split routes with `React.lazy`
6. **Debounce Search**: Debounce search input (300ms)

---

## Additional Features (Nice to Have)

1. **Export Orders**: Export to CSV/Excel
2. **Bulk Actions**: Mark multiple orders as fulfilled
3. **Order Notes**: Add internal notes to orders
4. **Email Customer**: Quick email customer button
5. **Print Invoice**: Generate and print invoice
6. **Order Timeline**: Show order history/events
7. **Analytics Dashboard**: Show order statistics
8. **Dark Mode**: Toggle dark/light theme
9. **Notifications**: Browser notifications for new orders
10. **Filter Presets**: Save common filter combinations

---

## Getting Started Commands

```bash
# Create new Vite + React + TypeScript project
npm create vite@latest orders-dashboard -- --template react-ts
cd orders-dashboard

# Install dependencies
npm install @tanstack/react-query axios react-router-dom

# Install UI library (choose one)
npm install tailwindcss postcss autoprefixer  # Tailwind
# OR
npm install @mui/material @emotion/react @emotion/styled  # Material-UI
# OR
npm install antd  # Ant Design

# Install dev dependencies
npm install -D @types/node

# Start development server
npm run dev
```

---

## Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:9000
VITE_API_TIMEOUT=30000
```

---

## Deliverables

1. ✅ Fully functional React application
2. ✅ Orders list page with pagination
3. ✅ Order details page
4. ✅ Payment status checker
5. ✅ Mark as fulfilled functionality
6. ✅ Responsive design
7. ✅ Error handling and loading states
8. ✅ TypeScript types for all data
9. ✅ Clean, documented code
10. ✅ README with setup instructions

---

## Success Criteria

- [ ] All orders are displayed correctly with proper formatting
- [ ] Payment status is accurate and can be refreshed
- [ ] Orders can be marked as fulfilled successfully
- [ ] Pagination works smoothly
- [ ] UI is responsive on mobile, tablet, and desktop
- [ ] Loading states are shown during API calls
- [ ] Errors are handled gracefully with user-friendly messages
- [ ] Currency is formatted correctly (GH₵)
- [ ] Application is performant (no lag when interacting)

---

Good luck building your orders dashboard! 🚀

