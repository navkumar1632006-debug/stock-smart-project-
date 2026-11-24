# StockSmart AI — Hyperlocal Retail & Inventory Intelligence Platform

[![CI](https://github.com/navkumar1632006-debug/stock-smart-project-/actions/workflows/ci.yml/badge.svg)](https://github.com/navkumar1632006-debug/stock-smart-project-/actions/workflows/ci.yml)
[![StockSmart CI](https://github.com/navkumar1632006-debug/stock-smart-project-/actions/workflows/stocksmart-ci.yml/badge.svg)](https://github.com/navkumar1632006-debug/stock-smart-project-/actions/workflows/stocksmart-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

StockSmart AI is an enterprise-grade retail inventory intelligence, demand forecasting, smart expiry management, dynamic pricing, and hyperlocal commerce platform designed specifically for Kirana stores, grocery markets, supermarkets, dairy booths, and pharmacies.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Main Objectives](#3-main-objectives)
4. [Key Features](#4-key-features)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Frontend Setup (Web)](#7-frontend-setup-web)
8. [Backend Setup (Express API)](#8-backend-setup-express-api)
9. [Android Setup (React Native / Expo)](#9-android-setup-react-native--expo)
10. [Supabase Configuration](#10-supabase-configuration)
11. [Database Migration Instructions](#11-database-migration-instructions)
12. [AI Integration Architecture](#12-ai-integration-architecture)
13. [Environment Variable Configuration](#13-environment-variable-configuration)
14. [Testing Instructions](#14-testing-instructions)
15. [Performance Testing Instructions (k6)](#15-performance-testing-instructions-k6)
16. [Build Instructions](#16-build-instructions)
17. [GitHub Actions CI/CD Workflows](#17-github-actions-cicd-workflows)
18. [Security & Compliance Guardrails](#18-security--compliance-guardrails)
19. [Known Limitations](#19-known-limitations)
20. [Future Roadmap](#20-future-roadmap)

---

## 1. Project Overview
StockSmart AI transforms traditional, manual mom-and-pop grocery stores (Kirana shops) and regional supermarkets into intelligent, data-driven retail operations. By bridging modern web interfaces, physical Android mobile scanning, cloud-native PostgreSQL ledgers, and edge-orchestrated machine learning models, StockSmart AI optimizes daily procurement, eliminates perishables spoilage, automates credit tracking (Khata), and drives hyper-localized customer retention.

---

## 2. Problem Statement
Local grocery retailers face persistent operational challenges:
- **Perishable Waste:** 15–30% of inventory spoil due to manual expiration tracking and lack of First-Expired, First-Out (FEFO) controls.
- **Stockouts & Overstocking:** Intuition-based ordering results in frequent stockouts of staples or locked capital in slow-moving goods.
- **Unsecured Credit (Udhaar):** Manual paper-based Khata ledgers lead to dispute, ledger loss, and delayed receivables.
- **Fragmented Tooling:** Retailers are forced to balance barcode hardware, accounting spreadsheets, and paper records with zero unified intelligence.

---

## 3. Main Objectives
1. **Zero Spoilage via Automated FEFO & Dynamic Pricing:** Trigger graduated discounts on near-expiry goods to clear inventory before write-off.
2. **Predictive Procurement:** Forecast seasonal, weekly, and weather-driven demand patterns to generate automated Purchase Orders (POs).
3. **Dual-Layer Database Security:** Enforce strict PostgreSQL column privilege revocations paired with `SECURITY INVOKER` trigger guards so client tampering is mathematically impossible.
4. **Unified Multi-Platform Experience:** Seamless synchronization across Web POS, Android Camera Scanner, and Supabase cloud.

---

## 4. Key Features
- **Smart Point of Sale (POS):** Fast, keyboard- and scanner-optimized checkout with automated tax computation and digital receipting.
- **Physical Barcode Scanner:** Real-time live camera barcode scanning (EAN-13, UPC-A, QR code) with laser reticle, flashlight toggle, and instant catalog matching.
- **Smart Expiry Management:** Real-time status flags (Normal, Near Expiry, Critical, Expired) with automated markdown recommendations.
- **AI Demand Forecasting:** Multi-horizon demand curves using historical moving averages, seasonal variance, and weather indicators with deterministic fallback.
- **Digital Khata Ledger:** Audit-logged customer credit/debit tracking with idempotency protection and atomic balance reconciliation.
- **Loyalty Points Engine:** Configurable earn-and-burn point redemption tied directly into sale line totals.
- **Procurement & Supplier Management:** End-to-end purchase order workflows from generation to partial or full receiving with batch lot logging.
- **Role-Based Access Control (RBAC):** Multi-tenant store segregation supporting `owner`, `manager`, `cashier`, and `inventory_clerk` roles.

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT INTERFACES                              │
│                                                                             │
│   Web Application (React 19 / Vite)     Mobile Application (React Native)   │
│   - Desktop POS & Dashboard             - Real-Time Camera Barcode Scanner  │
│   - Khata & Supplier Management         - Android Native Camera & Storage   │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY & BACKEND                             │
│                                                                             │
│   Express.js Microservice (Node 20 / TypeScript)                            │
│   - Helmet Security Headers & Rate Limiting                                 │
│   - Server-Side Secret Management & AI Proxy                                │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────┐
│        INTELLIGENCE ENGINE           │   │         SUPABASE CLOUD           │
│                                      │   │                                  │
│  - Supabase Edge Functions           │   │  PostgreSQL 15 (Multi-Tenant)    │
│  - Google Gemini 2.0 API             │   │  - Row-Level Security (RLS)      │
│  - Deterministic Offline Fallback    │   │  - SECURITY DEFINER Stored Procs │
│  - Quota Limiter & Fraud Defense     │   │  - Layer 1 & 2 Guard Triggers    │
└──────────────────────────────────────┘   └──────────────────────────────────┘
```

---

## 6. Technology Stack
- **Web Frontend:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Lucide Icons, Framer Motion, Recharts.
- **Mobile Client:** React Native 0.86, Expo 57, Expo Camera, React Navigation, Async Storage.
- **Backend API:** Node.js 20, Express 4.21, TypeScript, Helmet, CORS, Express-Rate-Limit, tsx.
- **Database & Auth:** Supabase (Cloud PostgreSQL), Row Level Security (RLS), Supabase Auth.
- **Testing & QA:** Vitest, Playwright, Selenium WebDriver, Appium, Mocha/Chai, k6 (Grafana).
- **CI/CD:** GitHub Actions (Ubuntu runners, automated artifact exports, Excel report builders).

---

## 7. Frontend Setup (Web)

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/navkumar1632006-debug/stock-smart-project-.git
cd stock-smart-project-

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Running Locally
```bash
# Start development server
npm run dev
# Server will listen on http://localhost:3000 (Express API + Vite HMR)
```

---

## 8. Backend Setup (Express API)

The backend runs concurrently with Vite in `server.ts` or as a standalone production bundle:

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

### Healthcheck
```bash
curl -I http://localhost:3000/api/health
# HTTP/1.1 200 OK
```

---

## 9. Android Setup (React Native / Expo)

### Prerequisites
- Android Studio with Android SDK Platform 34/35
- JDK 17
- Physical Android device with USB Debugging enabled, or Android Virtual Device (AVD)

### Running on Device
```bash
cd mobile

# Install dependencies
npm ci

# Configure mobile environment
cp .env.example .env.local

# Run debug build directly on connected device
npx expo run:android
```

---

## 10. Supabase Configuration

StockSmart AI uses Supabase for multi-tenant identity, cloud database, and edge functions.

1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve your **Project URL** and **anon/publishable key** from **Project Settings -> API**.
3. Retrieve your **service_role key** for server-side operations (keep this secret!).
4. Add credentials to your root `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## 11. Database Migration Instructions

Database migrations are located in `supabase/migrations/` and must be applied in sequential order:

```bash
# Method A: Using Supabase CLI
npx supabase link --project-ref your-project-ref
npx supabase db push

# Method B: Supabase Web Dashboard
# Navigate to Database -> SQL Editor and execute migration files sequentially:
# 1. 20260801000000_baseline_schema.sql
# 2. 20260810000000_add_performance_indexes.sql
# 3. 20260820000000_final_migration.sql
# 4. 20260831000000_phase17_rbac.sql
# 5. 20260928000000_phase19_atomic_transactions.sql
# 6. 20260929000000_phase20_procurement.sql
# 7. 20261116000000_phase21_update_rls_for_rbac.sql
# 8. 20261116010000_phase22_harden_rls_and_stored_procedures.sql
# 9. 20261116020000_phase23_ai_rate_limiting.sql
# 10. 20261117000000_phase24_barcode_lookup.sql
# 11. 20261119000000_fix_trigger_guard_record_types.sql
```

---

## 12. AI Integration Architecture

StockSmart AI implements a resilient, multi-tiered AI pipeline:
1. **Edge Inference:** Invocations first route through Supabase Edge Function `stocksmart-ai` powered by Gemini 2.0.
2. **Quota Tracking:** PostgreSQL function `check_and_increment_ai_quota` enforces hourly and daily rate limits per store.
3. **Deterministic Fallback:** If internet access drops or the edge function fails, the system automatically falls back to an offline deterministic seasonal algorithm in `src/lib/services/forecastService.ts`.

---

## 13. Environment Variable Configuration

| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Client & Server | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Public PostgREST API key | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | High-privilege administrative key | `eyJhbGci...` |
| `APP_URL` | Server Only | Base URL for CORS and links | `http://localhost:3000` |
| `PORT` | Server Only | Express listening port | `3000` |
| `GEMINI_API_KEY` | Server Only | Google GenAI API credential | `AIzaSy...` |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile Client | Mobile Supabase API URL | `https://xyz.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`| Mobile Client | Mobile public API key | `sb_publishable_...` |

---

## 14. Testing Instructions

### Unit & Integration Tests (Vitest)
```bash
npm test
# Executes 87 tests across 15 test files with 100% pass rate
```

### Static Analysis & Type Checking
```bash
# Check Web & Backend
npx tsc --noEmit

# Check Mobile (React Native / Expo)
cd mobile && npx tsc --noEmit
```

### Selenium Web End-to-End Tests
```bash
cd BrainBattleE2E
npm install
npm test
# Generates Excel test reports at BrainBattleE2E/reports/excel/Web_Test_Report.xlsx
```

### Appium Mobile Automation Tests
```bash
cd BrainBattleAppium
npm install
npm test
```

---

## 15. Performance Testing Instructions (k6)

StockSmart AI includes automated baseline load testing simulating 100 concurrent Virtual Users (VUs):

```bash
# Execute local load test and generate Excel summary
npm run test:load
```
Results are exported to `summary.json` and converted into `API_Load_Test_Report.xlsx`.

---

## 16. Build Instructions

```bash
# Production Web Build
npm run build
# Compiles Vite assets to dist/ and bundles server.ts to dist/server.cjs

# Android APK Build (Debug)
cd mobile
npx expo run:android --variant debug
```

---

## 17. GitHub Actions CI/CD Workflows

The repository includes pre-configured automation in `.github/workflows/`:
- `ci.yml`: Automated pull request validation (Node 20, Vitest, root and mobile typechecking).
- `stocksmart-ci.yml`: Comprehensive linting, testing, building, and security auditing.
- `load-test.yml`: Scheduled and on-demand k6 stress tests with automated Excel artifact uploads.
- `web-e2e.yml`: Headless Selenium Chrome end-to-end testing with Mochawesome report publishing.
- `deploy.yml`: Automated continuous deployment pipeline.

---

## 18. Security & Compliance Guardrails

- **Zero Client Mutations on Financial Columns:** Direct client `UPDATE` or `INSERT` on `products.stock_level`, `khata_customers.balance`, `loyalty_customers.points_balance`, and `purchase_order_items.received_quantity` is blocked by PostgreSQL column permissions (Layer 1) and reinforced by `SECURITY INVOKER` triggers (Layer 2).
- **Atomic Operations:** All stock and ledger mutations must flow through hardened `SECURITY DEFINER` stored procedures (`process_sale`, `process_stock_adjustment`, `process_khata_transaction`, `process_loyalty_transaction`, `receive_purchase_order`).
- **No Hardcoded Secrets:** All credentials are kept in `.env` files that are strictly `.gitignore`'d.

---

## 19. Known Limitations
- Real-time multi-device camera sync requires active Wi-Fi or cellular connectivity; offline scans queue locally in Async Storage until connection is restored.
- Cloud Run / Edge Function Cold Starts can add 300–600ms latency to the initial AI inference query.

---

## 20. Future Roadmap
- [ ] Offline-first SQLite local replica with bidirectional CRDT synchronization.
- [ ] Voice-assisted vernacular Kirana ordering (Hindi, Tamil, Telugu, Marathi).
- [ ] UPI QR dynamic generation directly on POS terminal screen with instant webhook reconciliation.
- [ ] ONDC (Open Network for Digital Commerce) protocol integration.

---

## License
StockSmart AI is licensed under the [MIT License](LICENSE).
