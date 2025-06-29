import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth'; // signInWithCustomToken, signInAnonymously はApp.tsx側での利用を想定 or initializeAuth内で利用
import { getFirestore, Firestore } from 'firebase/firestore';
// import { getFunctions, httpsCallable } from 'firebase/functions'; // 必要に応じて

// グローバル変数の型定義は環境変数利用に合わせるなら不要になる可能性
// declare global {
//   interface Window {
//     // __firebase_config?: string; // 環境変数から読むので不要
//     __initial_auth_token?: string; // これは残すか検討
//     // __app_id?: string; // 環境変数から読むので不要
//   }
// }

// Firebase構成オブジェクト
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 必須のキーを定義（measurementIdはオプションなので含めない）
const requiredConfigKeys: Array<keyof typeof firebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  const errorMessage = `Firebaseの必須の設定が.envファイルにありません。次のキーを確認してください: ${missingKeys.map(key => `REACT_APP_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}`;
  console.error(errorMessage);
  // エラーをスローしてアプリケーションの実行を停止
  throw new Error(errorMessage);
}

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
// const functions = getFunctions(app); // Firebase Functions を使う場合

// Firestoreのログレベルを設定 (デバッグ時に役立つ)
// import { setLogLevel } from 'firebase/firestore'; // これを使う場合
// setLogLevel('debug');


// initializeAuth は App.tsx に移管、または 여기서 유지하고 App.tsx에서 호출
// const initializeAuth = async (): Promise<void> => {
//   const initialAuthToken: string | null = typeof window !== 'undefined' && typeof (window as any).__initial_auth_token !== 'undefined' ? (window as any).__initial_auth_token : null;
//   if (initialAuthToken && auth) {
//     try {
//       console.log("Successfully signed in with custom token (logic to be implemented if needed).");
//     } catch (error) {
//       console.error("Error signing in with custom token, falling back to anonymous:", error);
//       console.log("Fallback to anonymous sign in (logic to be implemented if needed).");
//     }
//   } else if (auth && !auth.currentUser) {
//     try {
//       console.log("Attempting anonymous sign in (logic to be implemented if needed, or handled in App.tsx).");
//     } catch (error) {
//       console.error("Error signing in anonymously:", error);
//     }
//   }
// };

// App.tsxのuseEffect内で認証状態を監視するため、ここでは呼び出さないことが多い
// initializeAuth();

export { db, auth, app as firebaseApp }; // app も firebaseAppとしてエクスポート (initializeAppは不要)
export type { FirebaseApp, Auth as FirebaseAuth, Firestore as FirebaseFirestore }; 
