"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  Clock, 
  ArrowLeft, 
  Send, 
  HeadphonesIcon, 
  HelpCircle,
  Shield,
  FileText,
  Sparkles,
  MessageCircle,
  Zap,
  CheckCircle,
  Users,
  Award
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupportContact() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50/30 to-white py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-orange-500/30 relative overflow-x-hidden">
      
      {/* Premium Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-300/5 rounded-full blur-3xl -z-10" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] -z-10" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all group relative z-10 w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
          </Link>
        </div>
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center relative"
        >
          
          <div className="inline-flex items-center gap-3 bg-orange-100/50 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 border border-orange-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-medium text-orange-700 uppercase tracking-widest">We're Here to Help</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            LMS <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500">Support</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Having trouble logging in or accessing your courses? Our dedicated LMS technical support team is here to help.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>24hr Response</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4 text-blue-500" />
              <span>1K+ Students</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Award className="w-4 h-4 text-orange-500" />
              <span>4.9/5 Rating</span>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          
          {/* Contact Cards - Left Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-4"
          >
            {/* Phone Card */}
            <div className="group bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:border-orange-200/60 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Technical Helpline</p>
                  <a href="tel:+918179124566" className="font-bold text-slate-800 hover:text-orange-500 transition-colors text-sm block truncate">
                    +91 81791 24566
                  </a>
                  <p className="text-xs text-slate-400">For urgent portal issues</p>
                </div>
              </div>
            </div>
            
            {/* Email Card */}
            <div className="group bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:border-orange-200/60 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Support</p>
                  <a href="mailto:eclipse@codvedha.com" className="font-bold text-slate-800 hover:text-orange-500 transition-colors text-sm block truncate">
                    eclipse@codvedha.com
                  </a>
                  <p className="text-xs text-slate-400">Replies within 24 hours</p>
                </div>
              </div>
            </div>

            {/* Hours Card */}
            <div className="group bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:border-orange-200/60 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Support Hours</p>
                  <p className="font-bold text-slate-800 text-sm">Mon - Sat</p>
                  <p className="text-xs text-slate-400">11:00 AM - 8:00 PM IST</p>
                </div>
              </div>
            </div>

            {/* Quick Help Badge */}
            <div className="bg-gradient-to-r from-orange-50 to-purple-50 p-4 rounded-2xl border border-orange-200/60">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <p className="text-xs text-slate-700">
                  <span className="font-semibold">Pro Tip:</span> Check our 
                  <a href="/faq" className="text-orange-500 hover:underline font-medium mx-1">FAQ</a> 
                  for quick answers to common issues.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-orange-100">
                <HelpCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Submit a Ticket</h2>
                <p className="text-sm text-slate-500">We'll respond within 24 hours</p>
              </div>
            </div>
            
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); router.push('/'); }}>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Full Name <span className="text-orange-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all hover:bg-white" 
                    placeholder="Your Name" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Registered Email <span className="text-orange-500">*</span>
                  </label>
                  <input 
                    required 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all hover:bg-white" 
                    placeholder="email@example.com" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Issue Type <span className="text-orange-500">*</span>
                </label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all text-slate-700 hover:bg-white">
                  <option value="">Select an issue type</option>
                  <option>Face Authentication Error</option>
                  <option>Password Reset Issue</option>
                  <option>Missing Course Access</option>
                  <option>Role/Permission Issue</option>
                  <option>Payment & Billing</option>
                  <option>Other Technical Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Describe the Issue <span className="text-orange-500">*</span>
                </label>
                <textarea 
                  required 
                  rows={4} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all resize-none hover:bg-white" 
                  placeholder="Please provide details about your issue..."
                ></textarea>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200/60">
                <div className="flex items-start gap-2 flex-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-500">
                    By submitting this ticket, you agree to allow support staff to access your LMS logs for debugging purposes.
                  </p>
                </div>
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> 
                  Submit Ticket
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Footer Navigation - Links to Privacy & Terms */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-8 border-t border-slate-200/60"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a 
              href="/privacy" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors duration-200 group"
            >
              <Shield className="w-4 h-4 group-hover:text-orange-600" />
              Privacy Policy
            </a>
            <span className="text-slate-300">·</span>
            <a 
              href="/terms" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors duration-200 group"
            >
              <FileText className="w-4 h-4 group-hover:text-orange-600" />
              Terms of Service
            </a>
            <span className="text-slate-300">·</span>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors duration-200 group"
            >
              <span className="group-hover:translate-x-0.5 transition-transform">🏠</span>
              LMS Home
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} CodVedha Edtech LLP. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}