import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';

// firebase.ts をモック化
vi.mock('./services/firebase.ts', () => ({
  auth: {
    onAuthStateChanged: vi.fn(() => vi.fn()),
  },
  db: {},
}));

test('renders app component', () => {
  render(<App />);
  // アプリケーションがクラッシュせずにレンダリングされることを確認
}); 
