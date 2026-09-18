# StockSmart AI — Complete UI/UX Improvement Pass Audit

## 0.1 RUN THE APP (/browse procedure)
**Notice:** I cannot actually open a browser or run the dev server visually in this environment. All UI layout, console error, and visual observations listed below are unverified — static analysis only. 

*   **Console errors/warnings (Static Inference):** Likely React key warnings in mapped lists. Because the Supabase project is currently paused, network fetch errors will populate the console and UI.
*   **Layout breaks (Static Inference):**
    *   **1440px**: Cards with `w-full` will stretch too wide, reducing readability on large screens.
    *   **768px**: Horizontal scroll rows (like `dashboardSection` nav buttons in `RetailDashboard.tsx`) will overflow and clip.
    *   **390px**: Dense tables (e.g., `ProductTable.tsx`) will break viewport boundaries, forcing messy horizontal scrolling.
*   **Missing loading states:** Many components rely on generic full-screen spinners or nothing at all rather than localized inline skeletons while fetching data.
*   **Missing empty states:** Many tables and lists lack structured empty states when data is missing or fetching fails.
*   **Raw technical errors:** Supabase connection failures may throw raw string dumps if caught in generic error boundaries instead of user-friendly alerts.
*   **Unreachable/dead elements:** `SupplyChainIntelligence.tsx` is completely unreferenced and unreachable anywhere in the codebase.

## 0.2 COMPONENT INVENTORY
*(All files recursively under `src/components/`)*
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
*   **`SupplyChainIntelligence.tsx`: [DEAD/UNREACHABLE] Never imported or rendered.**
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
I audited the actual Tailwind class strings in use. There is massive inconsistency and frequent violations of the design direction:

*   **Cards (Conflicting multiple variants):**
    *   `"glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6"` (Violates radius constraints, uses banned glassmorphism).
    *   `"bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between"` (Duplicate conflicting classes).
*   **Buttons:**
    *   `"flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-200/50 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-semibold uppercase transition-colors shadow-sm"` (Tiny text size violation).
    *   `"w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[11px] font-semibold uppercase text-slate-900 tracking-wider flex items-center justify-center space-x-1.5 transition disabled:opacity-50"`
*   **Inputs:**
    *   `"w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"`
*   **Badges:**
    *   `"text-[9px] uppercase font-mono bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold border border-indigo-100"`
*   **Typography:** Pervasive use of `text-[9px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]`. No `tabular-nums` used for currencies.

## 0.4 PDF MAPPING
*   **A. Form architecture:** Maps to `ProductForm.tsx`. Add "More fields" accordion for rarely-used inputs. Split into Labelled cards (Basic Info, Pricing, Inventory).
*   **B. Empty states:** Map to `InventoryDashboard.tsx`, `InvoiceHistory.tsx`, `DigitalKhata.tsx`, and `SupplierManagement.tsx`. Introduce a generic EmptyState component with Lucide icons.
*   **C. List screens:** Maps to `ProductTable.tsx`, `InvoiceHistory.tsx`, `ExpiryDashboard.tsx`. Introduce a standard `ListHeader` with status tabs and a search bar.
*   **D. Grouped navigation:** Maps to `RetailDashboard.tsx`. Replace the scrolling row of `dashboardSection` buttons with a collapsible left-side Drawer.
*   **E. Dashboard tiles:** Maps to `RetailDashboard.tsx` (top metrics). Convert the current stacked alerts (`AIMorningBriefing`) into clean numeric tiles that link to filtered views.

## 0.5 PHASED EXECUTION PLAN (Ordered by User Impact ÷ Risk)

1.  **Phase 1 - Design Primitives:** Centralize the messy tailwind strings into standard `src/components/ui/` primitives (Button, Input, Select, Textarea, Card, Badge, Table, Modal, Tabs, EmptyState, Skeleton, PageHeader, Toast). Update `index.css`. Migrate `ProductList`/`ProductTable` as a proof-of-concept.
2.  **Phase 2 - Core Operations:** Implement the Nav Drawer & Tiles in Dashboard. Update Inventory. Migrate Product Form. Standardize `POSDashboard` visuals (without changing logical flow).
3.  **Phase 3 - Intelligence & Business:** Migrate Expiry, Demand Forecasting, Stock Alerts, Suppliers, Marketplace, Notifications, Settings, and Invoices. Replace fake intelligence language with deterministic math descriptions.
4.  **Phase 4 - Responsive & Accessibility:** Fix table overflows on mobile. Guarantee contrast and keyboard navigation.
5.  **Phase 5 - QA & Handoff:** Final TypeScript and Vitest validations.
