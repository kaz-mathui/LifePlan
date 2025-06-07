import React, { useState, ReactNode } from 'react';
// import { SimulationInputData } from '../App'; // App.tsxからインポート
import { SimulationInputData } from '../types'; // ★ インポート元を types.ts に変更
import { FaUser, FaMoneyBillWave, FaShoppingCart, FaChartLine, FaChevronDown, FaChevronUp, FaFileImport, FaFileExport, FaSave, FaCalculator } from 'react-icons/fa';
import Icon from './Icon'; // ★ Iconコンポーネントをインポート

// --- 新しいコンポーネント定義 ---

// 1. 開閉可能なセクションコンポーネント
interface FormSectionProps {
  title: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="border border-slate-200 rounded-lg mb-4 transition-all duration-300">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
    >
      <div className="flex items-center">
        <span className="text-sky-600 mr-3 text-xl">{icon}</span>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {isOpen ? <Icon as={FaChevronUp} className="text-slate-500" /> : <Icon as={FaChevronDown} className="text-slate-500" />}
    </button>
    {isOpen && (
      <div className="p-4 md:p-6 bg-white rounded-b-lg">
        {children}
      </div>
    )}
  </div>
);

// 2. 新しい入力フィールドコンポーネント
interface InputFieldProps {
  label: string;
  helperText?: string;
  type: string;
  name: keyof SimulationInputData | 'planName';
  value: string | number | '';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  unit?: string;
  min?: string;
  step?: string;
  max?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, helperText, type, name, value, onChange, placeholder, unit, min, step, max, required }) => (
  <div className="mb-6">
    <label htmlFor={name as string} className="block text-md font-medium text-slate-800 mb-1">{label}</label>
    {helperText && <p className="text-sm text-slate-500 mb-2">{helperText}</p>}
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
        className="mt-1 block w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-base"
      />
      {unit && <span className="ml-3 text-slate-600 text-lg">{unit}</span>}
    </div>
  </div>
);

// 3. メインのフォームコンポーネント
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
  const [openSection, setOpenSection] = useState<string>('basic');

  const toggleSection = (section: string) => {
    setOpenSection(prev => (prev === section ? '' : section));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-8">
      <h2 className="text-2xl font-semibold text-sky-700 mb-4">シミュレーションの基本情報を入力</h2>
      
      <InputField 
        label="このライフプランのお名前は？"
        helperText="後から見て分かりやすい名前をつけましょう。"
        type="text"
        name="planName"
        value={planName} 
        onChange={onPlanNameChange} 
        placeholder="例：我が家の安心プラン"
        required 
      />

      <FormSection title="基本情報" icon={<Icon as={FaUser} />} isOpen={openSection === 'basic'} onToggle={() => toggleSection('basic')}>
        <InputField label="あなたの現在の年齢は？" type="number" name="currentAge" value={input.currentAge} onChange={onInputChange} unit="歳" min="0" />
        <InputField label="何歳でリタイアしたいですか？" type="number" name="retirementAge" value={input.retirementAge} onChange={onInputChange} unit="歳" min="0" />
        <InputField label="何歳まで生きる想定で計算しますか？" helperText="日本の平均寿命などを参考に、少し長めに設定するのがおすすめです。" type="number" name="lifeExpectancy" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" min={(input.pensionStartDate || 0).toString()} />
      </FormSection>

      <FormSection title="収入と貯蓄" icon={<Icon as={FaMoneyBillWave} />} isOpen={openSection === 'income'} onToggle={() => toggleSection('income')}>
        <InputField label="現在の貯蓄額はいくらですか？" helperText="銀行預金や投資信託など、現在の金融資産の合計額を入力してください。" type="number" name="currentSavings" value={input.currentSavings} onChange={onInputChange} unit="円" min="0" step="10000" placeholder="例: 5000000" />
        <InputField label="年間の手取り収入はいくらですか？" helperText="税金や社会保険料が引かれて、実際に使える手取りの金額です。" type="number" name="annualIncome" value={input.annualIncome} onChange={onInputChange} unit="円" min="0" step="10000" placeholder="例: 4500000" />
        <InputField label="リタイア後にもらえる年金は、年間でいくらですか？" helperText="「ねんきん定期便」などで確認できる見込み額を入力してください。" type="number" name="pensionAmountPerYear" value={input.pensionAmountPerYear} onChange={onInputChange} unit="円" min="0" step="10000" placeholder="例: 1800000" />
        <InputField label="年金は何歳から受け取りますか？" type="number" name="pensionStartDate" value={input.pensionStartDate} onChange={onInputChange} unit="歳" min={(input.retirementAge || 0).toString()} max={(input.lifeExpectancy || 120).toString()} />
        <InputField label="退職金はいくらもらえそうですか？" helperText="もらえない場合は0のままでOKです。" type="number" name="severancePay" value={input.severancePay} onChange={onInputChange} unit="円" min="0" step="10000" placeholder="例: 15000000" />
      </FormSection>

      <FormSection title="支出" icon={<Icon as={FaShoppingCart} />} isOpen={openSection === 'expenses'} onToggle={() => toggleSection('expenses')}>
        <InputField label="毎月の生活費はいくらですか？" helperText="家賃、食費、光熱費、通信費、お小遣いなど、すべての支出の合計額の目安です。" type="number" name="monthlyExpenses" value={input.monthlyExpenses} onChange={onInputChange} unit="円" min="0" step="1000" placeholder="例: 250000" />
      </FormSection>

      <FormSection title="投資（任意）" icon={<Icon as={FaChartLine} />} isOpen={openSection === 'investment'} onToggle={() => toggleSection('investment')}>
        <InputField label="貯蓄のうち、何%を投資にまわしますか？" helperText="投資をしない場合は0のままでOKです。" type="number" name="investmentRatio" value={input.investmentRatio} onChange={onInputChange} unit="%" min="0" max="100" placeholder="0-100" />
        <InputField label="投資で、年間に何%くらいの利益を見込みますか？" helperText="税金を引いた後の利率です。分からなければ、年利3%〜5%あたりが一般的な目安です。" type="number" name="annualReturn" value={input.annualReturn} onChange={onInputChange} unit="%" min="0" step="0.1" placeholder="例: 3.0" />
      </FormSection>
      
      <div className="mt-10 pt-6 border-t border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-6 py-4 bg-sky-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
        >
          <Icon as={FaCalculator} className="mr-3" />
          {loading ? '計算中...' : 'この内容で未来を予測する'}
        </button>
      </div>

      <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
        >
          <Icon as={FaSave} className="mr-2" />
          <span>保存</span>
        </button>
        <label className="flex items-center cursor-pointer px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150">
          <Icon as={FaFileImport} className="mr-2" />
          <span>読込</span>
          <input type="file" accept=".csv" onChange={onImport} className="hidden" />
        </label>
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
        >
          <Icon as={FaFileExport} className="mr-2" />
          <span>書出</span>
        </button>
      </div>
    </form>
  );
};

export default InputForm; 
