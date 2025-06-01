import React from 'react';
import { signInAnonymously, GoogleAuthProvider, signInWithPopup, Auth as FirebaseAuth } from 'firebase/auth';

interface AuthProps {
  auth: FirebaseAuth | null; // FirebaseのAuthインスタンス、または初期化前はnull
}

const Auth: React.FC<AuthProps> = ({ auth }) => {
  if (!auth) {
    return <p className="text-red-500">認証サービスが利用できません。</p>;
  }

  const handleAnonymousSignIn = async () => {
    try {
      await signInAnonymously(auth);
      console.log("Signed in anonymously");
    } catch (error: any) { // エラーオブジェクトの型をanyまたはErrorに
      console.error("Error signing in anonymously:", error);
      alert(`匿名ログインエラー: ${error.message}`);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Signed in with Google");
    } catch (error: any) { // エラーオブジェクトの型をanyまたはErrorに
      console.error("Error signing in with Google:", error);
      alert(`Googleログインエラー: ${error.message}`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-xl text-center">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6">ログイン</h2>
      <p className="text-slate-600 mb-6">シミュレーションを開始するにはログインしてください。</p>
      <div className="space-y-4">
        <button
          onClick={handleGoogleSignIn}
          className="w-full px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition duration-150 font-medium"
        >
          Googleでログイン
        </button>
        <button
          onClick={handleAnonymousSignIn}
          className="w-full px-6 py-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition duration-150 font-medium"
        >
          ゲストとして続ける
        </button>
      </div>
    </div>
  );
};

export default Auth; 
