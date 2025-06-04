import React from 'react';
import { Chart } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { AssetDataPoint } from '../types';

// ChartJS.register は index.tsx で呼び出されている想定

interface AssetChartProps {
    assetData: AssetDataPoint[];
}

const AssetChart: React.FC<AssetChartProps> = ({ assetData }) => {

    if (!assetData || assetData.length === 0) {
        return <p className="text-center text-slate-500">グラフを表示するためのデータがありません。</p>;
    }

    // assetData を使用して動的にデータを生成
    const data: ChartData<'line'> = {
        labels: assetData.map(d => d.age.toString()), // X軸: 年齢
        datasets: [
            {
                label: '予測総資産額 (円)', // ラベルを元に戻す
                data: assetData.map(d => d.savings), // Y軸: 貯蓄額
                borderColor: 'rgb(54, 162, 235)', // 元の色に戻す
                backgroundColor: 'rgba(54, 162, 235, 0.5)', // 元の色に戻す
                tension: 0.1, // 元のtensionに戻す
                fill: true, // 元のfill設定に戻す
            }
        ]
    };

    // options を元の設定に戻す
    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false, 
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: '年齢別 資産推移グラフ', // タイトルを元に戻す
                font: {
                    size: 18,
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        if (typeof value === 'number') {
                            return (value / 10000).toLocaleString() + '万円';
                        }
                        return value;
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: '年齢 (歳)'
                }
            }
        }
    };

    console.log("Rendering AssetChart with dynamic data and full options.");

    return (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-2xl font-semibold text-sky-700 mb-4 border-b pb-2">資産推移グラフ</h2>
            <div style={{ height: '400px' }}>
                <Chart type='line' options={options} data={data} />
            </div>
        </div>
    );
};

export default AssetChart; 
