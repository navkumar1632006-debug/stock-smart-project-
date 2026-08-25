import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { SupplyChainAnalytics } from '../components/SupplyChainAnalytics';

describe('SupplyChainAnalytics', () => {
  it('renders without crashing', () => {
    render(<SupplyChainAnalytics products={[]} batches={[]} salesLogs={[]} />);
  });
});
