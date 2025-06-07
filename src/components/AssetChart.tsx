import React, { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
// ... existing code ...
const AssetChart: React.FC<AssetChartProps> = ({ data }) => {
  const chartRef = useRef<Chart<'line'>>(null);

  useEffect(() => {
    // 画面サイズ変更などでチャートが再描画されるときに既存のインスタンスを破棄
    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  if (!data || data.length === 0) {
    return (
// ... existing code ...

</rewritten_file> 
