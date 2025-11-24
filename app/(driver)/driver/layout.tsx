import React from 'react';
import Link from "next/link";
import { Map, Calendar, Wallet, LogOut } from "lucide-react";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar (Yan Menü) */}
      <aside className="w-20 lg:w-64 bg-slate-800 border-r border-slate-700 flex flex-col p-4">
        <div className="font-bold text-green-400 text-xl mb-8 hidden lg:block">EcoDriver</div>
        
        <nav className="space-y-2 flex-1">
          <Link href="/driver" className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl text-blue-400 font-medium hover:bg-slate-700 transition-colors">
            <Map size={20} /> <span className="hidden lg:block">Harita</span>
          </Link>
          <Link href="/driver/appointments" className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors">
            <Calendar size={20} /> <span className="hidden lg:block">Randevular</span>
          </Link>
          <Link href="/driver/wallet" className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors">
            <Wallet size={20} /> <span className="hidden lg:block">Cüzdanım</span>
          </Link>
        </nav>

        <Link href="/" className="flex items-center gap-3 p-3 hover:bg-red-900/20 text-red-400 rounded-xl mt-auto transition-colors">
          <LogOut size={20} /> <span className="hidden lg:block">Çıkış</span>
        </Link>
      </aside>

      {/* Ana İçerik Alanı (Harita buraya render olacak) */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}