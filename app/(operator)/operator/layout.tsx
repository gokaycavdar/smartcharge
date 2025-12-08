"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Megaphone, Settings, LogOut } from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-800 text-white">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center gap-2 font-bold text-xl mb-10 px-2">
          <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
             <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="hidden lg:block bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">SmartCharge</span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link 
            href="/operator" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/operator" 
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard size={20} className={pathname === "/operator" ? "text-white" : "group-hover:text-purple-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Panel</span>
          </Link>
          <Link 
            href="/operator/campaigns" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/operator/campaigns" 
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Megaphone size={20} className={pathname === "/operator/campaigns" ? "text-white" : "group-hover:text-purple-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Kampanyalar</span>
          </Link>
          <Link 
            href="/operator/stations" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/operator/stations" 
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Zap size={20} className={pathname === "/operator/stations" ? "text-white" : "group-hover:text-purple-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">İstasyonlar</span>
          </Link>
          <Link 
            href="/operator/settings" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              pathname === "/operator/settings" 
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Settings size={20} className={pathname === "/operator/settings" ? "text-white" : "group-hover:text-purple-400 transition-colors"} /> 
            <span className="hidden lg:block font-medium">Ayarlar</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800">
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all">
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" /> <span className="hidden lg:block font-medium">Çıkış</span>
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}
