import React from 'react';
import { Mail, MapPin, Phone, Github, Linkedin, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/10 pt-16 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Column 1: Brand / Description */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-acid-lime rounded-full shadow-[0_0_15px_#ccff00]">
                 <span className="text-lg font-bold text-black">T</span>
            </div>
            <h3 className="text-xl text-white font-serif italic">Tripura E-Library</h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              A centralized digital archive for engineering resources, research papers, and academic history.
            </p>
          </div>

          {/* Column 2: Contact Information */}
          <div className="space-y-6">
            <h4 className="text-acid-lime text-xs font-bold uppercase tracking-widest">Contact Support</h4>
            <div className="space-y-4">
              <a href="mailto:support@elibrary.edu" className="flex items-center gap-3 text-white/60 hover:text-white transition-colors group">
                <Mail size={16} className="text-acid-lime group-hover:scale-110 transition-transform" />
                <span className="text-sm">support@elibrary.edu</span>
              </a>
              <div className="flex items-center gap-3 text-white/60 group">
                <MapPin size={16} className="text-acid-lime" />
                <span className="text-sm">Electrical Eng. Dept, Block 4</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 group">
                <Phone size={16} className="text-acid-lime" />
                <span className="text-sm">+91 98765 43210</span>
              </div>
            </div>
          </div>

          {/* Column 3: Developer Details */}
          <div className="space-y-6">
            <h4 className="text-acid-lime text-xs font-bold uppercase tracking-widest">Developed By</h4>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-acid-lime/50 transition-colors">
              <p className="text-white font-medium mb-1">Your Name</p>
              <p className="text-white/40 text-xs mb-4">Full Stack Developer & UI Designer</p>
              
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
            © 2025 Tripura E-Library. All rights reserved.
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