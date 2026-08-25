import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    try {
      render(<App />);
      console.log("App rendered successfully");
    } catch (e) {
      console.error("App render failed:", e);
      throw e;
    }
  });
});
