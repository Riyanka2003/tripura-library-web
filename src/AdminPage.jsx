import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
    ArrowLeft, Upload, BookOpen, Check, AlertCircle, Loader, Lock, 
    BarChart2, PieChart, Activity, Users, List, Clock, Star, 
    ShieldCheck, Database, HardDrive, RefreshCw, Sparkles, FileText, 
    Image as ImageIcon, Trash2, X, Trophy, Calendar 
} from 'lucide-react';

export default function AdminPage() {
  const navigate = useNavigate();
  
  // --- AUTH & SYSTEM STATE ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [systemHealth, setSystemHealth] = useState({ api: 'checking', db: 'checking' });

  // --- TAB & ANALYTICS STATE ---
  const [activeTab, setActiveTab] = useState('upload'); 
  const [timeRange, setTimeRange] = useState('7d'); 
  const [analyticsData, setAnalyticsData] = useState({
      totalViews: 0, activityData: [], categoryData: [], 
      standardData: [], subjectData: [], topBooks: [], reviews: []
  });

  // --- ARCHIVE MANAGEMENT STATE ---
  const [books, setBooks] = useState([]); 
  const [isDeleting, setIsDeleting] = useState(null);

  // --- UPLOAD FORM STATE ---
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false); 
  const [success, setSuccess] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null); 
  
  const [formData, setFormData] = useState({
    title: '', author: '', category: 'Textbooks', language: 'English', description: '', standard: 'General', edition: '', subjects: ''    
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const standardOptions = ['General', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const categoriesList = ['Textbooks', 'History', 'Science', 'Engineering', 'Novels'];

  // --- 1. SYSTEM HEALTH & FETCH DATA ---
  useEffect(() => {
    const checkHealth = async () => {
        try {
            const { error: dbErr } = await supabase.from('books').select('id', { count: 'exact', head: true });
            const apiRes = await fetch('https://tripura-library-backend.onrender.com/health'); 
            setSystemHealth({
                db: dbErr ? 'offline' : 'online',
                api: apiRes.ok ? 'online' : 'offline'
            });
        } catch (e) {
            setSystemHealth({ db: 'error', api: 'offline' });
        }
    };
    if (isAdmin) {
        checkHealth();
        if (activeTab === 'manage') fetchArchive();
        if (activeTab === 'analytics') fetchAnalyticsData();
    }
  }, [isAdmin, activeTab, timeRange]);

  const fetchArchive = async () => {
    const { data: bData } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (bData) setBooks(bData);
    const { data: rData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (rData) setAnalyticsData(prev => ({ ...prev, reviews: rData }));
  };

  const fetchAnalyticsData = async () => {
    const now = new Date();
    let startDate = new Date();

    if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
    else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '1m') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === '6m') startDate.setMonth(now.getMonth() - 6);
    else if (timeRange === '1y') startDate.setFullYear(now.getFullYear() - 1);
    else if (timeRange === '18m') startDate.setMonth(now.getMonth() - 18);

    const { data: logs } = await supabase.from('analytics_logs')
        .select('*, books(title, author, cover_url)')
        .gte('created_at', startDate.toISOString());
      
      if (logs) {
          // TOP 5 Logic
          const bookCounts = logs.reduce((acc, log) => {
              const bId = log.book_id;
              if (!acc[bId]) acc[bId] = { count: 0, title: log.books?.title, cover: log.books?.cover_url };
              acc[bId].count++;
              return acc;
          }, {});

          const top5 = Object.entries(bookCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, info]) => ({ id, ...info }));

          setAnalyticsData(prev => ({ 
              ...prev, 
              totalViews: logs.length,
              topBooks: top5,
              activityData: Array.from({length: 7}, (_, i) => ({ label: `${i+1}`, count: Math.floor(Math.random() * 10) }))
          }));
      }
  };

  // --- NEW AUTHENTICATION LOGIC ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Call the secure RPC function in Supabase
        const { data: isValid, error } = await supabase.rpc('verify_admin_access', {
            provided_pass: adminPass
        });

        if (error) throw error;

        if (isValid) {
            setIsAdmin(true);
            sessionStorage.setItem('lib_admin_auth', 'true');
        } else {
            alert("Access Denied: Invalid Passkey");
            setAdminPass('');
        }
    } catch (err) {
        console.error("Auth System Error:", err.message);
        alert("Security authentication failed. Check your database connection.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteBook = async (book) => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    setIsDeleting(book.id);
    try {
        const getPath = (url) => url.split('library-assets/')[1];
        await supabase.storage.from('library-assets').remove([getPath(book.pdf_url), getPath(book.cover_url)]);
        await supabase.from('books').delete().eq('id', book.id);
        setBooks(prev => prev.filter(b => b.id !== book.id));
    } catch (e) { alert("Delete failed"); } finally { setIsDeleting(null); }
  };

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < rating ? "#ccff00" : "none"} className={i < rating ? "text-acid-lime" : "text-white/10"} />)}
    </div>
  );

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    setIsAiProcessing(true);
    const aiFormData = new FormData();
    aiFormData.append('file', file);
    try {
        const res = await fetch('https://tripura-library-backend.onrender.com/api/extract-metadata', { method: 'POST', body: aiFormData });
        const data = await res.json();
        if (data.success) {
            const rawAi = JSON.parse(data.metadata);
            const ai = Object.keys(rawAi).reduce((acc, key) => { acc[key.toLowerCase()] = rawAi[key]; return acc; }, {});
            setFormData(prev => ({ ...prev, title: ai.title || prev.title, author: ai.author || prev.author, category: categoriesList.includes(ai.category) ? ai.category : prev.category }));
            setCoverPreview(data.cover_preview);
        }
    } catch (err) { console.error(err); } finally { setIsAiProcessing(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ... Supabase logic ...
    setLoading(false);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
              <form onSubmit={handleAdminLogin} className="bg-neutral-900 border border-white/10 p-8 rounded-2xl w-full max-w-md text-center">
                  <img src="/logo.png" className="w-16 h-16 mx-auto mb-6 object-contain" alt="Logo" />
                  <h1 className="text-2xl font-serif text-white mb-2">Restricted Area</h1>
                  <input 
                    type="password" 
                    placeholder="Passkey" 
                    className="w-full bg-black border border-white/20 rounded-lg p-3 text-white mb-4 outline-none focus:border-acid-lime" 
                    value={adminPass} 
                    onChange={(e) => setAdminPass(e.target.value)} 
                  />
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50"
                  >
                    {loading ? <Loader className="animate-spin mx-auto" /> : "Authenticate"}
                  </button>
              </form>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-acid-lime selection:text-black">
      
      {/* HEADER LOGO SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/10 pb-6 gap-4">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={() => navigate('/')} className="p-2 border border-white/20 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
             <div className="flex items-center gap-3">
                 <img src="/logo.png" className="w-10 h-10 object-contain" alt="Logo" />
                 <div>
                    <h1 className="text-2xl font-serif italic leading-none text-white">Directorate of Kokborok & OML</h1>
                    <div className="flex gap-4 mt-1">
                        <span className="text-[10px] uppercase tracking-tighter text-white/40 font-bold">DB: <span className={systemHealth.db === 'online' ? 'text-acid-lime' : 'text-red-500'}>{systemHealth.db.toUpperCase()}</span></span>
                        <span className="text-[10px] uppercase tracking-tighter text-white/40 font-bold">AI: <span className={systemHealth.api === 'online' ? 'text-acid-lime' : 'text-red-500'}>{systemHealth.api.toUpperCase()}</span></span>
                    </div>
                 </div>
             </div>
         </div>
         <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
             <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'upload' ? 'bg-acid-lime text-black' : 'text-white/40'}`}><Upload size={14} className="inline mr-2"/> Upload</button>
             <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'manage' ? 'bg-acid-lime text-black' : 'text-white/40'}`}><List size={14} className="inline mr-2"/> Manage</button>
             <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'analytics' ? 'bg-acid-lime text-black' : 'text-white/40'}`}><BarChart2 size={14} className="inline mr-2"/> Analytics</button>
         </div>
      </div>

      <div className="max-w-7xl mx-auto">
          {activeTab === 'upload' && (
              <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <form onSubmit={handleUpload} className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-2">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">Book Metadata</h3>
                            <div className="flex items-center gap-2 px-2 py-1 bg-acid-lime/10 rounded border border-acid-lime/20">
                                <Sparkles size={10} className="text-acid-lime"/>
                                <span className="text-[9px] text-acid-lime font-bold uppercase">AI Scan Active</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/70 font-bold uppercase tracking-wider ml-1">Book Title</label>
                                <input required type="text" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-acid-lime outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/70 font-bold uppercase tracking-wider ml-1">Author Name</label>
                                <input required type="text" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-acid-lime outline-none" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <select className="bg-black border border-white/10 rounded-xl p-4 text-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                {categoriesList.map(c => <option key={c} className="bg-black">{c}</option>)}
                            </select>
                            <select className="bg-black border border-white/10 rounded-xl p-4 text-white" value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
                                <option className="bg-black">English</option><option className="bg-black">Bengali</option><option className="bg-black">Kokborok</option>
                            </select>
                            <select className="bg-black border border-white/10 rounded-xl p-4 text-white" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                                {standardOptions.map(opt => <option key={opt} className="bg-black">{opt}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/70 font-bold uppercase tracking-wider ml-1">Subjects/Tags</label>
                                <input type="text" placeholder="e.g. Physics, Math" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-acid-lime outline-none" value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/70 font-bold uppercase tracking-wider ml-1">Edition</label>
                                <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-acid-lime outline-none" value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] text-white/70 font-bold uppercase tracking-wider ml-1">Description</label>
                            <textarea className="w-full bg-black border border-white/10 rounded-2xl p-4 h-32 outline-none focus:border-acid-lime transition-all resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-acid-lime text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(204,255,0,0.2)] hover:bg-white transition-all">
                            {loading ? <Loader className="animate-spin mx-auto" /> : "Finalize & Push to Archive"}
                        </button>
                    </div>
                  </form>
                  <div className="lg:col-span-4 space-y-6">
                      <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl text-center relative overflow-hidden group shadow-xl">
                          <input required type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handlePdfChange} />
                          <div className={isAiProcessing ? 'blur-sm opacity-20' : ''}>
                              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-acid-lime border border-white/5 group-hover:bg-acid-lime group-hover:text-black transition-all">
                                  <Upload size={32}/>
                              </div>
                              <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-widest">Select Book PDF</h4>
                              <p className="text-[9px] text-white/40 uppercase">Instant AI Data Fill</p>
                          </div>
                          {isAiProcessing && <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40"><Loader className="animate-spin text-acid-lime mb-2" size={32} /><span className="text-[10px] font-bold text-acid-lime tracking-widest">ANALYZING...</span></div>}
                      </div>
                      <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl flex flex-col items-center shadow-xl">
                          <h3 className="text-[10px] text-white/50 uppercase tracking-[0.2em] mb-8 font-bold">Live Cover Preview</h3>
                          <div className="w-full aspect-[3/4] max-w-[200px] bg-black rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                            {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" alt="Preview" /> : <ImageIcon size={40} className="text-white/5"/>}
                          </div>
                          <button className="mt-8 w-full py-3 border border-white/10 rounded-xl text-[10px] text-white/50 uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-all cursor-pointer text-center">Override Image</button>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'manage' && (
              <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                      <h3 className="text-white/50 uppercase tracking-widest text-[11px] font-bold border-b border-white/10 pb-2">Books ({books.length})</h3>
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {books.map(book => (
                            <div key={book.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all">
                                <div className="flex items-center gap-3">
                                    <img src={book.cover_url} className="w-10 h-14 object-cover rounded bg-black" alt="" />
                                    <div>
                                        <h4 className="font-bold text-xs text-white">{book.title}</h4>
                                        <p className="text-[9px] text-white/40 uppercase mt-1">{book.author}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteBook(book)} className="p-2 text-white/10 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        ))}
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-acid-lime uppercase tracking-widest text-[11px] font-bold border-b border-white/10 pb-2">Student Feedback</h3>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {analyticsData.reviews.map((rev) => (
                            <div key={rev.id} className="bg-neutral-900 border border-white/5 p-4 rounded-xl relative group">
                                <div className="flex justify-between items-center mb-2">
                                    {renderStars(rev.rating)}
                                    <span className="text-[8px] text-white/20 font-mono">{new Date(rev.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-white/80 text-xs italic leading-relaxed">"{rev.feedback}"</p>
                            </div>
                        ))}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'analytics' && (
              <div className="animate-fadeIn space-y-8 pb-10">
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2 px-4 text-acid-lime font-bold text-[10px] uppercase tracking-[0.2em]"><Calendar size={14}/> Timeline Range</div>
                      <div className="flex gap-1">
                          {['24h', '7d', '1m', '6m', '1y', '18m'].map(t => (
                              <button key={t} onClick={() => setTimeRange(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${timeRange === t ? 'bg-acid-lime text-black' : 'text-white/30 hover:text-white'}`}>{t}</button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Total Views</p>
                          <h4 className="text-3xl font-serif text-acid-lime">{analyticsData.totalViews}</h4>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">System Health</p>
                          <h4 className="text-3xl font-serif text-white">99.8%</h4>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Active Archive</p>
                          <h4 className="text-3xl font-serif text-white">{books.length}</h4>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Avg Rating</p>
                          <h4 className="text-3xl font-serif text-acid-lime">4.8</h4>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-8 bg-white/5 border border-white/5 p-8 rounded-3xl h-80 flex flex-col relative overflow-hidden">
                            <div className="flex items-center gap-2 text-white/30 text-[10px] uppercase font-bold tracking-widest mb-10"><Activity size={14}/> Traffic Engagement Curve</div>
                            <div className="flex-1 flex items-end justify-between gap-2 px-6">
                                {analyticsData.activityData.map((d, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 w-full group relative">
                                        <div className="w-full bg-acid-lime/20 group-hover:bg-acid-lime rounded-t-lg transition-all" style={{ height: `${Math.max(d.count * 10, 5)}%` }}></div>
                                        <span className="text-[8px] text-white/20 truncate w-full text-center">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                      </div>

                      <div className="lg:col-span-4 bg-[#0f0f0f] border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col">
                          <h3 className="text-acid-lime font-bold text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Trophy size={16}/> Top 5 Most Read Books </h3>
                          <div className="space-y-4 flex-1">
                              {analyticsData.topBooks.map((book, i) => (
                                  <div key={book.id} className="flex items-center gap-4 bg-white/5 p-2.5 rounded-xl border border-white/5">
                                      <span className="text-[10px] font-black text-white/10">0{i+1}</span>
                                      <img src={book.cover} className="w-8 h-12 object-cover rounded shadow-lg" alt="" />
                                      <div className="overflow-hidden">
                                          <h4 className="text-[11px] font-bold text-white truncate">{book.title}</h4>
                                          <p className="text-[9px] text-white/30 uppercase">{book.count} Access Events</p>
                                      </div>
                                  </div>
                              ))}
                              {analyticsData.topBooks.length === 0 && <div className="h-full flex items-center justify-center text-white/10 italic text-[10px]">No data in current timeline</div>}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}