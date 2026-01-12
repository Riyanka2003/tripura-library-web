import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Share2, Heart, Eye, Loader, Sparkles } from 'lucide-react';
import { supabase } from './supabaseClient'; 

export default function BookDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data: bookData } = await supabase.from('books').select('*').eq('id', id).single();
      setBook(bookData);

      if (userId && bookData) {
        const { data: bookmark } = await supabase
          .from('bookmarks').select('*').eq('user_id', userId).eq('book_id', id).single();
        if (bookmark) setIsBookmarked(true);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  // --- HANDLE BOOKMARK ---
  const toggleBookmark = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Please login to save books."); return; }
    const userId = session.user.id;

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('book_id', id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert([{ user_id: userId, book_id: id }]);
      setIsBookmarked(true);
    }
  };

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

  return (
    <div className="relative min-h-screen w-full font-sans cursor-none bg-black selection:bg-acid-lime selection:text-black flex items-center justify-center p-6 md:p-12 overflow-hidden">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <img src="/assets/bg_library.jpg" onError={(e) => { e.target.src = "/assets/Unakoti.png"; }} alt="Background" 
              className="w-full h-full object-cover opacity-20 scale-105" 
              style={{ filter: 'blur(15px) grayscale(100%)' }}/>
         
         <div className="absolute inset-0 bg-black/70"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
      </div>

      {/* CURSOR */}
      {Array(TRAIL_COUNT).fill().map((_, i) => (
        <div key={i} ref={el => trailRef.current[i] = el} className={`fixed rounded-full pointer-events-none z-[100] mix-blend-difference -translate-x-1/2 -translate-y-1/2 ${getSegmentStyle(i)}`} style={{ left: 0, top: 0, willChange: 'transform' }} />
      ))}

      {/* BACK NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-center pointer-events-none">
         <button onClick={() => navigate(-1)} className="pointer-events-auto group flex items-center gap-3 text-white hover:text-acid-lime transition-colors cursor-none">
             <div className="p-2 border border-white/20 rounded-full group-hover:border-acid-lime transition-colors"><ArrowLeft size={20} /></div>
             <span className="uppercase tracking-widest text-xs font-bold">Back to Search</span>
         </button>
         <div className="w-10 h-10 bg-acid-lime rounded-full flex items-center justify-center font-bold text-black shadow-[0_0_15px_#ccff00]">T</div>
      </nav>

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative z-10 w-full max-w-7xl">
        {loading ? (
            <div className="flex flex-col items-center justify-center text-white/50 h-[60vh] gap-4">
                <Loader className="animate-spin text-acid-lime" size={48}/>
                <span className="tracking-[0.3em] uppercase text-xs animate-pulse">Retrieving Document...</span>
            </div>
        ) : !book ? (
            <div className="text-center text-white/50 h-[50vh] flex flex-col justify-center items-center">
                <h2 className="text-4xl font-serif italic mb-2 text-white">404</h2>
                <p>Book Not Found in Archive</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
                
                {/* --- LEFT COLUMN: THE MUSEUM FRAME --- */}
                <div className="lg:col-span-5 flex justify-center lg:justify-end relative group">
                    
                    {/* 1. FRAME CONTAINER */}
                    <div className="relative p-[25px] rounded-lg border-2 border-[#1a1510]
                        bg-gradient-to-br from-[#5e4b35] via-[#2e231b] to-[#5e4b35]
                        shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)]
                    ">
                        
                        {/* 2. INNER BEVEL */}
                        <div className="absolute inset-0 rounded-lg pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8),inset_2px_2px_5px_rgba(255,255,255,0.1)]"></div>

                        {/* 3. GOLD CORNER ORNAMENTS */}
                        <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-[#c5a059] rounded-tl-lg shadow-[0_0_10px_#c5a059_80] opacity-80"></div>
                        <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[#c5a059] rounded-tr-lg shadow-[0_0_10px_#c5a059_80] opacity-80"></div>
                        <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[#c5a059] rounded-bl-lg shadow-[0_0_10px_#c5a059_80] opacity-80"></div>
                        <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-[#c5a059] rounded-br-lg shadow-[0_0_10px_#c5a059_80] opacity-80"></div>

                        {/* 4. INNER MATTING */}
                        <div className="bg-[#121212] p-4 shadow-[inset_0_0_30px_rgba(0,0,0,1)] border border-[#ffffff05]">
                            
                            {/* 5. THE BOOK */}
                            {book.cover_url ? (
                                <img 
                                    src={book.cover_url} 
                                    alt="Cover" 
                                    className="w-[300px] h-[450px] object-cover shadow-[0_15px_40px_rgba(0,0,0,1)] 
                                               group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                                />
                            ) : (
                                <div className="w-[300px] h-[450px] flex flex-col items-center justify-center bg-neutral-900 text-white/20 gap-4 shadow-[0_15px_40px_rgba(0,0,0,1)]">
                                    <BookOpen size={60} />
                                    <span className="text-xs uppercase tracking-widest">No Cover</span>
                                </div>
                            )}

                            {/* 6. LIGHTING OVERLAY */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay"></div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: DETAILS BOX (WITH NEW SHADOWS) --- */}
                <div className="lg:col-span-7 animate-slideUp">
                    {/* UPDATED: Added deep drop shadow and subtle acid-lime glow behind the box */}
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl 
                        shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_30px_rgba(204,255,0,0.05),0_0_0_1px_rgba(255,255,255,0.1)]">
                        
                        {/* Decorative Top Line */}
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-acid-lime/50 to-transparent opacity-50"></div>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap items-center gap-3 mb-8">
                            <span className="px-4 py-1.5 bg-acid-lime text-black font-bold text-[10px] uppercase tracking-widest rounded-full flex items-center gap-2 shadow-[0_0_10px_rgba(204,255,0,0.3)]">
                                <Sparkles size={10} /> {book.category}
                            </span>
                            <span className="px-4 py-1.5 bg-white/10 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest rounded-full">
                                {book.language}
                            </span>
                            {book.standard && (
                                <span className="px-4 py-1.5 bg-white/5 border border-white/5 text-white/60 font-bold text-[10px] uppercase tracking-widest rounded-full">
                                    {book.standard}
                                </span>
                            )}
                        </div>

                        {/* Title & Author */}
                        <h1 className="text-4xl md:text-6xl font-serif text-white italic mb-4 leading-[1.1]">{book.title}</h1>
                        <p className="text-lg md:text-xl text-acid-lime mb-8 font-mono border-b border-white/10 pb-8 inline-block pr-12">
                            Authored by {book.author}
                        </p>

                        {/* Description */}
                        <div className="mb-10 text-white/70 leading-relaxed font-light text-sm md:text-base max-w-2xl">
                            {book.description || "No description provided for this archival document."}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" 
                               className="flex-1 bg-acid-lime text-black py-4 px-8 rounded-xl font-bold uppercase tracking-widest hover:bg-white hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] cursor-none flex items-center justify-center gap-3">
                                <Eye size={20} /> Start Reading
                            </a>
                            
                            <div className="flex gap-4">
                                <button 
                                    onClick={toggleBookmark}
                                    className={`p-4 border rounded-xl transition-all cursor-none flex items-center justify-center hover:scale-105 ${isBookmarked ? 'bg-acid-lime border-acid-lime text-black' : 'border-white/20 bg-transparent text-white hover:border-acid-lime hover:text-acid-lime'}`}
                                >
                                    <Heart fill={isBookmarked ? "black" : "none"} size={22} />
                                </button>
                                
                                <button className="p-4 border border-white/20 bg-transparent rounded-xl text-white hover:text-acid-lime hover:border-acid-lime transition-all cursor-none hover:scale-105 flex items-center justify-center">
                                    <Share2 size={22} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}