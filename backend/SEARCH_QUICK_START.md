# Search Endpoint - Quick Start Guide

## 🚀 TL;DR

Search endpoint is ready at `/store/search` - Returns **all** matching results

**Minimal Example:**
```bash
GET /store/search?q=kente
```

---

## 📍 Endpoint

```
GET /store/search
```

---

## 📝 Required Parameter

| Parameter | Description |
|-----------|-------------|
| `q` | Search query (e.g., "kente", "shirt", "dress") |

---

## 🎯 Optional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `type` | all | Filter: `all`, `products`, `categories` |
| `category_id` | - | Filter products by category |

---

## 💻 Quick Examples

### 1. Basic Search
```javascript
fetch('/store/search?q=kente')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 2. Search Products Only
```javascript
fetch('/store/search?q=shirt&type=products')
  .then(res => res.json())
  .then(data => console.log(data.products));
```

### 3. React Component
```jsx
import { useState } from 'react';

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);

  const search = async () => {
    const res = await fetch(`/store/search?q=${query}`);
    const data = await res.json();
    setResults(data);
  };

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && search()}
      />
      <button onClick={search}>Search</button>
      {results && (
        <div>
          <p>{results.total.products} products found</p>
          <p>{results.total.categories} categories found</p>
        </div>
      )}
    </div>
  );
}
```

---

## 📦 Response Structure

```json
{
  "query": "kente",
  "products": [
    {
      "id": "prod_123",
      "name": "Product Name",
      "handle": "product-name",
      "description": "...",
      "thumbnail": "https://...",
      "price": {
        "min": 5000,
        "max": 10000,
        "currency": "ghs"
      },
      "categories": [...],
      "variants": [...],
      "reviews": {
        "total": 12,
        "average_rating": 4.5
      },
      "is_in_wishlist": false,
      "relevance_score": 5
    }
  ],
  "categories": [
    {
      "id": "cat_123",
      "name": "Category Name",
      "handle": "category-name",
      "product_count": 24,
      "relevance_score": 5
    }
  ],
  "total": {
    "products": 5,
    "categories": 2,
    "all": 7
  }
}
```

---

## ✅ What You Get

### Products Include:
- ✓ Name, description, images
- ✓ Price range (min/max)
- ✓ All variants with prices
- ✓ Categories and tags
- ✓ Review stats
- ✓ Wishlist status (if logged in)
- ✓ Relevance score

### Categories Include:
- ✓ Name, description
- ✓ Parent/child categories
- ✓ Product count
- ✓ Relevance score

---

## 🎨 Features

| Feature | Status |
|---------|--------|
| Multi-field search | ✅ |
| Relevance scoring | ✅ |
| Returns all results | ✅ |
| Type filtering | ✅ |
| Category filtering | ✅ |
| Guest users | ✅ |
| Authenticated users | ✅ |
| Review integration | ✅ |
| Wishlist integration | ✅ |

---

## ⚡ Performance Tips

1. **Debounce** - Wait 300ms after user stops typing
2. **Type filter** - Use `type=products` for faster searches
3. **Category filter** - Narrow searches with `category_id`
4. **Client-side pagination** - Implement pagination on frontend if needed

---

## 🐛 Common Issues

### Empty Query Error
```json
// ❌ This fails
GET /store/search?q=

// ✅ This works
GET /store/search?q=kente
```

### Too Many Requests
```javascript
// ❌ Don't do this (searches on every keystroke)
onChange={(e) => search(e.target.value)}

// ✅ Do this (debounce)
const debouncedSearch = debounce(search, 300);
onChange={(e) => debouncedSearch(e.target.value)}
```

---

## 📚 Full Documentation

- **[SEARCH_ENDPOINTS.md](./SEARCH_ENDPOINTS.md)** - Complete API reference
- **[SEARCH_ENDPOINT_EXAMPLES.md](./SEARCH_ENDPOINT_EXAMPLES.md)** - Code examples
- **[SEARCH_IMPLEMENTATION_SUMMARY.md](./SEARCH_IMPLEMENTATION_SUMMARY.md)** - Technical details

---

## 🧪 Test It Now

### cURL
```bash
curl "http://localhost:9000/store/search?q=test"
```

### Browser
```
http://localhost:9000/store/search?q=test
```

### JavaScript Console
```javascript
fetch('/store/search?q=test')
  .then(r => r.json())
  .then(console.log)
```

---

## 💡 Pro Tips

1. **Autocomplete**: Slice results on frontend `results.products.slice(0, 5)`
2. **URL State**: Put search query in URL for shareable links
3. **Empty State**: Show helpful message when `total.all === 0`
4. **Loading State**: Show spinner during search
5. **Error Handling**: Always catch and display errors

---

## 🎓 Example Use Cases

| Use Case | Parameters |
|----------|------------|
| Search bar autocomplete | `?q=ken&type=products` (slice on frontend) |
| Full search results | `?q=kente` |
| Category browsing | `?q=traditional&type=categories` |
| Filtered product search | `?q=blue&type=products&category_id=cat_123` |

---

## 🔐 Authentication

- **Guest users**: Search works ✅
- **Logged in users**: Get wishlist status ✅
- **No API key required** ✅

---

## ⚙️ Status

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** November 25, 2025

---

## 🆘 Need Help?

1. Check the examples above
2. Read [SEARCH_ENDPOINTS.md](./SEARCH_ENDPOINTS.md)
3. Test with cURL to isolate frontend issues
4. Check browser console for errors
5. Verify search query is not empty

---

## 🚦 Quick Checklist

Before implementing search in your app:

- [ ] Understand the `/store/search` endpoint
- [ ] Know the required parameter (`q`)
- [ ] Implement debouncing (300ms recommended)
- [ ] Handle loading and error states
- [ ] Show empty state when no results
- [ ] Test with real queries
- [ ] Implement client-side pagination if needed
- [ ] Optimize for mobile devices
- [ ] Add keyboard shortcuts (Ctrl+K, etc.)

---

**Happy Searching! 🔍**

