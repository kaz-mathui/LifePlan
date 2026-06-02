// LifePlan v2.0 — 全150問の質問定義
// 全部入れれば「自分の人生の精密予測ダッシュボード」が完成
//
// 各問の意味:
//   key       — 一意ID(state保存・参照に使う)
//   category  — カテゴリ(進捗バー集計に使う)
//   order     — 表示順(数字小さいほど先)
//   question  — 質問文(直接表示)
//   helpText  — 補足説明(?マークで展開)
//   type      — 入力型
//   options   — type=selectの時の選択肢
//   unit      — 単位表示(円、%、歳 等)
//   difficulty — easy(秒で答える) / medium(調べる) / hard(計算が要る)
//   priority  — essential(必須) / recommended(推奨) / optional(任意)
//   impact    — high(予測への影響大) / medium / low
//   estimateRef — 統計プリフィル値の参照キー(未入力時の補完)

export type QuestionType =
  | 'number'
  | 'currency'    // 円表示
  | 'percent'     // %表示
  | 'select'
  | 'multi-select'
  | 'text'
  | 'date'
  | 'boolean'
  | 'age';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Priority = 'essential' | 'recommended' | 'optional';
export type Impact = 'high' | 'medium' | 'low';
// 思い出しコスト(28歳PdMレビュー指摘): 同じeasyでも「即答」と「調べる」では負荷が違う
export type RecallEffort = 'instant' | 'look_up' | 'estimate';

export interface QuestionOption {
  value: string | number | boolean;
  label: string;
  icon?: string;
}

export interface QuestionDef {
  key: string;
  category: CategoryKey;
  order: number;
  question: string;
  helpText?: string;
  type: QuestionType;
  options?: QuestionOption[];
  unit?: string;
  placeholder?: string;
  difficulty: Difficulty;
  priority: Priority;
  impact: Impact;
  estimateRef?: string;
  min?: number;
  max?: number;
  dependsOn?: string;       // この質問が表示される条件(他のkey)
  dependsOnValue?: any;     // dependsOnの値がこれと一致したら表示
  // v2.0 レビュー反映で追加
  isCore?: boolean;         // コア12問(ベース予測に必須)
  recallEffort?: RecallEffort; // 思い出しコスト
}

// 詳細カテゴリ(質問定義では細粒度のまま)
export type CategoryKey =
  | 'basic'
  | 'spouse'
  | 'children'
  | 'income_salary'
  | 'income_other'
  | 'expense_housing'
  | 'expense_food'
  | 'expense_utilities'
  | 'expense_insurance'
  | 'expense_hobby'
  | 'expense_transport'
  | 'asset_deposit'
  | 'asset_investment'
  | 'asset_realestate'
  | 'liability_loan'
  | 'liability_other'
  | 'pension'
  | 'retirement'
  | 'life_events'
  | 'health'
  | 'inheritance'
  | 'tax'
  | 'career'
  | 'other';

// UI表示用の統合カテゴリ(24→10、PdMレビュー反映)
export type GroupKey =
  | 'you'        // basic + health(自己評価)
  | 'family'     // spouse + children
  | 'work'       // income_salary + income_other + career
  | 'home'       // expense_housing + asset_realestate
  | 'living'     // expense_food + expense_utilities + expense_hobby + expense_transport
  | 'insurance'  // expense_insurance
  | 'assets'     // asset_deposit + asset_investment
  | 'debts'      // liability_loan + liability_other
  | 'retire'     // pension + retirement + health(介護)
  | 'future';    // life_events + inheritance + tax + other

export const CATEGORY_TO_GROUP: Record<CategoryKey, GroupKey> = {
  basic: 'you',
  spouse: 'family',
  children: 'family',
  income_salary: 'work',
  income_other: 'work',
  career: 'work',
  expense_housing: 'home',
  asset_realestate: 'home',
  expense_food: 'living',
  expense_utilities: 'living',
  expense_hobby: 'living',
  expense_transport: 'living',
  expense_insurance: 'insurance',
  asset_deposit: 'assets',
  asset_investment: 'assets',
  liability_loan: 'debts',
  liability_other: 'debts',
  pension: 'retire',
  retirement: 'retire',
  health: 'retire',
  life_events: 'future',
  inheritance: 'future',
  tax: 'future',
  other: 'future',
};

export interface GroupDef {
  key: GroupKey;
  label: string;
  icon: string;
  order: number;
}

export const GROUPS: GroupDef[] = [
  { key: 'you',       label: 'あなた',         icon: '👤', order: 1 },
  { key: 'family',    label: '家族',           icon: '👨‍👩‍👧', order: 2 },
  { key: 'work',      label: '仕事と収入',     icon: '💼', order: 3 },
  { key: 'home',      label: '住まい',         icon: '🏠', order: 4 },
  { key: 'living',    label: '毎月の生活費',   icon: '💸', order: 5 },
  { key: 'insurance', label: '保険',           icon: '🛡', order: 6 },
  { key: 'assets',    label: '資産',           icon: '💰', order: 7 },
  { key: 'debts',     label: '借入',           icon: '💳', order: 8 },
  { key: 'retire',    label: '老後',           icon: '👴', order: 9 },
  { key: 'future',    label: '将来・節税',     icon: '🎯', order: 10 },
];

// Group別の集計
export function getGroupProgress(answers: Record<string, any>): Record<GroupKey, { total: number; answered: number; percent: number }> {
  const result = {} as Record<GroupKey, { total: number; answered: number; percent: number }>;
  GROUPS.forEach(g => { result[g.key] = { total: 0, answered: 0, percent: 0 }; });

  QUESTIONS.forEach(q => {
    if (q.dependsOn) {
      const v = answers[q.dependsOn];
      const expected = q.dependsOnValue;
      const isVisible = Array.isArray(expected) ? expected.includes(v) : v === expected;
      if (!isVisible) return;
    }
    const group = CATEGORY_TO_GROUP[q.category];
    result[group].total++;
    if (answers[q.key] != null && answers[q.key] !== '') result[group].answered++;
  });

  GROUPS.forEach(g => {
    const r = result[g.key];
    r.percent = r.total > 0 ? Math.round(r.answered / r.total * 100) : 0;
  });

  return result;
}

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: string;
  description: string;
  order: number;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'basic',             label: '基本情報',         icon: '👤', description: 'あなた自身のこと', order: 1 },
  { key: 'spouse',            label: '配偶者・パートナー', icon: '💑', description: '配偶者の情報', order: 2 },
  { key: 'children',          label: '子供',             icon: '👶', description: '今・将来の子供のこと', order: 3 },
  { key: 'income_salary',     label: '収入: 給与',       icon: '💼', description: 'メインの収入', order: 4 },
  { key: 'income_other',      label: '収入: その他',     icon: '💰', description: '副業・配当・家賃収入', order: 5 },
  { key: 'expense_housing',   label: '支出: 住居',       icon: '🏠', description: '家賃・住宅ローン・修繕', order: 6 },
  { key: 'expense_food',      label: '支出: 食費',       icon: '🍙', description: '食費・日用品', order: 7 },
  { key: 'expense_utilities', label: '支出: 通信光熱',   icon: '💡', description: '電気・水道・通信', order: 8 },
  { key: 'expense_insurance', label: '支出: 保険',       icon: '🛡', description: '生命保険・医療保険', order: 9 },
  { key: 'expense_hobby',     label: '支出: 趣味',       icon: '🎮', description: '娯楽・サブスク', order: 10 },
  { key: 'expense_transport', label: '支出: 交通',       icon: '🚃', description: '交通費・車', order: 11 },
  { key: 'asset_deposit',     label: '資産: 預金',       icon: '🏦', description: '現金・預金', order: 12 },
  { key: 'asset_investment',  label: '資産: 投資',       icon: '📈', description: '株・投信・iDeCo・NISA', order: 13 },
  { key: 'asset_realestate',  label: '資産: 不動産',     icon: '🏘', description: '持ち家・投資不動産', order: 14 },
  { key: 'liability_loan',    label: '負債: ローン',     icon: '💳', description: '住宅・自動車・奨学金', order: 15 },
  { key: 'liability_other',   label: '負債: その他',     icon: '⚠️', description: 'カード残高・借入', order: 16 },
  { key: 'pension',           label: '年金',             icon: '👴', description: '加入歴・見込額', order: 17 },
  { key: 'retirement',        label: '退職金',           icon: '🎁', description: '退職金・退職計画', order: 18 },
  { key: 'life_events',       label: 'ライフイベント',   icon: '🎯', description: '結婚・出産・住宅・移住', order: 19 },
  { key: 'health',            label: '健康・介護',       icon: '🏥', description: '健康状態・介護見込み', order: 20 },
  { key: 'inheritance',       label: '相続・贈与',       icon: '🌳', description: '相続予定・贈与計画', order: 21 },
  { key: 'tax',               label: '節税',             icon: '💡', description: 'NISA・iDeCo・ふるさと納税', order: 22 },
  { key: 'career',            label: 'キャリア',         icon: '📊', description: '転職・独立予定', order: 23 },
  { key: 'other',             label: 'その他',           icon: '📝', description: 'ペット・寄付等', order: 24 },
];

export const QUESTIONS: QuestionDef[] = [
  // ============ 基本情報 (8問: 1問削除 + 2問追加) ============
  { key:'b_age', category:'basic', order:1, question:'いま何歳ですか?', type:'age', unit:'歳', min:18, max:80, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'b_gender', category:'basic', order:2, question:'性別', type:'select', options:[{value:'m',label:'男性'},{value:'f',label:'女性'},{value:'o',label:'その他/答えない'}], difficulty:'easy', priority:'essential', impact:'medium', recallEffort:'instant' },
  { key:'b_residence_pref', category:'basic', order:3, question:'お住まいの都道府県', type:'select', options:[], difficulty:'easy', priority:'recommended', impact:'medium', helpText:'家賃・物価水準・教育費補助等の地域差を反映', recallEffort:'instant' },
  { key:'b_residence_size', category:'basic', order:4, question:'お住まいの地域規模', type:'select', options:[{value:'metro',label:'政令市・東京23区'},{value:'city',label:'地方都市'},{value:'rural',label:'郡部・町村'}], difficulty:'easy', priority:'recommended', impact:'medium', recallEffort:'instant' },
  { key:'b_household_status', category:'basic', order:5, question:'世帯形態', type:'select', options:[{value:'single',label:'独身一人暮らし'},{value:'parents',label:'親と同居'},{value:'married_nokid',label:'夫婦のみ'},{value:'married_kid',label:'夫婦+子'},{value:'single_parent',label:'シングルペアレント'}], difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'b_target_lifespan', category:'basic', order:6, question:'何歳まで生きる前提で計画しますか?', type:'select', options:[{value:85,label:'85歳'},{value:90,label:'90歳(推奨)'},{value:95,label:'95歳'},{value:100,label:'100歳'}], unit:'歳', difficulty:'easy', priority:'essential', impact:'high', estimateRef:'lifespan_default', helpText:'平均寿命は男81歳・女87歳、保守的に90歳推奨', recallEffort:'instant' },
  { key:'b_dependents_other', category:'basic', order:7, question:'扶養している家族(配偶者・子以外)の人数', type:'number', unit:'人', min:0, max:10, difficulty:'easy', priority:'optional', impact:'medium', helpText:'親・兄弟など。税額・支出に影響', recallEffort:'instant' },
  { key:'infl_assumption', category:'basic', order:8, question:'想定インフレ率', type:'select', options:[{value:0,label:'0%(物価据置)'},{value:0.01,label:'1%(緩やか)'},{value:0.02,label:'2%(日銀目標)'},{value:0.03,label:'3%(高め)'}], unit:'%/年', difficulty:'easy', priority:'recommended', impact:'high', helpText:'30年スパンでは1%差で結果が±30%動きます', recallEffort:'estimate' },

  // ============ 配偶者・パートナー (8問) ============
  { key:'sp_status', category:'spouse', order:1, question:'配偶者・パートナーの状況', type:'select', options:[{value:'none',label:'いない'},{value:'dating',label:'交際中'},{value:'cohab',label:'同棲中'},{value:'married',label:'結婚済み'}], difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'sp_age', category:'spouse', order:2, question:'配偶者の年齢', type:'age', unit:'歳', min:18, max:90, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'sp_status', dependsOnValue:['cohab','married'] },
  { key:'sp_income', category:'spouse', order:3, question:'配偶者の年収(額面)', type:'currency', unit:'万円', min:0, max:5000, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'sp_status', dependsOnValue:['cohab','married'] },
  { key:'sp_job', category:'spouse', order:4, question:'配偶者の職業', type:'select', options:[{value:'company',label:'会社員'},{value:'public',label:'公務員'},{value:'freelance',label:'自営・フリー'},{value:'part',label:'パート・主婦/主夫'},{value:'other',label:'その他'}], difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'sp_status', dependsOnValue:['cohab','married'] },
  { key:'sp_retire_age', category:'spouse', order:5, question:'配偶者の退職予定年齢', type:'age', unit:'歳', min:50, max:75, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'sp_status', dependsOnValue:['cohab','married'] },
  { key:'sp_pension_estimate', category:'spouse', order:6, question:'配偶者の年金見込み(月額)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'hard', priority:'recommended', impact:'high', dependsOn:'sp_status', dependsOnValue:['cohab','married'], helpText:'ねんきん定期便で確認、不明なら厚生年金平均14.7万', recallEffort:'look_up' },
  { key:'sp_marry_plan_year', category:'spouse', order:7, question:'結婚予定までの年数', type:'number', unit:'年', min:0, max:20, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'sp_status', dependsOnValue:['dating','cohab'], recallEffort:'estimate' },
  { key:'sp_work_style_now', category:'spouse', order:8, question:'配偶者の現在の働き方', type:'select', options:[{value:'fulltime',label:'フルタイム'},{value:'shorttime',label:'時短'},{value:'part',label:'パート'},{value:'leave',label:'休職中'},{value:'home',label:'専業主婦/夫'}], difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'sp_status', dependsOnValue:['cohab','married'], recallEffort:'instant' },
  { key:'sp_work_style_change_plan', category:'spouse', order:9, question:'配偶者の働き方の変更予定', type:'select', options:[{value:'keep',label:'今のまま'},{value:'fulltime_return',label:'フルタイム復帰予定'},{value:'reduce',label:'減らす予定'},{value:'quit',label:'退職予定'}], difficulty:'easy', priority:'optional', impact:'high', dependsOn:'sp_status', dependsOnValue:['cohab','married'], helpText:'子の就学等タイミングでの変化', recallEffort:'estimate' },

  // ============ 子供 (10問) ============
  { key:'c_has_or_plan', category:'children', order:1, question:'子供の状況', type:'select', options:[{value:'none',label:'予定なし'},{value:'planning',label:'欲しい・予定中'},{value:'have',label:'既にいる'}], difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'c_count_current', category:'children', order:2, question:'現在の子供の人数', type:'number', unit:'人', min:0, max:10, difficulty:'easy', priority:'essential', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:'have' },
  { key:'c_count_plan', category:'children', order:3, question:'将来希望する子供の人数', type:'number', unit:'人', min:0, max:10, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:'planning' },
  { key:'c_first_birth_year', category:'children', order:4, question:'第一子の予定/誕生年(西暦)', type:'number', unit:'年', min:1990, max:2050, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'] },
  { key:'c_edu_plan', category:'children', order:5, question:'教育プラン(基本路線)', type:'select', options:[{value:'all_public',label:'すべて公立'},{value:'mixed',label:'公私混合'},{value:'all_private',label:'すべて私立'},{value:'science',label:'理系/医歯系'},{value:'overseas',label:'海外'}], difficulty:'medium', priority:'recommended', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'] },
  { key:'c_juku_yearly', category:'children', order:6, question:'塾・習い事の年間費用(ピーク年・子1人)', type:'currency', unit:'万円/年', min:0, max:200, difficulty:'medium', priority:'recommended', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'], estimateRef:'edu_juku_avg', helpText:'中学受験なら100-150万、高校受験で80万が目安', recallEffort:'estimate' },
  { key:'c_juku_exam_plan', category:'children', order:7, question:'中学受験を予定?', type:'select', options:[{value:'no',label:'公立中学のみ'},{value:'maybe',label:'検討中'},{value:'yes',label:'はい(受験予定/済)'},{value:'private_jh',label:'付属校で受験なし'}], difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'], helpText:'中受は塾費が小4-6で年100-150万', recallEffort:'estimate' },
  { key:'c_third_child_plan', category:'children', order:8, question:'第3子以降の予定', type:'select', options:[{value:'no',label:'なし'},{value:'considering',label:'検討中'},{value:'planning',label:'予定あり'}], difficulty:'easy', priority:'optional', impact:'high', dependsOn:'c_has_or_plan', dependsOnValue:'have' },
  { key:'c_univ_living_cost', category:'children', order:7, question:'大学で下宿予定?', type:'select', options:[{value:'home',label:'自宅通学'},{value:'dorm',label:'下宿'},{value:'overseas_living',label:'海外留学'}], difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'] },
  // c_child_allowance 削除(制度から自動計算可能)
  { key:'c_gakushi_insurance', category:'children', order:9, question:'学資保険の月額', type:'currency', unit:'万円/月', min:0, max:10, difficulty:'medium', priority:'optional', impact:'low', dependsOn:'c_has_or_plan', dependsOnValue:'have', recallEffort:'look_up' },
  { key:'c_grandparent_support', category:'children', order:10, question:'祖父母からの教育援助予定', type:'currency', unit:'万円(累計)', min:0, max:5000, difficulty:'hard', priority:'optional', impact:'medium', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'], recallEffort:'estimate' },

  // ============ 収入: 給与 (8問) ============
  { key:'is_annual_income', category:'income_salary', order:1, question:'年収(額面・税込み)', type:'currency', unit:'万円', min:0, max:10000, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'is_take_home_known', category:'income_salary', order:2, question:'手取り年収(把握している場合)', type:'currency', unit:'万円', min:0, max:10000, difficulty:'easy', priority:'recommended', impact:'high', helpText:'iDeCo・確定拠出・住民税等で個人差大。把握できれば計算精度が大幅向上', recallEffort:'look_up' },
  // is_bonus_ratio 削除(年収に含まれる)
  { key:'is_job_type', category:'income_salary', order:3, question:'雇用形態', type:'select', options:[{value:'regular',label:'正社員'},{value:'contract',label:'契約'},{value:'temp',label:'派遣'},{value:'part',label:'パート'},{value:'self',label:'自営/フリー'}], difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'is_industry', category:'income_salary', order:4, question:'業界', type:'select', options:[{value:'it',label:'IT・通信'},{value:'finance',label:'金融'},{value:'manuf',label:'製造'},{value:'public',label:'公務員'},{value:'retail',label:'小売・サービス'},{value:'medical',label:'医療'},{value:'other',label:'その他'}], difficulty:'easy', priority:'recommended', impact:'medium', recallEffort:'instant' },
  { key:'is_company_size', category:'income_salary', order:5, question:'会社規模', type:'select', options:[{value:'large',label:'大企業(1000人超)'},{value:'mid',label:'中堅(100-1000)'},{value:'small',label:'中小(100未満)'},{value:'startup',label:'スタートアップ'}], difficulty:'easy', priority:'recommended', impact:'high', helpText:'退職金水準に影響', recallEffort:'instant' },
  { key:'is_growth_rate', category:'income_salary', order:6, question:'年収の昇給見込み', type:'percent', unit:'%/年', min:0, max:20, difficulty:'medium', priority:'recommended', impact:'high', estimateRef:'wage_growth_avg', recallEffort:'estimate' },
  { key:'is_rsu_so', category:'income_salary', order:7, question:'RSU・ストックオプションの年間取得', type:'currency', unit:'万円/年', min:0, max:5000, difficulty:'hard', priority:'optional', impact:'high', recallEffort:'look_up' },
  // is_overtime_pct 削除(年収に含まれる)
  { key:'is_housing_subsidy', category:'income_salary', order:8, question:'家賃補助・社宅補助(月)', type:'currency', unit:'万円/月', min:0, max:30, difficulty:'easy', priority:'optional', impact:'medium', helpText:'会社からの住宅補助。手取りに加算される', recallEffort:'look_up' },

  // ============ 収入: その他 (6問) ============
  { key:'io_side_income', category:'income_other', order:1, question:'副業収入(月平均)', type:'currency', unit:'万円/月', min:0, max:500, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'io_dividend', category:'income_other', order:2, question:'配当・利息収入(年間)', type:'currency', unit:'万円/年', min:0, max:2000, difficulty:'medium', priority:'optional', impact:'medium' },
  { key:'io_rental', category:'income_other', order:3, question:'不動産家賃収入(年間)', type:'currency', unit:'万円/年', min:0, max:5000, difficulty:'medium', priority:'optional', impact:'high' },
  { key:'io_gift_inherit_received', category:'income_other', order:4, question:'今後の贈与・相続予定額(累計)', type:'currency', unit:'万円', min:0, max:50000, difficulty:'hard', priority:'optional', impact:'high' },
  { key:'io_pension_now', category:'income_other', order:5, question:'すでに受給中の年金(月額)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'easy', priority:'optional', impact:'high' },
  { key:'io_other_business', category:'income_other', order:6, question:'その他事業収入', type:'currency', unit:'万円/年', min:0, max:5000, difficulty:'hard', priority:'optional', impact:'medium' },

  // ============ 支出: 住居 (8問) ============
  { key:'eh_type', category:'expense_housing', order:1, question:'住居形態', type:'select', options:[{value:'rent',label:'賃貸'},{value:'own',label:'持ち家(ローン中)'},{value:'own_paid',label:'持ち家(完済)'},{value:'family',label:'親と同居'}], difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'eh_monthly', category:'expense_housing', order:2, question:'月の住居費(家賃 or ローン返済)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'instant' },
  { key:'eh_property_value', category:'expense_housing', order:3, question:'自宅、いま売ったらいくらくらい?', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'recommended', impact:'high', dependsOn:'eh_type', dependsOnValue:['own','own_paid'], helpText:'分からなければ購入時の価格でOK', recallEffort:'estimate' },
  { key:'eh_loan_balance', category:'expense_housing', order:4, question:'住宅ローン残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'essential', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', recallEffort:'look_up' },
  { key:'eh_loan_remaining_years', category:'expense_housing', order:5, question:'ローン残年数', type:'number', unit:'年', min:0, max:40, difficulty:'easy', priority:'essential', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', recallEffort:'look_up' },
  { key:'eh_loan_rate', category:'expense_housing', order:6, question:'ローン金利', type:'percent', unit:'%', min:0, max:10, difficulty:'medium', priority:'essential', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', recallEffort:'look_up' },
  { key:'eh_loan_type', category:'expense_housing', order:7, question:'ローン金利タイプ', type:'select', options:[{value:'variable',label:'変動'},{value:'fixed_period',label:'固定期間選択'},{value:'fixed',label:'全期間固定/フラット35'}], difficulty:'easy', priority:'essential', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', helpText:'金利上昇シナリオで結果が大きく変わる', recallEffort:'look_up' },
  { key:'eh_loan_pair', category:'expense_housing', order:8, question:'ペアローン/連帯債務か', type:'boolean', difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', helpText:'団信・離婚時・どちらかの収入減シナリオで影響大', recallEffort:'instant' },
  { key:'eh_refinance_plan', category:'expense_housing', order:9, question:'繰上げ返済/借換の予定', type:'select', options:[{value:'none',label:'予定なし'},{value:'prepay_after_deduction',label:'住宅ローン控除終了後に繰上げ'},{value:'refinance',label:'借換を検討'},{value:'aggressive',label:'積極的に繰上げ'}], difficulty:'easy', priority:'optional', impact:'high', dependsOn:'eh_type', dependsOnValue:'own', recallEffort:'estimate' },
  { key:'eh_property_tax_yearly', category:'expense_housing', order:10, question:'固定資産税(年間)', type:'currency', unit:'万円/年', min:0, max:100, difficulty:'medium', priority:'recommended', impact:'medium', dependsOn:'eh_type', dependsOnValue:['own','own_paid'], recallEffort:'look_up' },
  { key:'eh_repair_reserve', category:'expense_housing', order:11, question:'修繕積立・管理費(月)', type:'currency', unit:'万円/月', min:0, max:10, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'eh_type', dependsOnValue:['own','own_paid'], recallEffort:'look_up' },

  // ============ 支出: 食費・日用品 (2問: 5問から統合) ============
  { key:'ef_total_monthly', category:'expense_food', order:1, question:'食費・日用品 月合計', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'medium', priority:'essential', impact:'high', isCore:true, estimateRef:'food_avg', helpText:'食材+外食+日用品+被服+嗜好品の合計', recallEffort:'estimate' },
  { key:'ef_eating_out_ratio', category:'expense_food', order:2, question:'うち外食の割合', type:'percent', unit:'%', min:0, max:100, difficulty:'medium', priority:'optional', impact:'low', recallEffort:'estimate' },

  // ============ 支出: 通信・光熱費 (2問: 5問から統合) ============
  { key:'eu_utility_monthly', category:'expense_utilities', order:1, question:'光熱費(電気+ガス+水道)月合計', type:'currency', unit:'万円/月', min:0, max:10, difficulty:'easy', priority:'recommended', impact:'low', recallEffort:'look_up' },
  { key:'eu_comm_monthly', category:'expense_utilities', order:2, question:'通信費(スマホ+ネット)月合計', type:'currency', unit:'万円/月', min:0, max:5, difficulty:'easy', priority:'recommended', impact:'low', recallEffort:'look_up' },

  // ============ 支出: 保険 (4問: 8問から統合、ei_total_review削除) ============
  { key:'ei_total_monthly', category:'expense_insurance', order:1, question:'保険料 月合計(生命+医療+がん+年金+家財等)', type:'currency', unit:'万円/月', min:0, max:30, difficulty:'easy', priority:'recommended', impact:'medium', helpText:'全保険の月額合計、不明なら8000円程度が平均', recallEffort:'look_up' },
  { key:'ei_death_payout', category:'expense_insurance', order:2, question:'死亡保障の総額', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'medium', recallEffort:'look_up' },
  { key:'ei_income_protection_monthly', category:'expense_insurance', order:3, question:'収入保障保険(月額×残期間)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'medium', priority:'optional', impact:'high', helpText:'子育て世帯では月20万×15年が典型', recallEffort:'look_up' },
  { key:'ei_lifeplan_pension', category:'expense_insurance', order:4, question:'個人年金保険の受取見込', type:'currency', unit:'万円(累計)', min:0, max:5000, difficulty:'hard', priority:'optional', impact:'medium', recallEffort:'look_up' },

  // ============ 支出: 趣味・娯楽 (4問) ============
  { key:'ehb_subscription', category:'expense_hobby', order:1, question:'サブスク合計(月)', type:'currency', unit:'万円/月', min:0, max:5, difficulty:'medium', priority:'recommended', impact:'low' },
  { key:'ehb_travel_yearly', category:'expense_hobby', order:2, question:'旅行費用(年)', type:'currency', unit:'万円/年', min:0, max:300, difficulty:'medium', priority:'recommended', impact:'medium' },
  { key:'ehb_hobby', category:'expense_hobby', order:3, question:'趣味の費用(月平均)', type:'currency', unit:'万円/月', min:0, max:30, difficulty:'medium', priority:'recommended', impact:'low' },
  { key:'ehb_pets', category:'expense_hobby', order:4, question:'ペット関連費(月)', type:'currency', unit:'万円/月', min:0, max:10, difficulty:'easy', priority:'optional', impact:'low' },

  // ============ 支出: 交通・車 (6問) ============
  { key:'et_public_transit', category:'expense_transport', order:1, question:'公共交通費(月、定期含む)', type:'currency', unit:'万円/月', min:0, max:5, difficulty:'easy', priority:'recommended', impact:'low' },
  { key:'et_has_car', category:'expense_transport', order:2, question:'自動車を持っている?', type:'boolean', difficulty:'easy', priority:'essential', impact:'medium' },
  { key:'et_car_fuel', category:'expense_transport', order:3, question:'ガソリン代(月)', type:'currency', unit:'万円/月', min:0, max:5, difficulty:'easy', priority:'recommended', impact:'low', dependsOn:'et_has_car', dependsOnValue:true },
  { key:'et_car_maintenance', category:'expense_transport', order:4, question:'車検・メンテ(年)', type:'currency', unit:'万円/年', min:0, max:50, difficulty:'medium', priority:'recommended', impact:'low', dependsOn:'et_has_car', dependsOnValue:true },
  { key:'et_car_replace_cycle', category:'expense_transport', order:5, question:'車買替サイクル', type:'number', unit:'年', min:0, max:30, difficulty:'easy', priority:'optional', impact:'medium', dependsOn:'et_has_car', dependsOnValue:true },
  { key:'et_taxi_uber', category:'expense_transport', order:6, question:'タクシー・配車アプリ(月)', type:'currency', unit:'万円/月', min:0, max:5, difficulty:'easy', priority:'optional', impact:'low' },

  // ============ 資産: 預金 (5問) ============
  { key:'ad_total', category:'asset_deposit', order:1, question:'預貯金の合計', type:'currency', unit:'万円', min:0, max:100000, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'look_up' },
  { key:'ad_emergency_fund', category:'asset_deposit', order:2, question:'うち生活防衛資金(月数想定)', type:'number', unit:'ヶ月分', min:0, max:36, difficulty:'easy', priority:'recommended', impact:'low', recallEffort:'estimate' },
  // ad_main_bank 削除(予測に無関係)
  { key:'ad_fd', category:'asset_deposit', order:3, question:'定期預金の残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'optional', impact:'low', recallEffort:'look_up' },
  { key:'ad_foreign_currency', category:'asset_deposit', order:4, question:'外貨預金の残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'medium', recallEffort:'look_up' },

  // ============ 資産: 投資 (10問) ============
  { key:'ai_total', category:'asset_investment', order:1, question:'投資資産の合計', type:'currency', unit:'万円', min:0, max:100000, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'look_up' },
  { key:'ai_nisa_balance', category:'asset_investment', order:2, question:'NISA口座残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'ai_nisa_monthly', category:'asset_investment', order:3, question:'NISA月額積立', type:'currency', unit:'万円/月', min:0, max:30, difficulty:'easy', priority:'recommended', impact:'high' },
  { key:'ai_ideco_balance', category:'asset_investment', order:4, question:'iDeCo残高', type:'currency', unit:'万円', min:0, max:30000, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'ai_ideco_monthly', category:'asset_investment', order:5, question:'iDeCo月額拠出', type:'currency', unit:'万円/月', min:0, max:7, difficulty:'easy', priority:'recommended', impact:'high' },
  { key:'ai_individual_stock', category:'asset_investment', order:6, question:'個別株(日本+海外)', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'ai_index_funds', category:'asset_investment', order:7, question:'インデックスファンド残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'ai_crypto', category:'asset_investment', order:8, question:'暗号資産の残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'ai_alloc_stock_pct', category:'asset_investment', order:9, question:'株式比率', type:'percent', unit:'%', min:0, max:100, difficulty:'medium', priority:'recommended', impact:'medium', helpText:'投資全体の中の株式割合。30代なら70-90%が一般的' },
  { key:'ai_expected_return', category:'asset_investment', order:10, question:'想定リターン(年・実質)', type:'select', options:[{value:0.005,label:'0.5% (預金中心・超保守)'},{value:0.015,label:'1.5% (本アプリ標準・GPIF想定)'},{value:0.030,label:'3.0% (全世界株インデックス想定)'},{value:0.050,label:'5.0% (S&P500・楽観)'}], difficulty:'easy', priority:'recommended', impact:'high', estimateRef:'expected_return_default', helpText:'分からなければ標準1.5%でOK', recallEffort:'estimate' },

  // ============ 資産: 不動産 (8問) ============
  { key:'ar_primary_home_value', category:'asset_realestate', order:1, question:'自宅の現在評価額', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'recommended', impact:'high', dependsOn:'eh_type', dependsOnValue:['own','own_paid'] },
  { key:'ar_invest_property_count', category:'asset_realestate', order:2, question:'投資用不動産の物件数', type:'number', unit:'物件', min:0, max:20, difficulty:'easy', priority:'optional', impact:'high' },
  { key:'ar_invest_value_total', category:'asset_realestate', order:3, question:'投資用不動産の評価額合計', type:'currency', unit:'万円', min:0, max:100000, difficulty:'medium', priority:'optional', impact:'high', dependsOn:'ar_invest_property_count' },
  { key:'ar_invest_loan_balance', category:'asset_realestate', order:4, question:'投資用ローン残高', type:'currency', unit:'万円', min:0, max:100000, difficulty:'easy', priority:'optional', impact:'high', dependsOn:'ar_invest_property_count' },
  { key:'ar_invest_yield', category:'asset_realestate', order:5, question:'投資物件の表面利回り平均', type:'percent', unit:'%', min:0, max:20, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'ar_invest_property_count' },
  { key:'ar_invest_occupancy', category:'asset_realestate', order:6, question:'平均稼働率', type:'percent', unit:'%', min:0, max:100, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'ar_invest_property_count' },
  { key:'ar_other_land', category:'asset_realestate', order:7, question:'その他の不動産(別荘・土地等)', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'medium' },
  { key:'ar_reit_balance', category:'asset_realestate', order:8, question:'REIT(J-REIT等)残高', type:'currency', unit:'万円', min:0, max:30000, difficulty:'easy', priority:'optional', impact:'low' },

  // ============ 負債: ローン (8問) ============
  { key:'ll_car_loan_balance', category:'liability_loan', order:1, question:'自動車ローン残高', type:'currency', unit:'万円', min:0, max:5000, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'ll_car_loan_monthly', category:'liability_loan', order:2, question:'自動車ローン月返済額', type:'currency', unit:'万円/月', min:0, max:20, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'ll_car_loan_balance' },
  { key:'ll_student_loan_balance', category:'liability_loan', order:3, question:'奨学金残高', type:'currency', unit:'万円', min:0, max:5000, difficulty:'easy', priority:'recommended', impact:'high' },
  { key:'ll_student_loan_monthly', category:'liability_loan', order:4, question:'奨学金月返済額', type:'currency', unit:'万円/月', min:0, max:10, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'ll_student_loan_balance' },
  { key:'ll_student_loan_remaining_years', category:'liability_loan', order:5, question:'奨学金残年数', type:'number', unit:'年', min:0, max:30, difficulty:'easy', priority:'optional', impact:'medium', dependsOn:'ll_student_loan_balance' },
  { key:'ll_business_loan', category:'liability_loan', order:6, question:'事業性ローン残高', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'high' },
  { key:'ll_education_loan', category:'liability_loan', order:7, question:'教育ローン残高(子供向け)', type:'currency', unit:'万円', min:0, max:3000, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'ll_other_secured', category:'liability_loan', order:8, question:'その他有担保ローン', type:'currency', unit:'万円', min:0, max:10000, difficulty:'medium', priority:'optional', impact:'medium' },

  // ============ 負債: その他 (4問) ============
  { key:'lo_credit_balance', category:'liability_other', order:1, question:'クレカ未払い残高', type:'currency', unit:'万円', min:0, max:1000, difficulty:'easy', priority:'recommended', impact:'low' },
  { key:'lo_revolving', category:'liability_other', order:2, question:'リボ・キャッシング残高', type:'currency', unit:'万円', min:0, max:500, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'lo_family_loan', category:'liability_other', order:3, question:'家族・知人借入', type:'currency', unit:'万円', min:0, max:5000, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'lo_other', category:'liability_other', order:4, question:'その他の負債', type:'currency', unit:'万円', min:0, max:10000, difficulty:'easy', priority:'optional', impact:'medium' },

  // ============ 年金 (8問) ============
  { key:'p_enrolled_type', category:'pension', order:1, question:'加入している年金制度', type:'select', options:[{value:'kosei',label:'厚生年金(会社員/公務員)'},{value:'kokumin',label:'国民年金のみ(自営・無職)'},{value:'both',label:'過去に両方'}], difficulty:'easy', priority:'essential', impact:'high', recallEffort:'instant' },
  { key:'p_kosei_years', category:'pension', order:2, question:'会社員/公務員だった年数(おおよそ)', type:'number', unit:'年', min:0, max:50, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'p_enrolled_type', dependsOnValue:['kosei','both'], helpText:'分からない→現年齢-22で自動推定', recallEffort:'estimate' },
  // p_avg_monthly_wage 削除(統計+年収から推定)
  { key:'p_estimate_monthly', category:'pension', order:3, question:'65歳受給見込み(月額)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'medium', priority:'essential', impact:'high', helpText:'ねんきんネット( https://www.nenkin.go.jp/n_net/ )で確認可。分からなければ厚生年金平均14.7万', recallEffort:'look_up' },
  { key:'p_nenkin_confirmed', category:'pension', order:4, question:'年金見込額の確認方法', type:'select', options:[{value:'nenkin_net',label:'ねんきんネット確認済'},{value:'teikibin',label:'ねんきん定期便で確認'},{value:'estimate',label:'推計値'}], difficulty:'easy', priority:'recommended', impact:'medium', recallEffort:'instant' },
  { key:'p_start_age', category:'pension', order:5, question:'受給開始予定年齢', type:'age', unit:'歳', min:60, max:75, difficulty:'easy', priority:'recommended', impact:'high', recallEffort:'estimate' },
  { key:'p_kokumin_paid_years', category:'pension', order:6, question:'国民年金 納付年数', type:'number', unit:'年', min:0, max:40, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'p_enrolled_type', dependsOnValue:['kokumin','both'], recallEffort:'look_up' },
  // p_future_low_scenario 削除(What-ifスライダーで代替)
  { key:'p_addtl_dc', category:'pension', order:7, question:'企業型DC残高(企業年金)', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'medium', recallEffort:'look_up' },

  // ============ 退職金 (6問) ============
  { key:'r_severance_estimate', category:'retirement', order:1, question:'退職金の見込み', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'recommended', impact:'high', helpText:'分からなければ統計推定で代用(中小1,000万、大企業1,500万、公務員2,100万)', recallEffort:'look_up' },
  { key:'r_retire_age', category:'retirement', order:2, question:'予定の退職年齢', type:'age', unit:'歳', min:50, max:80, difficulty:'easy', priority:'essential', impact:'high', isCore:true, recallEffort:'estimate' },
  { key:'r_retire_lifestyle', category:'retirement', order:3, question:'退職後の生活費(月)', type:'currency', unit:'万円/月', min:0, max:100, difficulty:'medium', priority:'recommended', impact:'high', estimateRef:'retire_expense_avg', recallEffort:'estimate' },
  { key:'r_retire_post_work', category:'retirement', order:4, question:'退職後も働く予定?', type:'select', options:[{value:'no',label:'完全リタイア'},{value:'partial',label:'パート・嘱託で続ける'},{value:'rebuild',label:'起業/独立'}], difficulty:'easy', priority:'recommended', impact:'high', recallEffort:'estimate' },
  { key:'r_retire_partial_income', category:'retirement', order:5, question:'退職後の月収予定', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'r_retire_post_work', dependsOnValue:['partial','rebuild'], recallEffort:'estimate' },
  { key:'r_dc_handling', category:'retirement', order:6, question:'退職金・iDeCo・DCの受取方法', type:'select', options:[{value:'lump',label:'一時金で全額'},{value:'pension',label:'年金として分割'},{value:'combo',label:'併用(節税最適化)'}], difficulty:'medium', priority:'recommended', impact:'high', helpText:'退職所得控除と公的年金等控除の使い分けで税額が数百万円変動', recallEffort:'estimate' },
  { key:'r_fire_target', category:'retirement', order:7, question:'FIREに興味あり?', type:'select', options:[{value:'no',label:'なし'},{value:'lean',label:'Lean FIRE志向'},{value:'regular',label:'Regular FIRE志向'},{value:'fat',label:'Fat FIRE志向'},{value:'coast',label:'Coast FIRE志向'}], difficulty:'easy', priority:'optional', impact:'high', recallEffort:'instant' },
  { key:'r_post_independence_lifestyle', category:'retirement', order:8, question:'子独立後〜退職前の生活費(現役比)', type:'select', options:[{value:0.7,label:'70%(質素)'},{value:0.85,label:'85%(やや控えめ)'},{value:1.0,label:'100%(同等)'},{value:1.1,label:'110%(旅行等で増)'}], difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'c_has_or_plan', dependsOnValue:'have', helpText:'子独立で支出が大きく変わる', recallEffort:'estimate' },

  // ============ ライフイベント (10問) ============
  { key:'le_marriage_plan_age', category:'life_events', order:1, question:'結婚予定の年齢(未婚の場合)', type:'age', unit:'歳', min:0, max:90, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'sp_status', dependsOnValue:['none','dating'] },
  { key:'le_home_buy_plan_age', category:'life_events', order:2, question:'住宅購入予定年齢', type:'age', unit:'歳', min:0, max:90, difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'eh_type', dependsOnValue:'rent' },
  { key:'le_home_target_value', category:'life_events', order:3, question:'住宅購入の目標価格', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'high', dependsOn:'eh_type', dependsOnValue:'rent' },
  { key:'le_car_buy_plan', category:'life_events', order:4, question:'車の購入予定', type:'select', options:[{value:'none',label:'予定なし'},{value:'5y',label:'5年以内'},{value:'10y',label:'10年以内'}], difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'le_overseas_travel', category:'life_events', order:5, question:'大型海外旅行の予定(数年に1回)', type:'currency', unit:'万円/回', min:0, max:500, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'le_renovation', category:'life_events', order:6, question:'リフォーム予定額', type:'currency', unit:'万円', min:0, max:3000, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'eh_type', dependsOnValue:['own','own_paid'] },
  { key:'le_relocate_plan', category:'life_events', order:7, question:'移住・引越し予定', type:'select', options:[{value:'no',label:'なし'},{value:'in_same_pref',label:'県内引越し'},{value:'move_to_metro',label:'都市部へ移住'},{value:'move_to_rural',label:'地方移住'},{value:'overseas',label:'海外移住'}], difficulty:'easy', priority:'optional', impact:'high' },
  { key:'le_divorce_risk', category:'life_events', order:8, question:'離婚リスクを織り込む?', type:'boolean', difficulty:'easy', priority:'optional', impact:'high', dependsOn:'sp_status', dependsOnValue:'married' },
  { key:'le_big_purchase', category:'life_events', order:9, question:'近い将来の大型支出予定', type:'currency', unit:'万円', min:0, max:5000, difficulty:'medium', priority:'optional', impact:'medium' },
  { key:'le_one_time_income', category:'life_events', order:10, question:'近い将来の臨時収入予定', type:'currency', unit:'万円', min:0, max:10000, difficulty:'medium', priority:'optional', impact:'high' },

  // ============ 健康・介護 (6問) ============
  { key:'h_chronic', category:'health', order:1, question:'持病・通院中の病気', type:'boolean', difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'h_medical_yearly', category:'health', order:2, question:'年間の医療費自己負担', type:'currency', unit:'万円/年', min:0, max:300, difficulty:'easy', priority:'recommended', impact:'medium' },
  { key:'h_parent_care_support_self', category:'health', order:3, question:'自分の親の介護支援予定', type:'select', options:[{value:'none',label:'なし'},{value:'one',label:'片親のみ'},{value:'both',label:'両親とも'}], difficulty:'easy', priority:'recommended', impact:'high', recallEffort:'estimate' },
  { key:'h_parent_care_support_spouse', category:'health', order:4, question:'配偶者の親の介護支援予定', type:'select', options:[{value:'none',label:'なし'},{value:'one',label:'片親のみ'},{value:'both',label:'両親とも'}], difficulty:'easy', priority:'recommended', impact:'high', dependsOn:'sp_status', dependsOnValue:['cohab','married'], recallEffort:'estimate' },
  { key:'h_parent_care_cost', category:'health', order:5, question:'親の介護費 想定総額(4人合計)', type:'select', options:[{value:0,label:'なし'},{value:350,label:'~350万(片親軽め)'},{value:700,label:'~700万(両親)'},{value:1500,label:'~1500万(複数 or 重め)'},{value:-1,label:'分からない'}], difficulty:'medium', priority:'optional', impact:'high', estimateRef:'parent_care_avg', helpText:'平均1人500万。分からない場合は統計値を使用', recallEffort:'estimate' },
  { key:'h_self_care_cost', category:'health', order:6, question:'自分の介護費 想定', type:'select', options:[{value:300,label:'~300万(軽度)'},{value:580,label:'~580万(平均)'},{value:1500,label:'~1,500万(施設長期)'},{value:-1,label:'分からない'}], difficulty:'medium', priority:'recommended', impact:'high', estimateRef:'self_care_cost_avg', helpText:'生命保険文化センター平均580万、分からなければ平均値', recallEffort:'estimate' },
  { key:'h_long_term_care_insurance', category:'health', order:7, question:'民間介護保険への加入', type:'boolean', difficulty:'easy', priority:'optional', impact:'medium', recallEffort:'instant' },

  // ============ 相続・贈与 (6問) ============
  { key:'inh_expected_amount', category:'inheritance', order:1, question:'予定する相続額(総計)', type:'currency', unit:'万円', min:0, max:50000, difficulty:'hard', priority:'optional', impact:'high' },
  { key:'inh_expected_age', category:'inheritance', order:2, question:'予定相続のタイミング(あなたが何歳)', type:'age', unit:'歳', min:0, max:90, difficulty:'medium', priority:'optional', impact:'medium' },
  { key:'inh_gift_yearly', category:'inheritance', order:3, question:'親からの贈与(年)', type:'currency', unit:'万円/年', min:0, max:500, difficulty:'easy', priority:'optional', impact:'medium', helpText:'年110万まで暦年贈与は非課税(2024改正で生前7年遡及)', recallEffort:'instant' },
  { key:'inh_souzoku_seisan_kazei', category:'inheritance', order:4, question:'相続時精算課税制度の利用?', type:'select', options:[{value:'none',label:'未検討'},{value:'considering',label:'検討中'},{value:'using',label:'利用中'}], difficulty:'medium', priority:'optional', impact:'high', helpText:'2024改正で年110万基礎控除追加、暦年贈与より有利なケース増加', recallEffort:'estimate' },
  { key:'inh_gift_to_kids_plan', category:'inheritance', order:4, question:'子への贈与計画(累計)', type:'currency', unit:'万円', min:0, max:10000, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'c_has_or_plan', dependsOnValue:['planning','have'] },
  { key:'inh_estate_to_leave', category:'inheritance', order:5, question:'子に残したい遺産額', type:'currency', unit:'万円', min:0, max:50000, difficulty:'hard', priority:'optional', impact:'medium' },
  { key:'inh_donation_plan', category:'inheritance', order:6, question:'寄付・遺贈の予定', type:'currency', unit:'万円', min:0, max:50000, difficulty:'medium', priority:'optional', impact:'low' },

  // ============ 節税 (8問) ============
  { key:'t_furusato_yearly', category:'tax', order:1, question:'ふるさと納税(年額)', type:'currency', unit:'万円/年', min:0, max:200, difficulty:'easy', priority:'recommended', impact:'low', helpText:'年収の約1.2%が目安。ふるさと納税シミュレーターで上限確認', recallEffort:'look_up' },
  { key:'t_furusato_method', category:'tax', order:2, question:'ふるさと納税の申請方法', type:'select', options:[{value:'onestop',label:'ワンストップ特例(5自治体まで)'},{value:'final_return',label:'確定申告'},{value:'none',label:'やっていない'}], difficulty:'easy', priority:'optional', impact:'low', helpText:'医療費控除や副業確定申告とワンストップは併用不可', recallEffort:'instant' },
  { key:'t_nisa_max_use', category:'tax', order:3, question:'新NISAの活用度合い', type:'select', options:[{value:'full',label:'満額(月30万・年360万)'},{value:'mid',label:'部分活用'},{value:'low',label:'少額のみ'},{value:'no',label:'活用なし'}], difficulty:'easy', priority:'recommended', impact:'high', helpText:'2024年新NISA: 成長枠240+つみたて枠120 = 月30万まで非課税', recallEffort:'estimate' },
  { key:'t_ideco_max_use', category:'tax', order:4, question:'iDeCo/DCの拠出度合い', type:'select', options:[{value:'max',label:'上限まで'},{value:'partial',label:'一部'},{value:'no',label:'なし'}], difficulty:'easy', priority:'recommended', impact:'medium', helpText:'会社員月2.3万・公務員1.2万・自営月6.8万が上限', recallEffort:'instant' },
  { key:'t_ideco_exit_strategy', category:'tax', order:5, question:'iDeCo/DCの受取方法予定', type:'select', options:[{value:'lump',label:'一時金'},{value:'pension',label:'年金として分割'},{value:'combo',label:'併用'},{value:'undecided',label:'未定'}], difficulty:'medium', priority:'recommended', impact:'high', helpText:'退職所得控除との重複期間ルール(2026〜10年)で税額が数百万差', recallEffort:'estimate' },
  { key:'t_crypto_realized_pl', category:'tax', order:6, question:'暗号資産の年間実現損益', type:'currency', unit:'万円', min:-2000, max:5000, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'ai_crypto', helpText:'雑所得・総合課税で最大55%、損失繰越不可', recallEffort:'look_up' },
  { key:'t_side_income_classification', category:'tax', order:7, question:'副業所得の区分', type:'select', options:[{value:'salary',label:'給与所得'},{value:'business_blue',label:'事業所得(青色)'},{value:'business_white',label:'事業所得(白色)'},{value:'miscellaneous',label:'雑所得'}], difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'io_side_income', helpText:'年300万・帳簿要件で事業所得認定が厳格化', recallEffort:'instant' },
  { key:'t_medical_deduction', category:'tax', order:8, question:'医療費控除を毎年使う?', type:'boolean', difficulty:'easy', priority:'optional', impact:'low', recallEffort:'instant' },
  { key:'t_kosokyo', category:'tax', order:9, question:'小規模企業共済の月額', type:'currency', unit:'万円/月', min:0, max:7, difficulty:'medium', priority:'optional', impact:'medium', dependsOn:'is_job_type', dependsOnValue:['self','contract'], recallEffort:'look_up' },
  { key:'t_housing_loan_deduction_years', category:'tax', order:10, question:'住宅ローン控除 残年数', type:'number', unit:'年', min:0, max:13, difficulty:'easy', priority:'recommended', impact:'medium', dependsOn:'eh_type', dependsOnValue:'own', recallEffort:'look_up' },
  { key:'t_spouse_deduction', category:'tax', order:11, question:'配偶者控除の状況', type:'select', options:[{value:'full',label:'配偶者控除あり(配偶者年収103万以下)'},{value:'special',label:'配偶者特別控除(103-201万)'},{value:'none',label:'控除なし'}], difficulty:'easy', priority:'optional', impact:'medium', dependsOn:'sp_status', dependsOnValue:'married', recallEffort:'instant' },
  { key:'t_blue_return', category:'tax', order:12, question:'青色申告を使う?', type:'boolean', difficulty:'easy', priority:'optional', impact:'medium', dependsOn:'is_job_type', dependsOnValue:['self','contract'], recallEffort:'instant' },

  // ============ キャリア (4問) ============
  { key:'cr_career_change_plan', category:'career', order:1, question:'転職予定', type:'select', options:[{value:'none',label:'予定なし'},{value:'3y',label:'3年以内'},{value:'5y',label:'5年以内'}], difficulty:'easy', priority:'optional', impact:'high' },
  { key:'cr_career_change_income_change', category:'career', order:2, question:'転職での年収変動見込み', type:'currency', unit:'万円', min:-2000, max:5000, difficulty:'medium', priority:'optional', impact:'high', dependsOn:'cr_career_change_plan', dependsOnValue:['3y','5y'] },
  { key:'cr_independence_plan', category:'career', order:3, question:'独立・起業の予定', type:'select', options:[{value:'none',label:'予定なし'},{value:'5y',label:'5年以内'},{value:'10y',label:'10年以内'}], difficulty:'easy', priority:'optional', impact:'high' },
  { key:'cr_break_year', category:'career', order:4, question:'長期休職・サバティカル予定', type:'boolean', difficulty:'easy', priority:'optional', impact:'medium' },

  // ============ その他 (4問) ============
  { key:'o_charity_yearly', category:'other', order:1, question:'寄付・支援(年額)', type:'currency', unit:'万円/年', min:0, max:300, difficulty:'easy', priority:'optional', impact:'low' },
  { key:'o_alimony', category:'other', order:2, question:'養育費・扶養費(月)', type:'currency', unit:'万円/月', min:0, max:50, difficulty:'easy', priority:'optional', impact:'medium' },
  { key:'o_hobby_business', category:'other', order:3, question:'趣味の収益化(月)', type:'currency', unit:'万円/月', min:0, max:100, difficulty:'medium', priority:'optional', impact:'low' },
  { key:'o_freeform_notes', category:'other', order:4, question:'その他、覚えておきたい支出・収入', type:'text', difficulty:'easy', priority:'optional', impact:'low' },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

// 進捗集計ヘルパー
export function getProgress(answers: Record<string, any>): {
  total: number;
  answered: number;
  percent: number;
  byCategory: Record<CategoryKey, { total: number; answered: number; percent: number }>;
} {
  const byCategory = {} as Record<CategoryKey, { total: number; answered: number; percent: number }>;
  CATEGORIES.forEach(c => { byCategory[c.key] = { total: 0, answered: 0, percent: 0 }; });

  let answered = 0;
  QUESTIONS.forEach(q => {
    // 依存条件で非表示の質問はカウントしない
    if (q.dependsOn) {
      const v = answers[q.dependsOn];
      const expected = q.dependsOnValue;
      const isVisible = Array.isArray(expected) ? expected.includes(v) : v === expected;
      if (!isVisible) return;
    }
    byCategory[q.category].total++;
    if (answers[q.key] != null && answers[q.key] !== '') {
      byCategory[q.category].answered++;
      answered++;
    }
  });

  const total = Object.values(byCategory).reduce((s, c) => s + c.total, 0);
  CATEGORIES.forEach(c => {
    const cat = byCategory[c.key];
    cat.percent = cat.total > 0 ? Math.round(cat.answered / cat.total * 100) : 0;
  });

  return {
    total,
    answered,
    percent: total > 0 ? Math.round(answered / total * 100) : 0,
    byCategory,
  };
}

// 今日のミッション選出 (v2.0: PdMレビュー反映で乗算スコア+カテゴリ多様化)
// 旧加算スコアのバグ: essentialが尽きた後、optional×low×easy(35) が optional×high×hard(20) を上回り
// 「重要だが面倒な質問」が永遠に出ない問題があった
export function pickTodayMissions(answers: Record<string, any>, count: number = 3): QuestionDef[] {
  const unanswered = QUESTIONS.filter(q => {
    if (answers[q.key] != null && answers[q.key] !== '') return false;
    if (q.dependsOn) {
      const v = answers[q.dependsOn];
      const expected = q.dependsOnValue;
      const isVisible = Array.isArray(expected) ? expected.includes(v) : v === expected;
      if (!isVisible) return false;
    }
    return true;
  });

  // 乗算スコア: priorityで決定的に階層化、impactで強調、easeでタイブレーク
  const score = (q: QuestionDef) => {
    // コア質問は最優先
    const coreBoost = q.isCore ? 100000 : 0;
    const priorityScore = { essential: 1000, recommended: 100, optional: 10 }[q.priority];
    const impactMultiplier = { high: 3, medium: 2, low: 1 }[q.impact];
    const easeBonus = { easy: 5, medium: 3, hard: 1 }[q.difficulty];
    return coreBoost + priorityScore * impactMultiplier + easeBonus;
  };

  // スコア順にソート、ただし同カテゴリの連続を避ける多様化フィルタを適用
  const sorted = unanswered.sort((a, b) => score(b) - score(a));
  const result: QuestionDef[] = [];
  const usedCategories = new Set<CategoryKey>();
  for (const q of sorted) {
    if (result.length >= count) break;
    // 既に同カテゴリが選ばれていて、まだ他カテゴリの候補がある場合はスキップ(後回し)
    if (usedCategories.has(q.category)) continue;
    result.push(q);
    usedCategories.add(q.category);
  }
  // count に満たない場合(全カテゴリ消化済み)、残りはスコア順で埋める
  if (result.length < count) {
    for (const q of sorted) {
      if (result.length >= count) break;
      if (!result.includes(q)) result.push(q);
    }
  }
  return result;
}

// コア12問だけ取得 (ベース予測のトリガー)
export function getCoreQuestions(): QuestionDef[] {
  return QUESTIONS.filter(q => q.isCore);
}

// コア12問の回答状況
export function getCoreProgress(answers: Record<string, any>): { answered: number; total: number; percent: number } {
  const core = getCoreQuestions();
  const answered = core.filter(q => answers[q.key] != null && answers[q.key] !== '').length;
  return { answered, total: core.length, percent: Math.round(answered / core.length * 100) };
}
