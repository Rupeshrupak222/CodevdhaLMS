// app/terms/page.tsx
import { 
  FileText, 
  Shield, 
  BookOpen, 
  CreditCard, 
  RefreshCw, 
  Copy, 
  AlertCircle, 
  Award, 
  Scale, 
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Terms of Service
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
              <span className="text-orange-500 mt-0.5">📋</span>
              <span>
                Please read these Terms of Service carefully before using <strong className="text-slate-900">CodVedha's</strong> LMS Platform. 
                These terms constitute a legally binding agreement between you and <strong className="text-slate-900">CodVedha Edtech LLP.</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Terms Sections - Premium Cards */}
        <div className="space-y-6">
          {/* 1. Acceptance of Terms */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-100/60 group-hover:bg-orange-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>By accessing or using CodVedha's LMS platform, you agree to be bound by these Terms of Service.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>If you do not agree to these terms, please do not use our services.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span>We reserve the right to update these terms at any time with notice to users via email or platform notification.</span>
              </li>
            </ul>
          </div>

          {/* 2. Use of Services */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-100/60 group-hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">2. Use of Services</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>You must be at least 13 years old to use our LMS services.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>You are responsible for maintaining the confidentiality of your account credentials.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>You agree not to share your account with others or use another person's account.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>You agree not to use our platform for any unlawful or prohibited purpose.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <span>We reserve the right to suspend or terminate accounts that violate these terms.</span>
              </li>
            </ul>
          </div>

          {/* 3. Course Enrollment & Access */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100/60 group-hover:bg-purple-100 transition-colors">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">3. Course Enrollment &amp; Access</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Upon successful payment, you will be enrolled in the selected course/program.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Course access is granted to the registered user only and is non-transferable.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>We reserve the right to update course content to keep it current and relevant.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>Course access duration is as specified at the time of purchase.</span>
              </li>
            </ul>
          </div>

          {/* 4. Payment Terms */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-100/60 group-hover:bg-emerald-100 transition-colors">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">4. Payment Terms</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>All prices are in Indian Rupees (INR) and inclusive of applicable taxes.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>Payments are processed securely via Razorpay (PCI-DSS compliant).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>By making a payment, you confirm that you are authorised to use the payment method.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>We do not store your payment credentials on our servers.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>All sales are final unless covered by our Refund Policy (Section 5).</span>
              </li>
            </ul>
          </div>

          {/* 6. Intellectual Property */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-100/60 group-hover:bg-rose-100 transition-colors">
                <Copy className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">5. Intellectual Property</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span>All course content, materials, and platform features are owned by <strong className="text-slate-800">CodVedha Edtech LLP.</strong></span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span>You may not reproduce, distribute, or create derivative works without written permission.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span>You are granted a limited, non-exclusive licence to access content for personal learning only.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <span>Certificates issued are the property of CODVEDHA and may be verified by employers.</span>
              </li>
            </ul>
          </div>

          {/* 7. User Conduct */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-100/60 group-hover:bg-red-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">6. User Conduct</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>You agree not to upload harmful, offensive, or illegal content to the platform.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>You agree not to attempt to hack, disrupt, or reverse-engineer our platform.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>You agree not to scrape, crawl, or extract data from our platform without permission.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>Violations may result in immediate account termination without refund.</span>
              </li>
            </ul>
          </div>

          {/* 8. Certificates & Credentials */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-indigo-100/60 group-hover:bg-indigo-100 transition-colors">
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">7. Certificates &amp; Credentials</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Certificates are issued upon successful completion of all course requirements.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Certificates are digital and can be shared on LinkedIn and other professional platforms.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>CODVEDHA reserves the right to revoke certificates if fraud or misconduct is detected.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>Certificates do not guarantee employment or specific career outcomes.</span>
              </li>
            </ul>
          </div>

          {/* 9. Limitation of Liability */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-slate-100/60 group-hover:bg-slate-100 transition-colors">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">8. Limitation of Liability</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                <span>CODVEDHA is not liable for any indirect, incidental, or consequential damages.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                <span>Our total liability shall not exceed the amount paid for the specific service.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                <span>We do not guarantee specific learning outcomes or employment results.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                <span>Platform availability is provided on a best-effort basis with no uptime guarantee.</span>
              </li>
            </ul>
          </div>

          {/* 10. Governing Law */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-7 hover:border-orange-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-cyan-100/60 group-hover:bg-cyan-100 transition-colors">
                <Scale className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">9. Governing Law</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>These terms are governed by the laws of India.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>Any disputes shall be subject to the exclusive jurisdiction of courts in India.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                <span>We encourage resolving disputes amicably before pursuing legal action.</span>
              </li>
            </ul>
          </div>

          {/* 11. Contact */}
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
                <span>For legal queries: <a href="mailto:eclipse@codvedha.com" className="text-orange-600 hover:underline font-medium">eclipse@codvedha.com</a></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="/privacy" className="text-slate-500 hover:text-orange-600 transition-colors duration-200">
              Privacy Policy
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
