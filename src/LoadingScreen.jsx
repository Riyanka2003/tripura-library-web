import React, { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); 
          return 100;
        }
        return old + Math.floor(Math.random() * 5) + 2; 
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center font-mono cursor-default">
      
      {/* BRAND LOGO ADDITION */}
      <div className="mb-12 animate-in fade-in zoom-in duration-700">
        <img 
          src="/logo.png" 
          alt="Tripura E-Library Logo" 
          className="w-24 h-24 object-contain animate-pulse"
        />
      </div>

      <div className="w-64 mb-4">
          <div className="flex justify-between text-acid-lime text-xs mb-2 uppercase tracking-widest">
              <span>System Boot</span>
              <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                  className="h-full bg-acid-lime shadow-[0_0_20px_#ccff00] transition-all duration-200"
                  style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
          </div>
      </div>
      
      <div className="text-white/50 text-[10px] animate-pulse uppercase tracking-[0.2em]">
          Initializing Neural Archive...
      </div>
    </div>
  );
}