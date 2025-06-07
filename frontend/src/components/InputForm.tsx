import React from 'react';
// import { SimulationInputData } from '../App'; // App.tsxからインポート
import { SimulationInputData } from '../types'; // ★ インポート元を types.ts に変更

interface InputFieldProps {
  label: string;
  type: string;
  name: keyof SimulationInputData | 'planName'; // nameをSimulationInputDataのキーまたはplanNameに
  value: string | number | ''; // planName は string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  unit?: string;
  min?: string;
  step?: string;
  max?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, type, name, value, onChange, placeholder, unit, min, step, max, required }) => (
  <div className="mb-4">
    <label htmlFor={name as string} className="block text-sm font-medium text-slate-700 mb-1">{label}:</label>
    <div className="flex items-center">
      <input
        type={type}
        id={name as string}
        name={name as string}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        max={max}
        required={required}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
      />
      {unit && <span className="ml-2 text-slate-600">{unit}</span>}
    </div>
  </div>
);

interface InputFormProps {
  input: SimulationInputData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onSave: () => void;
  loading: boolean;
  planName: string;
  onPlanNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputForm: React.FC<InputFormProps> = ({ input, onInputChange, onSubmit, onSave, loading, planName, onPlanNameChange, onExport, onImport }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-8">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 border-b pb-2">入力情報</h2>
      
      <InputField 
        label="プラン名"
        type="text"
        name="planName"
        value={planName} 
        onChange={onPlanNameChange} 
        placeholder="例: 基本プラン"
        required 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="現在の年齢" type="number" name="currentAge" value={input.currentAge} onChange={onInputChange} unit="歳" min="0" />
        <InputField label="リタイア目標年齢" type="number" name="retirementAge" value={input.retirementAge} onChange={onInputChange} unit="歳" min="0" />
        <InputField label="年金受給開始年齢" type="number" name="pensionStartDate" value={input.pensionStartDate} onChange={onInputChange} unit="歳" min={(input.retirementAge || 0).toString()} max={(input.lifeExpectancy || 120).toString()} />
        <InputField label="寿命 (何歳まで計算するか)" type="number" name="lifeExpectancy" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" min={(input.pensionStartDate || 0).toString()} />
        <InputField label="現在の貯蓄額" type="number" name="currentSavings" value={input.currentSavings} onChange={onInputChange} unit="円" min="0" step="10000" />
        <InputField label="年間手取り収入 (現役時)" type="number" name="annualIncome" value={input.annualIncome} onChange={onInputChange} unit="円" min="0" step="10000" />
        <InputField label="年間年金受給額 (リタイア後)" type="number" name="pensionAmountPerYear" value={input.pensionAmountPerYear} onChange={onInputChange} unit="円" min="0" step="10000" />
        <InputField label="退職金 (一時金)" type="number" name="severancePay" value={input.severancePay} onChange={onInputChange} unit="円" min="0" step="10000" />
        <InputField label="月間支出額 (合計目安)" type="number" name="monthlyExpenses" value={input.monthlyExpenses} onChange={onInputChange} unit="円" min="0" step="1000" />
        <InputField label="金融資産の割合" type="number" name="investmentRatio" value={input.investmentRatio} onChange={onInputChange} unit="%" min="0" max="100" placeholder="0-100" />
        <InputField label="年間運用利回り (税引後)" type="number" name="annualReturn" value={input.annualReturn} onChange={onInputChange} unit="%" min="0" step="0.1" placeholder="例: 3.0" />
      </div>
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
        >
          {loading ? '計算中...' : 'シミュレーション実行'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="w-full sm:w-auto flex-1 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
        >
          {loading ? '保存中...' : '入力内容を保存'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-4 pt-4 border-t border-slate-200">
        <label className="w-full sm:w-auto flex-1 cursor-pointer px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150 text-center">
          インポート (CSV)
          <input type="file" accept=".csv" onChange={onImport} className="hidden" />
        </label>
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          className="w-full sm:w-auto flex-1 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
        >
          エクスポート (CSV)
        </button>
      </div>
    </form>
  );
};

export default InputForm; 
