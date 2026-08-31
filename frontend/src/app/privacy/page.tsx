// app/privacy/page.tsx
import { Lock, Shield, Eye, Cookie, Trash2, Mail, GraduationCap, Users, BookOpen, Award, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Premium Style */}
        <div className="mb-12 relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-400/10 rounded-full blur-3xl" />
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-400/5 rounded-full blur-3xl" />
          
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all group relative z-10 w-fit mb-6"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
          </Link>

          
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-500 shadow-lg shadow-orange-500/25 flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Privacy Policy
                </h1>
                <p className="text-slate-500 text-sm">CodVedha Edtech LLP · LMS Portal</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Last updated: May 2026
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Effective: May 1, 2026</span>
            </div>
          </div>

          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-purple-50 border border-orange-200/50 shadow-sm">
            <p className="text-sm text-slate-700 leading-relaxed flex items-start gap-3">
              <span className="text-orange-500 mt-0.5">🔒</span>
              <span>
                At <strong className="text-slate-900">CodVedha Edtech LLP.</strong>, we are committed to protecting your privacy.
                This policy explains how we collect, use, and safeguard your information when you use our 
                <strong className="text-slate-900"> Learning Management System (LMS) Portal</strong> — for both students and teachers.
              </span>
            </p>
          </div>
        </div>

        {/* Policy Sections - Premium Cards */}
        <div className="space-y-6">
          {/* 1. Information We Collect */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-100/60 group-hover:bg-orange-100 transition-colors">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">1. Information We Collect</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Student &amp; teacher profiles:</span> name, email, institution/class, role (student/teacher), and course enrollments.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Learning data:</span> quiz scores, assignment submissions, course progress, forum posts, and live session participation.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Teacher-specific:</span> course materials, feedback given to students, attendance records, and grading history.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Technical:</span> device info, IP address, browser type, and LMS interaction logs (clicks, pages visited).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>Payment data (for paid courses) is processed securely via Razorpay. We do not store card or UPI credentials.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>Cookies: session, analytics, and preference cookies (see section 6).</span>
              </li>
            </ul>
          </div>

          {/* 2. How We Use Your Information */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-100/60 group-hover:bg-blue-100 transition-colors">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">2. How We Use Your Information</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Deliver, personalise, and improve the LMS experience for both students and teachers.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Track course progress, grade assignments, and issue certificates/achievements.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Enable communication between teachers and students (messages, announcements, feedback).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Process payments for course enrollments and send transaction confirmations.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Analyse usage patterns to enhance platform features, course design, and user interface.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>Send course updates, reminders, and (with consent) promotional content — opt-out anytime.</span>
              </li>
            </ul>
          </div>

          {/* 3. Data Sharing */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100/60 group-hover:bg-purple-100 transition-colors">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">3. Data Sharing</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>We do not sell your personal data to third parties.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Trusted service providers: Razorpay (payments), SendGrid (email), MongoDB Atlas (database), and our video hosting partner for live sessions.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Teachers may view student data (name, progress, submissions) solely for educational purposes within the LMS.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>We may disclose data if required by law or to protect our legal rights.</span>
              </li>
            </ul>
          </div>

          {/* 4. Data Security */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-100/60 group-hover:bg-emerald-100 transition-colors">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">4. Data Security</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>All LMS data transmitted over HTTPS/TLS encryption.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>Passwords hashed using Argon2id — never stored in plain text.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>Payment processing is PCI-DSS compliant via Razorpay.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>Role-based access control: students and teachers see only relevant data.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>We conduct regular security audits and penetration tests.</span>
              </li>
            </ul>
          </div>

          {/* 5. Your Rights */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-100/60 group-hover:bg-rose-100 transition-colors">
                <Award className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">5. Your Rights</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Access:</span> request a copy of your personal data stored in the LMS.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Correction:</span> update inaccurate or incomplete profile/course data.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Deletion:</span> request deletion of your account and associated learning data (subject to legal retention).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Opt-out:</span> unsubscribe from marketing emails and non-essential notifications.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span>To exercise these rights, email <strong className="text-slate-800">eclipse@codvedha.com</strong> (mention “LMS privacy request”).</span>
              </li>
            </ul>
          </div>

          {/* 6. Cookie Policy */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100/60 group-hover:bg-purple-100 transition-colors">
                <Cookie className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">6. Cookie Policy</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Necessary:</span> authentication, session security — cannot be disabled.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Analytics:</span> help us understand how students/teachers interact with LMS features.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Functional:</span> remember preferences (e.g., dark mode, course filters).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium text-slate-800">Marketing:</span> used for targeted advertising (disabled by default).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Manage cookie preferences via the cookie banner on our LMS login page.</span>
              </li>
            </ul>
          </div>

          {/* 7. Data Retention */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-indigo-100/60 group-hover:bg-indigo-100 transition-colors">
                <Trash2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">7. Data Retention</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Account data is retained while your LMS account is active.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Course records, grades, and certificates are kept for academic/historical purposes (up to 7 years).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Payment records retained for 7 years for legal/tax compliance.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>You may request deletion of your account at any time.</span>
              </li>
            </ul>
          </div>

          {/* 8. Children's Privacy */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-cyan-100/60 group-hover:bg-cyan-100 transition-colors">
                <GraduationCap className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">8. Children's Privacy</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>Our LMS services are not directed to children under 13.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>We do not knowingly collect data from children under 13.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>If you believe a child has provided us data, contact us immediately.</span>
              </li>
            </ul>
          </div>

          {/* 9. Changes to This Policy */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-violet-100/60 group-hover:bg-violet-100 transition-colors">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">9. Changes to This Policy</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                <span>We may update this Privacy Policy from time to time.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                <span>We will notify you of significant changes via email or a notice on our LMS portal.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                <span>Continued use of our services after changes constitutes acceptance.</span>
              </li>
            </ul>
          </div>

          {/* 10. Contact Us */}
          <div className="group bg-gradient-to-r from-orange-50 to-purple-50 rounded-2xl border border-orange-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-200/60 group-hover:bg-orange-200 transition-colors">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">10. Contact Us</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span><span className="font-medium">CodVedha Edtech LLP.</span></span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>Email: <a href="mailto:eclipse@codvedha.com" className="text-orange-600 hover:underline font-medium">eclipse@codvedha.com</a></span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>For privacy-related queries: <a href="mailto:eclipse@codvedha.com" className="text-orange-600 hover:underline font-medium">eclipse@codvedha.com</a></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="/terms" className="text-slate-500 hover:text-orange-600 transition-colors duration-200">
              Terms of Service
            </a>
            <span className="text-slate-300">·</span>
            <a href="/contact" className="text-slate-500 hover:text-orange-600 transition-colors duration-200">
              Contact Us
            </a>
            <span className="text-slate-300">·</span>
            <Link href="/login" className="text-slate-500 hover:text-orange-600 transition-colors duration-200">
              LMS Home
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} CodVedha Edtech LLP. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}