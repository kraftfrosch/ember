"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, MessageCircle, Mic, PhoneOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";
import type { UserProfile } from "@/types/profile";

const CARD_COLORS = [
  "bg-orange-100",
  "bg-green-100",
  "bg-purple-100",
  "bg-blue-100",
  "bg-pink-100",
  "bg-yellow-100",
  "bg-teal-100",
];

type Decision = "yes" | "no" | null;

export default function FeedPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const supabase = createSupabaseClient();

  const currentProfile = profiles[currentIndex] || null;

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to agent");
      toast.success(`Connected to ${currentProfile?.display_name}'s agent`);
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast.error("Connection error. Please try again.");
    },
  });

  const { status, isSpeaking } = conversation;

  // Fetch profiles with ready agents
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("agent_ready", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching profiles:", error);
          toast.error("Failed to load profiles");
          return;
        }

        setProfiles(data || []);
      } catch (err) {
        console.error("Error:", err);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, [supabase]);

  // Start conversation with agent
  const startCall = useCallback(async () => {
    if (!currentProfile?.cloned_agent_id) {
      toast.error("This user's agent is not available");
      return;
    }

    setIsCallModalOpen(true);

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: currentProfile.cloned_agent_id,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Could not access microphone or connect to agent");
      setIsCallModalOpen(false);
    }
  }, [conversation, currentProfile]);

  // End conversation and show decision
  const endCall = useCallback(async () => {
    await conversation.endSession();
    setIsCallModalOpen(false);
    setShowDecisionModal(true);
  }, [conversation]);

  // Handle decision (yes/no)
  const handleDecision = useCallback((decision: Decision) => {
    if (!currentProfile) return;

    setDecisions((prev) => ({
      ...prev,
      [currentProfile.id]: decision,
    }));

    // Animate swipe direction
    setSwipeDirection(decision === "yes" ? "right" : "left");

    if (decision === "yes") {
      toast.success(`You liked ${currentProfile.display_name}! 💕`);
    }

    setShowDecisionModal(false);

    // Move to next profile after animation
    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentProfile, currentIndex, profiles.length]);

  // Skip without talking (pass)
  const handleSkip = useCallback(() => {
    if (!currentProfile) return;

    setDecisions((prev) => ({
      ...prev,
      [currentProfile.id]: "no",
    }));

    setSwipeDirection("left");

    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentProfile, currentIndex, profiles.length]);

  // Like without talking
  const handleLike = useCallback(() => {
    if (!currentProfile) return;

    setDecisions((prev) => ({
      ...prev,
      [currentProfile.id]: "yes",
    }));

    setSwipeDirection("right");
    toast.success(`You liked ${currentProfile.display_name}! 💕`);

    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentProfile, currentIndex, profiles.length]);

  // Get tag from profile
  const getProfileTag = (profile: UserProfile): string => {
    if (profile.onboarding_tags && profile.onboarding_tags.length > 0) {
      return profile.onboarding_tags[0];
    }
    return "New here";
  };

  // Get bio excerpt
  const getBioExcerpt = (profile: UserProfile): string => {
    if (profile.bio) {
      return profile.bio.length > 100 ? `"${profile.bio.slice(0, 100)}..."` : `"${profile.bio}"`;
    }
    if (profile.onboarding_summary) {
      return profile.onboarding_summary.length > 100
        ? `"${profile.onboarding_summary.slice(0, 100)}..."`
        : `"${profile.onboarding_summary}"`;
    }
    return `"Looking forward to connecting..."`;
  };

  // Count likes
  const likesCount = Object.values(decisions).filter((d) => d === "yes").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const isEndOfProfiles = currentIndex >= profiles.length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          VoiceDate
        </h1>
        <div className="flex items-center gap-3">
          {likesCount > 0 && (
            <div className="flex items-center gap-1 bg-pink-50 px-3 py-1 rounded-full">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
              <span className="text-sm font-medium text-pink-600">{likesCount}</span>
            </div>
          )}
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
            <div className="w-full h-full bg-slate-300" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">
        {/* Progress indicator */}
        {profiles.length > 0 && !isEndOfProfiles && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">
              {currentIndex + 1} of {profiles.length}
            </span>
            <div className="flex-1 mx-4 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / profiles.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-lg shadow-slate-100 border border-slate-100 mt-20">
            <Mic className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No matches yet</h3>
            <p className="text-slate-500">Check back later for new profiles!</p>
          </div>
        ) : isEndOfProfiles ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-lg shadow-slate-100 border border-slate-100 mt-20">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">You&apos;ve seen everyone!</h3>
            <p className="text-slate-500 mb-4">
              You liked {likesCount} {likesCount === 1 ? "person" : "people"} 💕
            </p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-medium transition-colors"
            >
              Start Over
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{
                opacity: 1,
                x: swipeDirection === "left" ? -300 : swipeDirection === "right" ? 300 : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border border-slate-100"
            >
              {currentProfile && (
                <>
                  <div
                    className={`h-64 ${CARD_COLORS[currentIndex % CARD_COLORS.length]} relative group`}
                  >
                    {currentProfile.profile_photo_url ? (
                      <img
                        src={currentProfile.profile_photo_url}
                        alt={currentProfile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Mic className="w-16 h-16 text-slate-900/10" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                        {getProfileTag(currentProfile)}
                      </div>
                      {currentProfile.onboarding_tags?.slice(1, 3).map((tag, i) => (
                        <div
                          key={i}
                          className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-3xl font-bold text-slate-900">
                        {currentProfile.display_name}, {currentProfile.age}
                      </h3>
                      {currentProfile.location_city && (
                        <p className="text-slate-400 text-sm mt-1">
                          {currentProfile.location_city}
                          {currentProfile.location_region && `, ${currentProfile.location_region}`}
                        </p>
                      )}
                      <p className="text-slate-600 text-base mt-3 leading-relaxed">
                        {getBioExcerpt(currentProfile)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleSkip}
                        className="w-16 h-16 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      >
                        <X className="w-7 h-7" />
                      </button>

                      <button
                        onClick={startCall}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white py-4 rounded-2xl font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                      >
                        <Mic className="w-5 h-5" />
                        Talk to Agent
                      </button>

                      <button
                        onClick={handleLike}
                        className="w-16 h-16 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      >
                        <Heart className="w-7 h-7" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
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

      {/* Voice Call Modal */}
      <AnimatePresence>
        {isCallModalOpen && currentProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 relative"
            >
              <div className="text-center space-y-6">
                {/* Profile info */}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {currentProfile.display_name}&apos;s Agent
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {status === "connected" ? "Connected" : "Connecting..."}
                  </p>
                </div>

                {/* Voice visualizer */}
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                  {status === "connected" && (
                    <>
                      <motion.div
                        animate={{
                          scale: isSpeaking ? [1, 1.2, 1] : 1,
                          opacity: isSpeaking ? 0.5 : 0.2,
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 bg-purple-400 rounded-full blur-xl"
                      />
                      <motion.div
                        animate={{
                          scale: isSpeaking ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-4 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full opacity-20"
                      />
                    </>
                  )}

                  <div className="relative z-10 w-28 h-28 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-slate-100">
                    {status === "connected" ? (
                      <div className="flex gap-1 items-center">
                        {[1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: isSpeaking ? [15, 35, 15] : 8,
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.4,
                              delay: i * 0.1,
                            }}
                            className="w-2 bg-slate-900 rounded-full"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                {/* Instruction */}
                <p className="text-slate-500 text-sm">
                  {isSpeaking
                    ? "Agent is speaking..."
                    : status === "connected"
                    ? "Your turn to speak"
                    : "Setting up connection..."}
                </p>

                {/* End call button */}
                <button
                  onClick={endCall}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Modal (Yes/No after call) */}
      <AnimatePresence>
        {showDecisionModal && currentProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8"
            >
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    What do you think?
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Would you like to match with {currentProfile.display_name}?
                  </p>
                </div>

                {/* Profile summary */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                  <div
                    className={`w-16 h-16 ${CARD_COLORS[currentIndex % CARD_COLORS.length]} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    {currentProfile.profile_photo_url ? (
                      <img
                        src={currentProfile.profile_photo_url}
                        alt={currentProfile.display_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <Mic className="w-6 h-6 text-slate-900/20" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">
                      {currentProfile.display_name}, {currentProfile.age}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {getProfileTag(currentProfile)}
                    </p>
                  </div>
                </div>

                {/* Decision buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleDecision("no")}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <X className="w-5 h-5" />
                    Pass
                  </button>
                  <button
                    onClick={() => handleDecision("yes")}
                    className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-pink-200"
                  >
                    <Heart className="w-5 h-5" />
                    Like
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
