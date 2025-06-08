import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, LineController, BarController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { SimulationResult } from '../types';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FaChartBar } from 'react-icons/fa';
import Icon from './Icon';

ChartJS.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface AssetChartProps {
  assetData: SimulationResult[];
  retirementAge: number;
  lifeExpectancy: number;
}

const AssetChart: React.FC<AssetChartProps> = ({ assetData, retirementAge, lifeExpectancy }) => {
    if (!assetData || assetData.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p>シミュレーション結果がありません。</p>
            </div>
        );
    }
    
    const labels = assetData.map(d => `${d.age}歳`);
    const savingsData = assetData.map(d => d.savings / 10000); // 万円単位に

    const data = {
        labels,
        datasets: [
            {
                type: 'line' as const,
                label: '資産残高（万円）',
                data: savingsData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                yAxisID: 'y',
                pointRadius: 2,
                pointHitRadius: 10,
                tension: 0.1,
            },
            {
                type: 'bar' as const,
                label: '年間収支（万円）',
                data: assetData.map(d => d.balance / 10000), // 万円単位に
                backgroundColor: (context: any) => {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 0 ? 'rgba(74, 222, 128, 0.5)' : 'rgba(239, 68, 68, 0.5)';
                },
                borderColor: (context: any) => {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 0 ? 'rgba(74, 222, 128, 1)' : 'rgba(239, 68, 68, 1)';
                },
                borderWidth: 1,
                yAxisID: 'y1',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0 }).format(context.parsed.y) + '万円';
                        }
                        return label;
                    }
                }
            },
            datalabels: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false
                }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: '資産残高（万円）',
                },
                grid: {
                    drawOnChartArea: true,
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: {
                    display: true,
                    text: '年間収支（万円）',
                },
                grid: {
                    drawOnChartArea: false, // メインのグリッドとかぶらないように
                },
            },
        },
        // イベントの線を引くためのannotationプラグインの設定
        // retirementAgeとlifeExpectancyを元に線を引く
    };

    return (
        <div className="p-6 rounded-lg shadow-md bg-white">
             <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <Icon as={FaChartBar} className="mr-2 text-sky-600" />
                資産推移グラフ
            </h3>
            <div style={{ height: '400px' }}>
                <Chart type='bar' data={data} options={options} />
            </div>
        </div>
    );
};

export default AssetChart; 
