'use client';

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Home() {
  const [message, setMessage] = useState<string>("Loading...");

  useEffect(() => {
    api.get('/')
      .then(res => {
        setMessage(res.data.message);
      })
      .catch(err => {
        console.error(err);
        setMessage("Failed to connect to backend");
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <main className="flex flex-col items-center gap-10 max-w-xl w-full">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#3a525d]">
            ERPSystem Hub
          </h1>
          <p className="text-[#2d8d9b] text-lg font-bold">
            Scalable Enterprise Management Dashboard
          </p>
        </div>

        <div className="w-full p-8 bg-white border border-[#fce4d4] rounded-[2.5rem] shadow-xl space-y-6">
          <div className="p-4 bg-[#fce4d4]/10 border border-[#fce4d4] rounded-xl shadow-sm">
            <p className="text-sm font-bold text-[#3a525d]">
              Backend Status: <span className="text-[#2d8d9b] font-mono">"{message}"</span>
            </p>
          </div>

          <div className="space-y-4">
            <Input label="System Verification" placeholder="Verify connectivity..." />
            <div className="flex gap-4">
              <Button variant="primary" className="flex-1 h-12 rounded-2xl bg-[#2d8d9b] text-white">Refresh Analytics</Button>
              <Button variant="secondary" className="flex-1 h-12 rounded-2xl border border-[#fce4d4] text-[#2d8d9b]">View Logs</Button>
            </div>
            <Button variant="danger" className="w-full h-12 rounded-2xl bg-error text-white">Emergency Stop</Button>
          </div>
        </div>

        <footer className="text-[#8b6b5a] text-[10px] font-black uppercase tracking-widest opacity-60">
          Corporate Enterprise Resource Planning Platform
        </footer>
      </main>
    </div>
  );
}
