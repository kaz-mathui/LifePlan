import React, { useState } from 'react';
import { InputField, Toggle, NestedInputField } from './InputField';
import { SimulationInputData } from '../types';
import { FaUser, FaBuilding, FaPiggyBank, FaHouseUser, FaCar, FaChild, FaNotesMedical, FaTrash } from 'react-icons/fa';
import FormSection, { FormSectionKey } from './FormSection';

interface InputFormProps {
  input: SimulationInputData;
  openSection: FormSectionKey | null;
  setOpenSection: (key: FormSectionKey | null) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNestedChange: (section: 'housing' | 'education' | 'car' | 'senior', field: string, value: any) => void;
  onChildrenChange: (index: number, field: keyof SimulationInputData['education']['children'][number], value: any) => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
}

const InputForm: React.FC<InputFormProps> = ({
  input,
  openSection,
  setOpenSection,
  onInputChange,
  onNestedChange,
  onChildrenChange,
  onAddChild,
  onRemoveChild
}) => {
  return (
    <>
      <FormSection title="基本情報" sectionKey="basic" openSection={openSection} setOpenSection={setOpenSection}>
          <InputField label="現在の年齢" name="currentAge" value={input.currentAge} onChange={onInputChange} unit="歳" />
          <InputField label="リタイア年齢" name="retirementAge" value={input.retirementAge} onChange={onInputChange} unit="歳" />
          <InputField label="平均寿命" name="lifeExpectancy" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" />
      </FormSection>

      <FormSection title="収入" sectionKey="income" openSection={openSection} setOpenSection={setOpenSection}>
          <InputField label="現在の年収" name="annualIncome" value={input.annualIncome} onChange={onInputChange} unit="万円" />
          <InputField label="昇給率" name="salaryIncreaseRate" value={input.salaryIncreaseRate} onChange={onInputChange} unit="%" />
          <InputField label="退職金" name="severancePay" value={input.severancePay} onChange={onInputChange} unit="万円" />
      </FormSection>

      <FormSection title="貯蓄・資産" sectionKey="savings" openSection={openSection} setOpenSection={setOpenSection}>
        <InputField label="現在の貯金額" name="currentSavings" value={input.currentSavings} onChange={onInputChange} unit="万円" />
        <InputField label="貯蓄に対する投資割合" name="investmentRatio" value={input.investmentRatio} onChange={onInputChange} unit="%" />
        <InputField label="投資の利回り（年率）" name="investmentYield" value={input.annualReturn} onChange={onInputChange} unit="%" />
      </FormSection>

      <FormSection title="住宅" sectionKey="housing" openSection={openSection} setOpenSection={setOpenSection}>
        <Toggle label="住宅ローンを計算に含める" section="housing" field="hasLoan" checked={input.housing.hasLoan} onChange={onNestedChange} />
        {input.housing.hasLoan && (
            <div className="pl-4 border-l-2 border-sky-200">
                <NestedInputField label="購入予定年齢" section="housing" field="startAge" value={input.housing.startAge} onChange={onNestedChange} unit="歳" />
                <NestedInputField label="物件価格" section="housing" field="propertyValue" value={input.housing.propertyValue} onChange={onNestedChange} unit="万円" />
                <NestedInputField label="頭金" section="housing" field="downPayment" value={input.housing.downPayment} onChange={onNestedChange} unit="万円" />
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ローン借入額</label>
                    <p className="px-3 py-2 bg-slate-100 rounded-md">{Math.max(0, Number(input.housing.propertyValue) - Number(input.housing.downPayment))} 万円</p>
                </div>
                <NestedInputField label="ローン期間" section="housing" field="loanTerm" value={input.housing.loanTerm} onChange={onNestedChange} unit="年" />
                <NestedInputField label="金利（年率）" section="housing" field="interestRate" value={input.housing.interestRate} onChange={onNestedChange} unit="%" />
                <NestedInputField label="固定資産税率（年率）" section="housing" field="propertyTaxRate" value={input.housing.propertyTaxRate} onChange={onNestedChange} unit="%" />
            </div>
        )}
      </FormSection>

      <FormSection title="子供" sectionKey="children" openSection={openSection} setOpenSection={setOpenSection}>
          <Toggle label="子供の情報を計算に含める" section="education" field="hasChildren" checked={input.education.hasChildren} onChange={onNestedChange} />
          {input.education.hasChildren && (
              <div className="pl-4 border-l-2 border-sky-200">
                  <NestedInputField label="子供一人あたりの年間生活費" section="education" field="childLivingCost" value={input.education.childLivingCost} onChange={onNestedChange} unit="万円" />
                  {input.education.children.map((child, index) => (
                      <div key={index} className="relative p-4 border border-slate-200 rounded-md mb-4">
                          <h4 className="font-semibold text-slate-800 mb-2">子供 {index + 1}</h4>
                          <div className="grid grid-cols-2 gap-x-4">
                            <InputField label="誕生年" name="birthYear" value={child.birthYear} onChange={(e) => onChildrenChange(index, 'birthYear', e.target.value)} unit="年" />
                            <InputField label="年間教育費" name="educationCost" value={child.educationCost} onChange={(e) => onChildrenChange(index, 'educationCost', e.target.value)} unit="万円" />
                          </div>
                          <button onClick={() => onRemoveChild(index)} className="absolute top-2 right-2 text-sm text-red-500 hover:text-red-700">[削除]</button>
                      </div>
                  ))}
                  <button onClick={onAddChild} className="mt-2 text-sm text-sky-600 hover:text-sky-800 font-semibold">+ 子供を追加</button>
              </div>
          )}
      </FormSection>

      <FormSection title="自動車" sectionKey="car" openSection={openSection} setOpenSection={setOpenSection}>
        <Toggle label="自動車を計算に含める" section="car" field="hasCar" checked={input.car.hasCar} onChange={onNestedChange} />
        {input.car.hasCar && (
            <div className="pl-4 border-l-2 border-sky-200">
                <NestedInputField label="購入予定年齢" section="car" field="purchaseAge" value={input.car.purchaseAge} onChange={onNestedChange} unit="歳" />
                <NestedInputField label="車両価格" section="car" field="price" value={input.car.price} onChange={onNestedChange} unit="万円" />
                <NestedInputField label="頭金" section="car" field="downPayment" value={input.car.downPayment} onChange={onNestedChange} unit="万円" />
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ローン借入額</label>
                    <p className="px-3 py-2 bg-slate-100 rounded-md">{Math.max(0, Number(input.car.price) - Number(input.car.downPayment))} 万円</p>
                </div>
                <NestedInputField label="ローン期間" section="car" field="loanTerm" value={input.car.loanTerm} onChange={onNestedChange} unit="年" />
                <NestedInputField label="金利（年率）" section="car" field="interestRate" value={input.car.interestRate} onChange={onNestedChange} unit="%" />
                <NestedInputField label="維持費（年間）" section="car" field="maintenanceCost" value={input.car.maintenanceCost} onChange={onNestedChange} unit="万円" />
                <NestedInputField label="買い替え周期" section="car" field="replacementCycle" value={input.car.replacementCycle} onChange={onNestedChange} unit="年" />
            </div>
        )}
      </FormSection>

      <FormSection title="老後" sectionKey="senior" openSection={openSection} setOpenSection={setOpenSection}>
          <Toggle label="老後の設定を計算に含める" section="senior" field="enabled" checked={input.senior.enabled} onChange={onNestedChange} />
          {input.senior.enabled && (
              <div className="pl-4 border-l-2 border-sky-200">
                  <NestedInputField label="介護費用（年間）" section="senior" field="careCost" value={input.senior.careCost} onChange={onNestedChange} unit="万円" />
                  <NestedInputField label="介護開始年齢" section="senior" field="startAge" value={input.senior.startAge} onChange={onNestedChange} unit="歳" />
              </div>
          )}
      </FormSection>
    </>
  );
};

export default InputForm; 
 