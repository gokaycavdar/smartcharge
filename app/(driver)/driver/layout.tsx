"use client";

import React, { useEffect } from 'react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Calendar, Wallet, LogOut, Zap, Gift, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import ChatWidget from "@/components/ChatWidget";
import GlobalAIWidget from "@/components/GlobalAIWidget";
import ThemeToggle from "@/components/ThemeToggle";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = getToken();

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [router, token]);

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-primary-bg text-primary font-sans overflow-hidden">
      {/* Sidebar (Yan Menü) */}
      <aside className="w-20 lg:w-64 bg-surface-1 border-r border-white/5 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center gap-2 font-bold text-xl mb-10 px-2">
          <div className="h-8 w-8 rounded-lg bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20">
             <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="hidden lg:block text-gradient font-display font-extrabold tracking-tight">SmartCharge</span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link 
            href="/driver" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/driver" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Map size={20} className={pathname === "/driver" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Harita</span>
          </Link>
          <Link 
            href="/driver/appointments" 
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === "/driver/appointments" 
                ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                : "text-text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <Calendar size={20} className={pathname === "/driver/appointments" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
            <span className="hidden lg:block">Randevular</span>
          </Link>
           <Link 
             href="/driver/wallet" 
             className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
               pathname === "/driver/wallet" 
                 ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                 : "text-text-secondary hover:bg-white/5 hover:text-white"
             }`}
           >
             <Wallet size={20} className={pathname === "/driver/wallet" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
             <span className="hidden lg:block">Cüzdanım</span>
           </Link>
           <Link 
             href="/driver/coupons" 
             className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium ${
               pathname === "/driver/coupons" 
                 ? "bg-accent-primary/10 text-accent-primary shadow-sm ring-1 ring-accent-primary/20" 
                 : "text-text-secondary hover:bg-white/5 hover:text-white"
             }`}
           >
             <Gift size={20} className={pathname === "/driver/coupons" ? "text-accent-primary" : "group-hover:text-accent-primary transition-colors"} /> 
             <span className="hidden lg:block">Kupon Merkezi</span>
           </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5">
            <div className="mb-2">
              <ThemeToggle />
            </div>
            <Link href="/" className="group flex items-center gap-3 p-3 hover:bg-red-500/10 text-text-secondary hover:text-red-400 rounded-xl transition-all font-medium">
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" /> <span className="hidden lg:block">Çıkış</span>
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
