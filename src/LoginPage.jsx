import React, { useState } from 'react';
import { ArrowRight, Loader, AlertCircle, UserPlus, Eye, EyeOff, Mail } from 'lucide-react';
import { supabase } from './supabaseClient'; 

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // Password Visibility Toggle
  const [isSignUp, setIsSignUp] = useState(false);

  // --- 1. GOOGLE LOGIN LOGIC ---
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirects back to your Vercel site
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. FORGOT PASSWORD LOGIC ---
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert("Reset link sent! Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { 
                        username: email.split('@')[0], 
                        role: "Student Access Level" 
                    }
                }
            });
            if (error) throw error;
            if (data.session) onLogin(data.session);
            else if (data.user) {
                alert("Account created! Please check your email to verify.");
                setIsSignUp(false);
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            onLogin(data.session);
        }
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[900] flex items-center justify-center font-sans">
        <div className="absolute inset-0 overflow-hidden">
             <img 
                src="/assets/Unakoti.png" 
                className="absolute w-full h-full object-cover opacity-20 blur-sm scale-110" 
                alt="Background"
                onError={(e) => e.target.style.display = 'none'}
             />
             <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-8">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-acid-lime rounded-full mb-6 shadow-[0_0_30px_#ccff00]">
                    <span className="text-3xl font-bold text-black">T</span>
                </div>
                {/* 1. FIXED TITLE: Starts with Welcome */}
                <h1 className="text-4xl text-white font-serif italic mb-2">
                    {isSignUp ? "New Identity" : "Welcome"}
                </h1>
                <p className="text-white/50 text-sm">
                    {isSignUp ? "Initialize your credentials." : "Enter your credentials to access the archive."}
                </p>
            </div>

            <div className="space-y-4 backdrop-blur-xl bg-white/5 p-8 rounded-3xl border border-white/10">
                
                {/* 2. GOOGLE AUTH BUTTON */}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-white/20 transition-all mb-6"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/0/google.svg" width="18" alt="Google" />
                  <span>{isSignUp ? "Sign up with Google" : "Sign in with Google"}</span>
                </button>

                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-4 text-white/30 text-xs uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-200 text-xs">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}

                    <div>
                        <label className="block text-acid-lime text-xs font-bold uppercase tracking-widest mb-2">Email</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-acid-lime focus:outline-none transition-colors" 
                          required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-acid-lime text-xs font-bold uppercase tracking-widest mb-2">Password</label>
                        <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-acid-lime focus:outline-none transition-colors pr-12" 
                              required
                            />
                            {/* 3. PASSWORD EYE ICON */}
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* 3. FORGOT PASSWORD OPTION */}
                    {!isSignUp && (
                        <div className="text-right">
                            <button 
                                type="button" 
                                onClick={handleForgotPassword}
                                className="text-[10px] uppercase tracking-widest text-acid-lime/60 hover:text-acid-lime transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                    
                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-acid-lime text-black font-bold py-4 rounded-lg uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader className="animate-spin" size={16}/> : <span>{isSignUp ? "Verify Identity" : "Access Library"}</span>}
                        {!loading && (isSignUp ? <UserPlus size={18} /> : <ArrowRight size={18} />)}
                    </button>
                </form>
            </div>
            
            <div className="text-center mt-6">
                <button 
                    onClick={() => { setError(null); setIsSignUp(!isSignUp); }}
                    className="text-xs uppercase tracking-widest text-white/50 hover:text-acid-lime transition-colors"
                >
                    {isSignUp ? "Already verified? " : "No credentials? "}
                    <span className="text-white font-bold underline">
                        {isSignUp ? "Login Access" : "Register Identity"}
                    </span>
                </button>
            </div>
        </div>
    </div>
  );
}