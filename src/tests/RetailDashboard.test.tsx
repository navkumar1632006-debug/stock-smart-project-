import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetailDashboard } from '../components/RetailDashboard';

// Mock recharts to avoid rendering issues in jsdom/happy-dom
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts as any,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container">{children}</div>
    ),
  };
});

// Mock fetch globally
global.fetch = vi.fn();

describe('RetailDashboard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/inventory/alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ count: 0, alerts: [] }) });
      }
      if (url.includes('/api/inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/batches')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/sales')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/forecast')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('renders loading state initially', async () => {
    render(<RetailDashboard />);
    // There might be a loading state like 'Synthesizing catalog indexes...'
    expect(screen.getAllByText(/Synthesizing catalog indexes/i)[0]).toBeInTheDocument();
  });

  it('renders dashboard sections after loading', async () => {
    render(<RetailDashboard />);
    await waitFor(() => {
      // The "Active Inventory Catalogue" header should appear once loaded
      expect(screen.getByText(/Active Inventory Catalogue/i)).toBeInTheDocument();
    });
  });

  it('contains main navigation buttons', async () => {
    render(<RetailDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/SKU Catalog & Restocking/i)).toBeInTheDocument();
      expect(screen.getByText(/Digital Khata Ledger/i)).toBeInTheDocument();
    });
  });
});
