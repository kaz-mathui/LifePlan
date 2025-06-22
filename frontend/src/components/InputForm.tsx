import React, { ChangeEvent } from 'react';
import { SimulationInputData } from '../types';
import FormSection from './FormSection';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Icon from './Icon';
import { NestedSectionKey } from '../App';

interface InputFormProps {
  input: SimulationInputData;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNestedChange: (section: NestedSectionKey, field: string, value: any) => void;
  onLifeEventChange: (index: number, field: string, value: any) => void;
  onAddLifeEvent: () => void;
  onRemoveLifeEvent: (index: number) => void;
  onChildrenChange: (index: number, field: string, value: any) => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
}

const InputField: React.FC<React.ComponentPropsWithoutRef<'input'> & { label: string; unit?: string; description?: string; }> = ({ label, unit, description, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-700">
            {label}
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
            <input
                {...props}
                className={`block w-full flex-1 min-w-0 rounded-none border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-sky-500 sm:text-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 ${!unit ? 'rounded-md' : 'rounded-l-md'}`}
            />
            {unit && (
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-3 text-slate-500 sm:text-sm">
                    {unit}
                </span>
            )}
        </div>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
);


const InputForm: React.FC<InputFormProps> = ({ 
    input, 
    onInputChange, 
    onNestedChange,
    onLifeEventChange,
    onAddLifeEvent,
    onRemoveLifeEvent,
    onChildrenChange, 
    onAddChild, 
    onRemoveChild 
}) => {
  const handleNestedInputChange = (section: NestedSectionKey) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;
    if (type === 'number') {
        processedValue = value === '' ? '' : Number(value);
    }
    onNestedChange(section, name, processedValue);

    if (section === 'car' && (name === 'price' || name === 'downPayment')) {
        const newCarData = { ...input.car, [name]: processedValue };
        const price = Number(newCarData.price) || 0;
        const downPayment = Number(newCarData.downPayment) || 0;
        const loanAmount = Math.max(0, price - downPayment);
        onNestedChange('car', 'loanAmount', loanAmount);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="space-y-6">
        <FormSection title="基本情報" initialOpen>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="現在年齢" name="currentAge" type="number" value={input.currentAge} onChange={onInputChange} unit="歳" />
                <InputField label="リタイア年齢" name="retirementAge" type="number" value={input.retirementAge} onChange={onInputChange} unit="歳" />
                <InputField label="想定寿命" name="lifeExpectancy" type="number" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" />
            </div>
        </FormSection>

        <FormSection title="収入・資産" initialOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="手取り年収" name="annualIncome" type="number" value={input.annualIncome} onChange={onInputChange} unit="万円" />
                <InputField label="昇給率" name="salaryIncreaseRate" type="number" value={input.salaryIncreaseRate} onChange={onInputChange} unit="％" step="0.1" />
                <InputField label="現在資産" name="currentSavings" type="number" value={input.currentSavings} onChange={onInputChange} unit="万円" />
                <InputField label="退職金" name="severancePay" type="number" value={input.severancePay} onChange={onInputChange} unit="万円" />
            </div>
        </FormSection>

        <FormSection title="支出・年金" initialOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="毎月の生活費" name="monthlyExpenses" type="number" value={input.monthlyExpenses} onChange={onInputChange} unit="万円" />
                <InputField label="年金（年間）" name="pensionAmountPerYear" type="number" value={input.pensionAmountPerYear} onChange={onInputChange} unit="万円" />
                <InputField label="年金開始年齢" name="pensionStartDate" type="number" value={input.pensionStartDate} onChange={onInputChange} unit="歳" />
            </div>
        </FormSection>

        <FormSection title="投資設定">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="投資割合" name="investmentRatio" type="number" value={input.investmentRatio} onChange={onInputChange} unit="％" description="資産のうち投資に回す割合" />
                <InputField label="想定利回り（年率）" name="annualReturn" type="number" value={input.annualReturn} onChange={onInputChange} unit="％" step="0.1" description="投資の平均的なリターン" />
            </div>
        </FormSection>

        <FormSection title="住宅ローン">
            <div className="space-y-4">
                <div className="flex items-center"><input id="hasLoan" name="hasLoan" type="checkbox" checked={input.housing.hasLoan} onChange={(e) => onNestedChange('housing', 'hasLoan', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" /><label htmlFor="hasLoan" className="ml-3 block text-sm font-medium text-gray-700">住宅ローンを計算に含める</label></div>
                {input.housing.hasLoan && (
                    <div className="pt-4 mt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="物件価格" name="propertyValue" type="number" value={input.housing.propertyValue} onChange={handleNestedInputChange('housing')} unit="万円" />
                        <InputField label="頭金" name="downPayment" type="number" value={input.housing.downPayment} onChange={handleNestedInputChange('housing')} unit="万円" />
                        <InputField label="ローン借入額" name="loanAmount" type="number" value={input.housing.loanAmount} unit="万円" disabled description="自動計算されます" />
                        <InputField label="ローン開始年齢" name="startAge" type="number" value={input.housing.startAge} onChange={handleNestedInputChange('housing')} unit="歳" />
                        <InputField label="返済期間" name="loanTerm" type="number" value={input.housing.loanTerm} onChange={handleNestedInputChange('housing')} unit="年" />
                        <InputField label="金利（年率）" name="interestRate" type="number" value={input.housing.interestRate} onChange={handleNestedInputChange('housing')} unit="％" step="0.01" />
                        <InputField label="固定資産税率" name="propertyTaxRate" type="number" value={input.housing.propertyTaxRate} onChange={handleNestedInputChange('housing')} unit="％" step="0.01" />
                    </div>
                )}
            </div>
        </FormSection>

        <FormSection title="教育費">
            <div className="space-y-4">
                <div className="flex items-center"><input id="hasChildren" name="hasChildren" type="checkbox" checked={input.education.hasChildren} onChange={(e) => onNestedChange('education', 'hasChildren', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" /><label htmlFor="hasChildren" className="ml-3 block text-sm font-medium text-gray-700">子供の教育費を計算に含める</label></div>
                {input.education.hasChildren && (
                    <div className="space-y-4">
                        <InputField type="number" label="1人あたりの年間生活費" name="childLivingCost" value={input.education.childLivingCost} onChange={(e) => onNestedChange('education', 'childLivingCost', Number(e.target.value))} unit="万円" description="教育費とは別に、子供が独立するまでにかかる食費や衣類などの基本的な生活費です。" />
                        {(input.education.children || []).map((child, index) => (
                            <div key={index} className="p-3 border rounded-md relative bg-white">
                                <h4 className="font-semibold mb-2 text-slate-700">子供 {index + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InputField label="誕生年" type="number" value={child.birthYear} onChange={(e) => onChildrenChange(index, 'birthYear', Number(e.target.value))} />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">進学プラン</label>
                                        <select value={child.plan} onChange={(e) => onChildrenChange(index, 'plan', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm">
                                            <option value="public">すべて国公立</option>
                                            <option value="private_liberal">大学のみ私立文系</option>
                                            <option value="private_science">大学のみ私立理系</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="button" onClick={() => onRemoveChild(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full"><Icon as={FaTrash} /></button>
                            </div>
                        ))}
                        <button type="button" onClick={onAddChild} className="w-full flex items-center justify-center text-sm py-2 px-4 border border-dashed rounded-md text-sky-600 border-sky-500 hover:bg-sky-50"><Icon as={FaPlus} className="mr-2" />子供を追加</button>
                    </div>
                )}
            </div>
        </FormSection>

        <FormSection title="自動車">
            <div className="space-y-4">
                <div className="flex items-center"><input id="hasCar" name="hasCar" type="checkbox" checked={input.car.hasCar} onChange={(e) => onNestedChange('car', 'hasCar', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" /><label htmlFor="hasCar" className="ml-3 block text-sm font-medium text-gray-700">自動車関連費を計算に含める</label></div>
                {input.car.hasCar && (
                    <div className="pt-4 mt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="車両価格" name="price" type="number" value={input.car.price} onChange={handleNestedInputChange('car')} unit="万円" />
                        <InputField label="購入時頭金" name="downPayment" type="number" value={input.car.downPayment} onChange={handleNestedInputChange('car')} unit="万円" />
                        <InputField label="ローン借入額" name="loanAmount" type="number" value={input.car.loanAmount} unit="万円" description="車両価格と頭金から自動計算" disabled/>
                        <InputField label="ローン返済期間" name="loanTerm" type="number" value={input.car.loanTerm} onChange={handleNestedInputChange('car')} unit="年" />
                        <InputField label="ローン金利（年率）" name="interestRate" type="number" value={input.car.interestRate} onChange={handleNestedInputChange('car')} unit="％" step="0.01" />
                        <InputField label="年間維持費" name="maintenanceCost" type="number" value={input.car.maintenanceCost} onChange={handleNestedInputChange('car')} unit="万円" description="税金、保険、車検代など" />
                        <InputField label="初回購入年齢" name="purchaseAge" type="number" value={input.car.purchaseAge} onChange={handleNestedInputChange('car')} unit="歳" />
                        <InputField label="買い替え周期" name="replacementCycle" type="number" value={input.car.replacementCycle} onChange={handleNestedInputChange('car')} unit="年" />
                    </div>
                )}
            </div>
        </FormSection>

        <FormSection title="その他ライフイベント" defaultOpen={true}>
            <div className="space-y-4">
                {(input.lifeEvents || []).map((event, index) => (
                    <div key={index} className="p-3 border rounded-md relative bg-white space-y-3">
                        <button type="button" onClick={() => onRemoveLifeEvent(index)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100">
                            <Icon as={FaTrash} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <InputField label="イベント名" name="description" type="text" value={event.description} onChange={(e) => onLifeEventChange(index, 'description', e.target.value)} />
                            <InputField label="年齢" name="startAge" type="number" value={event.startAge} onChange={(e) => onLifeEventChange(index, 'startAge', e.target.valueAsNumber)} unit="歳" />
                            <InputField label="金額" name="amount" type="number" value={event.amount} onChange={(e) => onLifeEventChange(index, 'amount', e.target.valueAsNumber)} unit="万円" description="支出はマイナスで入力" />
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={onAddLifeEvent}
                    className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-slate-300 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50"
                >
                    <Icon as={FaPlus} className="mr-2" />
                    ライフイベントを追加
                </button>
            </div>
        </FormSection>
      </div>
    </div>
  );
};

export default InputForm; 
 