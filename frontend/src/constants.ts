/**
 * アプリケーション全体で使用する定数を管理するファイル
 */

// API関連の定数
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  SIMULATION: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api/simulation',
  // 今後エンドポイントが増えた場合はここに追加
  // GET_PLANS: `${API_BASE_URL}/api/plans`, 
};

// その他の定数
// export const DEFAULT_USER_NAME = 'ゲスト'; 
