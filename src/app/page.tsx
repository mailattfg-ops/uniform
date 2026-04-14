'use client';

import { useEffect, useState } from "react";
import api from "@/services/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <nav className="absolute top-8 right-8">
        <ThemeToggle />
      </nav>

      <main className="flex flex-col items-center gap-10 max-w-xl w-full">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-primary">
            Theme System
          </h1>
          <p className="text-muted-foreground text-lg">
            A scalable Next.js + Tailwind UI with semantic color switching.
          </p>
        </div>

        <div className="w-full p-8 bg-muted/30 border border-border rounded-3xl backdrop-blur-sm space-y-6">
          <div className="p-4 bg-background border border-border rounded-xl shadow-sm">
            <p className="text-md font-medium">
              Backend Status: <span className="text-success font-mono">"{message}"</span>
            </p>
          </div>

          <div className="space-y-4">
            <Input label="Demo Input" placeholder="Type something..." />
            <div className="flex gap-4">
              <Button variant="primary" className="flex-1">Primary Action</Button>
              <Button variant="secondary" className="flex-1">Secondary</Button>
            </div>
            <Button variant="danger" className="w-full">Danger Zone</Button>
          </div>
        </div>

        <footer className="text-muted-foreground text-sm">
          Theme preference stored in local storage & synced with system.
        </footer>
      </main>
    </div>
  );
}
