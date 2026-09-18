# StockSmart AI — UI/UX Audit & Action Plan

## Overview
This document outlines the findings from Phase 0 of the UI/UX improvement pass. The audit compared the existing StockSmart AI React application against the requested design rules and the 5 specific patterns extracted from the Zoho Inventory Android PDF reference.

## Design Rule Violations & Fixes

1. **Surface Colors & Transparency**
   - **Current**: Widespread use of `glass-card`, `bg-indigo-500/5`, opacity-based backgrounds, and gradients.
   - **Fix**: Replace all glassmorphism and tinted backgrounds with solid white (`bg-white`) or near-white (`bg-slate-50`) surfaces.
2. **Border Radius**
   - **Current**: Extensive use of `rounded-2xl` (16px) and `rounded-3xl` (24px).
   - **Fix**: Standardize to 6–8px radius using Tailwind's `rounded-md` (6px) or `rounded-lg` (8px).
3. **Typography**
   - **Current**: Base text is often `text-[10.5px]`, `text-[11px]`, or `text-xs`.
   - **Fix**: Elevate base text to 13–14px (`text-sm`). Apply `tabular-nums` class to all currency and quantity displays.
4. **Shadows vs Borders**
   - **Current**: Heavy reliance on shadows (e.g., `shadow-lg`, `shadow-indigo-500/15`).
   - **Fix**: Replace decorative shadows with clean, structural borders (`border border-slate-200`). Use shadows only for temporary elevated elements (dropdowns, modals).
5. **Badges**
   - **Current**: Color-only status indicators in some places.
   - **Fix**: Ensure all badges include text labels alongside colors.

## PDF Pattern Mapping & Proposed Architecture

Based on the provided PDF reference, here is how we will map the 5 core patterns into our `src/components/ui/` primitives and refactor the screens:

### 1. Grouped Nav Drawer (PDF Pages 35, 38, 42-45)
- **Current State**: `RetailDashboard.tsx` uses a horizontal scrolling list of buttons (`dashboardSection`) which gets cluttered on small screens.
- **Action**: Refactor the main navigation into a grouped, collapsible Sidebar/Drawer (e.g., "Sales", "Inventory", "Reports"). 

### 2. Dashboard Tiles (PDF Pages 1, 2)
- **Current State**: `RetailDashboard.tsx` top section has some alert cards, but lacks simple, structured metric tiles that link to filtered views.
- **Action**: Create a `DashboardTile` primitive (white card, border, 8px radius, icon, count, label) to replace the current alerts section.

### 3. Forms (PDF Pages 14-23)
- **Current State**: `ProductForm.tsx` and other forms use `glass-card`, non-standard inputs, and dense inline layouts.
- **Action**: Implement "Labelled Cards" architecture for forms. Create a collapsible "Advanced Fields" component. Standardize inputs to white background, `border-slate-200`, `rounded-md`, `text-sm`.

### 4. List Screens (PDF Pages 40, 41)
- **Current State**: Tables (e.g., `ProductTable.tsx`) lack standardized filter sheets and clean tabbed headers.
- **Action**: Extract a unified `ListHeader` component with built-in tabs (e.g., "Active | Draft") and a standard Search/Filter bar.

### 5. Empty States (PDF Pages 36, 37, 39, 40)
- **Current State**: Ad-hoc empty messages scattered across components.
- **Action**: Create a global `EmptyState` component featuring:
  - An illustration/icon (using Lucide icons as a substitute for custom graphics).
  - A clear reason ("No Records Found").
  - 1 Primary Action button ("New Item").

## Phased Execution Plan (Ordered by Impact ÷ Risk)

*   **Phase 1: Design Primitives (`src/components/ui/`)**
    *   Build standard UI primitives: `Button`, `Card`, `Input`, `Badge`, `EmptyState`.
    *   Migrate `ProductForm.tsx` as a proof-of-concept.
*   **Phase 2: Core Screens & Navigation**
    *   Refactor `RetailDashboard.tsx` to use the Grouped Nav Drawer pattern.
    *   Update `InventoryDashboard.tsx` and `ProductTable.tsx` to use the new List Screen and Empty State patterns.
    *   Clean up `POSDashboard.tsx` to use solid white surfaces and proper borders.
*   **Phase 3: Intelligence Screens**
    *   Apply UI primitives to `ExpiryDashboard.tsx`, `DemandForecastDashboard.tsx`, `SupplierManagement.tsx`, and `HyperlocalMarketplace.tsx`.
    *   Ensure all "AI" labeling is replaced with deterministic, mathematically accurate descriptions (e.g., "Based on 30-day velocity").
*   **Phase 4: QA & Polish**
    *   Verify responsive layout at 1440px, 768px, and 390px.
    *   Run `npx tsc --noEmit` and `npx vitest run` to ensure zero regressions in the (read-only) services.

## Next Steps
Please review this audit. Once approved, I will begin Phase 1 (creating the UI primitives and migrating `ProductForm.tsx`).
