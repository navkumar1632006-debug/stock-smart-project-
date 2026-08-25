# StockSmart AI — Master Architecture Blueprint & Engineering Guidelines
**Document Version:** 2.4.0-PROD  
**Author:** Chief Technology Officer & Principal Software Architect  
**Classification:** Confidential - Internal Engineering Standards  

---

## 1. Executive Vision

### 1.1 Core Mission
StockSmart AI exists to digitize and empower the estimated 15 million neighborhood retail shops, pharmacy counters, local dairies, and *Kirana* stores across India and expanding emerging economies. By substituting archaic manual ledger tracking with a high-performance, predictive, mobile-first SaaS operating system, StockSmart AI equips small vendors with enterprise-grade retail intelligence.

```
       [Local Suppliers]
               │ (B2B Procurement)
               ▼
    ┌──────────────────────┐
    │    StockSmart AI     │ ◄─── (Predictive Demand Forecasting & FEFO Shelf Expiry)
    │   Retail Engine      │
    └──────────────────────┘
               │ (Hyperlocal Marketplace Sync)
               ▼
      [Nearby Consumers]
```

### 1.2 The System Paradigm
StockSmart AI is not a simple inventory tracker; it is an intelligent, dual-channel neighborhood commerce orchestrator. It bridges the gap between local back-store inventory replenishment (supply-side logistics) and consumer proximity discoverability (demand-side monetization), driving down waste and unlocking higher operating margins for businesses operating on thin unit economics.

---

## 2. Business Rationale & Market Dynamics

### 2.1 The Small Retail Problem Space (The Kirana Challenge)
Small-format retailers in emerging markets operate under severe structural constraints:
* **Manual Inventory Leakage:** Over 70% of inventory records are un-ledgered or loosely written on paper pads, resulting in a 3-5% margin loss due to shrinkage, theft, and misplaced batches.
* **Perishable Spoilage (The Waste Tax):** Lack of dynamic tracking causes perishable categories (Dairy, Bakery, Fruits, Vegetables) to rot on shelves. Retailers absorb 100% of the cost of expired goods, eating up to 25% of their net profit.
* **Capital Lockup (Overstocking vs. Stockouts):** Lacking predictive demand analysis, shopkeepers order intuitively. This leads to dual failures: stockouts of high-velocity items (e.g., Atta, Milk) during weekend spikes, and capital locked up in stagnant inventory.
* **The E-Commerce Disruption:** Giant aggregators and dark-store delivery models are eroding local foot traffic. Without a localized online presence, neighborhood merchants are excluded from digital consumer cycles.

### 2.2 The Strategic Pivot (Fintech Prototype to Retail SaaS)
During early R&D, legacy code focused on fintech paradigms (stock indices, equity portfolios, trading analysis). These modules represented a fundamental misalignment with target user demographics and have been permanently pruned. 
The current **SaaS Retail Operating System** model offers:
* **Immediate Utility:** Shopkeepers cannot afford to trade equities, but they desperately need to prevent 20 liters of milk from spoiling tomorrow.
* **Sticky Unit Economics:** A subscription model based on concrete operational savings (wastage recaptured, stockout reduction) commands higher retention and lower churn than financial trading utility software.
* **Defensible Local Moat:** Capitalizing on localized inventory data places StockSmart AI in a prime position to handle supply chain aggregation, localized credit lines (Book Debt / *Khata* digitizing), and direct-to-consumer hyperlocal delivery routing.

---

## 3. Architectural Invariants

The following rules represent the bedrock of the StockSmart AI platform. They are **non-negotiable** and must be strictly enforced across all pull requests, database refactoring, and AI integrations.

### [INVARIANT-001] Inventory is the Ultimate Source of Truth
* No transaction, sale, purchase, or adjustment may bypass the inventory mutation logs.
* Total available product quantity MUST be equal to the sum of all unexpired, active inventory batches for that product SKU.

### [INVARIANT-002] Hyperlocal Marketplace Mirroring
* Any item listed on the customer-facing hyperlocal marketplace MUST map directly to an active, physical inventory batch in the vendor catalog.
* Real-time stock counts on the marketplace must never exceed physical store quantities. Over-selling is treated as a critical operational failure.

### [INVARIANT-003] Absolute Backend Governance of Business Rules
* The frontend (web, mobile, or POS client) is strictly a presentation and input collection layer.
* Business rules—including GST tax calculations, HSN mapping, dynamic discount curves, and safety buffers—MUST be calculated and validated on the server.

### [INVARIANT-004] Perishable First-Expiry-First-Out (FEFO) Enforcement
* All inventory deductions during checkout MUST follow strict FEFO rules. 
* The system must automatically deduct stock from batches with the closest expiry date first, regardless of when the items were physically shelved or scanned.

### [INVARIANT-005] Decision Support Paradigm (AI as Copilot, Not Driver)
* AI engines (Gemini) are advisory. AI may suggest dynamic discounts, identify overstocking, or draft reorder bills, but it **MUST NEVER** execute inventory write mutations, change product catalog pricing, or initiate supplier orders without explicit merchant approval.

### [INVARIANT-006] Immutable Transaction Auditing
* Once a sale or purchase record is locked, it cannot be edited, deleted, or re-ordered. 
* Corrections to stock or cash balances must be handled via explicit compensatory adjustments (credit notes, returns, or spoilage logs) with designated reason codes.

### [INVARIANT-007] Complete Exclusion of Financial Securities
* No code relating to stock exchange tickers, equity shares, cryptocurrency, derivatives, portfolio beta tracking, or investment banking may enter the codebase. The word "Stock" in this repository strictly and exclusively means **physical shelf inventory**.

---

## 4. Non-Goals

To maintain focus and prevent scope creep, the following areas are explicitly declared out-of-scope for the StockSmart AI core engineering team:

1. **Equities & Cryptocurrencies:** No interfaces or integrations with stock markets (NSE/BSE), commodity trading systems, or decentralized finance networks.
2. **Heavy Enterprise ERP:** We do not target Fortune 500 supply chains, multi-national logistics operations, or high-complexity manufacturing workflows. The application is tuned for local, small-to-medium retail profiles.
3. **General-Purpose Accounting:** We are not building a replacement for double-entry desktop accounting suites. While we calculate tax rates, margins, and cost sheets, we do not handle tax filings, general ledgers, or capital asset depreciation.
4. **Autonomous Robotics:** Computer vision shelf monitoring and autonomous drone dispatching are out of scope. We rely on standard barcode scanning and manual inventory logging.

---

## 5. Engineering Principles

Future contributors must align their implementations with these core guidelines:

* **API-First Architecture:** Every frontend action must call a versioned REST or WebSocket endpoint. Frontends cannot perform direct database queries or bypass API validations.
* **Domain-Driven Design (DDD):** Organize code into logical domains: `/inventory`, `/sales`, `/forecasting`, `/marketplace`, `/assistant`. Avoid blurring boundaries between supplier purchase logic and end-customer checkout rules.
* **Type Safety Over Speed:** TypeScript is mandatory. The compiler flag `noImplicitAny` must remain enabled. No files should bypass typing via lazy `any` declarations.
* **Modular AI Components:** The AI service layer (Gemini SDK) must be encapsulated. The rest of the application should communicate with an abstraction layer, facilitating model swaps (e.g., Flash to Pro) or local LLM execution without rewriting controller routes.
* **Database Migrations Only:** No raw DDL SQL may be executed directly in production environments. All changes to tables, indices, triggers, or Row-Level Security (RLS) rules must go through Drizzle/Supabase migration files.

---

## 6. AI Architecture & Prompt Engineering Principles

```
  ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
  │  Client Chat / POS   │ ───► │  Server-Side Proxy   │ ───► │  Gemini Model API   │
  │  (No API keys visible)│      │  (System prompt inject│      │  (Context isolated)  │
  └──────────────────────┘      │  & real-time state)  │      └──────────────────────┘
                                └──────────────────────┘
```

1. **Server-Side Encapsulation:** All AI model interactions must happen on the backend server. No browser client is permitted to load the Gemini API key or interact directly with Gemini endpoints.
2. **Context-Enriched Prompts:** Prompts sent to Gemini must consist of three parts:
   * **System Role Definition:** Framing the assistant as a localized retail copilot.
   * **Real-time Context Snapshot:** Dynamically injecting the store's low-stock list, near-expiry batches, and sales statistics.
   * **User Query:** The specific command sent by the merchant.
3. **Graceful Failure Degradation:** If the Gemini API experiences an outage, high latency, or rate-limiting (HTTP 429), the application must degrade gracefully. The chat interfaces should fall back to standard rule-based alerts, and core checkout/inventory operations must proceed completely unaffected.
4. **Deterministic Math:** Do not use the AI engine to perform core arithmetic calculations (e.g., calculating GST, totaling sales invoices, or adjusting inventory counts). Use standard, robust Node.js logic for calculations, and use the LLM solely for qualitative analysis and natural language interactions.

---

## 7. System Design Philosophy

* **Backend-Centric Logic:** Business logic belongs on the server. If a pricing algorithm changes, it should require only a server-side deploy, never a client-side app-store update.
* **Stateless API Routes:** Server endpoints must be completely stateless. Use Redis or memory caches for session management to support horizontal scale-out of backend containers.
* **Predictive Intelligence:** AI is utilized where traditional database queries fail. Rather than simple historic averages, we run weighted multi-model regression to predict demand spikes and dips.

---

## 8. Future Engineering Direction & Roadmap

```
  Phase 1 [Active] ───► Phase 2 ──────────────► Phase 3 ────────────────► Phase 4 ───────────────► Phase 5
  Production Readiness  Retail Intelligence    Marketplace Expansion     Enterprise Scaling       AI OS
  (Local State/Node)    (Supabase DB/Sync)     (Merchant-to-Consumer)    (Multi-Branch Support)   (Autonomous POS)
```

### Phase 1: Production Readiness & Basic Automation (Current State)
* Focus on robust local storage fallback, modular React components, and unified Node.js/Express server operations.
* Realize core inventory cataloging, FEFO batch expiry alerts, sales simulation, and the AI Retail Copilot with local context injection.

### Phase 2: Relational Cloud Database & Real-Time Sync
* Move from in-memory state arrays to a persistent, highly scalable database (Supabase PostgreSQL).
* Configure Row-Level Security (RLS) to enforce absolute isolation between competing merchants (multi-tenancy).
* Set up database triggers to auto-update product `stockLevel` whenever a batch transaction or sale occurs.

### Phase 3: Marketplace Expansion & Customer Discovery
* Implement customer geolocation-based queries.
* Set up a consumer mobile interface where nearby shoppers can browse discounted near-expiry batches, place orders, and coordinate delivery.
* Integrate SMS/WhatsApp notification triggers for local order fulfillment.

### Phase 4: Enterprise Multi-Store & Role-Based Access (RBAC)
* Introduce multi-branch management where a vendor can track stock across multiple physical locations.
* Implement RBAC: Owner (full read/write/settings), Cashier (sales logs only), Inventory Clerk (batch entries and receiving shipments).

### Phase 5: Autonomous Store Operations
* Implement computer-vision-assisted shelf monitoring.
* Automated B2B purchase order generation: the system automatically negotiates and issues restock orders to local distributors based on AI demand cycles.

---

## 9. Platform Success Metrics (Engineering KPIs)

To maintain world-class standards, our engineering teams measure and optimize for these exact operational targets:

| Success Metric | Target SLA / KPI | Measurement Method |
| :--- | :--- | :--- |
| **Inventory Accuracy** | `100.0%` alignment | Daily POS count audits vs database records |
| **Demand Forecast Accuracy** | `≥ 88.5%` confidence | Mean Absolute Percentage Error (MAPE) of predictions |
| **API Latency (P95)** | `≤ 120ms` | APM instrumentation logs (Cloud Run metrics) |
| **Marketplace Sync Delay** | `≤ 1.5 seconds` | Time from vendor shelf change to consumer screen update |
| **DB Query Performance** | `≤ 15ms` for indexes | PostgreSQL slow-query log monitoring |
| **Spoilage Spoil Rate Reduction** | `↓ 40%` average reduction | Vendor historic waste log audits |
| **AI Copilot Acceptance Rate**| `≥ 75%` suggestion adoption | Click-through telemetry on AI suggested restock drafts |

---

## 10. Security & Threat Modeling

1. **Tenant Isolation:** Under multi-tenancy, every database query must explicitly filter by `tenant_id`. No cross-tenant reads or writes are permitted.
2. **Rate Limiting:** Protect server endpoints against script exploits and denial-of-service attempts. All `/api/*` endpoints must enforce a strict rate limit (e.g., maximum 100 requests per 15 minutes per IP address).
3. **OWASP Compliance:** Sanitization of all inputs is mandatory. Express routes must utilize `helmet` middleware to set headers preventing XSS, clickjacking, and mime-type sniffing.
4. **Least Privilege Credentials:** API keys (Gemini, Supabase, Payment Gateways) must be stored securely using environment secrets management, never checked into git, and accessed with restricted read-only permissions where applicable.

---

## 11. Scalability & Caching Strategy

* **Read Heavy / Write Sparse:** Retailers check inventory lists and consumers query marketplace items constantly. Write actions (sales checkout, restock) are periodic. 
* **Layered Cache:** Implement Redis to cache near-static master datasets (e.g., GST rates, product category templates, and HSN catalog listings) with a sliding TTL.
* **Horizontal Scaling:** Design backend Express containers to be completely stateless, allowing frictionless horizontal scaling across container orchestration systems (Cloud Run, Kubernetes) during high-velocity holiday retail seasons.

---

## 12. Testing & Quality Assurance Standards

```
  [Unit Tests]            ───► Verify pure logic (GST math, discount curves, date offsets).
  [FEFO Workflow Tests]   ───► Ensure closest expiry date batches are consumed first.
  [AI Fallback Tests]     ───► Force API mock failures; verify operational continuity.
  [E2E Core Journeys]     ───► Simulate product registry, inventory restock, POS checkouts.
```

* **No Code Un-Tested:** All critical helper functions (such as `calculateDynamicDiscount` and `getDaysToExpiry`) must achieve 100% unit test coverage.
* **Deterministic Mocking:** For integration tests, mock external HTTP dependencies (such as Gemini model responses) to guarantee reliable, repeatable, and fast pipeline builds.

---

## 13. Documentation Standards for New Features

Every subsequent feature pull request (PR) must document its impact on the following layers:

1. **SaaS Business Purpose:** What real-world shopkeeper problem does this solve?
2. **Data Layer Modification:** Are we adding database columns, tables, or indexes?
3. **API Contracts:** Define exact payload shapes, headers, and status codes.
4. **Security Analysis:** Does this interface with user data? Detail RLS compliance.
5. **AI Prompt Impact:** Does this alter context-injection prompt templates?

---

## 14. Code Review Checklist

Before any PR can be merged into the production branch, the reviewer must check off:

* [ ] **No Fintech Leftovers:** Does this PR contain any references to stock tickers, equities, trading charts, or portfolio assets? (Must be strictly blocked if true).
* [ ] **Invariants Unbroken:** Does the implementation respect the inventory source-of-truth and FEFO invariants?
* [ ] **TypeScript Rigor:** Are there any typed variables bypassing checking using the `any` or `ts-ignore` labels?
* [ ] **Error Safety:** Are network or database calls wrapped in robust try-catch blocks with explicit user-friendly fallback notifications?
* [ ] **Linter and Compiler Green:** Does the build succeed with no linter warnings?

---

## 15. Future Contributor Onboarding Guide

Welcome to StockSmart AI! As you begin your journey with our team, remember:

* **Empathize with the Shopkeeper:** We do not build technology for technology's sake. If a feature is too complex for a busy shopkeeper operating a crowded cash register under high pressure, it is not ready. Keep interfaces immediate, simple, highly accessible, and visually clean.
* **Keep Code Modular:** When adding new modules, write them as self-contained sub-folders. Place utility scripts in `/src/lib` and data structures in `/src/types/retail.ts`.
* **Protect the Future:** Every line of code should be clean, well-typed, and documented. Build StockSmart AI not just as an application, but as the enduring digital backbone of neighborhood commerce.
