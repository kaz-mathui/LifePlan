import React from 'react';
import { GoogleAuthProvider, signInWithRedirect, Auth as FirebaseAuth } from 'firebase/auth';
import { FaGoogle } from 'react-icons/fa';
import Icon from './Icon';

interface AuthProps {
  auth: FirebaseAuth;
}

const Auth: React.FC<AuthProps> = ({ auth }) => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Googleログインエラー:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">ログイン</h2>
        <button
        onClick={handleGoogleLogin}
        className="flex items-center justify-center w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
        <Icon as={FaGoogle} className="mr-3" />
          Googleでログイン
        </button>
    </div>
  );
};

export default Auth; 
