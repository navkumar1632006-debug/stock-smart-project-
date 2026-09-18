# PROJECT BASELINE AUDIT

## Current Architecture
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts.
* **Backend:** Supabase PostgreSQL, Supabase Auth, Supabase Realtime.
* **Data Flow:** React Components → TypeScript Services (`inventoryService`, `salesService`, `authApi`) → Supabase JS Client → PostgreSQL (RPCs & RLS).
* **Legacy Server:** An Express server (`server.ts`) exists as a static host but previously acted as a REST API. Mock REST endpoints have been stripped, though some components still attempt to fetch them.

## Current Database State
Based on the latest hardened migration (`supabase_phase_1_final_migration.sql`) and `database.types.ts`:
* **Tables Exist:** `stores`, `products`, `sales`, `batches`, `forecasts`, `suppliers`, `notifications`, `stock_movements`, `auth.users` (implicit).
* **Constraints/Indexes:** Proper `CHECK` constraints on stock >= 0, quantity > 0, price >= 0. Indexes on notifications and stock movements.
* **RLS Policies:** Fully implemented. All tables are scoped to `auth.uid() = owner_id` via the `stores` table joining mechanism. Client explicit `.eq('store_id', storeId)` is used defensively.
* **RPC Functions:** 
  * `process_sale`: Atomic stock decrement + sales logging + stock movement logging. Uses row locking (`FOR UPDATE`) and idempotency keys. Runs as `SECURITY DEFINER`.
  * `process_stock_adjustment`: Atomic adjustment logic with similar safeguards.
* **Realtime Configuration:** Publications exist for `products`, `sales`, `batches`, `notifications`, `stock_movements`.

## Completed Features
* Supabase Authentication (Login, Signup, Session management).
* Core Inventory fetching and rendering.
* Atomic stock mutations (using RPCs).
* Real-time multi-client syncing for database changes.

## Incomplete Features
* **AI & Forecasting:** Heavily reliant on hardcoded fallback UI components (e.g. `AIMorningBriefing`, `SalesForecastChart`, `AIRetailAssistant`).
* **Batch/Expiry logic:** Batch discounts are calculated dynamically on the frontend but lack a dedicated management interface (tied into product edit modal).
* **Marketplace & Khata:** UI placeholders exist with static demo states.
* **Supplier & Notification Services:** Not yet implemented as TypeScript services.

## Security Issues
* **Safe:** Supabase Anon key is used securely; no `service_role` leaks. No direct DB credentials exposed.
* **RPC Hardening:** The latest SQL migrations use `SECURITY DEFINER` and strip search paths, successfully closing RLS bypass risks during transactions.
* **Minor:** Client code relies on explicit `.eq('store_id', ...)` filters, which could bypass RLS testing locally if policies were misconfigured, though the backend RPCs validate ownership explicitly.

## Duplicate Implementations
* No duplicate business logic.
* However, state management is heavily duplicated/tangled across `RetailDashboard.tsx`. 

## API Usage
* The frontend contains broken `fetch()` calls to removed Express APIs (`/api/inventory/bulk`, `/api/inventory/alerts`) inside `RetailDashboard.tsx`. These must be removed and replaced with Supabase logic.

## TypeScript Opportunities
* `inventoryService.ts` relies on `any` types for row mapping (`const mapProduct = (row: any)`). This can be strongly typed using `Database['public']['Tables']['products']['Row']`.

## UI/UX Status
* `RetailDashboard.tsx` is an ~1800 line monolithic component.
* Inline forms and localized accessibility state (font scale, offline mode toggles) make it difficult to scale or reuse UI elements.

## Testing Status
* Basic test setups exist (`vitest`, `setupTests.ts`) but the project relies primarily on type-checking and manual run-time auditing right now. 
* Lints cleanly (`tsc --noEmit` passes).

## Deployment Readiness
* The Vite build succeeds (`npm run build` passes).
* Database is production-hardened.
* **Blocker:** The monolith dashboard and broken legacy API endpoints prevent this from being fully production-ready.

## Recommended Phase Order
1. **Phase 1: Service Completion & Cleanup** (Fix broken `fetch` calls, type `any` usages, build `notificationService`/`supplierService`).
2. **Phase 2: State Refactoring** (Implement Zustand to untangle `RetailDashboard.tsx`).
3. **Phase 3: Component Extraction** (Split `RetailDashboard.tsx` into small, focused modules).
4. **Phase 4: AI & Advanced Modules** (Connect Marketplace, AI Assistant, and Khata to real data flows).
