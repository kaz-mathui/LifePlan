import React, { useState, ChangeEvent, FormEvent } from 'react';
import { LifeEvent } from '../App'; // App.tsx から LifeEvent 型をインポート

interface LifeEventFormProps {
  lifeEvents: LifeEvent[];
  onLifeEventsChange: (newEventList: LifeEvent[]) => void;
  currentAge: number | '';
  lifeExpectancy: number | '';
}

// ★修正: フォーム編集中の一時的な型。age と amount は number | '' を許容
interface EditableLifeEvent {
  age: number | '';
  description: string;
  type: 'income' | 'expense';
  amount: number | '';
  frequency: 'one-time' | 'annual';
  endAge?: number | ''; // endAgeも空文字を許容
  id?: string; // 編集時は id を持つ
}

const LifeEventForm: React.FC<LifeEventFormProps> = ({ lifeEvents, onLifeEventsChange, currentAge, lifeExpectancy }) => {
  // ★修正: newEvent の型を EditableLifeEvent に変更
  const getInitialNewEventState = (): EditableLifeEvent => ({
    age: typeof currentAge === 'number' && currentAge > 0 ? currentAge + 1 : 30,
    description: '',
    type: 'expense',
    amount: '', // 初期値を空文字に
    frequency: 'one-time',
    endAge: '', // 初期値を空文字に
  });

  const [newEvent, setNewEvent] = useState<EditableLifeEvent>(getInitialNewEventState());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target; // type を inputType に変更 (変数名の衝突回避)
    let processedValue: string | number | undefined = value;

    if (inputType === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    // frequency や type のような select 要素はそのまま文字列として設定
    // endAge が空文字の場合は undefined ではなく空文字のまま扱う (バリデーションは handleSubmit で)

    setNewEvent(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ★修正: バリデーションロジックの強化
    if (newEvent.description.trim() === '' || newEvent.age === '' || newEvent.amount === '') {
      alert('年齢、説明、金額は必須です。');
      return;
    }
    
    const ageNum = Number(newEvent.age);
    const amountNum = Number(newEvent.amount);
    let endAgeNum: number | undefined = undefined;

    if (isNaN(ageNum)) {
        alert('年齢は数値で入力してください。');
        return;
    }
    if (isNaN(amountNum)) {
        alert('金額は数値で入力してください。');
        return;
    }

    if (newEvent.frequency === 'annual' && newEvent.endAge !== '' && newEvent.endAge !== undefined) {
        endAgeNum = Number(newEvent.endAge);
        if (isNaN(endAgeNum)) {
            alert('終了年齢は数値で入力してください。');
            return;
        }
    }

    if (ageNum < (currentAge || 0)) {
        alert(`イベント発生年齢は現在の年齢 (${currentAge || 0}歳) 以上にしてください。`);
        return;
    }
    if (ageNum > (lifeExpectancy || 120)) {
        alert(`イベント発生年齢は寿命 (${lifeExpectancy || 120}歳) 以下にしてください。`);
        return;
    }
    if (amountNum < 0) {
        alert('金額は0以上で入力してください。');
        return;
    }
    if (newEvent.frequency === 'annual' && endAgeNum !== undefined && endAgeNum < ageNum) {
        alert('終了年齢は開始年齢以上に設定してください。');
        return;
    }

    const finalEventData: LifeEvent = {
        id: editingEventId || crypto.randomUUID(),
        description: newEvent.description.trim(),
        age: ageNum,
        type: newEvent.type,
        amount: amountNum,
        frequency: newEvent.frequency,
        endAge: newEvent.frequency === 'annual' ? endAgeNum : undefined, // 毎年でない場合はendAgeは不要
    };

    if (editingEventId) {
      onLifeEventsChange(lifeEvents.map(event => event.id === editingEventId ? finalEventData : event));
      setEditingEventId(null);
    } else {
      onLifeEventsChange([...lifeEvents, finalEventData]);
    }
    
    setNewEvent(getInitialNewEventState()); // フォームをリセット
  };

  const handleEdit = (eventToEdit: LifeEvent) => {
    setEditingEventId(eventToEdit.id);
    // ★修正: LifeEvent型からEditableLifeEvent型へ変換してセット
    setNewEvent({
        ...eventToEdit,
        age: eventToEdit.age, // numberなのでそのまま
        amount: eventToEdit.amount, // numberなのでそのまま
        endAge: eventToEdit.endAge === undefined ? '' : eventToEdit.endAge, // undefinedなら空文字に
    });
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm('このライフイベントを削除してもよろしいですか？')) {
      onLifeEventsChange(lifeEvents.filter(event => event.id !== eventId));
      if (editingEventId === eventId) {
        setEditingEventId(null);
        setNewEvent(getInitialNewEventState());
      }
    }
  };
  
  const currentMinAge = typeof currentAge === 'number' && currentAge > 0 ? currentAge.toString() : "0";
  const currentMaxAge = typeof lifeExpectancy === 'number' && lifeExpectancy > 0 ? lifeExpectancy.toString() : "120";

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-xl font-semibold text-sky-700 mb-4 border-b pb-2">ライフイベント設定</h2>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">イベント内容:</label>
          <input type="text" name="description" id="description" value={newEvent.description} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-slate-700">発生年齢 (歳):</label>
            {/* ★修正: value を newEvent.age (number | '') に合わせる */}
            <input type="number" name="age" id="age" value={newEvent.age} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min={currentMinAge} max={currentMaxAge} />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700">金額 (円):</label>
            {/* ★修正: value を newEvent.amount (number | '') に合わせる */}
            <input type="number" name="amount" id="amount" value={newEvent.amount} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min="0" step="10000" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">種類:</label>
            <select name="type" id="type" value={newEvent.type} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </select>
          </div>
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-slate-700">頻度:</label>
            <select name="frequency" id="frequency" value={newEvent.frequency} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
              <option value="one-time">一回のみ</option>
              <option value="annual">毎年</option>
            </select>
          </div>
        </div>
        {newEvent.frequency === 'annual' && (
          <div>
            <label htmlFor="endAge" className="block text-sm font-medium text-slate-700">終了年齢 (歳, 毎年イベントの場合 - 未入力で寿命まで):</label>
            {/* ★修正: value を newEvent.endAge (number | '' | undefined) に合わせる */}
            <input type="number" name="endAge" id="endAge" value={newEvent.endAge ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" min={(typeof newEvent.age === 'number' ? newEvent.age : currentMinAge).toString()} max={currentMaxAge} placeholder="未入力で寿命まで" />
          </div>
        )}
        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150">
          {editingEventId ? 'イベントを更新' : 'イベントを追加'}
        </button>
        {editingEventId && (
            <button type="button" onClick={() => { setEditingEventId(null); setNewEvent(getInitialNewEventState()); }} className="ml-2 px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition duration-150">
                キャンセル
            </button>
        )}
      </form>

      {lifeEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">登録済みライフイベント</h3>
          <ul className="space-y-2">
            {lifeEvents.sort((a,b) => a.age - b.age).map((event) => (
              <li key={event.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{event.description} ({event.age}歳)</p>
                  <p className="text-sm text-slate-600">
                    {event.type === 'income' ? '収入' : '支出'}: {event.amount.toLocaleString()} 円 ({event.frequency === 'one-time' ? '一回のみ' : `毎年${event.endAge ? ` (${event.endAge}歳まで)` : '(寿命まで)'}`})
                  </p>
                </div>
                <div>
                  <button onClick={() => handleEdit(event)} className="text-sm text-sky-600 hover:text-sky-800 mr-2">編集</button>
                  <button onClick={() => handleDelete(event.id)} className="text-sm text-red-500 hover:text-red-700">削除</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LifeEventForm; 

