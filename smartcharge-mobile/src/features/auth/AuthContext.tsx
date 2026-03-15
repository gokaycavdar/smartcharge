import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken } from "../../lib/auth";

type AuthCtx = {
  isAuthed: boolean;
  booting: boolean;
  setAuthed: (v: boolean) => void;
  refreshAuth: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);

  const refreshAuth = async () => {
    const t = await getToken();
    setAuthed(!!t);
    setBooting(false);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <Ctx.Provider value={{ isAuthed, booting, setAuthed, refreshAuth }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}