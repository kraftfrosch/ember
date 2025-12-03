"use client";

import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 space-y-8 text-center"
      >
        <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
          <Mail className="w-10 h-10 text-purple-600" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">
            Check your email
          </h1>
          <p className="text-slate-500 leading-relaxed">
            We've sent you a verification link. Please check your inbox to verify your account and get started with VoiceDate.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full bg-slate-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          Back to Login
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  );
}

