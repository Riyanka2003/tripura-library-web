import React, { useEffect, useRef, useState } from 'react';
import { Home, Search, ChevronRight, Filter, Zap, ArrowRight, Sparkles, X, BookOpen, Download, Star, Loader, MessageSquare, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { askTripuraAI } from './api'; 
import { supabase } from './supabaseClient';
import { useAnalytics } from './useAnalytics'; // Import the new hook

export default function ImposterEbookLayout() {
  const navigate = useNavigate();

  // --- 0. NEW ANALYTICS & ENGAGEMENT LOGIC ---
  const { streak, logEvent } = useAnalytics();
  
  // Feedback State
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Handle Feedback Submission
  const submitFeedback = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) { alert("Please login to give feedback."); return; }

    try {
        await supabase.from('reviews').insert([{ 
            user_id: session.user.id, 
            rating, 
            feedback: feedbackText 
        }]);
        alert("Thank you for your feedback!");
        setShowFeedback(false);
        setRating(0);
        setFeedbackText('');
    } catch (error) {
        console.error("Feedback error:", error);
        alert("Failed to submit feedback.");
    }
  };

  // Handle Book Click (Logs the view before navigating)
  const handleBookClick = (book) => {
      // Log the view event
      logEvent('view_book', { 
          category: book.category, 
          standard: book.standard, 
          title: book.title 
      }, book.id);
      
      // Navigate to details
      navigate(`/book/${book.id}`);
  };

  // --- BACKGROUND SLIDESHOW ---
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const bgImages = ['/Unakoti.png', '/assets/Neermahal.png', '/assets/Chabimura.png', '/assets/Palace.png'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % bgImages.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [bgImages.length]);

  // --- 1. FILTER STATE ---
  const [activeCategory, setActiveCategory] = useState('Language');
  const [selectedFilters, setSelectedFilters] = useState({
    Title: '',
    Language: '',
    Standard: '',
    Subjects: '',
    Category: '',
    Author: '',
    Edition: ''
  });

  const filterOptions = {
    'Title': [], 
    'Language': ['Kokborok', 'English', 'Bengali', 'Hindi'],
    'Standard': ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'General'],
    'Subjects': ['Mathematics', 'Science', 'History', 'Geography', 'Literature', 'Physics', 'Chemistry', 'Biology', 'Computer Sc'],
    'Category': ['Textbooks', 'History', 'Science', 'Literature', 'Engineering', 'Novels'],
    'Author': [], 
    'Edition': [] 
  };

  // --- 2. SEARCH & RESULTS STATE ---
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSelection = (category, value) => {
    if (selectedFilters[category] === value) {
        setSelectedFilters(prev => ({ ...prev, [category]: '' }));
    } else {
        setSelectedFilters(prev => ({ ...prev, [category]: value }));
    }
  };

  const executeSearch = async () => {
    setIsSearching(true);
    setSearchResults([]); 

    console.log("🔍 Starting Search with filters:", selectedFilters); 

    try {
        let query = supabase.from('books').select('*');

        // 1. Text Filters (Partial Match)
        if (selectedFilters.Title) query = query.ilike('title', `%${selectedFilters.Title}%`);
        if (selectedFilters.Author) query = query.ilike('author', `%${selectedFilters.Author}%`);
        if (selectedFilters.Subjects) query = query.ilike('subjects', `%${selectedFilters.Subjects}%`);
        if (selectedFilters.Edition) query = query.ilike('edition', `%${selectedFilters.Edition}%`);

        // 2. Dropdown Filters (Case-Insensitive Match)
        if (selectedFilters.Language) query = query.ilike('language', selectedFilters.Language);
        if (selectedFilters.Category) query = query.ilike('category', selectedFilters.Category);
        if (selectedFilters.Standard) query = query.ilike('standard', selectedFilters.Standard);

        const { data, error } = await query;
        
        if (error) {
            console.error("❌ Supabase Error:", error);
            throw new Error(error.message || "Database error");
        }

        console.log("✅ Results found:", data.length);
        setSearchResults(data);

        if (data.length > 0) {
            setTimeout(() => {
                 document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

    } catch (error) {
        console.error("Search Crash:", error);
        alert(`Search Failed: ${error.message}`);
    } finally {
        setIsSearching(false);
    }
  };

  // --- AI ASSISTANT LOGIC ---
  const [aiQuery, setAiQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleAiAsk = async (e) => { 
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiThinking(true);
    setAiResult(null);
    const answer = await askTripuraAI(aiQuery);
    setAiResult(answer);
    setIsAiThinking(false);
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
    let color = 'bg-white';
    if (index > 0 && index <= 15) color = 'bg-yellow-700';
    else if (index > 15 && index <= 50) color = 'bg-pink-800';
    else if (index > 50 && index <= 95) color = 'bg-purple-800';
    else if (index > 95 && index <= 150) color = 'bg-violet-900';
    else if (index > 125) color = 'bg-indigo-900';
    return `${size} ${color}`;
  };

  const bigTextStyle = "font-serif italic text-acid-lime text-[10vw] leading-none tracking-tighter mx-8 whitespace-nowrap";
  const ScrollingTextContent = () => (
      <>
          <div className="flex items-center"><span className={bigTextStyle}>Tripura E-Library —</span></div>
          <div className="flex items-center"><span className={bigTextStyle}>Tripura E-Library —</span></div>
      </>
  );

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden font-sans cursor-none selection:bg-acid-lime selection:text-black bg-black">
      
      {/* FIXED BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         {bgImages.map((img, index) => (
             <img key={img} src={img} onError={(e) => { e.target.style.display = 'none'; }} alt="Background" 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentBgIndex ? 'opacity-100' : 'opacity-0'}`} 
                style={{ filter: 'contrast(1.2) brightness(0.9)' }}
             />
         ))}
         <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* CURSOR */}
      {Array(TRAIL_COUNT).fill().map((_, i) => (
        <div key={i} ref={el => trailRef.current[i] = el}
           className={`fixed rounded-full pointer-events-none z-[100] mix-blend-screen -translate-x-1/2 -translate-y-1/2 ${getSegmentStyle(i)}`}
           style={{ left: 0, top: 0, willChange: 'transform' }}
        />
      ))}

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center p-6 md:p-8 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
           <div className="w-10 h-10 bg-acid-lime rounded-full flex items-center justify-center font-bold text-black text-xl shadow-[0_0_15px_#ccff00]">T</div>
           <span className="text-white font-bold tracking-widest uppercase text-xs drop-shadow-md">Tripura E-Library</span>
        </div>
      </header>

      {/* SIDEBAR (UPDATED WITH STREAK) */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col shadow-2xl pointer-events-auto">
        
        {/* New Streak Counter */}
        <div className="w-14 h-14 bg-black border-b border-gray-800 flex flex-col items-center justify-center text-acid-lime group cursor-none">
             <Flame size={18} fill="currentColor" className={streak > 0 ? "animate-pulse" : "opacity-50"} />
             <span className="text-[9px] font-bold mt-1">{streak}</span>
        </div>

        <button onClick={() => navigate('/')} className="w-14 h-14 bg-white flex items-center justify-center border-b border-gray-200 hover:bg-acid-lime transition-colors duration-300 group cursor-none">
          <Home size={22} className="text-black group-hover:scale-110 transition-transform"/>
        </button>
        <button onClick={() => navigate('/profile')} className="w-14 py-8 bg-white flex items-center justify-center hover:bg-acid-lime transition-colors duration-300 group cursor-none">
          <span className="text-black font-bold text-xs uppercase tracking-widest whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>My Profile</span>
        </button>
      </div>

      {/* --- FLOATING FEEDBACK BUTTON & MODAL --- */}
      
      {/* 1. Button */}
      <button 
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-8 right-8 z-50 p-4 bg-acid-lime text-black rounded-full shadow-[0_0_20px_#ccff00] hover:scale-110 transition-transform cursor-none font-bold"
      >
        <MessageSquare size={24} />
      </button>

      {/* 2. Modal (FIXED: CURSOR VISIBILITY) */}
      {showFeedback && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              {/* Added 'cursor-default' here so the mouse is visible inside the box */}
              <div className="bg-neutral-900 border border-white/20 p-8 rounded-2xl w-full max-w-md relative shadow-[0_0_50px_rgba(204,255,0,0.2)] cursor-default pointer-events-auto">
                  
                  <button onClick={() => setShowFeedback(false)} className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer">
                      <X size={20}/>
                  </button>
                  
                  <h2 className="text-3xl font-serif text-white italic mb-2">Rate Us</h2>
                  <p className="text-sm text-white/50 mb-6">How was your archive experience?</p>
                  
                  <div className="flex justify-center gap-2 mb-8">
                      {[1,2,3,4,5].map((star) => (
                          <button key={star} onClick={() => setRating(star)} className="p-2 transition-transform hover:scale-125 cursor-pointer pointer-events-auto">
                              <Star size={32} fill={rating >= star ? "#ccff00" : "none"} className={rating >= star ? "text-acid-lime" : "text-white/20"} />
                          </button>
                      ))}
                  </div>

                  {/* Added 'cursor-text' here for typing */}
                  <textarea 
                    className="w-full bg-black border border-white/20 rounded-lg p-4 text-white mb-6 h-32 focus:border-acid-lime outline-none resize-none cursor-text"
                    placeholder="Write your suggestions here..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  ></textarea>

                  <button onClick={submitFeedback} className="w-full bg-acid-lime text-black font-bold py-3 rounded-lg uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">
                      Submit Feedback
                  </button>
              </div>
          </div>
      )}


      {/* --- CONTENT WRAPPER --- */}
      <div className="relative z-10 w-full">
        
        {/* HERO */}
        <section className="relative h-screen flex flex-col justify-end pb-20 pointer-events-none">
            <div className="mb-4 ml-[5vw] max-w-md border-l-4 border-acid-lime pl-6 pointer-events-auto">
                <p className="text-white text-lg md:text-xl font-light opacity-90 leading-relaxed shadow-black drop-shadow-md">
                    The first digital initiative to preserve the knowledge of Tripura.
                </p>
            </div>
            <div className="w-full overflow-hidden mix-blend-screen py-4">
                <div className="animate-marquee flex"><ScrollingTextContent /></div>
            </div>
        </section>

        {/* --- SEARCH INTERFACE --- */}
        <section className="relative bg-black/90 backdrop-blur-xl border-t border-white/10 px-6 py-32">
            
            <div className="max-w-7xl mx-auto">
                
                <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-acid-lime rounded-full text-black shadow-[0_0_15px_#ccff00]"><Search size={24} /></div>
                        <h2 className="text-4xl md:text-6xl font-serif text-white italic">Archive Search</h2>
                    </div>
                    
                    <button 
                        onClick={executeSearch}
                        className="group flex items-center gap-3 bg-acid-lime text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(204,255,0,0.4)] cursor-none"
                    >
                        {isSearching ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}
                        <span className="text-sm">Search Now</span>
                    </button>
                </div>

                {/* FILTER TABS */}
                <div className="relative mb-12 border-b border-white/10">
                    <div className="flex items-center gap-4 overflow-x-auto pb-6 scrollbar-hide">
                        <div className="flex items-center gap-2 text-acid-lime mr-4 flex-shrink-0">
                             <Filter size={20} />
                             <span className="text-xs font-bold tracking-widest uppercase">Filters:</span>
                        </div>
                        {Object.keys(filterOptions).map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`flex-shrink-0 px-6 py-3 rounded-t-lg text-xs tracking-widest uppercase font-bold transition-all duration-300 cursor-none relative
                                ${activeCategory === category ? 'bg-white/10 text-acid-lime border-b-2 border-acid-lime' : 'text-white/40 hover:text-white'}`}
                            >
                                {category}
                                {selectedFilters[category] && <div className="absolute top-2 right-2 w-2 h-2 bg-acid-lime rounded-full shadow-[0_0_5px_#ccff00]"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILTER OPTIONS */}
                <div className="animate-fadeIn min-h-[150px] mb-16">
                    {(activeCategory === 'Title' || activeCategory === 'Author' || activeCategory === 'Edition' || activeCategory === 'Subjects') ? (
                        <div className="max-w-4xl">
                            <label className="block text-white/50 text-xs uppercase tracking-widest mb-4">Type to filter by {activeCategory}</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={selectedFilters[activeCategory]}
                                    onChange={(e) => handleSelection(activeCategory, e.target.value)}
                                    placeholder={`Enter ${activeCategory}...`}
                                    className="w-full bg-white/5 border border-white/20 rounded-full px-8 py-5 text-white text-lg placeholder-white/30 focus:border-acid-lime focus:bg-white/10 focus:outline-none transition-all cursor-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-white/50 text-xs uppercase tracking-widest mb-4">Select {activeCategory}</label>
                            <div className="flex flex-wrap gap-3">
                                {filterOptions[activeCategory].map((option, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSelection(activeCategory, option)}
                                        className={`px-6 py-3 rounded-lg border text-sm font-mono transition-all duration-300 cursor-none flex items-center gap-2
                                        ${selectedFilters[activeCategory] === option 
                                            ? 'bg-acid-lime text-black border-acid-lime font-bold shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
                                            : 'bg-white/5 border-white/10 text-white/70 hover:border-white/40'}`}
                                    >
                                        {option}
                                        {selectedFilters[activeCategory] === option && <span className="text-[10px] ml-1">✕</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* ACTIVE FILTERS SUMMARY */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {Object.entries(selectedFilters).map(([key, value]) => (
                        value && (
                            <div key={key} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10">
                                <span className="text-white/40 text-[10px] uppercase">{key}:</span>
                                <span className="text-acid-lime text-xs font-bold">{value}</span>
                                <button onClick={() => handleSelection(key, '')} className="text-white/50 hover:text-white cursor-none ml-2"><X size={12}/></button>
                            </div>
                        )
                    ))}
                    {Object.values(selectedFilters).some(v => v) && (
                        <button onClick={() => setSelectedFilters({Title:'',Language:'',Standard:'',Subjects:'',Category:'',Author:'',Edition:''})} className="text-xs text-red-400 hover:text-red-300 underline cursor-none ml-2">Clear All</button>
                    )}
                </div>

                {/* --- RESULTS SECTION --- */}
                <div id="results-section">
                    {searchResults !== null && (
                        <div className="border-t border-white/10 pt-16 animate-fadeIn">
                            <h3 className="text-white text-2xl font-serif italic mb-8">
                                Search Results <span className="text-acid-lime">({searchResults.length})</span>
                            </h3>

                            {searchResults.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-white/50 font-serif italic">No books found matching your filters.</p>
                                    <button onClick={() => setSelectedFilters({Title:'',Language:'',Standard:'',Subjects:'',Category:'',Author:'',Edition:''})} className="mt-4 text-acid-lime text-xs uppercase tracking-widest hover:underline cursor-none">Clear Filters & Try Again</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {searchResults.map((book) => (
                                        // UPDATED: Added handleBookClick for analytics
                                        <div key={book.id} onClick={() => handleBookClick(book)} className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-acid-lime/50 p-6 rounded-2xl transition-all cursor-none hover:-translate-y-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-acid-lime overflow-hidden">
                                                    {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover" alt="cover"/> : <BookOpen size={20}/>}
                                                </div>
                                                <div className="px-2 py-1 bg-black rounded text-[10px] text-white/50 uppercase">{book.language}</div>
                                            </div>
                                            <h4 className="text-white font-serif italic text-xl mb-2 line-clamp-2 group-hover:text-acid-lime transition-colors">{book.title}</h4>
                                            <p className="text-white/50 text-xs line-clamp-2 mb-6">{book.description || `Author: ${book.author}`}</p>
                                            <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                                <span className="text-white/40 text-[10px] uppercase tracking-wider">{book.standard}</span>
                                                <a href={book.pdf_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-acid-lime rounded-full text-black hover:scale-110 transition-transform"><Download size={14}/></a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </section>

        {/* --- SECTION 3: AI ASSISTANT (FUNCTIONAL) --- */}
        <section className="relative min-h-screen bg-neutral-900 border-t border-white/10 flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-acid-lime/20 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="relative z-10 max-w-4xl w-full text-center">
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-acid-lime/30 bg-acid-lime/10 text-acid-lime text-xs font-bold uppercase tracking-widest mb-8">
                    <Zap size={14} fill="currentColor"/>
                    <span>Tripura AI Beta</span>
                </div>

                <h2 className="text-5xl md:text-7xl font-serif text-white italic mb-6">
                    "Tell me about the <span className="text-transparent bg-clip-text bg-gradient-to-r from-acid-lime to-white">Manikya Dynasty</span>"
                </h2>
                
                <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                    Our neural engine has read every book in the archive. Ask complex questions, get summarized history, or translate Kokborok texts instantly.
                </p>

                {/* AI Chat Interface */}
                <form onSubmit={handleAiAsk} className="relative group max-w-2xl mx-auto mb-12">
                    <div className="absolute -inset-1 bg-gradient-to-r from-acid-lime to-white rounded-full opacity-20 group-hover:opacity-50 blur transition duration-500"></div>
                    <div className="relative flex items-center bg-black rounded-full p-2 border border-white/10">
                        <div className="pl-6 flex-1">
                            <input 
                                type="text" 
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                placeholder="Ask the archive anything..." 
                                className="w-full bg-transparent text-white text-lg placeholder-white/30 focus:outline-none font-sans"
                            />
                        </div>
                        <button type="submit" className="p-4 bg-acid-lime rounded-full text-black hover:scale-105 transition-transform cursor-none">
                            <ArrowRight size={24} />
                        </button>
                    </div>
                </form>

                {/* AI RESPONSE AREA */}
                {isAiThinking && (
                    <div className="flex flex-col gap-4 items-center animate-pulse">
                        <div className="flex items-center gap-2 text-acid-lime text-sm font-mono uppercase tracking-widest">
                             <Sparkles size={16} className="animate-spin" />
                             <span>Neural Engine Processing...</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-white/50 text-xs">
                             Consulting with Gemini Cloud...
                        </div>
                    </div>
                )}

                {!isAiThinking && aiResult && (
                    <div className="animate-fadeIn max-w-3xl mx-auto text-left">
                        <div className="relative bg-white/5 backdrop-blur-xl border border-acid-lime/30 rounded-3xl p-8 md:p-10 shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                             {/* Close Button */}
                             <button onClick={() => setAiResult(null)} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors cursor-none">
                                <X size={20} />
                             </button>

                             <div className="flex items-center gap-3 mb-6">
                                 <div className="p-2 bg-acid-lime rounded-lg text-black"><Zap size={20}/></div>
                                 <h4 className="text-white font-serif italic text-2xl">Archive Result</h4>
                             </div>
                             
                             <p className="text-white/80 text-lg leading-relaxed mb-6 font-light">
                                 {aiResult}
                             </p>

                             <div className="flex gap-4 border-t border-white/10 pt-6">
                                 <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/50 uppercase tracking-wider">Reliability: 98%</div>
                                 <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/50 uppercase tracking-wider">Source: Google Gemini</div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </section>

      </div>
    </div>
  );
}