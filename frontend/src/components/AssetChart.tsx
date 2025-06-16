import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, LineController, BarController, ChartOptions, Scale } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { SimulationResult } from '../types';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin, { AnnotationOptions } from 'chartjs-plugin-annotation';
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
  ChartDataLabels,
  annotationPlugin
);

interface AssetChartProps {
  assetData: SimulationResult[];
  retirementAge: number;
  lifeExpectancy: number;
}

const AssetChart: React.FC<AssetChartProps> = ({ assetData, retirementAge, lifeExpectancy }) => {
    const [tickStep, setTickStep] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) { // sm
                setTickStep(5);
            } else if (width < 1024) { // lg
                setTickStep(2);
            } else {
                setTickStep(1);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // 初期ロード時にも実行

        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                order: 0,
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
                order: 1,
            },
        ],
    };

    const retirementAgeIndex = assetData.findIndex(d => d.age === retirementAge);

    const retirementLineAnnotation: AnnotationOptions = {
        type: 'line',
        xMin: retirementAgeIndex,
        xMax: retirementAgeIndex,
        borderColor: 'rgb(234, 179, 8)',
        borderWidth: 2,
        label: {
            content: 'リタイア',
            display: true,
            position: 'start',
            backgroundColor: 'rgba(234, 179, 8, 0.8)',
            color: 'white',
            font: {
                size: 10,
            }
        }
    };

    const options: ChartOptions<'bar' | 'line'> = {
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
                            label += Math.round(context.parsed.y).toLocaleString() + '万円';
                        }
                        return label;
                    }
                }
            },
            datalabels: {
                display: false,
            },
            annotation: {
                annotations: {
                    retirementLine: retirementLineAnnotation
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    callback: function(this: Scale, val: number | string, index: number) {
                        return index % tickStep === 0 ? labels[index] : null;
                    },
                    autoSkip: false,
                    maxRotation: 0,
                    minRotation: 0,
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
                    drawOnChartArea: false, 
                },
            },
        },
    };

    return (
        <div className="p-6 rounded-lg shadow-md bg-white">
             <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <Icon as={FaChartBar} className="mr-2 text-sky-600" />
                資産推移グラフ
            </h3>
            <div style={{ height: '400px', width: '100%' }}>
                <Chart type='bar' data={data} options={options} />
            </div>
        </div>
    );
};

export default AssetChart; 
