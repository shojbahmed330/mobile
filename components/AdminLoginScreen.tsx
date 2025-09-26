
import React, { useState } from 'react';
import { AdminUser } from '../types';
import Icon from './Icon';
import { geminiService } from '../services/geminiService';

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

type AuthMode = 'login' | 'register';

const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let user: AdminUser | null = null;
      if (mode === 'login') {
        user = await geminiService.adminLogin(email, password);
        if (!user) {
          setError('Invalid credentials. Please try again.');
        }
      } else {
        user = await geminiService.adminRegister(email, password);
        if (!user) {
          setError('An admin with this email already exists.');
        }
      }

      if (user) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4">
       <a href="/#/" className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <Icon name="back" className="w-5 h-5"/>
            <span>Back to Main Site</span>
        </a>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Icon name="lock-closed" className="w-16 h-16 mx-auto text-sky-500 mb-4" />
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-slate-400">Please authenticate to continue.</p>
        </div>

        <div className="bg-slate-800/50 p-8 rounded-lg border border-slate-700">
          <div className="flex border-b border-slate-700 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`w-1/2 py-3 font-semibold text-lg transition-colors ${mode === 'login' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`w-1/2 py-3 font-semibold text-lg transition-colors ${mode === 'register' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              Register
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 transition"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 transition"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Admin Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginScreen;