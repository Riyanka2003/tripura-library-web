import React, { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Wait 0.5s then finish
          return 100;
        }
        // Random speed for realistic "hacking" feel
        return old + Math.floor(Math.random() * 5) + 2; 
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    // Changed 'cursor-none' to 'cursor-default' to ensure the arrow icon is visible
    <div className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-center font-mono cursor-default">
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
      <div className="text-white/50 text-[10px] animate-pulse">
          INITIALIZING NEURAL ARCHIVE...
      </div>
    </div>
  );
}