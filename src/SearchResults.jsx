import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, Download, Loader } from 'lucide-react';
import { supabase } from './supabaseClient'; 

export default function SearchResults() {
  const { category, query } = useParams(); 
  const navigate = useNavigate();
  
  // --- STATE FOR REAL DATA ---
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 2. FETCH DATA FROM SUPABASE ---
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      
      let queryBuilder = supabase.from('books').select('*');
      const lowerCat = category.toLowerCase();

      // CASE A: EXACT MATCH (For Dropdowns)
      // Language, Standard, Category must match exactly (e.g. "English" == "English")
      if (['language', 'standard', 'category'].includes(lowerCat) && query !== 'All') {
          queryBuilder = queryBuilder.eq(lowerCat, query);
      }

      // CASE B: PARTIAL MATCH (For Text Inputs)
      // Subjects, Title, Author, Edition should match partially (e.g. "Math" finds "Advanced Math")
      else if (['subjects', 'title', 'author', 'edition'].includes(lowerCat) && query !== 'All') {
          queryBuilder = queryBuilder.ilike(lowerCat, `%${query}%`);
      }

      // CASE C: GENERAL SEARCH (Fallback)
      // If we don't know the category, assume it's a Title search
      else if (query !== 'All') {
          queryBuilder = queryBuilder.ilike('title', `%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching data:', error);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    }

    fetchBooks();
  }, [category, query]);


  // --- 3. UI LOGIC (PRESERVED) ---
  const backgroundMap = {
    'Language': '/assets/Neermahal.png',
    'Standard': '/assets/Palace.png',
    'Subjects': '/assets/Chabimura.png',
    'Books': '/assets/Neermahal.png',
    'Author': '/assets/Palace.png',
    'Edition': '/assets/Chabimura.png'
  };
  const bgImage = backgroundMap[category] || '/assets/Unakoti.png';

  // --- PHYSICS CURSOR SETUP ---
  const trailRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const TRAIL_COUNT = 100;

  useEffect(() => {
    const points = Array(TRAIL_COUNT).fill().map(() => ({ x: 0, y: 0 }));
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (points[0].x === 0 && points[0].y === 0) points.forEach(p => { p.x = e.clientX; p.y = e.clientY; });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      let head = points[0];
      head.x += (mouseRef.current.x - head.x) * 0.9;
      head.y += (mouseRef.current.y - head.y) * 0.9;
      for (let i = 1; i < TRAIL_COUNT; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        curr.x += (prev.x - curr.x) * 0.8;
        curr.y += (prev.y - curr.y) * 0.8;
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
    let size = index > 50 ? 'w-1 h-1' : 'w-2 h-2';
    let color = index < 30 ? 'bg-acid-lime' : 'bg-white';
    return `${size} ${color}`;
  };

  return (
    <div className="relative min-h-screen w-full font-sans cursor-none bg-black selection:bg-acid-lime selection:text-black">
      
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0">
        <img 
          src={bgImage}
          onError={(e) => { e.target.src = "/assets/Unakoti.png"; }}
          alt="Category Background" 
          className="w-full h-full object-cover opacity-60"
          style={{ filter: 'blur(8px) brightness(0.5)' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20"></div>
      </div>

      {/* CURSOR */}
      {Array(TRAIL_COUNT).fill().map((_, i) => (
        <div 
           key={i} 
           ref={el => trailRef.current[i] = el}
           className={`fixed rounded-full pointer-events-none z-[100] mix-blend-difference -translate-x-1/2 -translate-y-1/2 ${getSegmentStyle(i)}`} 
           style={{ left: 0, top: 0, willChange: 'transform' }}
        />
      ))}

      {/* HEADER NAV */}
      <nav className="fixed top-0 w-full p-8 z-50 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
            <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-white hover:text-acid-lime transition-colors cursor-none">
                <div className="p-2 border border-white/20 rounded-full group-hover:border-acid-lime transition-colors">
                    <ArrowLeft size={20} />
                </div>
                <span className="uppercase tracking-widest text-xs font-bold">Back</span>
            </button>
        </div>
        <div className="w-10 h-10 bg-acid-lime rounded-full flex items-center justify-center font-bold text-black shadow-[0_0_15px_#ccff00]">T</div>
      </nav>

      {/* CONTENT AREA */}
      <main className="relative z-10 pt-32 px-6 md:px-20 pb-20">
        
        {/* Title Block */}
        <div className="mb-16 border-l-4 border-acid-lime pl-6 animate-fadeIn">
            <h4 className="text-acid-lime uppercase tracking-[0.3em] text-sm font-bold mb-2">{category} Archive</h4>
            <h1 className="text-5xl md:text-7xl font-serif text-white italic">{query === 'All' ? 'Full Repository' : query}</h1>
            <p className="text-white/50 mt-4">{results.length} Documents Found</p>
        </div>

        {/* LOADING STATE */}
        {loading ? (
             <div className="flex flex-col items-center justify-center h-64 text-white/50 gap-4">
                 <Loader className="animate-spin text-acid-lime" size={40} />
                 <p className="tracking-widest uppercase text-xs">Retrieving Data from Cloud...</p>
             </div>
        ) : (
            /* --- REAL DATA GRID --- */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {results.length > 0 ? (
                    results.map((book) => (
                        <div 
                            key={book.id} 
                            onClick={() => navigate(`/book/${book.id}`)}
                            className="group relative rounded-2xl p-8 transition-all duration-300 cursor-none hover:-translate-y-2
                            bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
                            hover:border-acid-lime/60 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-black/40 rounded-xl text-acid-lime">
                                    {/* Try to show cover image if available, else icon */}
                                    {book.cover_url ? (
                                        <img src={book.cover_url} className="w-8 h-8 object-cover rounded" alt="cover"/>
                                    ) : (
                                        <BookOpen size={28} />
                                    )}
                                </div>
                                <div className="flex gap-1 text-acid-lime">
                                    <Star size={14} fill="currentColor" />
                                    <Star size={14} fill="currentColor" />
                                    <Star size={14} fill="currentColor" />
                                    <Star size={14} fill="currentColor" />
                                </div>
                            </div>
                            
                            <h3 className="text-2xl text-white font-serif italic mb-3 group-hover:text-acid-lime transition-colors line-clamp-2">
                                {book.title}
                            </h3>
                            
                            <p className="text-white/70 text-sm mb-8 leading-relaxed font-light line-clamp-3">
                                {book.description || `A digitized copy of ${book.title} by ${book.author}.`}
                            </p>
                            
                            <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-black/30 rounded-full text-[10px] uppercase tracking-wider text-white/60">
                                        {book.language || 'English'}
                                    </span>
                                </div>
                                <a 
                                    href={book.pdf_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} 
                                    className="p-2 rounded-full bg-white/10 hover:bg-acid-lime hover:text-black transition-colors"
                                >
                                    <Download size={18} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 text-white/30 text-xl font-serif italic">
                        No documents found in the archives.
                    </div>
                )}
            </div>
        )}

      </main>
    </div>
  );
}