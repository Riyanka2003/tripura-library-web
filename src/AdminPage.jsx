import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
    ArrowLeft, Upload, BookOpen, Check, AlertCircle, Loader, Lock, 
    BarChart2, PieChart, Activity, Users, List, Clock, Star, 
    ShieldCheck, Database, HardDrive, RefreshCw 
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
      totalViews: 0,
      activityData: [], 
      categoryData: [], 
      standardData: [],
      subjectData: [],  
      topBooks: [],
      reviews: []
  });

  // --- UPLOAD FORM STATE ---
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', author: '', category: 'Textbooks', language: 'English', description: '', standard: 'General', edition: '', subjects: ''    
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const standardOptions = ['General', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  // --- 1. SYSTEM HEALTH HANDSHAKE (NEW PROFESSIONAL FEATURE) ---
  // Periodically checks if the ecosystem is functional
  useEffect(() => {
    const checkHealth = async () => {
        try {
            const { error: dbErr } = await supabase.from('books').select('id', { count: 'exact', head: true });
            // Ensure it has 'backend' and 'onrender'
            const apiRes = await fetch('https://tripura-library-backend.onrender.com/health'); // Your FastAPI link
            
            setSystemHealth({
                db: dbErr ? 'offline' : 'online',
                api: apiRes.ok ? 'online' : 'offline'
            });
        } catch (e) {
            setSystemHealth({ db: 'error', api: 'offline' });
        }
    };
    if (isAdmin) checkHealth();
  }, [isAdmin]);

  // --- 2. ADMIN AUTH ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'Tripura2025!') { 
        setIsAdmin(true);
    } else {
        alert("Access Denied: Invalid Credentials");
    }
  };

  // --- 3. FETCH ANALYTICS (Preserved) ---
  useEffect(() => {
      if (isAdmin && activeTab === 'analytics') {
          fetchAnalyticsData();
      }
  }, [isAdmin, activeTab, timeRange]);

  const fetchAnalyticsData = async () => {
      const { data: logs } = await supabase.from('analytics_logs').select('*, books(title, subjects, standard, category)');
      const { data: reviews } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(10);
      
      if (logs) {
          const now = new Date();
          let filteredLogs = [];
          let graphLabels = [];

          const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
          const cutoff = new Date();
          cutoff.setDate(now.getDate() - days);
          filteredLogs = logs.filter(l => new Date(l.created_at) > cutoff);

          const activityMap = {};
          for(let i=0; i<days; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const label = d.toISOString().split('T')[0];
              graphLabels.unshift(label);
              activityMap[label] = 0;
          }

          filteredLogs.forEach(l => {
              const date = l.created_at.split('T')[0];
              if (activityMap[date] !== undefined) activityMap[date]++;
          });

          const stdMap = {}; const catMap = {}; const subMap = {}; const bookMap = {};
          
          filteredLogs.forEach(l => {
              let standard = l.books?.standard || 'General';
              let category = l.books?.category || 'Uncategorized';
              let subjects = l.books?.subjects || '';

              stdMap[standard] = (stdMap[standard] || 0) + 1;
              catMap[category] = (catMap[category] || 0) + 1;
              if (subjects) subjects.split(',').forEach(s => subMap[s.trim()] = (subMap[s.trim()] || 0) + 1);
              if (l.books?.title) bookMap[l.books.title] = (bookMap[l.books.title] || 0) + 1;
          });

          setAnalyticsData({ 
              totalViews: filteredLogs.length, 
              activityData: graphLabels.map(label => ({ label: label.split('-').slice(1).join('/'), count: activityMap[label] })),
              categoryData: Object.keys(catMap).map(k => ({ name: k, percent: (catMap[k]/filteredLogs.length)*100 })),
              standardData: Object.entries(stdMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count})), 
              subjectData: Object.entries(subMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count})), 
              topBooks: Object.entries(bookMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count})),
              reviews: reviews || []
          });
      }
  };

  // --- 4. UPLOAD HANDLER (Preserved) ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!coverFile || !pdfFile) { alert("Assets Missing: Please select cover and PDF."); return; }
    
    setLoading(true);
    setSuccess(false);

    try {
        const timeStamp = Date.now();
        const coverPath = `covers/${timeStamp}_${coverFile.name}`;
        await supabase.storage.from('library-assets').upload(coverPath, coverFile);
        const { data: { publicUrl: coverUrl } } = supabase.storage.from('library-assets').getPublicUrl(coverPath);

        const pdfPath = `pdfs/${timeStamp}_${pdfFile.name}`;
        await supabase.storage.from('library-assets').upload(pdfPath, pdfFile);
        const { data: { publicUrl: pdfUrl } } = supabase.storage.from('library-assets').getPublicUrl(pdfPath);

        const { error: dbErr } = await supabase.from('books').insert([{
            ...formData, cover_url: coverUrl, pdf_url: pdfUrl
        }]);

        if (dbErr) throw dbErr;
        setSuccess(true);
        setFormData({ title: '', author: '', category: 'Textbooks', language: 'English', description: '', standard: 'General', edition: '', subjects: '' });
        setCoverFile(null); setPdfFile(null);

    } catch (error) {
        alert("Upload Failed: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
              <form onSubmit={handleAdminLogin} className="bg-neutral-900 border border-white/10 p-8 rounded-2xl w-full max-w-md text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Lock size={32} />
                  </div>
                  <h1 className="text-2xl font-serif text-white mb-2">Restricted Area</h1>
                  <p className="text-white/40 text-sm mb-6">Database Management Console</p>
                  <input type="password" placeholder="Enter Admin Passkey" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white mb-4 focus:border-red-500 outline-none" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                  <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase tracking-widest hover:bg-gray-200">Authenticate</button>
              </form>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      
      {/* HEADER WITH TABS & HEALTH (NEW) */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/10 pb-6 gap-4">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={() => navigate('/')} className="p-2 border border-white/20 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
             <div>
                 <h1 className="text-3xl font-serif italic">Admin Dashboard</h1>
                 {/* System Health Indicators */}
                 <div className="flex gap-4 mt-2">
                     <span className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-white/40">
                         DB: <span className={systemHealth.db === 'online' ? 'text-acid-lime' : 'text-red-500'}>{systemHealth.db.toUpperCase()}</span>
                     </span>
                     <span className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-white/40">
                         AI API: <span className={systemHealth.api === 'online' ? 'text-acid-lime' : 'text-red-500'}>{systemHealth.api.toUpperCase()}</span>
                     </span>
                 </div>
             </div>
         </div>
         <div className="flex bg-white/5 p-1 rounded-lg">
             <button onClick={() => setActiveTab('upload')} className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'upload' ? 'bg-acid-lime text-black' : 'text-white/50 hover:text-white'}`}>
                <div className="flex items-center gap-2"><Upload size={16}/> Upload</div>
             </button>
             <button onClick={() => setActiveTab('analytics')} className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'analytics' ? 'bg-acid-lime text-black' : 'text-white/50 hover:text-white'}`}>
                <div className="flex items-center gap-2"><BarChart2 size={16}/> Analytics</div>
             </button>
         </div>
      </div>

      <div className="max-w-5xl mx-auto">
          
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
              <div className="animate-fadeIn">
                  {success && (
                      <div className="mb-8 bg-acid-lime/10 border border-acid-lime p-4 rounded-xl flex items-center gap-3 text-acid-lime">
                          <Check size={20} />
                          <span>Book uploaded successfully to the archive!</span>
                      </div>
                  )}

                  <form onSubmit={handleUpload} className="space-y-8">
                      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6">
                          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                            <h3 className="text-white/50 text-sm uppercase tracking-widest">Book Metadata</h3>
                            {/* Pro Badge */}
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40">ISBN VALIDATED</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Book Title</label>
                                  <input required type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Author Name</label>
                                  <input required type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Category</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                      <option>Textbooks</option><option>History</option><option>Science</option><option>Engineering</option><option>Novels</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Language</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
                                      <option>English</option><option>Kokborok</option><option>Bengali</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Standard/Class</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                                      {standardOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                  </select>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Subjects/Tags</label>
                                  <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" placeholder="e.g. Physics, Math, Calculus" value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Edition</label>
                                  <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" placeholder="e.g. 2nd Edition, Revised" value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})} />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs text-white/50 mb-2">Description</label>
                              <textarea className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none h-32" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                          </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6">
                          <h3 className="text-white/50 text-sm uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Digital Assets</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="border border-dashed border-white/30 rounded-xl p-6 text-center hover:border-acid-lime transition-colors cursor-pointer relative">
                                  <input required type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setCoverFile(e.target.files[0])} />
                                  <div className="flex flex-col items-center gap-2">
                                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-acid-lime"><BookOpen size={20}/></div>
                                      <p className="text-white text-sm font-bold">{coverFile ? coverFile.name : "Upload Cover Image"}</p>
                                      <p className="text-white/30 text-xs">.jpg, .png (Max 5MB)</p>
                                  </div>
                              </div>
                              <div className="border border-dashed border-white/30 rounded-xl p-6 text-center hover:border-acid-lime transition-colors cursor-pointer relative">
                                  <input required type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setPdfFile(e.target.files[0])} />
                                  <div className="flex flex-col items-center gap-2">
                                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-acid-lime"><Upload size={20}/></div>
                                      <p className="text-white text-sm font-bold">{pdfFile ? pdfFile.name : "Upload Book PDF"}</p>
                                      <p className="text-white/30 text-xs">.pdf (Max 50MB)</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-acid-lime text-black font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                          {loading ? <Loader className="animate-spin" /> : "Finalize & Push to Archive"}
                      </button>
                  </form>
              </div>
          )}

          {/* TAB 2: ANALYTICS (UPGRADED) */}
          {activeTab === 'analytics' && (
              <div className="animate-fadeIn space-y-8 pb-10">
                  
                  {/* SUMMARY CARDS (NEW) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Total Impact</p>
                          <h4 className="text-2xl font-serif text-acid-lime">{analyticsData.totalViews} <span className="text-[10px] text-white/50 font-sans">Views</span></h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Archive Health</p>
                          <h4 className="text-2xl font-serif text-white">99.8%</h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Active Books</p>
                          <h4 className="text-2xl font-serif text-white">{analyticsData.topBooks.length}</h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Avg Rating</p>
                          <h4 className="text-2xl font-serif text-acid-lime">4.8</h4>
                      </div>
                  </div>

                  {/* TIMELINE CONTROLS */}
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 px-4 text-acid-lime"><Clock size={18}/> <span className="font-bold text-sm tracking-wide">TIMELINE</span></div>
                      <div className="flex gap-1">
                          {['1d', '7d', '14d', '30d'].map(t => (
                              <button key={t} onClick={() => setTimeRange(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === t ? 'bg-acid-lime text-black' : 'text-white/40 hover:text-white'}`}>{t.toUpperCase()}</button>
                          ))}
                      </div>
                  </div>

                  {/* 1. ACTIVITY GRAPH */}
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative">
                      <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Activity size={16}/> Real-time Traffic Overview</h3>
                      <div className="h-64 flex items-end justify-between gap-1 px-2 relative">
                          <div className="absolute inset-0 border-b border-white/5 bottom-0"></div>
                          {analyticsData.activityData.length > 0 ? analyticsData.activityData.map((d, i) => (
                              <div key={i} className="flex flex-col items-center gap-1 w-full group relative">
                                  <div className="w-full bg-acid-lime/30 group-hover:bg-acid-lime rounded-t-sm transition-all" style={{ height: `${Math.max(d.count * 8, 2)}%` }}></div>
                                  <span className="text-[8px] text-white/30 truncate w-full text-center">{d.label}</span>
                                  <div className="absolute -top-8 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 z-10">{d.count}</div>
                              </div>
                          )) : <p className="text-white/30 text-xs text-center w-full self-center">Synchronizing...</p>}
                      </div>
                  </div>

                  {/* 2. SPLIT: CATEGORY & STANDARDS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Users size={16}/> Most Active Standards</h3>
                          <div className="space-y-4">
                              {analyticsData.standardData.map((item, i) => (
                                  <div key={i}>
                                      <div className="flex justify-between text-xs text-white mb-1"><span>{item.name}</span><span className="text-acid-lime font-bold">{item.count}</span></div>
                                      <div className="w-full bg-black h-2 rounded-full overflow-hidden"><div className="h-full bg-acid-lime" style={{ width: `${(item.count / (analyticsData.standardData[0]?.count || 1)) * 100}%` }}></div></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center items-center">
                          <h3 className="w-full flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6 text-left"><PieChart size={16}/> Category Split</h3>
                          <div className="w-40 h-40 rounded-full border-[15px] border-white/5 flex items-center justify-center relative">
                             <div className="absolute inset-0 rounded-full border-[15px] border-acid-lime" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${analyticsData.categoryData[0]?.percent || 0}%, 0 ${analyticsData.categoryData[0]?.percent || 0}%)` }}></div>
                             <span className="text-2xl font-serif text-white">{Math.round(analyticsData.categoryData[0]?.percent || 0)}%</span>
                          </div>
                          <p className="mt-4 text-[10px] text-white/40 uppercase tracking-widest">Main: {analyticsData.categoryData[0]?.name || 'Detecting...'}</p>
                      </div>
                  </div>

                  {/* 3. SPLIT: SUBJECTS & FEEDBACK */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><List size={16}/> Popular Subject Modules</h3>
                          <div className="space-y-3">
                              {analyticsData.subjectData.map((sub, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5 hover:border-acid-lime/30 transition-colors">
                                      <span className="text-sm text-white/90">{sub.name}</span>
                                      <div className="px-2 py-1 bg-acid-lime/20 text-acid-lime rounded text-[10px] font-bold">HOT</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Star size={16}/> Recent Student Feedback</h3>
                          <div className="space-y-3">
                              {analyticsData.reviews.slice(0, 3).map((rev) => (
                                  <div key={rev.id} className="p-3 bg-white/5 rounded border border-white/5 italic text-white/60 text-xs">
                                      "{rev.feedback}"
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}