import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, Upload, BookOpen, Check, AlertCircle, Loader, Lock, BarChart2, PieChart, Activity, Users, List, Clock, Star } from 'lucide-react';

export default function AdminPage() {
  const navigate = useNavigate();
  
  // --- AUTH STATE ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  // --- TAB & ANALYTICS STATE ---
  const [activeTab, setActiveTab] = useState('upload'); 
  const [timeRange, setTimeRange] = useState('7d'); 
  
  const [analyticsData, setAnalyticsData] = useState({
      totalViews: 0,
      activityData: [], 
      categoryData: [], 
      standardData: [], // Added to prevent crash
      subjectData: [],  // Added to prevent crash
      topBooks: [],
      reviews: []
  });

  // --- UPLOAD FORM STATE (Strictly preserved from your base code) ---
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', author: '', category: 'Textbooks', language: 'English', description: '', standard: 'General', edition: '', subjects: ''    
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const standardOptions = ['General', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  // --- 1. ADMIN CHECK ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'Tripura2025!') { 
        setIsAdmin(true);
    } else {
        alert("Access Denied: Invalid Credentials");
    }
  };

  // --- 2. FETCH ANALYTICS (FIXED: Safe Parsing & Full Data Population) ---
  useEffect(() => {
      if (isAdmin && activeTab === 'analytics') {
          fetchAnalyticsData();
      }
  }, [isAdmin, activeTab, timeRange]);

  const fetchAnalyticsData = async () => {
      // Fetch Logs + Book Details
      const { data: logs } = await supabase.from('analytics_logs').select('*, books(title, subjects, standard, category)');
      const { data: reviews } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(10);
      
      if (logs) {
          const now = new Date();
          let filteredLogs = [];
          let graphLabels = [];

          // --- A. Time Filtering ---
          if (timeRange === '1d') {
              const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              filteredLogs = logs.filter(l => new Date(l.created_at) > cutoff);
              
              const activityMap = {};
              for(let i=0; i<24; i++) {
                  const d = new Date(now.getTime() - i * 60 * 60 * 1000);
                  const label = d.getHours() + ":00";
                  graphLabels.unshift(label);
                  activityMap[label] = 0;
              }
              filteredLogs.forEach(l => {
                  try {
                    const h = new Date(l.created_at).getHours() + ":00";
                    if (activityMap[h] !== undefined) activityMap[h]++;
                  } catch(e){}
              });
              var activityData = graphLabels.map(label => ({ label, count: activityMap[label] }));

          } else {
              const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
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
                  try {
                    const date = l.created_at.split('T')[0];
                    if (activityMap[date] !== undefined) activityMap[date]++;
                  } catch(e){}
              });
              var activityData = graphLabels.map(label => ({ label: label.split('-').slice(1).join('/'), count: activityMap[label] }));
          }

          // --- B. Aggregate Details (Standard, Category, Subject) ---
          const stdMap = {};
          const catMap = {};
          const subMap = {};
          const bookMap = {};
          
          filteredLogs.forEach(l => {
              let standard = 'General';
              let category = 'Uncategorized';
              let subjects = '';

              // 1. Try Log Details (Safe Parse)
              if (l.details) {
                  try {
                      const det = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                      if(det?.standard) standard = det.standard;
                      if(det?.category) category = det.category;
                  } catch(e) {}
              } 
              
              // 2. Fallback to Book Data
              if (l.books) {
                  if (standard === 'General' && l.books.standard) standard = l.books.standard;
                  if (category === 'Uncategorized' && l.books.category) category = l.books.category;
                  if (l.books.subjects) subjects = l.books.subjects;
              }

              // 3. Count Up
              stdMap[standard] = (stdMap[standard] || 0) + 1;
              catMap[category] = (catMap[category] || 0) + 1;
              
              // Subjects
              if (subjects) {
                  subjects.split(',').forEach(s => {
                      const cleanSub = s.trim();
                      if(cleanSub) subMap[cleanSub] = (subMap[cleanSub] || 0) + 1;
                  });
              } else if (category !== 'Uncategorized') {
                  subMap[category] = (subMap[category] || 0) + 1;
              }

              // Top Books
              if(l.books?.title) bookMap[l.books.title] = (bookMap[l.books.title] || 0) + 1;
          });

          // --- C. Format Data ---
          const totalViews = filteredLogs.length;
          const categoryData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k], percent: totalViews ? (catMap[k]/totalViews)*100 : 0 }));
          const standardData = Object.entries(stdMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));
          const subjectData = Object.entries(subMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));
          const topBooks = Object.entries(bookMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));

          setAnalyticsData({ 
              totalViews, 
              activityData, 
              categoryData, 
              standardData, 
              subjectData, 
              topBooks,
              reviews: reviews || []
          });
      }
  };

  // --- 3. UPLOAD HANDLER (Strictly preserved from your base code) ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!coverFile || !pdfFile) { alert("Please select both a cover image and a PDF."); return; }
    
    setLoading(true);
    setSuccess(false);

    try {
        const timeStamp = Date.now();

        // 1. Upload Cover Image
        const coverPath = `covers/${timeStamp}_${coverFile.name}`;
        const { error: coverErr } = await supabase.storage.from('library-assets').upload(coverPath, coverFile);
        if (coverErr) throw coverErr;
        const { data: { publicUrl: coverUrl } } = supabase.storage.from('library-assets').getPublicUrl(coverPath);

        // 2. Upload PDF
        const pdfPath = `pdfs/${timeStamp}_${pdfFile.name}`;
        const { error: pdfErr } = await supabase.storage.from('library-assets').upload(pdfPath, pdfFile);
        if (pdfErr) throw pdfErr;
        const { data: { publicUrl: pdfUrl } } = supabase.storage.from('library-assets').getPublicUrl(pdfPath);

        // 3. Insert into Database
        const { error: dbErr } = await supabase.from('books').insert([{
            title: formData.title, author: formData.author, category: formData.category, language: formData.language,
            description: formData.description, standard: formData.standard, edition: formData.edition, subjects: formData.subjects, 
            cover_url: coverUrl, pdf_url: pdfUrl
        }]);

        if (dbErr) throw dbErr;

        setSuccess(true);
        // Reset form
        setFormData({ 
            title: '', author: '', category: 'Textbooks', language: 'English', 
            description: '', standard: 'General', edition: '', subjects: '' 
        });
        setCoverFile(null);
        setPdfFile(null);

    } catch (error) {
        alert("Upload Failed: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER LOGIN SCREEN ---
  if (!isAdmin) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
              <form onSubmit={handleAdminLogin} className="bg-neutral-900 border border-white/10 p-8 rounded-2xl w-full max-w-md text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Lock size={32} />
                  </div>
                  <h1 className="text-2xl font-serif text-white mb-2">Restricted Area</h1>
                  <p className="text-white/40 text-sm mb-6">Database Management Console</p>
                  
                  <input 
                    type="password" 
                    placeholder="Enter Admin Passkey"
                    className="w-full bg-black border border-white/20 rounded-lg p-3 text-white mb-4 focus:border-red-500 outline-none"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg uppercase tracking-widest hover:bg-gray-200">
                      Authenticate
                  </button>
              </form>
          </div>
      );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      
      {/* HEADER WITH TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/10 pb-6 gap-4">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={() => navigate('/')} className="p-2 border border-white/20 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
             <div>
                 <h1 className="text-3xl font-serif italic">Admin Dashboard</h1>
                 <p className="text-acid-lime text-xs uppercase tracking-widest">Upload to Public Library</p>
             </div>
         </div>
         {/* TAB SWITCHER */}
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
          
          {/* ======================================================= */}
          {/* TAB 1: UPLOAD (EXACTLY YOUR BASE CODE)                  */}
          {/* ======================================================= */}
          {activeTab === 'upload' && (
              <div className="animate-fadeIn">
                  {success && (
                      <div className="mb-8 bg-acid-lime/10 border border-acid-lime p-4 rounded-xl flex items-center gap-3 text-acid-lime">
                          <Check size={20} />
                          <span>Book uploaded successfully to the archive!</span>
                      </div>
                  )}

                  <form onSubmit={handleUpload} className="space-y-8">
                      {/* Original Form Layout */}
                      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6">
                          <h3 className="text-white/50 text-sm uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Book Metadata</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Book Title</label>
                                  <input required type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" 
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Author Name</label>
                                  <input required type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" 
                                    value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Category</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none"
                                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                      <option>Textbooks</option><option>History</option><option>Science</option><option>Literature</option><option>Engineering</option><option>Novels</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Language</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none"
                                    value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
                                      <option>English</option><option>Kokborok</option><option>Bengali</option><option>Hindi</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Standard/Class</label>
                                  <select className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none"
                                    value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})}>
                                      {standardOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                  </select>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Subjects/Tags</label>
                                  <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" 
                                     placeholder="e.g. Physics, Math, Calculus"
                                    value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs text-white/50 mb-2">Edition</label>
                                  <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none" 
                                     placeholder="e.g. 2nd Edition, Revised"
                                    value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})} />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs text-white/50 mb-2">Description</label>
                              <textarea className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-acid-lime outline-none h-32"
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                          </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6">
                          <h3 className="text-white/50 text-sm uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Digital Assets</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Cover Input */}
                              <div className="border border-dashed border-white/30 rounded-xl p-6 text-center hover:border-acid-lime transition-colors cursor-pointer relative">
                                  <input required type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={e => setCoverFile(e.target.files[0])} />
                                  <div className="flex flex-col items-center gap-2">
                                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-acid-lime"><BookOpen size={20}/></div>
                                      <p className="text-white text-sm font-bold">{coverFile ? coverFile.name : "Upload Cover Image"}</p>
                                      <p className="text-white/30 text-xs">.jpg, .png (Max 5MB)</p>
                                  </div>
                              </div>
                              {/* PDF Input */}
                              <div className="border border-dashed border-white/30 rounded-xl p-6 text-center hover:border-acid-lime transition-colors cursor-pointer relative">
                                  <input required type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" 
                                     onChange={e => setPdfFile(e.target.files[0])} />
                                  <div className="flex flex-col items-center gap-2">
                                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-acid-lime"><Upload size={20}/></div>
                                      <p className="text-white text-sm font-bold">{pdfFile ? pdfFile.name : "Upload Book PDF"}</p>
                                      <p className="text-white/30 text-xs">.pdf (Max 50MB)</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <button type="submit" disabled={loading} className="w-full bg-acid-lime text-black font-bold py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                          {loading ? <Loader className="animate-spin" /> : "Upload to Library"}
                      </button>
                  </form>
              </div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: ANALYTICS (FIXED CRASHES & VISUALIZED)           */}
          {/* ======================================================= */}
          {activeTab === 'analytics' && (
              <div className="animate-fadeIn space-y-8 pb-10">
                  
                  {/* TIME CONTROLS */}
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 px-4 text-acid-lime"><Clock size={18}/> <span className="font-bold text-sm tracking-wide">TIMELINE</span></div>
                      <div className="flex gap-1">
                          {['1d', '7d', '14d', '30d'].map(t => (
                              <button key={t} onClick={() => setTimeRange(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === t ? 'bg-acid-lime text-black' : 'text-white/40 hover:text-white'}`}>{t === '1d' ? '24 HOURS' : t.toUpperCase()}</button>
                          ))}
                      </div>
                  </div>

                  {/* 1. ACTIVITY GRAPH */}
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative">
                      <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Activity size={16}/> Traffic Overview ({timeRange === '1d' ? 'Hourly' : 'Daily'})</h3>
                      <div className="h-64 flex items-end justify-between gap-1 px-2 relative">
                          <div className="absolute inset-0 border-b border-white/5 bottom-0"></div>
                          {analyticsData.activityData.length > 0 ? analyticsData.activityData.map((d, i) => (
                              <div key={i} className="flex flex-col items-center gap-1 w-full group relative">
                                  <div className="w-full bg-acid-lime/30 group-hover:bg-acid-lime rounded-t-sm transition-all" style={{ height: `${Math.max(d.count * 8, 2)}%` }}></div>
                                  <span className="text-[8px] text-white/30 truncate w-full text-center">{d.label}</span>
                                  <div className="absolute -top-8 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{d.count} views</div>
                              </div>
                          )) : <p className="text-white/30 text-xs text-center w-full self-center">No traffic data.</p>}
                      </div>
                  </div>

                  {/* 2. SPLIT: CATEGORY (Pie) & AGE/STANDARD (Bar) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Category Split */}
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center">
                          <h3 className="w-full flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><PieChart size={16}/> Category Distribution</h3>
                          <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)]"
                               style={{ background: `conic-gradient(#ccff00 0% ${analyticsData.categoryData[0]?.percent || 0}%, #7b2cbf ${analyticsData.categoryData[0]?.percent || 0}% 100%)` }}>
                               <div className="w-32 h-32 bg-neutral-900 rounded-full flex flex-col items-center justify-center text-white font-bold text-2xl">{analyticsData.totalViews}<span className="text-[9px] text-white/40 font-normal uppercase">Events</span></div>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-6 justify-center">
                              {analyticsData.categoryData.slice(0, 3).map((cat, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-white/70"><div className={`w-3 h-3 rounded-full ${i===0 ? 'bg-acid-lime' : 'bg-[#7b2cbf]'}`}></div> {cat.name} ({Math.round(cat.percent)}%)</div>
                              ))}
                          </div>
                      </div>

                      {/* Age/Standard Bar Graph */}
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Users size={16}/> Most Active Standards</h3>
                          <div className="space-y-4">
                              {analyticsData.standardData.map((item, i) => (
                                  <div key={i} className="group">
                                      <div className="flex justify-between text-xs text-white mb-1"><span>{item.name}</span><span className="text-acid-lime font-bold">{item.count}</span></div>
                                      <div className="w-full bg-black h-2 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: `${(item.count / (analyticsData.standardData[0]?.count || 1)) * 100}%` }}></div></div>
                                  </div>
                              ))}
                              {analyticsData.standardData.length === 0 && <p className="text-white/30 text-xs italic">No data available.</p>}
                          </div>
                      </div>
                  </div>

                  {/* 3. SPLIT: SUBJECTS & TOP BOOKS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Subject List */}
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><List size={16}/> Popular Subjects</h3>
                          <div className="space-y-3">
                              {analyticsData.subjectData.map((sub, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5 hover:border-acid-lime/30 transition-colors">
                                      <span className="text-sm text-white/90">{sub.name}</span><div className="px-2 py-1 bg-acid-lime/20 text-acid-lime rounded text-xs font-bold">{sub.count} Views</div>
                                  </div>
                              ))}
                              {analyticsData.subjectData.length === 0 && <p className="text-white/30 text-xs italic">No subject data yet.</p>}
                          </div>
                      </div>

                      {/* Top Books & Reviews */}
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col">
                          <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6"><Star size={16}/> Recent Feedback</h3>
                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                              {analyticsData.reviews.map((rev) => (
                                  <div key={rev.id} className="p-3 bg-white/5 rounded border border-white/5">
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="flex text-acid-lime">{[...Array(rev.rating)].map((_,i)=><Star key={i} size={8} fill="currentColor"/>)}</div>
                                          <span className="text-[9px] text-white/30">{new Date(rev.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-white/70">"{rev.feedback}"</p>
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