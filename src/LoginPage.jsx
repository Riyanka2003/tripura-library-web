import React, { useState } from 'react';
import { ArrowRight, Loader, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { supabase } from './supabaseClient'; 

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New State: Toggle between Login and Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        if (isSignUp) {
            // --- SIGN UP LOGIC ---
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // Set default metadata so Profile page works immediately
                    data: { 
                        username: email.split('@')[0], 
                        role: "Student Access Level" 
                    }
                }
            });
            if (error) throw error;
            
            // Check if email confirmation is required by your Supabase settings
            if (data.session) {
                onLogin(data.session);
            } else if (data.user) {
                alert("Account created! Please check your email to verify your identity.");
                setIsSignUp(false); // Switch back to login
            }
        } else {
            // --- LOGIN LOGIC ---
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
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
    <div className="fixed inset-0 bg-black z-[900] flex items-center justify-center font-sans cursor-default">
        
        {/* Background Art */}
        <div className="absolute inset-0 overflow-hidden">
             <img 
                src="/assets/Unakoti.png" 
                onError={(e) => e.target.style.display = 'none'}
                className="absolute w-full h-full object-cover opacity-20 blur-sm scale-110" 
                alt="Background"
             />
             <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-8">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-acid-lime rounded-full mb-6 shadow-[0_0_30px_#ccff00]">
                    <span className="text-3xl font-bold text-black">T</span>
                </div>
                {/* Dynamic Title */}
                <h1 className="text-4xl text-white font-serif italic mb-2">
                    {isSignUp ? "New Identity" : "Welcome Back"}
                </h1>
                <p className="text-white/50 text-sm">
                    {isSignUp ? "Initialize your credentials for the archive." : "Enter your credentials to access the archive."}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4 backdrop-blur-xl bg-white/5 p-8 rounded-3xl border border-white/10">
                
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
                      placeholder="student@tripura.edu" 
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-acid-lime focus:outline-none transition-colors" 
                    />
                </div>
                <div>
                    <label className="block text-acid-lime text-xs font-bold uppercase tracking-widest mb-2">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-acid-lime focus:outline-none transition-colors" 
                    />
                </div>
                
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-acid-lime text-black font-bold py-4 rounded-lg uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] mt-4 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                      <>Processing <Loader className="animate-spin" size={16}/></>
                    ) : (
                      <>
                        <span>{isSignUp ? "Create Account" : "Access Library"}</span> 
                        {isSignUp ? <UserPlus size={18} /> : <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>}
                      </>
                    )}
                </button>
            </form>
            
            {/* Toggle Login/Signup */}
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

            <p className="text-center text-white/30 text-[10px] mt-4">
                Restricted Access. Authorized Personnel Only.
            </p>
        </div>
    </div>
  );
}