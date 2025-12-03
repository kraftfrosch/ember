"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Mic, User, LogOut } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedClientProps {
  user: any; // User object from Supabase
}

export default function FeedClient({ user }: FeedClientProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  const cards = [
    { name: "Sarah", age: 24, tag: "Bookworm", color: "bg-orange-100" },
    { name: "Mike", age: 27, tag: "Hiker", color: "bg-green-100" },
    { name: "Jessica", age: 23, tag: "Artist", color: "bg-purple-100" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          VoiceDate
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              <User className="w-5 h-5 text-slate-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <div className="px-2 py-1.5 text-xs text-slate-500 truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Feed */}
      <main className="p-4 space-y-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Discover</h2>
          <span className="text-sm text-slate-500">San Francisco, CA</span>
        </div>

        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border border-slate-100"
          >
            <div className={`h-48 ${card.color} relative group`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic className="w-12 h-12 text-slate-900/10 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                  {card.tag}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {card.name}, {card.age}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    "I love spending weekends exploring new coffee shops..."
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4" />
                  Talk to Agent
                </button>
                <button className="w-14 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center max-w-md mx-auto">
        <button className="text-purple-600 flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
            <div className="w-2 h-2 bg-purple-600 rounded-full" />
          </div>
          <span className="text-[10px] font-medium">Feed</span>
        </button>
        <button className="text-slate-400 hover:text-slate-600 flex flex-col items-center gap-1">
          <MessageCircle className="w-6 h-6" />
          <span className="text-[10px] font-medium">Chats</span>
        </button>
      </nav>
    </div>
  );
}
