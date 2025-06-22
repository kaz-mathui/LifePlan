import React from 'react';
import { SimulationResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface AssetChartProps {
  assetData: SimulationResult[];
  retirementAge: number;
}

const formatYAxis = (tickItem: number) => {
  if (tickItem === 0) return '0';
  return `${tickItem / 10000}億円`;
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white p-3 rounded-lg shadow-lg border border-slate-200">
        <p className="label font-bold text-lg">{`${label}歳`}</p>
        <p className="intro text-slate-700">{`資産残高: ${(payload[0].value as number).toLocaleString()} 万円`}</p>
      </div>
    );
  }
  return null;
};

const AssetChart: React.FC<AssetChartProps> = ({ assetData, retirementAge }) => {

  const uniqueTicks = Array.from(new Set([
    assetData[0]?.age, 
    retirementAge, 
    ...assetData.filter(d => d.age % 10 === 0).map(d => d.age),
    assetData[assetData.length - 1]?.age
  ].filter(age => age !== undefined).sort((a,b) => a-b))) as number[];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">資産推移</h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={assetData.map(d => ({ ...d, savings: d.savings / 10000 }))}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="age" 
            label={{ value: '年齢', position: 'insideBottom', offset: -10 }} 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            ticks={uniqueTicks}
          />
          <YAxis 
            tickFormatter={formatYAxis} 
            label={{ value: '資産額', angle: -90, position: 'insideLeft', offset: -5 }} 
            tick={{ fontSize: 12 }}
            width={80}
            domain={['dataMin', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36}/>
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          <ReferenceLine x={retirementAge} stroke="red" strokeDasharray="3 3" label={{ value: "リタイア", position: "insideTopRight", fill: "red" }}/>

          <defs>
            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <Area type="monotone" dataKey="savings" name="資産残高" stroke="#8884d8" fill="url(#colorSavings)" strokeWidth={2} dot={false} activeDot={{ r: 6 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AssetChart; 
