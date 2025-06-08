import React, { useState, ChangeEvent, FormEvent } from 'react';
import { LifeEvent } from '../types';
import { FormSection } from './InputForm';
import { FaPlus, FaEdit, FaTrash, FaRegCalendarAlt, FaYenSign, FaSyncAlt, FaExclamationCircle, FaArrowRight } from 'react-icons/fa';
import Icon from './Icon';

interface LifeEventFormProps {
  lifeEvents: LifeEvent[];
  onLifeEventsChange: (newEventList: LifeEvent[]) => void;
  currentAge: number | '';
  lifeExpectancy: number | '';
}

// フォーム編集中の一時的な型。startAgeとamountはnumber | ''を許容
interface EditableLifeEvent {
  startAge: number | '';
  description: string;
  type: 'income' | 'expense';
  amount: number | '';
  endAge?: number | '' | null;
  id?: string; // 編集時は id を持つ
}

const LifeEventForm: React.FC<LifeEventFormProps> = ({ lifeEvents, onLifeEventsChange, currentAge, lifeExpectancy }) => {
  const getInitialNewEventState = (): EditableLifeEvent => ({
    startAge: typeof currentAge === 'number' && currentAge > 0 ? currentAge + 1 : 30,
    description: '',
    type: 'expense',
    amount: '', // 初期値を空文字に
    endAge: null, // 初期値はnull
  });

  const [newEvent, setNewEvent] = useState<EditableLifeEvent>(getInitialNewEventState());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  // 「毎年」のチェックボックスの状態を管理
  const [isAnnual, setIsAnnual] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target; // type を inputType に変更 (変数名の衝突回避)
    let processedValue: string | number | undefined = value;

    if (inputType === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    
    setNewEvent(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsAnnual(e.target.checked);
    if (!e.target.checked) {
      // 毎年でなくなったら endAge をリセット
      setNewEvent(prev => ({ ...prev, endAge: null }));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newEvent.description.trim() === '' || newEvent.startAge === '' || newEvent.amount === '') {
      alert('年齢、説明、金額は必須です。');
      return;
    }
    
    const startAgeNum = Number(newEvent.startAge);
    const amountNum = Number(newEvent.amount);
    let endAgeNum: number | '' | null | undefined = newEvent.endAge;

    if (isNaN(startAgeNum)) {
        alert('年齢は数値で入力してください。');
        return;
    }
    if (isNaN(amountNum)) {
        alert('金額は数値で入力してください。');
        return;
    }

    if (isAnnual && endAgeNum !== '' && endAgeNum !== null && endAgeNum !== undefined) {
        if (isNaN(Number(endAgeNum))) {
          alert('終了年齢は数値で入力してください。');
          return;
        }
        if (Number(endAgeNum) < startAgeNum) {
          alert('終了年齢は開始年齢以上に設定してください。');
          return;
        }
    }

    if (startAgeNum < (currentAge || 0)) {
        alert(`イベント発生年齢は現在の年齢 (${currentAge || 0}歳) 以上にしてください。`);
        return;
    }
    if (startAgeNum > (lifeExpectancy || 120)) {
        alert(`イベント発生年齢は寿命 (${lifeExpectancy || 120}歳) 以下にしてください。`);
        return;
    }
    if (amountNum < 0) {
        alert('金額は0以上で入力してください。');
        return;
    }
    
    const finalEventData: LifeEvent = {
        id: editingEventId || crypto.randomUUID(),
        description: newEvent.description.trim(),
        startAge: startAgeNum,
        type: newEvent.type,
        amount: amountNum,
        endAge: isAnnual ? (endAgeNum === '' || endAgeNum === null ? undefined : Number(endAgeNum)) : undefined,
    };

    if (editingEventId) {
      onLifeEventsChange(lifeEvents.map(event => event.id === editingEventId ? finalEventData : event));
      setEditingEventId(null);
    } else {
      onLifeEventsChange([...lifeEvents, finalEventData]);
    }
    
    setIsAnnual(false); // フォームリセット時にチェックボックスもリセット
    setNewEvent(getInitialNewEventState()); // フォームをリセット
  };

  const handleEdit = (eventToEdit: LifeEvent) => {
    setEditingEventId(eventToEdit.id);
    setIsAnnual(eventToEdit.endAge !== undefined && eventToEdit.endAge !== null);
    setNewEvent({
        id: eventToEdit.id,
        description: eventToEdit.description,
        type: eventToEdit.type,
        startAge: eventToEdit.startAge,
        amount: eventToEdit.amount,
        endAge: eventToEdit.endAge,
    });
    window.scrollTo({ top: document.getElementById('life-event-form')?.offsetTop || 0, behavior: 'smooth' });
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm('このライフイベントを削除してもよろしいですか？')) {
      onLifeEventsChange(lifeEvents.filter(event => event.id !== eventId));
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setIsAnnual(false);
        setNewEvent(getInitialNewEventState());
      }
    }
  };
  
  const currentMinAge = typeof currentAge === 'number' && currentAge > 0 ? currentAge.toString() : "0";
  const currentMaxAge = typeof lifeExpectancy === 'number' && lifeExpectancy > 0 ? lifeExpectancy.toString() : "120";

  return (
    <FormSection title="ライフイベント設定" icon={<Icon as={FaRegCalendarAlt} />}>
      <div id="life-event-form" className="p-4 bg-sky-50 border border-sky-200 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-sky-800 mb-4">{editingEventId ? 'イベント編集' : '新規イベント追加'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">イベント内容:</label>
            <input type="text" name="description" id="description" value={newEvent.description} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" placeholder="例：子供の大学入学" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startAge" className="block text-sm font-medium text-slate-700 mb-1">発生年齢:</label>
              <div className="relative">
                <input type="number" name="startAge" id="startAge" value={newEvent.startAge} onChange={handleInputChange} required className="pl-3 pr-12 py-2 w-full border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min={currentMinAge} max={currentMaxAge} />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">歳</span>
              </div>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">金額:</label>
              <div className="relative">
                <input type="number" name="amount" id="amount" value={newEvent.amount} onChange={handleInputChange} required className="pl-3 pr-12 py-2 w-full border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min="0" step="1" placeholder='100' />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">万円</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">種類:</label>
              <select name="type" id="type" value={newEvent.type} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center">
                <input type="checkbox" name="isAnnual" id="isAnnual" checked={isAnnual} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                <label htmlFor="isAnnual" className="ml-2 block text-sm font-medium text-slate-700">毎年発生</label>
              </div>
            </div>
          </div>
          {isAnnual && (
            <div>
              <label htmlFor="endAge" className="block text-sm font-medium text-slate-700 mb-1">終了年齢 (任意):</label>
               <div className="relative">
                <input type="number" name="endAge" id="endAge" value={newEvent.endAge ?? ''} onChange={handleInputChange} className="pl-3 pr-12 py-2 w-full border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min={(typeof newEvent.startAge === 'number' ? newEvent.startAge : currentMinAge).toString()} max={currentMaxAge} placeholder="未入力で寿命まで" />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">歳</span>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2 pt-2">
            <button type="submit" className="inline-flex items-center px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150">
              {editingEventId ? <><Icon as={FaEdit} className="mr-2" /> 更新</> : <><Icon as={FaPlus} className="mr-2" /> 追加</>}
            </button>
            {editingEventId && (
                <button type="button" onClick={() => { setEditingEventId(null); setIsAnnual(false); setNewEvent(getInitialNewEventState()); }} className="inline-flex items-center px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition duration-150">
                    キャンセル
                </button>
            )}
          </div>
        </form>
      </div>

      {lifeEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">登録済みライフイベント</h3>
          <div className="space-y-3">
            {lifeEvents.sort((a,b) => (a.startAge || 0) - (b.startAge || 0)).map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-shadow hover:shadow-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-lg">{event.description}</p>
                    <div className="flex items-center text-slate-600 text-sm mt-2 flex-wrap">
                       <span className={`flex items-center mr-4 px-2 py-1 rounded-full text-xs font-semibold ${event.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <Icon as={FaYenSign} className="mr-1" />{event.type === 'income' ? '収入' : '支出'}: {(event.amount || 0).toLocaleString()} 万円
                      </span>
                      <span className="flex items-center mr-4"><Icon as={FaRegCalendarAlt} className="mr-1" />{event.startAge}歳</span>
                      {event.endAge && <span className="flex items-center"><Icon as={FaArrowRight} className="mx-2" />{event.endAge}歳</span>}
                       <span className="flex items-center ml-4 text-blue-600"><Icon as={FaSyncAlt} className="mr-1" />{event.endAge ? '毎年' : '一回のみ'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleEdit(event)} className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-100 rounded-full transition-colors duration-150" title="編集"><Icon as={FaEdit} /></button>
                    <button onClick={() => handleDelete(event.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-150" title="削除"><Icon as={FaTrash} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {lifeEvents.length === 0 && (
         <div className="text-center py-10 px-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <Icon as={FaExclamationCircle} className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-lg font-medium text-slate-800">ライフイベントは未登録です</h3>
            <p className="mt-1 text-sm text-slate-600">上のフォームから、結婚、出産、住宅購入などのイベントを追加しましょう。</p>
        </div>
      )}
    </FormSection>
  );
};

export default LifeEventForm; 

 