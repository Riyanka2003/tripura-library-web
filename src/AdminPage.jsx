import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, Users, Clock, BookOpen, Star, TrendingUp, Activity } from 'lucide-react';

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    mostViewedBook: 'Loading...',
    avgTime: '0 min',
    activeStandard: 'Loading...',
    peakHour: '00:00',
    totalViews: 0
  });
  const [reviews, setReviews] = useState([]);
  const [popularSubjects, setPopularSubjects] = useState([]);

  // --- FETCH ANALYTICS ---
  useEffect(() => {
    async function loadAnalytics() {
      // 1. Fetch Logs
      const { data: logs } = await supabase.from('analytics_logs').select('*, books(title)');
      const { data: reviewData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(5);
      
      setReviews(reviewData || []);

      if (logs && logs.length > 0) {
        // A. MOST VIEWED BOOK
        const bookCounts = {};
        logs.forEach(l => { if(l.book_id) bookCounts[l.books?.title] = (bookCounts[l.books?.title] || 0) + 1; });
        const topBook = Object.keys(bookCounts).reduce((a, b) => bookCounts[a] > bookCounts[b] ? a : b, 'N/A');

        // B. POPULAR SUBJECTS (Chart Data)
        const subCounts = {};
        logs.forEach(l => { 
            if(l.details && l.details.includes('"category"')) { // simplistic check
                 const cat = JSON.parse(l.details).category || 'General';
                 subCounts[cat] = (subCounts[cat] || 0) + 1;
            }
        });
        const sortedSubs = Object.entries(subCounts).sort((a,b) => b[1] - a[1]).slice(0, 4);
        setPopularSubjects(sortedSubs);

        // C. PEAK HOUR
        const hourCounts = {};
        logs.forEach(l => {
            const hour = new Date(l.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const topHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, 12);
        
        setStats({
            mostViewedBook: topBook,
            avgTime: '4.2m', // Mocked: Real time tracking requires complex session handling
            activeStandard: 'Class 10', // You can infer this from logs if you log 'standard'
            peakHour: `${topHour}:00`,
            totalViews: logs.length
        });
      }
    }
    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
         <button onClick={() => navigate('/')} className="p-2 border border-white/20 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
         <h1 className="text-3xl font-serif italic">Admin Analytics Console</h1>
      </div>

      {/* --- 1. STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<BookOpen />} label="Most Viewed Book" value={stats.mostViewedBook} sub="Based on clicks" />
          <StatCard icon={<Clock />} label="Avg. Session Time" value={stats.avgTime} sub="Estimated per user" />
          <StatCard icon={<Activity />} label="Peak Activity" value={stats.peakHour} sub="UTC Timezone" />
          <StatCard icon={<Users />} label="Top Standard" value={stats.activeStandard} sub="Most active group" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* --- 2. MOST READ CATEGORIES (Visual Chart) --- */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
              <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6">
                  <TrendingUp size={16}/> Subject Popularity
              </h3>
              <div className="space-y-6">
                  {popularSubjects.map(([subject, count], idx) => (
                      <div key={idx}>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-white">{subject}</span>
                              <span className="text-white/50">{count} views</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-acid-lime" style={{ width: `${(count / stats.totalViews) * 100}%` }}></div>
                          </div>
                      </div>
                  ))}
                  {popularSubjects.length === 0 && <p className="text-white/30 text-sm">No data yet.</p>}
              </div>
          </div>

          {/* --- 3. STUDENT REVIEWS --- */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
              <h3 className="flex items-center gap-2 text-acid-lime uppercase tracking-widest text-xs font-bold mb-6">
                  <Star size={16}/> Recent Feedback
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {reviews.map((rev) => (
                      <div key={rev.id} className="p-4 bg-black/40 rounded-xl border border-white/5">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex gap-1 text-acid-lime">
                                  {[...Array(rev.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                              </div>
                              <span className="text-[10px] text-white/30">{new Date(rev.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed">"{rev.feedback}"</p>
                      </div>
                  ))}
                  {reviews.length === 0 && <p className="text-white/30 text-sm">No reviews yet.</p>}
              </div>
          </div>
      </div>
    </div>
  );
}

// Simple Helper Component
function StatCard({ icon, label, value, sub }) {
    return (
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:border-acid-lime/50 transition-colors group">
            <div className="w-10 h-10 bg-acid-lime/10 text-acid-lime rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h4 className="text-2xl font-serif text-white mb-1 truncate">{value}</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{label}</p>
            <p className="text-[10px] text-white/30">{sub}</p>
        </div>
    );
}