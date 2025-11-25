# Search Endpoints Documentation

This document describes the search endpoint for the Kente & Bobs backend.

## Overview

The search endpoint allows customers to search across products and categories with intelligent relevance scoring. It supports filtering by type and category filtering for products. **Returns all matching results**.

---

## Base URL

The search endpoint is located at `/store/search`

---

## Endpoint

### Search Products and Categories

**Endpoint:** `GET /store/search`

**Description:** Performs a comprehensive search across products and categories. Returns **all** results sorted by relevance score.

**Authentication:** Optional (works for both authenticated and guest users)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | **Yes** | - | Search query string. Must be non-empty. |
| `type` | string | No | `all` | Filter results by type. Options: `products`, `categories`, `all`. |
| `category_id` | string | No | - | Filter products by specific category ID (only applies when searching products). |

---

## Search Algorithm

The search endpoint uses intelligent relevance scoring:

### Product Relevance Scoring
- **Title match**: +3 points
- **Title starts with query**: +2 bonus points
- **Subtitle match**: +2 points
- **Description match**: +1 point

### Category Relevance Scoring
- **Name match**: +3 points
- **Name starts with query**: +2 bonus points
- **Description match**: +1 point

Results are automatically sorted by relevance score (highest first).

---

## Response Format

**Response:** `200 OK`

```json
{
  "query": "kente",
  "products": [
    {
      "id": "prod_01HZPROD123",
      "name": "Traditional Kente Cloth",
      "handle": "traditional-kente-cloth",
      "description": "Authentic handwoven kente cloth from Ghana",
      "subtitle": "Premium Quality",
      "thumbnail": "https://example.com/image.jpg",
      "status": "published",
      "images": [
        {
          "id": "img_01",
          "url": "https://example.com/image.jpg"
        }
      ],
      "price": {
        "min": 15000,
        "max": 25000,
        "currency": "ghs"
      },
      "categories": [
        {
          "id": "cat_01",
          "name": "Traditional Wear",
          "handle": "traditional-wear"
        }
      ],
      "tags": [
        {
          "id": "tag_01",
          "value": "kente"
        }
      ],
      "quantity": 5,
      "variants": [
        {
          "id": "variant_01",
          "title": "Red & Gold Pattern",
          "sku": "KENTE-RG-001",
          "price": 20000,
          "currency": "ghs",
          "quantity": 1
        }
      ],
      "reviews": {
        "total": 12,
        "average_rating": 4.8,
        "recent": [
          {
            "id": "rev_01",
            "rating": 5,
            "comment": "Excellent quality!",
            "customer_name": "John Doe"
          }
        ]
      },
      "is_in_wishlist": false,
      "relevance_score": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "categories": [
    {
      "id": "cat_01HZCAT123",
      "name": "Kente Collection",
      "handle": "kente-collection",
      "description": "Browse our authentic kente products",
      "parent_category_id": null,
      "parent_category": null,
      "subcategories": [
        {
          "id": "subcat_01",
          "name": "Men's Kente",
          "handle": "mens-kente"
        }
      ],
      "product_count": 24,
      "relevance_score": 5
    }
  ],
  "total": {
    "products": 1,
    "categories": 1,
    "all": 2
  }
}
```

---

## Response Fields

### Root Level
- `query`: The search query that was executed
- `products`: Array of ALL matching products
- `categories`: Array of ALL matching categories
- `total`: Object containing counts of results

### Product Fields
- `id`: Product ID
- `name`: Product title/name
- `handle`: URL-friendly product handle
- `description`: Full product description
- `subtitle`: Product subtitle
- `thumbnail`: Main product image URL
- `status`: Product status (always "published" in search results)
- `images`: Array of product images
- `price`: Price range with min, max, and currency
- `categories`: Array of categories this product belongs to
- `tags`: Array of product tags
- `quantity`: Total available quantity (based on variants)
- `variants`: Array of product variants with pricing
- `reviews`: Review statistics and recent reviews
- `is_in_wishlist`: Boolean indicating if product is in user's wishlist (requires authentication)
- `relevance_score`: Search relevance score (higher = more relevant)
- `created_at`: Product creation timestamp
- `updated_at`: Product last update timestamp

### Category Fields
- `id`: Category ID
- `name`: Category name
- `handle`: URL-friendly category handle
- `description`: Category description
- `parent_category_id`: Parent category ID (if any)
- `parent_category`: Parent category object (if any)
- `subcategories`: Array of child categories
- `product_count`: Number of products in this category
- `relevance_score`: Search relevance score (higher = more relevant)

---

## Error Responses

### 400 Bad Request
Missing or invalid search query.

```json
{
  "error": "Bad Request",
  "message": "Search query 'q' is required and must be a non-empty string"
}
```

### 500 Internal Server Error
Server error during search execution.

```json
{
  "error": "Internal Server Error",
  "message": "Failed to perform search",
  "details": "Detailed error message"
}
```

---

## Usage Examples

### Example 1: Basic Search
Search for "kente" across all types.

```bash
GET /store/search?q=kente
```

**Response:** Returns all products and categories matching "kente".

---

### Example 2: Search Products Only
Search for "shirt" in products only.

```bash
GET /store/search?q=shirt&type=products
```

**Response:** Returns all products matching "shirt".

---

### Example 3: Search Products in Specific Category
Search for "blue" in a specific category.

```bash
GET /store/search?q=blue&type=products&category_id=cat_01HZCAT123
```

**Response:** Returns all products matching "blue" within the specified category.

---

### Example 4: Search Categories Only
Search for "traditional" in categories only.

```bash
GET /store/search?q=traditional&type=categories
```

**Response:** Returns all categories matching "traditional".

---

## Features

### 1. Multi-Field Search
- Searches across product titles, descriptions, and subtitles
- Searches across category names and descriptions

### 2. Relevance Scoring
- Automatically calculates relevance scores
- Prioritizes title/name matches over description matches
- Bonus points for queries that start with the search term

### 3. Rich Product Data
- Includes pricing information (min/max range)
- Includes all variants with individual prices
- Includes review statistics and recent reviews
- Shows wishlist status for authenticated users

### 4. Category Hierarchy
- Shows parent category information
- Lists subcategories
- Shows product count per category

### 5. Flexible Filtering
- Filter by type (products, categories, or both)
- Filter products by category
- Returns all matching results

### 6. Guest & Authenticated Users
- Works for both guest and authenticated users
- Additional features for authenticated users:
  - Wishlist status for products

---

## Performance Considerations

1. **Type Filtering**: Use `type` parameter to search only what you need (products or categories)
2. **Category Filtering**: Narrow down product searches with `category_id`
3. **Client-side Pagination**: Implement pagination on frontend if needed for large result sets

---

## Best Practices

1. **Always validate user input**: The endpoint validates search queries, but sanitize on the frontend too
2. **Debounce search requests**: Implement debouncing on the frontend to avoid excessive API calls (300-500ms recommended)
3. **Show relevance indicators**: Use the `relevance_score` to show users why results matched
4. **Cache frequent searches**: Consider caching common search queries
5. **Implement frontend pagination**: Slice results on frontend for autocomplete or paginated views

---

## Frontend Integration Example

```javascript
// Search function with debouncing
const searchProducts = async (searchQuery, filters = {}) => {
  const params = new URLSearchParams({
    q: searchQuery,
    type: filters.type || 'all',
    ...(filters.category_id && { category_id: filters.category_id })
  });

  try {
    const response = await fetch(`/store/search?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Search failed');
    }
    
    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

// Usage - Get all products
const results = await searchProducts('kente', {
  type: 'products'
});

console.log(`Found ${results.total.products} products`);
console.log('Products:', results.products);

// For autocomplete - slice on frontend
const autocompleteResults = results.products.slice(0, 5);
```

---

## Notes

- Search is case-insensitive
- Partial matches are supported (searching "ken" will match "kente")
- Only published products are included in search results
- Only active categories are included in search results
- Empty search queries are rejected with a 400 error
- Relevance scores are calculated server-side for consistent results
- For authenticated users, wishlist status is automatically included
- **Returns ALL matching results** - implement pagination on frontend if needed

---

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Filtering**
   - Price range filtering
   - Rating filtering
   - Tag-based filtering
   - Date range filtering

2. **Search Suggestions**
   - Autocomplete suggestions
   - "Did you mean...?" suggestions
   - Popular searches

3. **Search Analytics**
   - Track popular search terms
   - Track search-to-purchase conversion
   - Improve relevance algorithm based on analytics

4. **Performance Optimizations**
   - Full-text search indexing
   - Search result caching
   - Elasticsearch/Meilisearch integration

5. **AI-Powered Features**
   - Semantic search
   - Image-based search
   - Personalized search results

