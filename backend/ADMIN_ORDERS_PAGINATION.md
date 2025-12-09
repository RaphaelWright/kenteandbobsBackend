# Admin Orders Pagination Guide

## Overview

The `/admin/orders` endpoint now supports comprehensive pagination with multiple ways to navigate through orders.

## Pagination Methods

### Method 1: Using Page Numbers (Recommended)

The easiest way to implement pagination - just pass a `page` parameter (1-indexed).

```bash
# Get page 1 (first 50 orders)
GET /admin/orders?page=1

# Get page 2 (orders 51-100)
GET /admin/orders?page=2

# Get page 3 with custom limit
GET /admin/orders?page=3&limit=20
```

### Method 2: Using Offset (Advanced)

For more control, use `offset` and `limit`.

```bash
# Get first 20 orders
GET /admin/orders?limit=20&offset=0

# Get next 20 orders
GET /admin/orders?limit=20&offset=20

# Get orders 41-60
GET /admin/orders?limit=20&offset=40
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | - | Page number (1-indexed). Overrides `offset` if provided. |
| `limit` | number | 50 | Number of orders per page |
| `offset` | number | 0 | Number of orders to skip (ignored if `page` is provided) |
| `status` | string | - | Filter by order status (e.g., "pending", "completed") |
| `email` | string | - | Filter by customer email |
| `order_by` | string | "created_at" | Field to sort by |
| `order_direction` | string | "desc" | Sort direction ("asc" or "desc") |

## Response Structure

```json
{
  "orders": [...],  // Array of order objects
  "pagination": {
    // Current page data
    "count": 20,              // Orders in this response
    "total": 127,             // Total orders in database
    
    // Pagination parameters
    "offset": 40,             // Current offset
    "limit": 20,              // Orders per page
    "page": 3,                // Current page (1-indexed)
    "total_pages": 7,         // Total pages available
    
    // Navigation helpers
    "has_next_page": true,    // Can go to next page?
    "has_previous_page": true, // Can go to previous page?
    "next_page": 4,           // Next page number (or null)
    "previous_page": 2        // Previous page number (or null)
  },
  
  // Legacy fields (for backward compatibility)
  "count": 20,
  "offset": 40,
  "limit": 20,
  "total": 127
}
```

## Frontend Implementation Examples

### React Example (with hooks)

```typescript
import { useState, useEffect } from 'react';

interface PaginationInfo {
  count: number;
  total: number;
  page: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
  next_page: number | null;
  previous_page: number | null;
}

function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20); // Orders per page

  useEffect(() => {
    fetchOrders();
  }, [currentPage, limit]);

  const fetchOrders = async () => {
    const response = await fetch(
      `/admin/orders?page=${currentPage}&limit=${limit}`
    );
    const data = await response.json();
    
    setOrders(data.orders);
    setPagination(data.pagination);
  };

  return (
    <div>
      <h1>Orders</h1>
      
      {/* Order list */}
      <div>
        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Pagination controls */}
      {pagination && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={!pagination.has_previous_page}
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.total_pages}
            ({pagination.total} total orders)
          </span>

          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!pagination.has_next_page}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### Simple JavaScript Example

```javascript
let currentPage = 1;
const limit = 20;

async function loadOrders(page = 1) {
  const response = await fetch(`/admin/orders?page=${page}&limit=${limit}`);
  const data = await response.json();
  
  displayOrders(data.orders);
  updatePagination(data.pagination);
}

function updatePagination(pagination) {
  const { page, total_pages, has_next_page, has_previous_page } = pagination;
  
  document.getElementById('page-info').textContent = 
    `Page ${page} of ${total_pages}`;
  
  document.getElementById('prev-btn').disabled = !has_previous_page;
  document.getElementById('next-btn').disabled = !has_next_page;
}

// Event listeners
document.getElementById('prev-btn').onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    loadOrders(currentPage);
  }
};

document.getElementById('next-btn').onclick = () => {
  currentPage++;
  loadOrders(currentPage);
};

// Initial load
loadOrders(1);
```

### Vue.js Example

```vue
<template>
  <div>
    <h1>Orders</h1>
    
    <!-- Orders list -->
    <div v-for="order in orders" :key="order.id">
      <OrderCard :order="order" />
    </div>

    <!-- Pagination -->
    <div v-if="pagination" class="pagination">
      <button 
        @click="goToPage(pagination.previous_page)"
        :disabled="!pagination.has_previous_page"
      >
        Previous
      </button>

      <span>
        Page {{ pagination.page }} of {{ pagination.total_pages }}
      </span>

      <button 
        @click="goToPage(pagination.next_page)"
        :disabled="!pagination.has_next_page"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      orders: [],
      pagination: null,
      currentPage: 1,
      limit: 20,
    };
  },
  
  mounted() {
    this.fetchOrders();
  },
  
  methods: {
    async fetchOrders() {
      const response = await fetch(
        `/admin/orders?page=${this.currentPage}&limit=${this.limit}`
      );
      const data = await response.json();
      
      this.orders = data.orders;
      this.pagination = data.pagination;
    },
    
    goToPage(page) {
      if (page) {
        this.currentPage = page;
        this.fetchOrders();
      }
    },
  },
};
</script>
```

## Advanced Features

### Filtering with Pagination

```bash
# Get page 2 of pending orders only
GET /admin/orders?page=2&status=pending

# Get page 1 of orders for specific customer
GET /admin/orders?page=1&email=customer@example.com
```

### Sorting with Pagination

```bash
# Get newest orders first (default)
GET /admin/orders?page=1&order_by=created_at&order_direction=desc

# Get oldest orders first
GET /admin/orders?page=1&order_by=created_at&order_direction=asc

# Sort by total amount
GET /admin/orders?page=1&order_by=total&order_direction=desc
```

### Custom Page Sizes

```bash
# Show 10 orders per page
GET /admin/orders?page=1&limit=10

# Show 100 orders per page
GET /admin/orders?page=1&limit=100
```

## Pagination Helper Component (React)

```typescript
interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, total_pages, has_next_page, has_previous_page } = pagination;
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(total_pages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Previous button */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!has_previous_page}
        className="px-3 py-2 border rounded disabled:opacity-50"
      >
        ← Previous
      </button>

      {/* First page */}
      {!getPageNumbers().includes(1) && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 border rounded"
          >
            1
          </button>
          <span>...</span>
        </>
      )}

      {/* Page numbers */}
      {getPageNumbers().map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`px-3 py-2 border rounded ${
            pageNum === page ? 'bg-blue-500 text-white' : ''
          }`}
        >
          {pageNum}
        </button>
      ))}

      {/* Last page */}
      {!getPageNumbers().includes(total_pages) && (
        <>
          <span>...</span>
          <button
            onClick={() => onPageChange(total_pages)}
            className="px-3 py-2 border rounded"
          >
            {total_pages}
          </button>
        </>
      )}

      {/* Next button */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!has_next_page}
        className="px-3 py-2 border rounded disabled:opacity-50"
      >
        Next →
      </button>

      {/* Page info */}
      <span className="ml-4 text-sm text-gray-600">
        Page {page} of {total_pages} ({pagination.total} total)
      </span>
    </div>
  );
}
```

## Testing Pagination

Use these URLs to test:

```bash
# Test basic pagination
curl "http://localhost:9000/admin/orders?page=1&limit=10"

# Test navigation
curl "http://localhost:9000/admin/orders?page=2&limit=10"

# Test with filters
curl "http://localhost:9000/admin/orders?page=1&limit=10&status=pending"

# Test edge cases
curl "http://localhost:9000/admin/orders?page=999&limit=10"  # Should return empty
curl "http://localhost:9000/admin/orders?page=0&limit=10"     # Should treat as page 1
```

## Summary

✅ **Two pagination methods:** `page` (simple) or `offset` (advanced)  
✅ **Rich metadata:** Current page, total pages, navigation helpers  
✅ **Flexible:** Custom page sizes, filtering, sorting  
✅ **Easy to implement:** Clear response structure for frontend  
✅ **Backward compatible:** Old `count`, `offset`, `limit`, `total` fields still work

Now you can easily implement pagination in your admin panel! 🚀

