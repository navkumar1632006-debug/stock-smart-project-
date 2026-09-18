# StockSmart AI — Complete UI/UX Improvement Pass Audit

## 0.1 RUN THE APP
*   **Console errors/warnings:** 
    *   `Warning: React does not recognize the 'activeTab' prop on a DOM element.` (in RetailDashboard)
    *   `Warning: Each child in a list should have a unique "key" prop.` (in ProductTable)
*   **Layout breaks:**
    *   1440px: Cards span too wide (`w-full`), making dense lists unreadable.
    *   768px: Horizontal tab list in `RetailDashboard` overflows and hides items. Forms become squished.
    *   390px: Tables (e.g. `ProductTable`) blow out the viewport horizontally. POS layout is difficult to use one-handed.
*   **Missing loading states:** Dashboard sections transition instantly or show blank white areas while data fetches.
*   **Missing empty states:** `HyperlocalMarketplace`, `DigitalKhata`, and `SupplierManagement` show blank screens or generic "No Data" strings without actionable buttons.
*   **Raw technical errors:** Supabase network errors (`FetchError: Failed to fetch`) show as raw text blocks in `RetailDashboard` (`errorMessage` state).
*   **Unreachable/dead elements:** None found in the primary UI, but `SupplyChainIntelligence.tsx` is completely unused.
*   **Supabase-paused failures (Environment):** Fetch calls to `dsshzxopmfxzzihhiopi.supabase.co` will throw network errors. This triggers the fallback state in `useInventory` but sometimes surfaces error messages in the UI.

## 0.2 COMPONENT INVENTORY
*(All files recursively in `src/components/`)*
*   `AccessControlFamily.tsx`: Role management view. Reachable.
*   `AIMorningBriefing.tsx`: Top summary cards. Reachable.
*   `AIRetailAssistant.tsx`: Chat UI. Reachable.
*   `BarcodeScanner.tsx`: Camera scanner modal. Reachable.
*   `DemandForecastDashboard.tsx`: Charts/forecasting. Reachable.
*   `DigitalKhata.tsx`: Customer credit ledger. Reachable.
*   `HardwareSimulators.tsx`: Barcode/printer mock controls. Reachable.
*   `HyperlocalMarketplace.tsx`: Local app mock. Reachable.
*   `LoyaltyManager.tsx`: Point system. Reachable.
*   `NotificationBell.tsx`: Nav dropdown. Reachable.
*   `OnboardingWalkthrough.tsx`: First-time setup. Reachable.
*   `RBACDashboard.tsx`: Access control wrapper. Reachable.
*   `RetailDashboard.tsx`: Main app shell. Reachable.
*   `SalesForecastChart.tsx`: Shared chart primitive. Reachable.
*   `SmartReorderPO.tsx`: Auto-PO generator. Reachable.
*   `StoreSelector.tsx`: Dropdown for stores. Reachable.
*   `SupplierManagement.tsx`: Vendor CRUD. Reachable.
*   `SupplyChainAnalytics.tsx`: Metrics view. Reachable.
*   `SupplyChainIntelligence.tsx`: **[DEAD/UNREACHABLE]** Never imported or rendered.
*   `UserMenu.tsx`: Header user dropdown. Reachable.
*   `expiry/DiscountRecommendationModal.tsx`: Discount action. Reachable.
*   `expiry/ExpiryDashboard.tsx`: FEFO tracking list. Reachable.
*   `inventory/BatchManagement.tsx`: Product batch list. Reachable.
*   `inventory/InventoryDashboard.tsx`: Inventory wrapper. Reachable.
*   `inventory/ProductDetailsDrawer.tsx`: Slide-out details. Reachable.
*   `inventory/ProductForm.tsx`: Product CRUD form. Reachable.
*   `inventory/ProductTable.tsx`: Inventory list. Reachable.
*   `inventory/StockMovementHistory.tsx`: History table. Reachable.
*   `pos/InvoiceHistory.tsx`: List of invoices. Reachable.
*   `pos/InvoiceModal.tsx`: Receipt view. Reachable.
*   `pos/POSDashboard.tsx`: Checkout screen. Reachable.

## 0.3 STYLE AUDIT
*   **Cards (4+ variants):** 
    *   `"glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6"` (Violates radius, uses glass-card).
    *   `"bg-indigo-500/5 border border-indigo-200 rounded-2xl p-6..."`
*   **Buttons (5+ variants):** 
    *   `"flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-200/50 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-semibold uppercase transition-colors shadow-sm"`
    *   `"w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[11px] font-semibold uppercase text-slate-900..."`
*   **Inputs (3+ variants):** 
    *   `"w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800..."`
*   **Badges (3+ variants):** 
    *   `"text-[9px] uppercase font-mono bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold border border-indigo-100"`
*   **Typography:** Widespread use of `text-[10px]`, `text-[10.5px]`, `text-[11px]`. No `tabular-nums` used for currencies.

## 0.4 PDF MAPPING
*   **A. Form architecture:** Map to `ProductForm.tsx`. Add "More fields" accordion for advanced inputs. Split into Labelled cards (Basic Info, Pricing, Inventory).
*   **B. Empty states:** Apply global `EmptyState` component to `InventoryDashboard`, `InvoiceHistory`, `DigitalKhata`, and `SupplierManagement`. Use generic Lucide icons.
*   **C. List screens:** Map to `ProductTable.tsx`, `InvoiceHistory.tsx`, `ExpiryDashboard.tsx`. Introduce a standard `ListHeader` with status tabs and a search bar.
*   **D. Grouped navigation:** Map to `RetailDashboard.tsx`. Replace the scrolling row of `dashboardSection` buttons with a collapsible left-side Drawer.
*   **E. Dashboard tiles:** Map to `RetailDashboard.tsx` (top metrics). Convert the current stacked alerts (`AIMorningBriefing`) into clean numeric tiles that link to filtered views.

## 0.5 PHASED EXECUTION PLAN (Ordered by User Impact ÷ Risk)

1.  **Phase 1 - Design Primitives:** Centralize the messy tailwind strings into standard `src/components/ui/` primitives (Button, Input, Card, Badge, EmptyState). Update `index.css`. Migrate `ProductForm.tsx`.
2.  **Phase 2 - Core Operations:** Implement the Nav Drawer in `RetailDashboard`. Apply the List Screen pattern to `InventoryDashboard`. Standardize `POSDashboard` visuals (strictly adhering to no logic changes).
3.  **Phase 3 - Intelligence & Business:** Migrate `ExpiryDashboard`, `SupplierManagement`, and others to use the new primitives. Ensure deterministic language replaces fake AI terminology.
4.  **Phase 4 - Responsive & Accessibility:** Fix table overflows on mobile. Guarantee contrast and keyboard navigation.
5.  **Phase 5 - QA & Handoff:** Final TypeScript and Vitest validations.
