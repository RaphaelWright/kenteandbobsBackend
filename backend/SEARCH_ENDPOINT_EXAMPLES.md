# Search Endpoint - Usage Examples

This document provides practical examples for using the `/store/search` endpoint.

## Quick Reference

**Endpoint:** `GET /store/search`

**Base URL:** `http://localhost:9000/store/search` (development)

**Note:** Returns **ALL** matching results. Implement pagination on frontend if needed.

---

## Example 1: Basic Search

Search for products and categories containing "kente".

### Request
```bash
curl "http://localhost:9000/store/search?q=kente"
```

### Expected Response
```json
{
  "query": "kente",
  "products": [...],
  "categories": [...],
  "total": {
    "products": 5,
    "categories": 2,
    "all": 7
  }
}
```

---

## Example 2: Search Products Only

Search only for products (exclude categories).

### Request
```bash
curl "http://localhost:9000/store/search?q=shirt&type=products"
```

### JavaScript/Fetch Example
```javascript
const searchProducts = async (query) => {
  const response = await fetch(
    `http://localhost:9000/store/search?q=${encodeURIComponent(query)}&type=products`
  );
  const data = await response.json();
  return data.products;
};

// Usage
const products = await searchProducts("shirt");
console.log(`Found ${products.length} products`);
```

---

## Example 3: Search with Category Filter

Search for products within a specific category.

### Request
```bash
curl "http://localhost:9000/store/search?q=blue&type=products&category_id=cat_01HZCAT123"
```

### JavaScript Example
```javascript
const searchInCategory = async (query, categoryId) => {
  const params = new URLSearchParams({
    q: query,
    type: 'products',
    category_id: categoryId
  });

  const response = await fetch(`/store/search?${params}`);
  const data = await response.json();
  
  return data.products;
};

// Usage
const blueProducts = await searchInCategory("blue", "cat_01HZCAT123");
```

---

## Example 4: Search Categories Only

Search only categories (useful for category navigation).

### Request
```bash
curl "http://localhost:9000/store/search?q=traditional&type=categories"
```

### Vue.js Example
```vue
<template>
  <div>
    <input 
      v-model="searchQuery" 
      @input="debouncedSearch"
      placeholder="Search categories..."
    />
    <div v-if="loading">Searching...</div>
    <ul v-else>
      <li v-for="category in categories" :key="category.id">
        {{ category.name }} ({{ category.product_count }} products)
      </li>
    </ul>
  </div>
</template>

<script>
import { ref } from 'vue';
import { debounce } from 'lodash';

export default {
  setup() {
    const searchQuery = ref('');
    const categories = ref([]);
    const loading = ref(false);

    const searchCategories = async (query) => {
      if (!query) {
        categories.value = [];
        return;
      }

      loading.value = true;
      try {
        const response = await fetch(
          `/store/search?q=${encodeURIComponent(query)}&type=categories`
        );
        const data = await response.json();
        categories.value = data.categories;
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        loading.value = false;
      }
    };

    const debouncedSearch = debounce(() => {
      searchCategories(searchQuery.value);
    }, 300);

    return { searchQuery, categories, loading, debouncedSearch };
  }
};
</script>
```

---

## Example 5: Autocomplete Search

Implement autocomplete by limiting displayed results on frontend.

### Request
```bash
curl "http://localhost:9000/store/search?q=ken&type=products"
```

### React Autocomplete Component
```javascript
import { useState, useEffect } from 'react';

const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `/store/search?q=${encodeURIComponent(query)}&type=products`
        );
        const data = await response.json();
        // Limit to first 5 results for autocomplete
        setSuggestions(data.products.slice(0, 5));
      } catch (error) {
        console.error('Autocomplete failed:', error);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Search products..."
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((product) => (
            <li key={product.id} onClick={() => {
              // Navigate to product page
              window.location.href = `/products/${product.handle}`;
            }}>
              <img src={product.thumbnail} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <span>{product.price.currency} {product.price.min}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Example 6: Advanced Search with Filters

Comprehensive search with multiple filters.

### JavaScript Example
```javascript
class SearchService {
  constructor(baseUrl = 'http://localhost:9000') {
    this.baseUrl = baseUrl;
  }

  async search({
    query,
    type = 'all',
    categoryId = null
  }) {
    const params = new URLSearchParams({
      q: query,
      type
    });

    if (categoryId) {
      params.append('category_id', categoryId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/store/search?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Search failed');
      }

      const data = await response.json();
      return {
        success: true,
        data,
        query: data.query,
        totalResults: data.total.all
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchProducts(query, options = {}) {
    return this.search({ query, type: 'products', ...options });
  }

  async searchCategories(query, options = {}) {
    return this.search({ query, type: 'categories', ...options });
  }
}

// Usage
const searchService = new SearchService();

// Search all
const allResults = await searchService.search({
  query: 'kente'
});

// Search products only
const productResults = await searchService.searchProducts('dress', {
  categoryId: 'cat_01HZCAT123'
});

// Search categories only
const categoryResults = await searchService.searchCategories('traditional');

if (allResults.success) {
  console.log(`Found ${allResults.totalResults} total results`);
  console.log('Products:', allResults.data.products);
  console.log('Categories:', allResults.data.categories);
}
```

---

## Example 7: Search with Authentication

Search as an authenticated user to get wishlist status.

### Request with Cookie/Session
```bash
curl "http://localhost:9000/store/search?q=kente" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### JavaScript with Credentials
```javascript
const searchWithAuth = async (query) => {
  const response = await fetch(
    `/store/search?q=${encodeURIComponent(query)}`,
    {
      credentials: 'include', // Include cookies
    }
  );

  const data = await response.json();
  
  // For authenticated users, products will have is_in_wishlist field
  return data;
};

// Usage
const results = await searchWithAuth("kente");
results.products.forEach(product => {
  console.log(`${product.name}: ${product.is_in_wishlist ? '❤️ In Wishlist' : '🤍 Not in Wishlist'}`);
});
```

---

## Example 8: Error Handling

Handle different error scenarios.

### JavaScript Example with Error Handling
```javascript
const searchWithErrorHandling = async (query) => {
  // Validate query on client side
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error: 'Search query cannot be empty'
    };
  }

  try {
    const response = await fetch(
      `/store/search?q=${encodeURIComponent(query.trim())}`
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Search failed',
        statusCode: response.status
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error or server unavailable',
      details: error.message
    };
  }
};

// Usage
const result = await searchWithErrorHandling(userInput);

if (result.success) {
  displayResults(result.data);
} else {
  if (result.statusCode === 400) {
    showError('Please enter a valid search term');
  } else if (result.statusCode === 500) {
    showError('Server error. Please try again later.');
  } else {
    showError(result.error);
  }
}
```

---

## Example 9: Client-Side Pagination

Implement pagination on the frontend since the API returns all results.

### React Pagination Example
```javascript
import { useState, useEffect } from 'react';

const SearchWithPagination = () => {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const searchProducts = async (searchQuery) => {
    const response = await fetch(`/store/search?q=${searchQuery}&type=products`);
    const data = await response.json();
    setAllResults(data.products);
    setCurrentPage(1); // Reset to first page
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = allResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(allResults.length / itemsPerPage);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && searchProducts(query)}
      />
      
      <div className="results">
        <p>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, allResults.length)} of {allResults.length} results</p>
        {currentItems.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Testing with cURL

### Test 1: Empty Query (Should Fail)
```bash
curl "http://localhost:9000/store/search?q="
# Expected: 400 Bad Request
```

### Test 2: Valid Search
```bash
curl "http://localhost:9000/store/search?q=test"
# Expected: 200 OK with results
```

### Test 3: Products Only
```bash
curl "http://localhost:9000/store/search?q=test&type=products"
# Expected: 200 OK with only products
```

### Test 4: With Category Filter
```bash
curl "http://localhost:9000/store/search?q=test&type=products&category_id=cat_123"
# Expected: 200 OK with products filtered by category
```

---

## Best Practices

1. **Debounce User Input**: Wait 300-500ms after user stops typing before searching
2. **Minimum Query Length**: Only search when query is at least 2-3 characters
3. **Show Loading States**: Display loading indicator during search
4. **Handle Empty Results**: Show helpful message when no results found
5. **Cache Results**: Cache common searches to reduce API calls
6. **URL State**: Store search query in URL for shareable links
7. **Clear Previous Results**: Clear old results when starting new search
8. **Error Recovery**: Show user-friendly error messages
9. **Client-side Pagination**: Implement pagination on frontend for large result sets
10. **Keyboard Navigation**: Support arrow keys for autocomplete
11. **Accessibility**: Ensure search is keyboard and screen-reader friendly

---

## Common Issues & Solutions

### Issue: Too Many Results
**Solution**: Implement client-side pagination or filtering
```javascript
// Limit displayed results
const displayedResults = allResults.slice(0, 20);

// Or implement pagination
const paginatedResults = allResults.slice(page * pageSize, (page + 1) * pageSize);
```

### Issue: Too Many API Calls
**Solution**: Implement debouncing
```javascript
import { debounce } from 'lodash';

const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

### Issue: Empty Search Results
**Solution**: Check query validation
```javascript
if (!query || query.trim().length < 2) {
  return; // Don't search
}
```

### Issue: CORS Errors
**Solution**: Ensure credentials are included
```javascript
fetch('/store/search?q=test', {
  credentials: 'include'
});
```

---

## Performance Tips

1. **Use Type Filtering**: Only search what you need (`type=products` or `type=categories`)
2. **Implement Debouncing**: Reduce API calls during typing
3. **Cache Frequent Searches**: Store common queries in memory/localStorage
4. **Optimize Images**: Product thumbnails should be optimized
5. **Lazy Load**: Load images and details as user scrolls
6. **Frontend Pagination**: Slice large result sets on the frontend

