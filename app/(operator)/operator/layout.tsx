"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Megaphone, Settings, LogOut } from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-xl shadow-slate-200/50 z-20">
        <div className="flex items-center gap-3 font-bold text-xl mb-10 px-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
             <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="hidden lg:block text-slate-900 tracking-tight font-extrabold">Otwatt</span>
        </div>
        
        <nav className="space-y-1.5 flex-1">
          <Link 
            href="/operator" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator" 
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <LayoutDashboard size={20} className={pathname === "/operator" ? "text-blue-600" : "group-hover:text-blue-600 transition-colors"} /> 
            <span className="hidden lg:block">Panel</span>
          </Link>
          <Link 
            href="/operator/campaigns" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/campaigns" 
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <Megaphone size={20} className={pathname === "/operator/campaigns" ? "text-blue-600" : "group-hover:text-blue-600 transition-colors"} /> 
            <span className="hidden lg:block">Kampanyalar</span>
          </Link>
          <Link 
            href="/operator/stations" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/stations" 
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <Zap size={20} className={pathname === "/operator/stations" ? "text-blue-600" : "group-hover:text-blue-600 transition-colors"} /> 
            <span className="hidden lg:block">İstasyonlar</span>
          </Link>
          <Link 
            href="/operator/settings" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/operator/settings" 
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <Settings size={20} className={pathname === "/operator/settings" ? "text-blue-600" : "group-hover:text-blue-600 transition-colors"} /> 
            <span className="hidden lg:block">Ayarlar</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100">
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all font-medium">
            <LogOut size={20} className="group-hover:text-red-600 transition-colors" /> <span className="hidden lg:block">Çıkış</span>
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50/50">
        {children}
      </main>
    </div>
  );
}
