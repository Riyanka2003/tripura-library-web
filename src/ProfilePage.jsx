import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Bookmark, Upload, FileText, Plus, LogOut, Loader, Trash2, Eye, Camera, X, Settings, Lock, BookOpen, Flame } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAnalytics } from './useAnalytics'; // Import the Analytics Hook

export default function ProfilePage() {
  const navigate = useNavigate();
  
  // --- ANALYTICS HOOK ---
  const { streak } = useAnalytics(); 

  // --- STATE ---
  const [session, setSession] = useState(null); // Changed 'user' to 'session' for auth logic
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Data
  const [username, setUsername] = useState("Neon Scholar");
  const [role, setRole] = useState("Student Access Level");
  const [booksReadCount, setBooksReadCount] = useState(0);

  const [uploads, setUploads] = useState([]);
  const [bookmarks, setBookmarks] = useState([]); 
  const [notes, setNotes] = useState([]); 

  // Auth Form State (New)
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Modals
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Edit Form State
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Upload & Note States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // --- FETCH DATA ---
  useEffect(() => {
    async function initProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      
      // IF NO SESSION -> STOP LOADING (Triggers Login Form)
      if (!session) { 
          setLoading(false); 
          return; 
      }

      setSession(session);

      // 1. Load Profile Metadata
      const meta = session.user.user_metadata;
      if (meta?.username) setUsername(meta.username);
      if (meta?.role) setRole(meta.role);
      
      setEditUsername(meta?.username || session.user.email?.split('@')[0]);
      setEditRole(meta?.role || "Student Access Level");
      setEditEmail(session.user.email);

      // 2. Load Avatar
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
      if (profile) setAvatarUrl(profile.avatar_url);

      // 3. Uploads
      const { data: userFiles } = await supabase.from('user_uploads').select('*').order('created_at', { ascending: false });
      if (userFiles) setUploads(userFiles);

      // 4. Bookmarks
      const { data: savedBooks } = await supabase
        .from('bookmarks')
        .select(`id, book_id, books ( id, title, cover_url )`)
        .order('created_at', { ascending: false });
      if (savedBooks) setBookmarks(savedBooks);

      // 5. Notes
      const { data: userNotes } = await supabase.from('sticky_notes').select('*').order('created_at', { ascending: false });
      if (userNotes) setNotes(userNotes);

      // 6. Calculate Books Read (Estimate based on Logs)
      // Note: This requires the analytics_logs table to allow reading your own logs
      const { data: logs } = await supabase.from('analytics_logs').select('book_id'); // Simple fetch
      if(logs) {
         // In a real app with RLS, this would filter by user. For now, we simulate.
         setBooksReadCount(new Set(logs.map(l => l.book_id)).size || 0); 
      }

      setLoading(false);
    }
    initProfile();
  }, [navigate]);

  // --- AUTH HANDLERS (NEW) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Signup successful! You can now login.");
        setAuthMode('login');
        setAuthLoading(false);
        return;
      }
      window.location.reload();
    } catch (error) {
      alert(error.message);
      setAuthLoading(false);
    }
  };

  // --- HANDLERS (EXISTING) ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const updates = {
            email: editEmail,
            data: { username: editUsername, role: editRole }
        };
        const { error: profileError } = await supabase.auth.updateUser(updates);
        if (profileError) throw profileError;

        if (editPassword.trim().length > 0) {
            const { error: passError } = await supabase.auth.updateUser({ password: editPassword });
            if (passError) throw passError;
            alert("Password updated successfully!");
        }

        setUsername(editUsername);
        setRole(editRole);
        setShowEditModal(false);
        setEditPassword(""); 
    } catch (error) {
        alert("Update failed: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    try {
      setUploadingAvatar(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${session.user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('library-assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('library-assets').getPublicUrl(filePath);
      await supabase.from('profiles').upsert({ id: session.user.id, avatar_url: publicUrl });
      setAvatarUrl(publicUrl);
    } catch (error) { alert(error.message); } 
    finally { setUploadingAvatar(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const filePath = `private/${session.user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('library-assets').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('library-assets').getPublicUrl(filePath);
      const { data, error } = await supabase.from('user_uploads').insert([{ user_id: session.user.id, title: file.name, file_url: publicUrl }]).select();
      if (error) throw error;
      setUploads([data[0], ...uploads]);
    } catch (error) { alert(error.message); } 
    finally { setUploadingFile(false); }
  };

  const handleDeleteFile = async (id, fileUrl) => {
      if (!window.confirm("Delete this file?")) return;
      try {
          const path = fileUrl.split('/library-assets/')[1];
          if (path) await supabase.storage.from('library-assets').remove([path]);
          await supabase.from('user_uploads').delete().eq('id', id);
          setUploads(uploads.filter((item) => item.id !== id));
      } catch (error) { alert("Error: " + error.message); }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    const colors = ['bg-yellow-200/10 border-yellow-200/20 text-yellow-100', 'bg-pink-200/10 border-pink-200/20 text-pink-100', 'bg-cyan-200/10 border-cyan-200/20 text-cyan-100'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const { data, error } = await supabase.from('sticky_notes').insert([{ user_id: session.user.id, content: newNoteText, color: randomColor }]).select();
    if (!error) { setNotes([data[0], ...notes]); setNewNoteText(""); setIsAddingNote(false); }
  };

  const handleDeleteNote = async (id) => {
      const { error } = await supabase.from('sticky_notes').delete().eq('id', id);
      if (!error) setNotes(notes.filter(n => n.id !== id));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  // --- PHYSICS CURSOR ---
  const trailRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const TRAIL_COUNT = 200;

  useEffect(() => {
    const points = Array(TRAIL_COUNT).fill().map(() => ({ x: 0, y: 0 }));
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (points[0].x === 0 && points[0].y === 0) {
        points.forEach(p => { p.x = e.clientX; p.y = e.clientY; });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      let head = points[0];
      head.x += (mouseRef.current.x - head.x) * 0.9;
      head.y += (mouseRef.current.y - head.y) * 0.9;

      for (let i = 1; i < TRAIL_COUNT; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        curr.x += (prev.x - curr.x) * 0.9;
        curr.y += (prev.y - curr.y) * 0.9;
      }

      trailRef.current.forEach((el, index) => {
        if (!el) return;
        const p = points[index];
        el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      });
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const getSegmentStyle = (index) => {
    let size = 'w-2 h-2'; 
    if (index > 20) size = 'w-2 h-2'; 
    if (index > 70) size = 'w-2 h-2'; 
    return `${size} ${index < 75 ? 'bg-acid-lime' : 'bg-white'}`;
  };

  // --- RENDER: LOADING ---
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-acid-lime"><Loader className="animate-spin"/></div>;

  // --- RENDER: LOGIN FORM (If not logged in) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans cursor-none">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-80"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-acid-lime/10 blur-[100px] rounded-full pointer-events-none"></div>

        {/* Cursor */}
        {Array(TRAIL_COUNT).fill().map((_, i) => (
            <div key={i} ref={el => trailRef.current[i] = el} className={`fixed rounded-full pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2 ${getSegmentStyle(i)}`} style={{ left: 0, top: 0, willChange: 'transform' }} />
        ))}

        <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <button onClick={() => navigate('/')} className="absolute top-6 left-6 text-white/50 hover:text-white cursor-none"><ArrowLeft size={20}/></button>
            
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-acid-lime rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_#ccff00]">
                    <User size={30} className="text-black"/>
                </div>
                <h2 className="text-3xl font-serif text-white italic mb-2">Student Portal</h2>
                <p className="text-white/40 text-sm">Access your saved books and streak.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-acid-lime font-bold">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-white/30" size={18}/>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                            className="w-full bg-black/50 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white focus:border-acid-lime outline-none transition-colors cursor-none" placeholder="student@example.com" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-acid-lime font-bold">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-white/30" size={18}/>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} 
                            className="w-full bg-black/50 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white focus:border-acid-lime outline-none transition-colors cursor-none" placeholder="••••••••" />
                    </div>
                </div>

                <button type="submit" disabled={authLoading} className="w-full py-4 mt-4 bg-acid-lime text-black font-bold rounded-xl uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-50 cursor-none">
                    {authLoading ? 'Processing...' : (authMode === 'login' ? 'Enter Library' : 'Create Account')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-white/40 text-xs hover:text-white underline cursor-none">
                    {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
            </div>
        </div>
      </div>
    );
  }

  // --- RENDER: LOGGED IN (PROFILE) ---
  return (
    <div className="relative min-h-screen w-full font-sans cursor-none bg-black selection:bg-acid-lime selection:text-black flex items-center justify-center p-4">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-neutral-900 pointer-events-none">
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
         <div className="absolute top-0 w-full h-1 bg-acid-lime/50 shadow-[0_0_50px_#ccff00] animate-scan"></div>
      </div>

      {/* CURSOR */}
      {Array(TRAIL_COUNT).fill().map((_, i) => (
        <div key={i} ref={el => trailRef.current[i] = el} className={`fixed rounded-full pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2 ${getSegmentStyle(i)}`} style={{ left: 0, top: 0, willChange: 'transform' }} />
      ))}

      {/* BACK BUTTON */}
      <button onClick={() => navigate('/')} className="fixed top-8 left-8 z-50 group flex items-center gap-3 text-white hover:text-acid-lime transition-colors cursor-none">
         <div className="p-2 border border-white/20 rounded-full group-hover:border-acid-lime transition-colors"><ArrowLeft size={20} /></div>
         <span className="uppercase tracking-widest text-xs font-bold">Home</span>
      </button>

      {/* --- EDIT SETTINGS MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-neutral-900 border border-acid-lime/30 rounded-2xl w-full max-w-md p-8 relative shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-serif italic text-white">Edit Settings</h2>
                    <button onClick={() => setShowEditModal(false)} className="text-white/50 hover:text-white cursor-none"><X size={24}/></button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="text-acid-lime text-[10px] uppercase font-bold tracking-widest mb-2 block">Username</label>
                        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-acid-lime transition-colors">
                            <User size={18} className="text-white/50 mr-3"/>
                            <input 
                                type="text" 
                                value={editUsername} 
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/20 cursor-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-acid-lime text-[10px] uppercase font-bold tracking-widest mb-2 block">Designation / Role</label>
                        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-acid-lime transition-colors">
                            <BookOpen size={18} className="text-white/50 mr-3"/>
                            <input 
                                type="text" 
                                value={editRole} 
                                onChange={(e) => setEditRole(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/20 cursor-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-acid-lime text-[10px] uppercase font-bold tracking-widest mb-2 block">Email ID</label>
                        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-acid-lime transition-colors">
                            <Mail size={18} className="text-white/50 mr-3"/>
                            <input 
                                type="email" 
                                value={editEmail} 
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/20 cursor-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-acid-lime text-[10px] uppercase font-bold tracking-widest mb-2 block">New Password (Optional)</label>
                        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-acid-lime transition-colors">
                            <Lock size={18} className="text-white/50 mr-3"/>
                            <input 
                                type="password" 
                                value={editPassword} 
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/20 cursor-none"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full py-4 bg-acid-lime text-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-colors cursor-none flex justify-center items-center gap-2"
                    >
                        {isSaving ? <Loader className="animate-spin" size={18}/> : <Settings size={18}/>}
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- BOOKMARKS MODAL --- */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-neutral-900 border border-acid-lime/30 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col relative shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                <div className="p-8 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-serif italic text-white">Saved Library</h2>
                        <p className="text-acid-lime text-xs uppercase tracking-widest mt-2">{bookmarks.length} Books Bookmarked</p>
                    </div>
                    <button onClick={() => setShowBookmarksModal(false)} className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors cursor-none">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {bookmarks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-white/30">
                            <Bookmark size={48} className="mb-4 opacity-50"/>
                            <p>No books saved yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {bookmarks.map((item) => (
                                <div key={item.id} onClick={() => navigate(`/book/${item.books.id}`)} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-acid-lime/50 transition-all cursor-none group flex gap-4 items-start">
                                    <div className="w-16 h-24 bg-black rounded overflow-hidden flex-shrink-0">
                                        {item.books.cover_url ? <img src={item.books.cover_url} alt="Cover" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white/20"><BookOpen size={16}/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-serif italic text-lg truncate group-hover:text-acid-lime transition-colors">{item.books.title}</h4>
                                        <div className="mt-4 text-xs text-white/40 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">Read Now <ArrowLeft className="rotate-180" size={10}/></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-10">
            
            {/* LEFT COLUMN: IDENTITY & STATS */}
            <div className="flex flex-col items-center gap-6 md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-8">
                
                {/* PROFILE PICTURE */}
                <div className="relative group w-40 h-40">
                    <div className="w-full h-full rounded-full border-4 border-acid-lime p-2 shadow-[0_0_30px_rgba(204,255,0,0.2)]">
                        <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                            {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <User size={60} className="text-white/50" />}
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                {uploadingAvatar ? <Loader className="animate-spin text-acid-lime"/> : <Camera className="text-acid-lime mb-1" />}
                                <span className="text-[10px] text-white uppercase font-bold tracking-widest">Change</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="text-center w-full relative">
                    {/* EDIT SETTINGS BUTTON */}
                    <button 
                        onClick={() => setShowEditModal(true)}
                        className="absolute right-0 top-0 p-2 text-white/30 hover:text-acid-lime transition-colors cursor-none"
                    >
                        <Settings size={18} />
                    </button>

                    <h2 className="text-xl font-serif italic text-white truncate px-2">{username}</h2>
                    <p className="text-acid-lime tracking-widest text-[10px] uppercase font-bold mt-2 mb-6">{role}</p>
                    
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center gap-3 text-left w-full mb-4">
                        <div className="p-2 bg-white/10 rounded-full text-acid-lime"><Mail size={16} /></div>
                        <div className="overflow-hidden">
                            <p className="text-white/50 text-[10px] uppercase tracking-wider">Email</p>
                            <p className="text-white text-sm truncate">{session?.user?.email}</p>
                        </div>
                    </div>

                    {/* --- NEW: LIVE STATS GRID --- */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-acid-lime/10 border border-acid-lime/30 p-4 rounded-xl text-center">
                             <Flame size={20} className="text-acid-lime mx-auto mb-1" />
                             <h3 className="text-xl font-serif text-white">{streak}</h3>
                             <p className="text-[9px] uppercase tracking-widest text-acid-lime font-bold">Streak</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                             <BookOpen size={20} className="text-white/50 mx-auto mb-1" />
                             <h3 className="text-xl font-serif text-white">{booksReadCount}</h3>
                             <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold">Read</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="w-full py-3 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 cursor-none">
                        <LogOut size={14}/> Logout
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: DASHBOARD GRID */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. BOOKMARKS CARD */}
                <div 
                    onClick={() => setShowBookmarksModal(true)} 
                    className="p-6 rounded-xl border bg-black/30 border-white/5 hover:border-acid-lime/50 transition-colors group cursor-pointer flex flex-col justify-between"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-lg bg-white/5 text-acid-lime group-hover:bg-acid-lime group-hover:text-black transition-colors"><Bookmark size={20}/></div>
                        <span className="text-3xl font-bold text-white">{bookmarks.length}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <p className="text-white/50 text-xs uppercase tracking-wider">Saved Bookmarks</p>
                        <p className="text-[10px] text-acid-lime opacity-0 group-hover:opacity-100 transition-opacity">OPEN LIBRARY &rarr;</p>
                    </div>
                </div>

                {/* 2. UPLOAD CARD */}
                <label className="p-6 rounded-xl border bg-black/30 border-white/5 hover:border-acid-lime/50 transition-colors group cursor-pointer relative overflow-hidden flex flex-col justify-between">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                    {uploadingFile && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                            <Loader className="animate-spin text-acid-lime mb-2" />
                            <span className="text-acid-lime text-xs uppercase tracking-widest">Uploading...</span>
                        </div>
                    )}
                    <div className="flex justify-between items-start">
                         <div className="p-2 rounded-lg bg-white/5 text-acid-lime group-hover:bg-acid-lime group-hover:text-black transition-colors"><Upload size={20}/></div>
                         <div className="p-1 border border-white/20 rounded text-white/50 text-[10px] uppercase">Select</div>
                    </div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Upload File</p>
                        <p className="text-white/30 text-[10px]">Synced to Mobile App</p>
                    </div>
                </label>

                {/* 3. MY PRIVATE FILES LIST */}
                <div className="bg-black/30 p-6 rounded-xl border border-white/5 col-span-1 md:col-span-2">
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                             <FileText size={18} className="text-acid-lime" />
                             <span className="text-white text-sm font-bold uppercase tracking-wider">My Private Files</span>
                          </div>
                          <div className="text-[10px] text-white/30">{uploads.length} Files</div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto scrollbar-hide">
                          {uploads.length === 0 ? <div className="text-white/20 text-xs italic">No files yet.</div> : 
                          uploads.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10 hover:border-acid-lime/30 transition-colors group">
                                  <span className="text-xs text-white/80 truncate pl-2">{file.title}</span>
                                  <div className="flex gap-2">
                                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/20 rounded text-acid-lime"><Eye size={14}/></a>
                                    <button onClick={() => handleDeleteFile(file.id, file.file_url)} className="p-1 hover:bg-red-500/20 rounded text-white/30 hover:text-red-500 transition-colors">
                                        <Trash2 size={14}/>
                                    </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                </div>

                {/* 4. STICKY NOTES */}
                <div className="bg-black/30 p-6 rounded-xl border border-white/5 col-span-1 md:col-span-2 relative min-h-[200px] flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-white text-sm font-bold uppercase tracking-wider">Sticky Notes</span>
                          <button onClick={() => setIsAddingNote(!isAddingNote)} className="w-6 h-6 rounded bg-acid-lime text-black flex items-center justify-center hover:bg-white transition-colors">
                             <Plus size={16}/>
                          </button>
                      </div>

                      {isAddingNote && (
                          <div className="mb-4 flex gap-2 animate-fadeIn">
                              <input 
                                autoFocus
                                type="text" 
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                placeholder="Type note here..."
                                className="flex-1 bg-white/5 border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-acid-lime outline-none cursor-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                              />
                              <button onClick={handleAddNote} className="px-3 bg-white/10 rounded text-acid-lime text-xs font-bold uppercase hover:bg-acid-lime hover:text-black cursor-none">Save</button>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[200px] scrollbar-hide">
                          {notes.length === 0 && !isAddingNote ? (
                              <div className="col-span-2 text-center text-white/20 text-xs py-4">Click + to add a note.</div>
                          ) : (
                              notes.map((note) => (
                                  <div key={note.id} className={`p-3 rounded border text-xs leading-relaxed relative group ${note.color || 'bg-white/10 border-white/20 text-white'}`}>
                                      {note.content}
                                      <button onClick={() => handleDeleteNote(note.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-black/50 hover:text-red-500 transition-opacity cursor-none">
                                          <X size={12} />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}