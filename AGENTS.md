# StockSmart AI — Developer Guidelines & Project Constraints

This document defines the strict boundaries, target personas, and architecture of **StockSmart AI**. Any AI coding session or developer MUST align with these instructions.

---

## 🚫 Critical Alignment Mandate — What This Project Is NOT
* This is **NOT** a stock trading, investment, portfolio tracker, financial advisory, cryptocurrency, or TradingView clone application.
* **DO NOT** add or implement stock market tickers, financial charts, investment mindmaps, or options pricing tools. Any previous code relating to stock symbols or portfolio tracking is a legacy prototype that is being migrated out.

---

## 📦 Official Vision
An AI-powered Hyperlocal Inventory Management, Demand Forecasting, Smart Expiry Management, Dynamic Pricing, and Retail Intelligence Platform.

### Target Users:
* Local shops, Kirana stores, grocery stores, supermarkets, pharmacies, bakeries, dairy shops, convenience stores.

---

## 🏗️ Core Application Architecture
1. **Inventory Management**: Product list, batch tracking, SKUs, and barcode processing.
2. **Smart Expiry Management**: Alerts for near-expiry products, and automated dynamic discount triggers to prevent waste.
3. **AI Demand Forecasting**: Predicting demand cycles using machine learning to assist store managers in reordering.
4. **Hyperlocal Marketplace**: Connecting consumers to nearby shops to buy near-expiry or high-freshness items at a discount.
5. **AI Retail Assistant**: Chat interface for storeowners (managing inventory queries, restock alerts) and customers (finding products, asking for discounts).

---

## ⚙️ Coding Rules & Guardrails
1. **Never Revert to Stock Tickers**: All dashboard metrics must represent retail operations (Total Sales, Expiry Warnings, Active SKUs, Reorder Alerts, Waste Prevented).
2. **Server-Side Security**: Keep all AI orchestrations, database write mutations, and sensitive third-party integrations (like Razorpay) server-side inside `server.ts`.
3. **No Placeholders**: Build real data flows. Utilize LocalStorage or local structures as a stepping stone, but define real PostgreSQL and JSON payloads.
