import React from 'react';
import { GoogleAuthProvider, signInWithPopup, Auth as FirebaseAuth, signInAnonymously } from 'firebase/auth';
import { FaGoogle, FaUserSecret } from 'react-icons/fa';
import Icon from './Icon';

interface AuthProps {
  auth: FirebaseAuth;
}

const Auth: React.FC<AuthProps> = ({ auth }) => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Googleログインエラー:", error);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("匿名ログインエラー:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl max-w-sm mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">ログイン</h2>
      <div className="w-full space-y-4">
        <button
        onClick={handleGoogleLogin}
        className="flex items-center justify-center w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
        <Icon as={FaGoogle} className="mr-3" />
          Googleでログイン
        </button>
        <button
          onClick={handleAnonymousLogin}
          className="flex items-center justify-center w-full px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
          <Icon as={FaUserSecret} className="mr-3" />
          匿名で利用する
        </button>
      </div>
    </div>
  );
};

export default Auth; 
