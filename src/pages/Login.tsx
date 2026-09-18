import React, { useState } from 'react';
import { Store, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '../lib/api/authApi';

export const Login: React.FC<{ onNavigateSignup?: () => void }> = ({ onNavigateSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotPasswordSuccess(false);

    // Basic validation
    if (!email.trim()) {
      setErrorMsg("Email is required.");
      return;
    }
    
    if (!isForgotPasswordMode && !password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (isForgotPasswordMode) {
      setIsLoading(true);
      const { error } = await authApi.resetPasswordForEmail(email);
      setIsLoading(false);
      
      if (error) {
        setErrorMsg(error.message || "Failed to send reset email. Please try again.");
      } else {
        setForgotPasswordSuccess(true);
      }
      return;
    }

    if (!password.trim()) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setIsLoading(true);

    const { error } = await authApi.signIn(email, password);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setErrorMsg("Email verification is required. Please check your inbox.");
      } else {
        setErrorMsg("Invalid email or password.");
      }
      setIsLoading(false);
    }
    // If successful, onAuthStateChange in AuthProvider will handle the redirect/state change automatically
  };

  const handleResend = async () => {
    if (!email) return;
    setIsLoading(true);
    const { error } = await authApi.resendVerification(email);
    setIsLoading(false);
    if (error) {
      setErrorMsg("Failed to resend verification email. Please try again.");
    } else {
      setErrorMsg("Verification email resent. Please check your inbox.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg">
            <Store className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {isForgotPasswordMode ? 'Reset Password' : 'StockSmart AI'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isForgotPasswordMode ? 'Enter your email to receive a recovery link' : 'Sign in to your store dashboard'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col space-y-2">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 font-medium">{errorMsg}</p>
                </div>
                {errorMsg.includes('verification') && (
                  <div className="pl-8">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            )}

            {forgotPasswordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3">
                <Store className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 font-medium">Password reset email sent. Please check your inbox.</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 bg-slate-50 border hover:bg-white transition-colors"
                  placeholder="admin@localshop.com"
                />
              </div>
            </div>

            {!isForgotPasswordMode && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setErrorMsg(null);
                      setForgotPasswordSuccess(false);
                    }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required={!isForgotPasswordMode}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 bg-slate-50 border hover:bg-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isForgotPasswordMode ? 'Sending...' : 'Signing in...'}
                  </>
                ) : (
                  isForgotPasswordMode ? 'Send Reset Link' : 'Sign in'
                )}
              </button>
            </div>

            {onNavigateSignup && !isForgotPasswordMode && (
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={onNavigateSignup}
                    disabled={isLoading}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            )}

            {isForgotPasswordMode && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setErrorMsg(null);
                    setForgotPasswordSuccess(false);
                  }}
                  disabled={isLoading}
                  className="font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
