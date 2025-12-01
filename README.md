# GPT Marketplace Plus

A comprehensive AI marketplace built on Cloudflare's edge infrastructure.

## Architecture

- **Workers (TypeScript)** - Backend API with CORS-enabled fetch handlers
- **Pages (React)** - Frontend with functional components and hooks
- **D1 (SQLite)** - 34 database tables for all platform data
- **R2** - Object storage for uploads and assets
- **KV** - Session management and caching

## Features

### AI Models Marketplace
- Browse and discover AI models
- Rent models by hour, day, or month
- Pay-per-use pricing options
- Creator earnings and payouts

### Subscription Plans
- Free, Pro, and Enterprise tiers
- API call limits and features
- Monthly and yearly billing

### Prediction Markets
- Create and trade on outcomes
- Automated market making
- Portfolio tracking

### Wallet System
- Deposit and withdraw funds
- Transaction history
- Creator payouts

## Project Structure

```
gptmarketplus/
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   │   ├── handlers/      # API route handlers
│   │   ├── middleware/    # CORS, auth middleware
│   │   ├── services/      # Database operations
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Helper functions
│   │   └── index.ts       # Main entry point
│   ├── wrangler.toml      # Wrangler config
│   └── package.json
│
├── pages/                  # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # CSS styles
│   ├── vite.config.ts
│   └── package.json
│
├── database/
│   └── schema.sql         # D1 database schema
│
└── shared/
    └── types/             # Shared TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Installation

```bash
# Install worker dependencies
cd worker
npm install

# Install frontend dependencies
cd ../pages
npm install
```

### Configuration

1. Create D1 database:
```bash
wrangler d1 create gptmarketplus-db
```

2. Create R2 bucket:
```bash
wrangler r2 bucket create gptmarketplus-storage
```

3. Create KV namespaces:
```bash
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS
```

4. Update `worker/wrangler.toml` with the generated IDs

5. Set secrets (never commit these):
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put JWT_SECRET
```

### Database Setup

```bash
wrangler d1 execute gptmarketplus-db --file=./database/schema.sql
```

## Development

### Run Worker locally
```bash
cd worker
npm run dev
```

### Run Frontend locally
```bash
cd pages
npm run dev
```

## Deployment

### Deploy Worker
```bash
cd worker
npm run deploy
```

### Deploy Pages
The Pages app is automatically deployed via Cloudflare Pages CI/CD when pushing to the main branch.

Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `pages`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/profile` - Get current user profile
- `POST /api/v1/auth/logout` - Logout

### Models
- `GET /api/v1/models` - List models
- `GET /api/v1/models/featured` - Featured models
- `GET /api/v1/models/:id` - Get model details
- `POST /api/v1/models` - Create model (creators only)

### Rentals
- `GET /api/v1/rentals` - User's rentals
- `POST /api/v1/rentals` - Create rental
- `GET /api/v1/rentals/:id` - Get rental details
- `POST /api/v1/rentals/:id/cancel` - Cancel rental

### Subscriptions
- `GET /api/v1/subscriptions/plans` - List plans
- `GET /api/v1/subscriptions` - User's subscription
- `POST /api/v1/subscriptions` - Subscribe
- `POST /api/v1/subscriptions/cancel` - Cancel

### Markets
- `GET /api/v1/markets` - List markets
- `GET /api/v1/markets/:id` - Market details
- `POST /api/v1/markets` - Create market
- `POST /api/v1/markets/:id/trade` - Place trade
- `GET /api/v1/markets/positions` - User's positions

### Wallet
- `GET /api/v1/wallet` - Wallet balance
- `GET /api/v1/wallet/transactions` - Transaction history
- `POST /api/v1/wallet/deposit` - Add funds
- `POST /api/v1/wallet/withdraw` - Withdraw funds

## Monetization

### Platform Fees
- **Rental Fee**: 20% of rental revenue goes to platform
- **Trading Fee**: 2% on all market trades
- **API Charges**: $0.001 per request beyond subscription limits
- **Subscription Revenue**: Monthly/yearly subscription fees

### Creator Earnings
- Creators earn 80% of rental revenue
- Automatic payouts to creator wallets
- Transparent revenue tracking

## Security

- All secrets managed via Wrangler secrets (never in code)
- Parameterized queries for all database operations
- JWT-based authentication with session validation
- CORS properly configured
- Input sanitization on all endpoints

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV
- **Frontend**: React 18 + Vite
- **Payments**: Stripe
- **Language**: TypeScript (strict mode)

## License

MIT