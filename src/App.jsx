import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Import Supabase
import AdminPage from './AdminPage';
// --- IMPORTS ---
import LoadingScreen from './LoadingScreen';
import LoginPage from './LoginPage';
import ImposterEbookLayout from './ImposterEbookLayout';
import SearchResults from './SearchResults'; 
import ProfilePage from './ProfilePage';    
import BookDetail from './BookDetail';
import Footer from './Footer';

function App() {
  const [loading, setLoading] = useState(true); // Initial "System Boot" animation
  const [session, setSession] = useState(null); // Stores the logged-in user

  // 1. Check for existing login session on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Loading Screen Logic
  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />;
  }

  // 3. Login Check
  // If no session, show Login Page
  if (!session) {
    return <LoginPage onLogin={(newSession) => setSession(newSession)} />;
  }

  // 4. Main App (Authenticated)
  return (
    <Router>
        <div className="min-h-screen bg-black flex flex-col justify-between">
            <div className="flex-grow">
                <Routes>
                    <Route path="/" element={<ImposterEbookLayout />} />
                    <Route path="/search/:category/:query" element={<SearchResults />} />
                    <Route path="/book/:id" element={<BookDetail />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    
                    {/* ADD THIS ROUTE */}
                    <Route path="/admin" element={<AdminPage />} />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
            <Footer />
        </div>
    </Router>
  );
}

export default App;