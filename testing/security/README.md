# StockSmart AI — Security Testing & SAST Auditing

Comprehensive security analysis, dependency vulnerability scanning, secret detection, and database Row Level Security (RLS) verification suite.

## Security Checks
- **Secret Scanning:** Deep-scan of all repository files to ensure zero private keys, API keys, or leaked credentials.
- **Static Code Analysis (SAST):** AST pattern matching for insecure JavaScript/TypeScript idioms (`eval`, `dangerouslySetInnerHTML`, wildcard CORS).
- **Database RLS & Stored Procedures:** Auditing PostgreSQL migrations for table-level RLS, privilege revocations, and `SECURITY DEFINER` search-path isolation.
- **npm Dependency Audit:** Real-time dependency vulnerability tracking.

## Running Locally
```bash
cd testing/security

# Install dependencies
npm install

# Run complete security review
node run_security_audit.js
```

## Generated Reports
Outputs in `reports/`:
- `reports/Web_Security_Report.xlsx` (4 worksheets: Executive Summary, Dependency Vulnerabilities, Static Analysis Findings, OWASP Top 10 Mapping)
- `reports/Backend_Security_Report.xlsx` (3 worksheets: Executive Summary, Supabase RLS Review, Secret Scanning Audit)
- `reports/Security_Executive_Summary.md`
