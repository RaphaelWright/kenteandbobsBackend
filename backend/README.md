### local setup
Video instructions: https://youtu.be/PPxenu7IjGM

- `cd /backend`
- `pnpm install` or `npm i`
- Rename `.env.template` ->  `.env`
- To connect to your online database from your local machine, copy the `DATABASE_URL` value auto-generated on Railway and add it to your `.env` file.
  - If connecting to a new database, for example a local one, run `pnpm ib` or `npm run ib` to seed the database.
- `pnpm dev` or `npm run dev`

### API Documentation
- [Product Endpoints](./PRODUCT_ENDPOINTS.md) - Documentation for product-related endpoints
- [Orders Endpoints](./ORDERS_ENDPOINTS.md) - Documentation for customer order endpoints
- [Cart Endpoints](./CART_ENDPOINTS.md) - Documentation for shopping cart endpoints
- [Checkout Endpoints](./CHECKOUT_ENDPOINTS.md) - **NEW** Complete checkout flow documentation
- [Search Endpoints](./SEARCH_ENDPOINTS.md) - Documentation for search functionality
- [Customer Endpoints](./CUSTOMER_ENDPOINTS.md) - Documentation for customer-related endpoints
- [Wishlist Endpoints](./WISHLIST_ENDPOINTS.md) - Documentation for wishlist functionality

### Quick Start Guides
- [Quick Start - Authentication](./QUICK_START_AUTH.md) - Authentication guide
- [Quick Start - Checkout](./CHECKOUT_QUICK_START.md) - **NEW** Implement checkout in 5 minutes ⚡
- [Quick Start - Products](./QUICK_START_PRODUCTS.md) - Products guide
- [Google OAuth Quick Start](./GOOGLE_OAUTH_QUICK_START.md) - Get Google OAuth working in 5 minutes ⚡
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Complete guide to implementing Google OAuth

### requirements
- **postgres database** (Automatic setup when using the Railway template)
- **redis** (Automatic setup when using the Railway template) - fallback to simulated redis.
- **MinIO storage** (Automatic setup when using the Railway template) - fallback to local storage.
- **Meilisearch** (Automatic setup when using the Railway template)

### commands

`cd backend/`
`npm run ib` or `pnpm ib` will initialize the backend by running migrations and seed the database with required system data.
`npm run dev` or `pnpm dev` will start the backend (and admin dashboard frontend on `localhost:9000/app`) in development mode.
`pnpm build && pnpm start` will compile the project and run from compiled source. This can be useful for reproducing issues on your cloud instance.
