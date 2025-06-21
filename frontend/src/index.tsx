import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// import './index.css'; // Tailwind CSSをプロジェクトに含める場合

// Chart.js の必要なモジュールを登録
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

root.render(
  // <React.StrictMode> // 一時的にコメントアウト
    <App />
  // </React.StrictMode> // 一時的にコメントアウト
); 
