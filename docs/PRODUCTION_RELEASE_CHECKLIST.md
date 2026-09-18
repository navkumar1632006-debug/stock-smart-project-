# StockSmart AI — Production Release Checklist & Operations Manual

This document outlines the mandatory release checklist, database backup/recovery strategies, deployment procedures, and post-deployment smoke tests for **StockSmart AI**.

---

## 📋 1. Pre-Deployment Configuration Checklist

### Environment Variables
- [ ] `VITE_SUPABASE_URL`: Verified pointing to remote project `dsshzxopmfxzzihhiopi.supabase.co`.
- [ ] `VITE_SUPABASE_ANON_KEY`: Public anonymous key configured (Zero `SERVICE_ROLE` keys exposed).
- [ ] `APP_URL`: Production domain configured (e.g. `https://stocksmart.example.com`).
- [ ] `PORT`: Environment port set (default `3000`).
- [ ] `NODE_ENV`: Set to `production`.

### Build & Code Verification
- [ ] TypeScript check: `npx tsc --noEmit` passes with 0 errors.
- [ ] Vitest suite: `npm test` passes all unit tests.
- [ ] Security audit: `npm audit` returns 0 vulnerabilities.
- [ ] Vite build: `npm run build` succeeds and generates `dist/` and `dist/server.cjs`.

---

## 🗄️ 2. Supabase Database & Security Verification

### Database Migration & Schema
- [ ] `supabase/migrations/20260831000000_phase17_rbac.sql` applied to remote project.
- [ ] Table `public.store_staff` exists with constraints (`UNIQUE(store_id, user_id)`).
- [ ] RPC `public.has_store_role(uuid, text[])` configured (`SECURITY DEFINER`, `SET search_path = public`).
- [ ] RPC `public.invite_staff_by_email(text, text, uuid)` configured (`SECURITY DEFINER`, `SET search_path = public`).

### Row-Level Security (RLS)
- [ ] RLS enabled on `stores`, `products`, `batches`, `sales`, `invoices`, `forecasts`, `suppliers`, `store_staff`.
- [ ] Anonymous write operations rejected by PostgreSQL policies (`42501`).
- [ ] Multi-tenant isolation verified (Stores cannot access data across tenant boundaries).

---

## 🚀 3. Production Deployment Guide

### Node.js Server Deployment (Render / Railway / Fly.io)
1. **Build Command**:
   ```bash
   npm run build
   ```
2. **Start Command**:
   ```bash
   npm start
   ```
3. **Health Check Endpoint**:
   `GET /api/health` (HTTP 200)
4. **Readiness Check Endpoint**:
   `GET /api/ready` (HTTP 200)

---

## 💾 4. Backup, Recovery & Rollback Strategy

### Database Backups (Supabase)
- **Point-in-Time Recovery (PITR)** enabled on Supabase Pro/Enterprise tier.
- **Manual Logical Backups**:
  ```bash
  npx supabase db dump --project-ref dsshzxopmfxzzihhiopi -f backups/backup_$(date +%Y%m%d).sql
  ```

### Rollback Procedure
1. Revert application build to target release commit: `git checkout <previous_release_tag>`.
2. Execute reverse migration SQL or restore Supabase database snapshot via Dashboard.
3. Restart production server process (`npm start`).

---

## 🧪 5. Post-Deployment Smoke Tests

- [ ] Ping `GET /api/health` -> HTTP 200 (`{"status":"ok"}`).
- [ ] Ping `GET /api/ready` -> HTTP 200 (`{"ready":true}`).
- [ ] Test owner authentication login & store switching.
- [ ] Test POS checkout workflow and verify stock deduction via FEFO.
- [ ] Verify staff invitation via `public.invite_staff_by_email` RPC.
- [ ] Verify non-owner role restrictions (Cashier blocked from RBAC administration).
