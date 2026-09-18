# PHASE 0 — COMPLETE PROJECT AUDIT REPORT

## 1. Current Architecture
*   **Frontend**: React + TypeScript + Vite + Tailwind CSS.
*   **Backend**: Supabase (PostgreSQL, Auth, Realtime).
*   **Data Layer**: TypeScript services (`inventoryService.ts`, `salesService.ts`, `storeService.ts`, `authApi.ts`) interacting with the Supabase JS client.
*   **Server**: A local Express server acts as a proxy/SPA server but the actual API interactions are direct to Supabase.
*   **State Management**: Complex local state in monolithic components (`RetailDashboard.tsx`), no Zustand store found.

## 2. Existing Working Features
*   Authentication (Login, Signup, Password Reset via Supabase).
*   Inventory viewing, adding, and updating (with atomic DB operations).
*   Sales processing via `process_sale` RPC.
*   Real-time UI sync for stock movements and sales using Supabase Realtime channels.
*   TypeScript typings for Supabase database.

## 3. Existing Incomplete Features
*   Batch management (coupled to product edits instead of a standalone batch workflow).
*   Desktop notifications (still calls removed `/api/inventory/alerts` endpoints).
*   Bulk CSV Import (calls removed `/api/inventory/bulk` endpoint).
*   AI Assistant / Forecaster (uses mocked or static data locally).

## 4. Existing Database Tables
*   `stores`
*   `products`
*   `sales`
*   `batches`
*   `forecasts`
*   `suppliers`
*   `notifications`
*   `stock_movements`

## 5. Existing RLS Policies
*   Strict RLS exists. Queries append `.eq('store_id', storeId)` verifying multi-tenancy.
*   Tenancy is scoped to the `owner_id` (users) and related `store_id`.

## 6. Existing RPC Functions
*   `process_sale` (Atomic sale execution & stock decrement).
*   `process_stock_adjustment` (Atomic inventory modification).

## 7. Existing TypeScript Services
*   `inventoryService.ts`
*   `inventoryIntelligenceService.ts`
*   `salesService.ts`
*   `storeService.ts`
*   `authApi.ts`

## 8. Existing Mock/Demo Data
*   Widespread use in lazy-loaded UI modules: `LoyaltyManager`, `SalesForecastChart`, `HyperlocalMarketplace`, `HardwareSimulators`, `DigitalKhata`, `AIRetailAssistant`, `AIMorningBriefing`, `AccessControlFamily`.

## 9. Existing API/Backend Dependencies
*   Express server exists for static hosting and previous fallback mock APIs (which were removed but still polled by the frontend).
*   Supabase JS client is the primary backend dependency.

## 10. localStorage Usage
*   None observed in services. Used sparingly or implicitly via Supabase auth session handling.

## 11. Security Problems
*   Supabase keys (`VITE_SUPABASE_ANON_KEY`) are safely handled.
*   No `service_role` keys on frontend.
*   No MongoDB/mongoose or direct python links.
*   No critical security flaws identified. Client-side explicit `store_id` filtering may mask RLS testing, but backend RPCs enforce safety.

## 12. TypeScript Problems
*   Usage of `any` types in `inventoryService.ts` (e.g. `mapProduct`).

## 13. UI/UX Problems
*   `RetailDashboard.tsx` is an 1800+ line monolith, making it difficult to maintain.
*   Forms are inline, state is heavily tangled.

## 14. Build/Test Status
*   Auditing via `npm run lint` and `npm run build` now.

## 15. Exact Files That Must Be Modified
*   `src/components/RetailDashboard.tsx` (Split state and fix broken `fetch` calls).
*   `src/lib/services/inventoryService.ts` (Remove `any` types).
*   Create new services: `notificationService.ts`, `supplierService.ts`, `forecastService.ts`.

## 16. Recommended Implementation Order
1.  **Phase 1**: Resolve build/lint issues and broken endpoints.
2.  **Phase 2**: Refactor `RetailDashboard.tsx` into Zustand state.
3.  **Phase 3**: Implement missing services and remove component mocks.
4.  **Phase 4**: Complete integration of Advanced UI components (Khata, Marketplace, AI) to real DB/Edge layers.
