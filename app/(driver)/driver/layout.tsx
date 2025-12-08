"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Calendar, Wallet, LogOut, Zap } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import GlobalAIWidget from "@/components/GlobalAIWidget";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-800 text-white">
      {/* Sidebar (Yan Menü) */}
      <aside className="w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center gap-2 font-bold text-xl mb-10 px-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
             <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="hidden lg:block bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">SmartCharge</span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link 
            href="/driver" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/driver" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Map size={20} className={pathname === "/driver" ? "text-white" : "group-hover:text-blue-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Harita</span>
          </Link>
          <Link 
            href="/driver/appointments" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/driver/appointments" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Calendar size={20} className={pathname === "/driver/appointments" ? "text-white" : "group-hover:text-blue-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Randevular</span>
          </Link>
          <Link 
            href="/driver/wallet" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/driver/wallet" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Wallet size={20} className={pathname === "/driver/wallet" ? "text-white" : "group-hover:text-blue-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Cüzdanım</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800">
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all">
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" /> <span className="hidden lg:block font-medium">Çıkış</span>
            </Link>
        </div>
      </aside>

      {/* Ana İçerik Alanı (Harita buraya render olacak) */}
      <main className={`flex-1 relative ${pathname === "/driver" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
        <GlobalAIWidget />
        <ChatWidget />
      </main>
    </div>
  );
}