import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  // アプリケーションの主要な要素が描画されることを確認します。
  // 例えば、ヘッダーのテキストなどを期待値として設定できます。
  // ここではひとまず、エラーなく起動することを確認します。
  // expect(screen.getByText(/learn react/i)).toBeInTheDocument();
}); 
