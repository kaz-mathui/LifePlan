import React, { useState } from 'react';
import { LifeEvent } from '../types';

interface LifeEventFormProps {
  lifeEvents: LifeEvent[];
  onLifeEventsChange: (events: LifeEvent[]) => void;
  currentAge: number | '';
  lifeExpectancy: number | '';
}

const LifeEventForm: React.FC<LifeEventFormProps> = ({ lifeEvents, onLifeEventsChange, currentAge, lifeExpectancy }) => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventData, setEventData] = useState<Omit<LifeEvent, 'id'>>({
    description: '',
    type: 'expense',
    amount: 0,
    startAge: Number(currentAge) || 30,
    endAge: 0,
  });

  const resetForm = () => {
    setEditingEventId(null);
    setEventData({
      description: '',
      type: 'expense',
      amount: 0,
      startAge: Number(currentAge) || 30,
      endAge: 0,
    });
  };

  const handleEdit = (event: LifeEvent) => {
    setEditingEventId(event.id);
    setEventData({ ...event });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.description || !eventData.amount) {
      alert('イベント名と金額を入力してください。');
      return;
    }

    if (editingEventId) {
      onLifeEventsChange(lifeEvents.map(e => e.id === editingEventId ? { ...eventData, id: editingEventId } : e));
    } else {
      onLifeEventsChange([...lifeEvents, { ...eventData, id: `event-${Date.now()}` }]);
    }
    resetForm();
  };

  const handleRemove = (id: string) => {
    onLifeEventsChange(lifeEvents.filter(event => event.id !== id));
  };

  return (
    <div id="life-event-form" className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
      <h3 className="text-lg font-semibold text-sky-800 mb-4">{editingEventId ? 'イベント編集' : '新規イベント追加'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="イベント名 (例: 子供の結婚祝い)"
            value={eventData.description}
            onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
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
          <div className="relative">
            <input
              type="number"
              placeholder="金額"
              value={eventData.amount}
              onChange={(e) => setEventData({ ...eventData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
             <span className="absolute inset-y-0 right-3 flex items-center text-slate-500">万円</span>
          </div>
          <input
            type="number"
            placeholder="開始年齢"
            value={eventData.startAge}
            onChange={(e) => setEventData({ ...eventData, startAge: Number(e.target.value) })}
            min={Number(currentAge) || 0}
            max={Number(lifeExpectancy) || 100}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
          />
          <input
            type="number"
            placeholder="終了年齢 (任意)"
            value={eventData.endAge || ''}
            onChange={(e) => setEventData({ ...eventData, endAge: Number(e.target.value) || 0 })}
            min={eventData.startAge}
            max={Number(lifeExpectancy) || 100}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <button type="submit" className="w-full bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 font-semibold transition-colors">
          {editingEventId ? '更新' : '追加'}
        </button>
        {editingEventId && (
          <button type="button" onClick={resetForm} className="w-full mt-2 text-center text-sm text-slate-600 hover:text-slate-800">
            キャンセル
          </button>
        )}
      </form>

      <div className="mt-6">
        <h4 className="text-md font-semibold text-slate-700 mb-2">登録済みイベント</h4>
        {lifeEvents.length === 0 ? (
          <p className="text-sm text-slate-500">登録済みのライフイベントはありません。</p>
        ) : (
          <ul className="space-y-2">
            {lifeEvents.map(event => (
              <li key={event.id} className="flex items-center justify-between bg-white p-3 rounded-md border">
                <div className="text-sm">
                  <p className="font-semibold">{event.description}</p>
                  <p className="text-slate-600">
                    {event.startAge}歳{event.endAge && event.endAge !== event.startAge ? `～${event.endAge}歳` : ''}: {event.type === 'income' ? '収入' : '支出'} {event.amount}万円
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEdit(event)} className="p-1 text-slate-500 hover:text-sky-600">[編集]</button>
                  <button onClick={() => handleRemove(event.id)} className="p-1 text-slate-500 hover:text-red-600">[削除]</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LifeEventForm; 

 