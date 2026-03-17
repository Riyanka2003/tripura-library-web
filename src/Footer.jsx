import React from 'react';
import { Mail, MapPin, Phone, Github, Linkedin, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/10 pt-16 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Column 1: Brand / Description */}
          <div className="space-y-4">
            
            {/* REPLACED "T" WITH REAL LOGO + MAINTAINED EFFECT */}
            <div className="relative group inline-block">
                {/* The "Under-effect" glow */}
                <div className="absolute -inset-1 bg-acid-lime/30 rounded-full blur-md group-hover:bg-acid-lime/50 transition-all"></div>
                
                <div className="relative inline-flex items-center justify-center w-12 h-12 bg-black border border-white/10 rounded-full shadow-[0_0_15px_rgba(204,255,0,0.3)] overflow-hidden">
                     <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="w-8 h-8 object-contain"
                     />
                </div>
            </div>

            <h3 className="text-xl text-white font-serif italic">Directorate of Kokborok & OML</h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Tripura E-library : A centralized digital archive for both scientific and cultural resources, language learning, and academic history in regional languages like kokborok, bengali, etc.
            </p>
          </div>

          {/* Column 2: Contact Information */}
          <div className="space-y-6">
            <h4 className="text-acid-lime text-xs font-bold uppercase tracking-widest">Contact Support</h4>
            <div className="space-y-4">
              <a href="mailto:support@elibrary.edu" className="flex items-center gap-3 text-white/60 hover:text-white transition-colors group">
                <Mail size={16} className="text-acid-lime group-hover:scale-110 transition-transform" />
                <span className="text-sm">riyankabhowmik955@gmail.com</span>
              </a>
              <div className="flex items-center gap-3 text-white/60 group">
                <MapPin size={16} className="text-acid-lime" />
                <span className="text-sm">Tripura Education Dept., Agartala</span>
              </div>
            </div>
          </div>

          {/* Column 3: Developer Details */}
          <div className="space-y-6">
            <h4 className="text-acid-lime text-xs font-bold uppercase tracking-widest">Developed By</h4>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-acid-lime/50 transition-colors">
              <p className="text-white font-medium mb-1">Riyanka Bhowmik</p>
              <p className="text-white/40 text-xs mb-4">Software Developer & UI Designer</p>
              
              <div className="flex gap-4">
                <a href="#" className="text-white/40 hover:text-acid-lime transition-colors">
                  <Github size={18} />
                </a>
                <a href="#" className="text-white/40 hover:text-acid-lime transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="text-white/40 hover:text-acid-lime transition-colors">
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-xs text-center md:text-left">
            © 2026 Directorate of Kokborok & OML. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></div>
            <span className="text-acid-lime text-[10px] uppercase tracking-widest">System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}