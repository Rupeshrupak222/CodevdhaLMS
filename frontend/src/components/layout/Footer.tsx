"use client";

import React from 'react';

export const Footer = () => {
 return (
 <footer className=" w-full py-2 px-6 border-t border-slate-200/50 dark:border-slate-800/50 text-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-sm transition-colors duration-300">
 <div>
 <span>&copy; {new Date().getFullYear()} LMS Portal. Powered by CODVEDHA. All rights reserved.</span>
 </div>
 <div className="hidden md:flex gap-4 mt-2 sm:mt-0 font-medium">
 <a href="#" className="hover:text-[#a855f7] transition">Terms of Use</a>
 <span>&bull;</span>
 <a href="#" className="hover:text-[#a855f7] transition">Privacy Shield</a>
 <span>&bull;</span>
 <a href="#" className="hover:text-[#a855f7] transition">Contact Technical Support</a>
 </div>
 </footer>
 );
};
