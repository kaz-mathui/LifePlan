import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  pickTodayMissions, getProgress, getCoreProgress,
  QUESTIONS, CATEGORY_TO_GROUP, GROUPS, getGroupProgress,
  QuestionDef,
} from '../data/questions';
import MissionCard from './MissionCard';
import GroupProgress from './GroupProgress';
import Forecast from './Forecast';
import { useV2Answers } from './useV2Answers';
import { simulateFromAnswers, getKeyMetrics, formatMan } from './simulator';
import PlanSelector from './PlanSelector';
import MFImport from './MFImport';
import CompletionCertificate from './CompletionCertificate';
import ScenarioBoard from './ScenarioBoard';

type ViewMode = 'today' | 'groups' | 'group_detail' | 'forecast' | 'tools';

const todayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const MissionHome: React.FC = () => {
  const [currentPlanId, setCurrentPlanId] = useState<string>('default');
  const { answers, updateAnswer, loaded, syncing, uid } = useV2Answers(currentPlanId);
  const [mode, setMode] = useState<ViewMode>('today');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  // 「今日のミッション」関連 state
  // - todayQuotaList: 「今日のミッション」として固定された質問キー(順番崩れず)
  // - extraRounds: 「もっとやる」で追加した回数
  // - dailyDone: 「今日完了」したか
  const todayKey = todayDateKey();
  const lsTodayKey = `lifeplan_v2_today_${uid || 'anon'}_${currentPlanId}`;
  const [todayState, setTodayState] = useState<{ date: string; quota: string[]; extraRounds: number; doneAt?: string }>({
    date: todayKey, quota: [], extraRounds: 0,
  });

  // ロード(日付変わったらリセット)
  React.useEffect(() => {
    if (!loaded) return;
    try {
      const raw = localStorage.getItem(lsTodayKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayKey) {
          setTodayState(parsed);
          return;
        }
      }
    } catch {}
    setTodayState({ date: todayKey, quota: [], extraRounds: 0 });
  }, [loaded, lsTodayKey, todayKey]);

  // todayState の永続化
  React.useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(lsTodayKey, JSON.stringify(todayState)); } catch {}
  }, [todayState, loaded, lsTodayKey]);

  // MF CSV 取り込み: 複数キーをまとめて反映
  const applyBulkUpdates = (updates: Record<string, any>) => {
    Object.entries(updates).forEach(([k, v]) => updateAnswer(k, v));
  };

  const handleUseEstimate = (key: string) => {
    // 統計推定値で埋める。実際の値は dataの estimateRef を参照する想定だが、
    // Phase 1 ではプレースホルダ値を入れる(後続で動的計算に差し替え)
    const q = QUESTIONS.find(x => x.key === key);
    if (!q) return;
    let estimate: any = '';
    if (q.type === 'currency' || q.type === 'number' || q.type === 'percent') {
      estimate = q.min != null ? Math.round((q.min + (q.max ?? 100)) / 2) : 0;
    } else if (q.type === 'select' && q.options && q.options.length > 0) {
      const mid = Math.floor(q.options.length / 2);
      estimate = String(q.options[mid].value);
    } else if (q.type === 'boolean') {
      estimate = false;
    } else {
      estimate = '';
    }
    updateAnswer(key, estimate);
  };

  const handleSkip = (key: string) => {
    // スキップ = 一時的に「skipped」マークを付けて、次のミッションへ
    try {
      const skippedKey = 'lifeplan_v2_skipped_' + (uid || 'anon');
      const skipped = JSON.parse(localStorage.getItem(skippedKey) || '{}');
      skipped[key] = Date.now();
      localStorage.setItem(skippedKey, JSON.stringify(skipped));
    } catch {}
    // 値ゼロをマーク代わりに保存して既回答扱いにする(ベース予測トリガーには影響大なので注意)
    // 代替: 何もしない(再表示は許容)
  };

  const overall = useMemo(() => getProgress(answers), [answers]);
  const core = useMemo(() => getCoreProgress(answers), [answers]);

  // 今日のミッション: quota が空なら3問選出してロック
  React.useEffect(() => {
    if (!loaded) return;
    if (todayState.quota.length === 0) {
      const picked = pickTodayMissions(answers, 3);
      if (picked.length > 0) {
        setTodayState(s => ({ ...s, quota: picked.map(q => q.key) }));
      }
    }
  }, [loaded, todayState.quota.length, answers]);

  // quota に対応する質問オブジェクトを取得
  const todayMissions = useMemo(() => {
    return todayState.quota
      .map(k => QUESTIONS.find(q => q.key === k))
      .filter((q): q is NonNullable<typeof q> => !!q);
  }, [todayState.quota]);

  // 今日のミッションのうち、回答済みの数
  const todayAnsweredCount = todayMissions.filter(
    q => answers[q.key] != null && answers[q.key] !== ''
  ).length;
  const todayAllDone = todayMissions.length > 0 && todayAnsweredCount === todayMissions.length;

  // 「もっとやる」: quota を3つ追加
  const addMoreMissions = () => {
    const picked = pickTodayMissions(answers, 3);
    const newKeys = picked.map(q => q.key).filter(k => !todayState.quota.includes(k));
    if (newKeys.length > 0) {
      setTodayState(s => ({ ...s, quota: [...s.quota, ...newKeys], extraRounds: s.extraRounds + 1 }));
    }
  };

  // 「今日は完了」明示宣言
  const markTodayDone = () => {
    setTodayState(s => ({ ...s, doneAt: new Date().toISOString() }));
  };

  // ベース予測解放判定
  const baseUnlocked = core.percent >= 100;

  // 質問回答時の差分通知: ベース解放後のみ。65歳資産の変化を toast 表示
  const handleAnswerSave = (key: string, value: any) => {
    const oldValue = answers[key];
    const isFirstAnswer = oldValue == null || oldValue === '';
    const beforeMetrics = baseUnlocked ? getKeyMetrics(simulateFromAnswers(answers)) : null;
    updateAnswer(key, value);

    if (beforeMetrics && beforeMetrics.assetsAt65 !== 0) {
      const newAnswers = { ...answers, [key]: value };
      const afterMetrics = getKeyMetrics(simulateFromAnswers(newAnswers));
      const diff = afterMetrics.assetsAt65 - beforeMetrics.assetsAt65;
      const pct = (diff / Math.abs(beforeMetrics.assetsAt65)) * 100;

      // 30万円以上 or 0.5%以上の変化のみ通知
      if (Math.abs(diff) > 30 || Math.abs(pct) > 0.5) {
        const sign = diff >= 0 ? '+' : '';
        const icon = diff >= 0 ? '📈' : '📉';
        const color = diff >= 0 ? 'text-green-600' : 'text-red-600';
        toast.custom(t => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-2' : ''} bg-white rounded-2xl shadow-xl border border-gray-200 px-4 py-3 max-w-xs`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{icon}</div>
              <div>
                <div className="text-[10px] text-gray-500 font-semibold">65歳の資産予測</div>
                <div className={`text-base font-extrabold ${color}`}>
                  {sign}{formatMan(diff)}
                </div>
                <div className={`text-xs font-bold ${color}`}>
                  {sign}{pct.toFixed(1)}% {isFirstAnswer ? '(初回反映)' : ''}
                </div>
              </div>
            </div>
          </div>
        ), { duration: 2800, position: 'top-center' });
      }
    } else if (!baseUnlocked && isFirstAnswer) {
      // ベース解放前: 残り何問でアンロックかを表示
      const remaining = 12 - Math.min(12, Math.round(core.percent * 12 / 100));
      if (remaining > 0 && remaining <= 11) {
        toast(`コア質問 あと${remaining}問でベース予測がアンロック`, { icon: '⭐', duration: 1800 });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {tourOpen && (
        <ScenarioBoard
          answers={answers}
          onClose={() => setTourOpen(false)}
          onApplyToReality={(updates) => {
            Object.entries(updates).forEach(([k, v]) => updateAnswer(k, v));
            toast.success(`${Object.keys(updates).length}件の戦略を反映しました`, { icon: '✨', duration: 2500 });
          }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              LifePlan <span className="text-blue-600">v2</span>
              {syncing && (
                <span className="text-[10px] text-blue-500 font-semibold animate-pulse">同期中…</span>
              )}
              {!uid && (
                <span className="text-[10px] text-gray-400 font-semibold">ローカルのみ</span>
              )}
            </h1>
            <span className="text-xs text-gray-500 font-semibold">
              {overall.answered} / {overall.total} ({overall.percent}%)
            </span>
          </div>
        </div>
      </header>

      {!loaded && (
        <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500 text-sm">
          データを読み込んでいます…
        </div>
      )}

      <main className={`max-w-xl mx-auto px-4 py-4 space-y-4 ${!loaded ? 'hidden' : ''}`}>
        {/* プラン選択 (ログイン時のみ) */}
        {uid && <PlanSelector currentPlanId={currentPlanId} onChange={setCurrentPlanId} />}

        {/* コア進捗(12問完了でベース予測解放) */}
        {!baseUnlocked && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-xs opacity-80 font-bold uppercase tracking-wider mb-1">
              ⭐ コア質問の進捗
            </div>
            <div className="text-3xl font-extrabold leading-tight">
              {core.answered} / {core.total} 問
            </div>
            <div className="text-xs opacity-90 mt-1">
              あと <b>{core.total - core.answered}問</b> で、ベース予測がアンロックされます
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 transition-all duration-500" style={{ width: `${core.percent}%` }} />
            </div>
            {/* 待たせない導線: 仮予測は今すぐ見られる / MFインポートで一気に入力 */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('forecast')}
                className="py-2 rounded-xl bg-white/15 text-white text-[11px] font-bold active:scale-[0.97] transition-transform"
              >
                🔮 仮予測を今すぐ見る
              </button>
              <button
                onClick={() => setMode('tools')}
                className="py-2 rounded-xl bg-white/15 text-white text-[11px] font-bold active:scale-[0.97] transition-transform"
              >
                📥 MFのCSVで一気に入力
              </button>
            </div>
          </div>
        )}

        {baseUnlocked && (
          <>
            <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-2xl p-5 shadow-lg">
              <div className="text-xs opacity-80 font-bold uppercase tracking-wider mb-1">
                ✓ ベース予測 解放済み
              </div>
              <div className="text-2xl font-extrabold leading-tight">
                次は詳細精度を上げよう
              </div>
              <div className="text-xs opacity-90 mt-1">
                全体 {overall.percent}% 完了。残り {overall.total - overall.answered} 問
              </div>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-300 transition-all duration-500" style={{ width: `${overall.percent}%` }} />
              </div>
            </div>
          </>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('today')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'today' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            📍 今日
          </button>
          <button
            onClick={() => setMode('forecast')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'forecast' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            🔮 {baseUnlocked ? '予測' : '仮予測'}
          </button>
          <button
            onClick={() => setMode('groups')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'groups' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            🗂 カテゴリ
          </button>
          <button
            onClick={() => setMode('tools')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'tools' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            🔧 ツール
          </button>
        </div>

        {/* 今日のミッション (1問ずつフォーカス表示) */}
        {mode === 'today' && (
          <TodayMissionFocus
            todayMissions={todayMissions}
            answers={answers}
            todayState={todayState}
            todayAllDone={todayAllDone}
            todayAnsweredCount={todayAnsweredCount}
            overallPercent={overall.percent}
            baseUnlocked={baseUnlocked}
            updateAnswer={handleAnswerSave}
            handleSkip={handleSkip}
            handleUseEstimate={handleUseEstimate}
            addMoreMissions={addMoreMissions}
            markTodayDone={markTodayDone}
            resetDone={() => setTodayState(s => ({ ...s, doneAt: undefined }))}
            setMode={setMode}
          />
        )}

        {/* 予測タブ (ロック中も「仮予測」として開放し、初回から価値を見せる) */}
        {mode === 'forecast' && (
          <div className="space-y-3">
            {!baseUnlocked && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                <div className="text-sm font-extrabold text-amber-900">⚡ これは平均値ベースの仮予測です</div>
                <div className="text-xs text-amber-800 mt-1 leading-relaxed">
                  未回答の項目は同世代の標準値で計算しています。
                  コア質問あと<b>{core.total - core.answered}問</b>で「あなた仕様」のベース予測に切り替わり、
                  以降は答えるほど精度が上がります。
                </div>
                <button
                  onClick={() => setMode('today')}
                  className="mt-3 w-full py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold active:scale-[0.98] transition-transform"
                >
                  📍 今日の3問に答えて精度を上げる
                </button>
              </div>
            )}

            {/* シナリオツアー導線 (ヒーローバナー・解放後のみ) */}
            {baseUnlocked && (
              <button
                onClick={() => setTourOpen(true)}
                className="w-full rounded-2xl p-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🌅</div>
                  <div className="flex-1">
                    <div className="text-base font-extrabold">もしも、の戦略ボード</div>
                    <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                      あり得た未来をトグルで切り替え、効果を即座に確認
                    </div>
                  </div>
                  <div className="text-xl opacity-80">→</div>
                </div>
              </button>
            )}

            <Forecast
              answers={answers}
              compact={!baseUnlocked}
              onOpenScenarioBoard={baseUnlocked ? () => setTourOpen(true) : undefined}
            />
          </div>
        )}

        {/* ツールタブ */}
        {mode === 'tools' && (
          <div className="space-y-3">
            <MFImport onApply={applyBulkUpdates} />
            {/* 完成証明書(全問完了時のみ) */}
            {overall.percent === 100 && <CompletionCertificate answers={answers} overall={overall} />}
          </div>
        )}

        {/* カテゴリ別 + 検索 */}
        {mode === 'groups' && (
          <GroupsWithSearch
            answers={answers}
            onSelectGroup={(g) => { setSelectedGroup(g); setMode('group_detail'); }}
            onSelectQuestion={() => {}}
            updateAnswer={handleAnswerSave}
          />
        )}

        {/* グループ詳細 */}
        {mode === 'group_detail' && selectedGroup && (
          <GroupDetailView
            groupKey={selectedGroup}
            answers={answers}
            onSave={handleAnswerSave}
            onBack={() => setMode('groups')}
          />
        )}
      </main>
    </div>
  );
};

const GroupDetailView: React.FC<{
  groupKey: string;
  answers: Record<string, any>;
  onSave: (key: string, value: any) => void;
  onBack: () => void;
}> = ({ groupKey, answers, onSave, onBack }) => {
  const questions = useMemo(() => {
    return QUESTIONS.filter(q => {
      if (CATEGORY_TO_GROUP[q.category] !== groupKey) return false;
      if (q.dependsOn) {
        const v = answers[q.dependsOn];
        const expected = q.dependsOnValue;
        const isVisible = Array.isArray(expected) ? expected.includes(v) : v === expected;
        if (!isVisible) return false;
      }
      return true;
    });
  }, [groupKey, answers]);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-blue-600 font-bold">← グループ一覧へ</button>
      {questions.map(q => (
        <MissionCard
          key={q.key}
          question={q}
          initialValue={answers[q.key]}
          onSave={onSave}
        />
      ))}
    </div>
  );
};

// ========== 検索つきカテゴリビュー ==========
const GroupsWithSearch: React.FC<{
  answers: Record<string, any>;
  onSelectGroup: (g: string) => void;
  onSelectQuestion: (k: string) => void;
  updateAnswer: (k: string, v: any) => void;
}> = ({ answers, onSelectGroup, updateAnswer }) => {
  const [search, setSearch] = useState('');
  const trimmed = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmed) return [];
    return QUESTIONS.filter(q => {
      // 依存条件で非表示はスキップ
      if (q.dependsOn) {
        const v = answers[q.dependsOn];
        const expected = q.dependsOnValue;
        const isVisible = Array.isArray(expected) ? expected.includes(v) : v === expected;
        if (!isVisible) return false;
      }
      const hay = [
        q.question, q.helpText || '', q.unit || '',
        ...(q.options || []).map(o => o.label),
      ].join(' ').toLowerCase();
      return hay.includes(trimmed);
    }).slice(0, 30);
  }, [trimmed, answers]);

  return (
    <div className="space-y-3">
      {/* 検索ボックス */}
      <div className="bg-white border border-gray-200 rounded-xl p-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 質問を検索(例: NISA / 住宅 / 子供)"
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
        />
      </div>

      {/* 検索結果 */}
      {trimmed && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-700 px-1">
            「{search}」の検索結果: {searchResults.length}件
          </div>
          {searchResults.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500">
              該当する質問はありません
            </div>
          )}
          {searchResults.map(q => (
            <MissionCard
              key={q.key}
              question={q}
              initialValue={answers[q.key]}
              onSave={updateAnswer}
            />
          ))}
        </div>
      )}

      {/* 検索していない時はグループ一覧 */}
      {!trimmed && (
        <GroupProgress answers={answers} onSelectGroup={onSelectGroup} />
      )}
    </div>
  );
};

// ========== 1問ずつフォーカス表示 ==========
const TodayMissionFocus: React.FC<{
  todayMissions: QuestionDef[];
  answers: Record<string, any>;
  todayState: any;
  todayAllDone: boolean;
  todayAnsweredCount: number;
  overallPercent: number;
  baseUnlocked: boolean;
  updateAnswer: (k: string, v: any) => void;
  handleSkip: (k: string) => void;
  handleUseEstimate: (k: string) => void;
  addMoreMissions: () => void;
  markTodayDone: () => void;
  resetDone: () => void;
  setMode: (m: any) => void;
}> = (props) => {
  const {
    todayMissions, answers, todayState, todayAllDone, todayAnsweredCount,
    overallPercent, baseUnlocked, updateAnswer, handleSkip, handleUseEstimate,
    addMoreMissions, markTodayDone, resetDone, setMode,
  } = props;

  // 全問完了(186問)
  if (todayMissions.length === 0 && overallPercent === 100) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-lg font-bold mb-1">全問完了!</div>
        <div className="text-sm text-gray-500">あなたの精密予測ダッシュボードが完成しました</div>
      </div>
    );
  }

  // 「今日終わった」状態
  if (todayState.doneAt) {
    return (
      <div className="bg-white border-2 border-green-200 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">✓</div>
        <div className="text-base font-bold mb-1 text-gray-900">今日は完了しました</div>
        <div className="text-xs text-gray-500 mb-4">
          明日また3問お待ちしています。毎日少しずつでも予測精度は上がっていきます。
        </div>
        <div className="flex gap-2">
          {baseUnlocked && (
            <button onClick={() => setMode('forecast')} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
              予測を見る
            </button>
          )}
          <button onClick={resetDone} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-xs">
            やっぱり続ける
          </button>
        </div>
      </div>
    );
  }

  // 完了セルブレーション
  if (todayAllDone) {
    return (
      <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-white rounded-2xl p-6 shadow-lg text-center">
        <div className="text-5xl mb-2">🎊</div>
        <div className="text-xl font-extrabold mb-1">今日のミッション完了!</div>
        <div className="text-sm opacity-95 mb-4">
          全 {todayAnsweredCount} 問に答えました。お疲れさまでした!<br/>
          {todayState.extraRounds > 0 && `(${todayState.extraRounds + 1}ラウンド達成)`}
        </div>
        <div className="flex flex-col gap-2">
          {baseUnlocked && (
            <button onClick={() => { markTodayDone(); setMode('forecast'); }}
              className="w-full py-3 bg-white text-orange-600 rounded-xl font-extrabold text-sm shadow">
              🔮 予測を見にいく →
            </button>
          )}
          <button onClick={addMoreMissions}
            className="w-full py-3 bg-white/20 backdrop-blur text-white border border-white/40 rounded-xl font-bold text-sm">
            + あと3問やる
          </button>
          <button onClick={markTodayDone} className="w-full py-2 text-white/90 underline text-xs">
            今日はここまでにする
          </button>
        </div>
      </div>
    );
  }

  // 未回答だけ抽出
  const unanswered = todayMissions.filter(q => answers[q.key] == null || answers[q.key] === '');
  const currentQ = unanswered[0];

  if (!currentQ) {
    // すべて回答済みだが todayAllDone が false(react更新ラグ)、何も表示しない
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 進捗インジケーター: ◯◯◯ */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          今日のミッション
        </div>
        <div className="flex items-center gap-1.5">
          {todayMissions.map((q, i) => {
            const isAns = answers[q.key] != null && answers[q.key] !== '';
            const isCurrent = q.key === currentQ.key;
            return (
              <span
                key={q.key}
                className={`block w-2 h-2 rounded-full transition-all ${
                  isAns ? 'bg-green-500' : isCurrent ? 'bg-blue-600 w-6' : 'bg-gray-300'
                }`}
              />
            );
          })}
          <span className="text-xs font-bold text-gray-700 ml-2">
            {todayAnsweredCount} / {todayMissions.length}
          </span>
        </div>
      </div>

      {/* 1問だけ表示(現在の質問) */}
      <MissionCard
        key={currentQ.key}  // key を分けることでアニメリセット
        question={currentQ}
        initialValue={answers[currentQ.key]}
        onSave={updateAnswer}
        onSkip={handleSkip}
        onUseEstimate={handleUseEstimate}
      />

      <div className="text-center text-xs text-gray-400 mt-2">
        答えると、次の質問に進みます
      </div>
    </div>
  );
};

export default MissionHome;
