import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LifeEvent } from '../types';
import Icon from './Icon';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

interface LifeEventFormProps {
  lifeEvents: LifeEvent[];
  onLifeEventsChange: (events: LifeEvent[]) => void;
  currentAge: number;
  lifeExpectancy: number;
}

// Form state allows empty strings for number fields for better UX
type LifeEventFormState = {
  description: string;
  type: 'income' | 'expense';
  amount: number | '';
  startAge: number | '';
  endAge: number | '' | null;
}

const LifeEventForm: React.FC<LifeEventFormProps> = ({ lifeEvents, onLifeEventsChange, currentAge, lifeExpectancy }) => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [eventData, setEventData] = useState<LifeEventFormState>({
    description: '',
    type: 'expense',
    amount: '',
    startAge: '',
    endAge: '',
  });

  const resetForm = () => {
    setEditingEventId(null);
    setEventData({
      description: '',
      type: 'expense',
      amount: '',
      startAge: '',
      endAge: '',
    });
    setIsRecurring(false);
  };

  const handleEdit = (event: LifeEvent) => {
    setEditingEventId(event.id);
    setEventData({ 
        description: event.description,
        type: event.type,
        amount: event.amount,
        startAge: event.startAge,
        endAge: event.endAge ?? '',
    });
    setIsRecurring(!!event.endAge && event.endAge !== event.startAge);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.description || eventData.amount === '' || eventData.startAge === '') {
      toast.error("イベント内容、金額、開始年齢は必須です。");
      return;
    }

    const startAgeNum = Number(eventData.startAge);
    const endAgeNum = isRecurring ? (Number(eventData.endAge) || startAgeNum) : startAgeNum;
    
    const finalEventData = {
        description: eventData.description,
        type: eventData.type,
        amount: Number(eventData.amount),
        startAge: startAgeNum,
        endAge: endAgeNum
    };

    if (editingEventId) {
      onLifeEventsChange(lifeEvents.map(e => e.id === editingEventId ? { ...finalEventData, id: editingEventId } as LifeEvent : e));
    } else {
      onLifeEventsChange([...lifeEvents, { ...finalEventData, id: `event-${Date.now()}` } as LifeEvent]);
    }
    resetForm();
  };

  const handleRemove = (id: string) => {
    onLifeEventsChange(lifeEvents.filter(e => e.id !== id));
  };
  
  // When 'isRecurring' changes, adjust endAge
  useEffect(() => {
    if (!isRecurring) {
        setEventData(prev => ({...prev, endAge: ''}));
    }
  }, [isRecurring]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">{editingEventId ? 'イベントを編集' : '新規イベント追加'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="イベント内容 (例: 車の購入, 資格取得)"
            value={eventData.description}
            onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 md:col-span-2"
          />
          <input
            type="number"
            placeholder="金額 (万円)"
            value={eventData.amount}
            onChange={(e) => setEventData({ ...eventData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
          />
          <select
            value={eventData.type}
            onChange={(e) => setEventData({ ...eventData, type: e.target.value as 'income' | 'expense' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4">
                <label className="flex items-center">
                    <input type="radio" name="event-type" checked={!isRecurring} onChange={() => setIsRecurring(false)} className="form-radio h-4 w-4 text-sky-600"/>
                    <span className="ml-2 text-sm text-slate-700">一回だけ</span>
                </label>
                <label className="flex items-center">
                    <input type="radio" name="event-type" checked={isRecurring} onChange={() => setIsRecurring(true)} className="form-radio h-4 w-4 text-sky-600"/>
                    <span className="ml-2 text-sm text-slate-700">毎年</span>
                </label>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="開始年齢"
              value={eventData.startAge}
              onChange={(e) => setEventData({ ...eventData, startAge: e.target.value === '' ? '' : Number(e.target.value) })}
              min={Number(currentAge) || 0}
              max={Number(lifeExpectancy) || 100}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {isRecurring && (
            <div className="relative">
              <input
                type="number"
                placeholder="終了年齢"
                value={eventData.endAge ?? ''}
                onChange={(e) => setEventData({ ...eventData, endAge: e.target.value === '' ? '' : Number(e.target.value) })}
                min={Number(eventData.startAge) || 0}
                max={Number(lifeExpectancy) || 100}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          )}
        </div>
        <button type="submit" className="w-full bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 font-semibold transition-colors">
          {editingEventId ? '更新' : '追加'}
        </button>
      </form>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">登録済みイベント</h3>
        <div className="space-y-2">
          {lifeEvents.length > 0 ? (
            lifeEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{event.description}</p>
                  <p className="text-sm text-slate-600">
                    {event.startAge}歳
                    {event.endAge && event.endAge !== event.startAge ? `から${event.endAge}歳まで` : ''}
                    、{event.type === 'income' ? '収入' : '支出'}: {event.amount.toLocaleString()}万円
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEdit(event)} className="p-1 text-slate-500 hover:text-sky-600">
                    <Icon as={FaEdit} />
                  </button>
                  <button onClick={() => handleRemove(event.id)} className="p-1 text-slate-500 hover:text-red-600">
                    <Icon as={FaTrash} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">登録済みのイベントはありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LifeEventForm; 

 