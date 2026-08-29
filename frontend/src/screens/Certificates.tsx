"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, X, Award, ShieldCheck, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';

export const Certificates = () => {
  const { activeRole } = useLMS();
  
  // API Data Fetching
  const { data: rawCertificates = [], mutate: mutateCertificates, isLoading: isCertificatesLoading } = useSWR('/certificates', fetcher);
  const { data: coursesData, isLoading: isCoursesLoading } = useSWR('/courses', fetcher);
  const courses = coursesData || [];

  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueData, setIssueData] = useState({ 
    studentId: '', 
    courseId: '', 
    type: 'Course Completion',
    startDate: '',
    endDate: '',
    durationMonths: '',
    issueDate: new Date().toISOString().split('T')[0]
  });
  const [imgError, setImgError] = useState(false);

  // Fetch enrolled students dynamically when courseId is selected
  const { data: rawEnrollments = [], isLoading: isStudentsLoading } = useSWR(
    issueData.courseId ? `/courses/${issueData.courseId}/students` : null,
    fetcher
  );
  const courseStudents = rawEnrollments.map((e: any) => e.student);

  // Verification State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifiedCert, setVerifiedCert] = useState<any>(null);

  const getTemplateForType = (type: string) => {
    switch (type) {
      case 'Internship Completion': return '/assets/intenship (1)_page-0001.jpg';
      case 'Project Completion': return '/assets/Project (1)_page-0001.jpg';
      case 'Best Performance': return '/assets/Best Performer (1)_page-0001.jpg';
      default: return '/assets/Course (1)_page-0001.jpg';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[monthIndex]} ${parts[0]}`;
    }
    return dateStr;
  };

  // Fixed: Returns JSX with proper bold tags
  const getParagraphText = (cert: any) => {
    const name = cert.studentName || '[Student Name]';
    const course = cert.courseName || '[Course Name]';
    const start = formatDate(cert.startDate) || '[Start Date]';
    const end = formatDate(cert.completionDate || cert.issueDate) || '[End Date]';
    const duration = cert.durationMonths ? <><strong>{cert.durationMonths} Months</strong> </> : '';

    switch (cert.type) {
      case 'Best Performance':
        return (
          <>
            This certificate is awarded to <strong>{name}</strong> for being the Best Performer in the <strong>{course}</strong> Program conducted by <span className='text-purple-500 font-bold'>CODVEDHA</span> from <strong>{start}</strong> to <strong>{end}</strong>. In recognition of outstanding dedication, exceptional performance, and commitment to excellence, we proudly acknowledge this achievement and wish them continuous success in their future endeavors.
          </>
        );
      case 'Project Completion':
        return (
          <>
            This is to certify that <strong>{name}</strong> has successfully completed the <strong>{course}</strong> Project at <span className='text-purple-500 font-bold'>CODVEDHA</span> from <strong>{start}</strong> to <strong>{end}</strong>. The participant demonstrated commitment, technical skills, and professionalism throughout the project and successfully fulfilled all project requirements. We wish them success in all their future endeavors.
          </>
        );
      case 'Internship Completion':
        return (
          <>
            This certification confirms that <strong>{name}</strong> successfully completed the {duration}<strong>{course}</strong> Internship Programme at <span className='text-purple-500 font-bold'>CODVEDHA</span> from <strong>{start}</strong> to <strong>{end}</strong>. During the internship, the candidate demonstrated dedication, practical skills and a strong commitment to professional growth. We wish them continuous success in their future endeavours.
          </>
        );
      default: // Course Completion
        return (
          <>
            This is to certify that <strong>{name}</strong> has successfully completed the {duration}<strong>{course}</strong> Course offered by <span className='text-purple-500 font-bold'>CODVEDHA</span> from <strong>{start}</strong> to <strong>{end}</strong>. The participant actively engaged in the course and successfully fulfilled all learning objectives and assessment requirements. We commend their commitment to skill development and wish them every success in their future endeavors.
          </>
        );
    }
  };

  // Fixed: For canvas rendering (plain text without HTML)
  const getPlainParagraphText = (cert: any) => {
    const name = cert.studentName || '[Student Name]';
    const course = cert.courseName || '[Course Name]';
    const start = formatDate(cert.startDate) || '[Start Date]';
    const end = formatDate(cert.completionDate || cert.issueDate) || '[End Date]';
    const duration = cert.durationMonths ? `<b>${cert.durationMonths} Months</b> ` : '';

    switch (cert.type) {
      case 'Best Performance':
        return `This certificate is awarded to <b>${name}</b> for being the Best Performer in the <b>${course}</b> Program conducted by <b><y>CODVEDHA</y></b> from <b>${start}</b> to <b>${end}</b>. In recognition of outstanding dedication, exceptional performance, and commitment to excellence, we proudly acknowledge this achievement and wish them continuous success in their future endeavors.`;
      case 'Project Completion':
        return `This is to certify that <b>${name}</b> has successfully completed the <b>${course}</b> Project at <b><y>CODVEDHA</y></b> from <b>${start}</b> to <b>${end}</b>. The participant demonstrated commitment, technical skills, and professionalism throughout the project and successfully fulfilled all project requirements. We wish them success in all their future endeavors.`;
      case 'Internship Completion':
        return `This certification confirms that <b>${name}</b> successfully completed the ${duration}<b>${course}</b> Internship Programme at <b><y>CODVEDHA</y></b> from <b>${start}</b> to <b>${end}</b>. During the internship, the candidate demonstrated dedication, practical skills and a strong commitment to professional growth. We wish them continuous success in their future endeavours.`;
      default:
        return `This is to certify that <b>${name}</b> has successfully completed the ${duration}<b>${course}</b> Course offered by <b><y>CODVEDHA</y></b> from <b>${start}</b> to <b>${end}</b>. The participant actively engaged in the course and successfully fulfilled all learning objectives and assessment requirements. We commend their commitment to skill development and wish them every success in their future endeavors.`;
    }
  };

  // Map API certificates
  const displayCerts = rawCertificates.map((c: any) => {
    let type = 'Course Completion';
    if (c.type === 'INTERNSHIP_COMPLETION') type = 'Internship Completion';
    else if (c.type === 'PROJECT_COMPLETION') type = 'Project Completion';
    else if (c.type === 'BEST_PERFORMANCE') type = 'Best Performance';

    return {
      ...c,
      studentName: c.student?.name || 'Student',
      courseName: c.course?.title || 'Course',
      type,
      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
      completionDate: new Date(c.completionDate).toISOString().split('T')[0],
      issueDate: c.issueDate ? new Date(c.issueDate).toISOString().split('T')[0] : new Date(c.completionDate).toISOString().split('T')[0]
    };
  });

  // Render certificate modal
  const handleViewCertificate = (cert: any) => {
    setSelectedCert(cert);
    // Always use the CodVedha-branded certificate design (drawn in code),
    // not the legacy template JPGs.
    setImgError(true);
  };

  // Draw a CodVedha-branded certificate entirely on canvas (no legacy template image).
  const handleDownload = () => {
    if (!selectedCert) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Landscape A4-ish at high resolution
    const W = 1600;
    const H = 1131;
    canvas.width = W;
    canvas.height = H;

    const PURPLE = '#a855f7';
    const PURPLE_DARK = '#7c3aed';
    const PURPLE_DEEP = '#6d28d9';
    const ORANGE = '#f97316';
    const INK = '#1e293b';
    const MUTED = '#64748b';

    const centerX = W / 2;

    const drawCertificate = (logo: HTMLImageElement | null) => {
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Outer gradient border band
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, PURPLE);
      grad.addColorStop(0.5, PURPLE_DARK);
      grad.addColorStop(1, PURPLE_DEEP);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Inner white card
      const m = 34;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m, m, W - m * 2, H - m * 2);

      // Thin accent inner frame
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = 2;
      ctx.strokeRect(m + 22, m + 22, W - (m + 22) * 2, H - (m + 22) * 2);

      // Orange accent corner ticks
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 6;
      const c = 70; const off = m + 22;
      // top-left
      ctx.beginPath(); ctx.moveTo(off, off + c); ctx.lineTo(off, off); ctx.lineTo(off + c, off); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(W - off - c, off); ctx.lineTo(W - off, off); ctx.lineTo(W - off, off + c); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(off, H - off - c); ctx.lineTo(off, H - off); ctx.lineTo(off + c, H - off); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(W - off - c, H - off); ctx.lineTo(W - off, H - off); ctx.lineTo(W - off, H - off - c); ctx.stroke();

      // Logo
      if (logo) {
        const ls = 120;
        try { ctx.drawImage(logo, centerX - ls / 2, 95, ls, ls); } catch (_) {}
      }

      // Brand name
      ctx.textAlign = 'center';
      ctx.fillStyle = PURPLE_DARK;
      ctx.font = "700 34px 'Space Grotesk', sans-serif";
      ctx.fillText('CodVedha', centerX, 250);
      ctx.fillStyle = MUTED;
      ctx.font = "600 15px 'Inter', sans-serif";
      ctx.fillText('MASTER 4.0 TECHNOLOGIES', centerX, 278);

      // Title
      ctx.fillStyle = INK;
      ctx.font = "800 62px 'Space Grotesk', sans-serif";
      ctx.fillText((selectedCert.type || 'Certificate').toUpperCase(), centerX, 380);

      // Purple underline
      ctx.fillStyle = ORANGE;
      ctx.fillRect(centerX - 90, 400, 180, 5);

      // "This is to certify that"
      ctx.fillStyle = MUTED;
      ctx.font = "500 22px 'Inter', sans-serif";
      ctx.fillText('This certificate is proudly presented to', centerX, 470);

      // Student name
      ctx.fillStyle = PURPLE_DARK;
      ctx.font = "700 56px 'Playfair Display', serif";
      ctx.fillText(selectedCert.studentName, centerX, 545);
      // name underline
      const nameW = Math.min(ctx.measureText(selectedCert.studentName).width + 80, W - 300);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(centerX - nameW / 2, 575); ctx.lineTo(centerX + nameW / 2, 575); ctx.stroke();

      // Paragraph (wrapped)
      ctx.fillStyle = INK;
      ctx.font = "400 22px 'Inter', sans-serif";
      const para = getPlainParagraphText(selectedCert).replace(/<\/?b>|<\/?y>/g, '');
      const words = para.split(/\s+/);
      let line = '';
      let y = 640;
      const maxW = W * 0.72;
      words.forEach((w: string) => {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, centerX, y);
          y += 36;
          line = w;
        } else {
          line = test;
        }
      });
      if (line) ctx.fillText(line, centerX, y);

      // Seal
      const sealX = centerX; const sealY = 880; const r = 58;
      const sealGrad = ctx.createLinearGradient(sealX - r, sealY - r, sealX + r, sealY + r);
      sealGrad.addColorStop(0, PURPLE);
      sealGrad.addColorStop(1, PURPLE_DEEP);
      ctx.fillStyle = sealGrad;
      ctx.beginPath(); ctx.arc(sealX, sealY, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = "700 20px 'Space Grotesk', sans-serif";
      ctx.fillText('CV', sealX, sealY + 7);

      // Signatures / date row
      const rowY = 1000;
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      // date (left)
      ctx.beginPath(); ctx.moveTo(230, rowY); ctx.lineTo(560, rowY); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "600 22px 'Inter', sans-serif";
      ctx.fillText(formatDate(selectedCert.issueDate), 395, rowY - 12);
      ctx.fillStyle = MUTED; ctx.font = "600 15px 'Inter', sans-serif";
      ctx.fillText('DATE OF ISSUE', 395, rowY + 28);
      // registrar (right)
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(W - 560, rowY); ctx.lineTo(W - 230, rowY); ctx.stroke();
      ctx.fillStyle = PURPLE_DARK; ctx.font = "italic 600 24px 'Playfair Display', serif";
      ctx.fillText('CodVedha', W - 395, rowY - 12);
      ctx.fillStyle = MUTED; ctx.font = "600 15px 'Inter', sans-serif";
      ctx.fillText('AUTHORISED SIGNATORY', W - 395, rowY + 28);

      // Verify ID (bottom center)
      ctx.fillStyle = MUTED;
      ctx.font = "500 16px 'JetBrains Mono', monospace";
      ctx.fillText(`Verify ID: ${selectedCert.verifyId.replace('CERT-', 'CV-')}`, centerX, H - 60);

      // Export
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, W, H);
      pdf.save(`${selectedCert.studentName.replace(/\s+/g, '_')}_${selectedCert.type.replace(/\s+/g, '_')}_CodVedha.pdf`);
      toast.success('Certificate downloaded successfully!');
    };

    // Load the CodVedha logo, then draw (draw anyway if it fails)
    const logo = new Image();
    logo.crossOrigin = 'Anonymous';
    logo.onload = () => drawCertificate(logo);
    logo.onerror = () => drawCertificate(null);
    logo.src = '/assets/logo-codvedha.png';
  };

  // Legacy template renderer (kept for reference, no longer used)
  const handleDownloadLegacy = () => {
    if (!selectedCert) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = getTemplateForType(selectedCert.type);

    img.onload = () => {
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);

      // Draw Name
      ctx.font = `normal ${Math.floor(img.height * 0.045)}px serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedCert.studentName, canvas.width / 2, canvas.height * 0.44);

      // Draw Paragraph - using plain text version with rich text rendering for <b> tags
      const baseFontSize = Math.floor(img.height * 0.029);
      const baseFont = `normal ${baseFontSize}px sans-serif`;
      const boldFont = `bold ${baseFontSize}px sans-serif`;
      
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const paraText = getPlainParagraphText(selectedCert);
      
      const drawRichTextCentered = (context: any, text: string, centerX: number, startY: number, maxWidth: number, lineHeight: number, normalFont: string, bFont: string) => {
        const tokens: any[] = [];
        let isBold = false;
        let isYellow = false;
        const parts = text.split(/(<b>|<\/b>|<y>|<\/y>)/g);
        parts.forEach(part => {
          if (part === '<b>') isBold = true;
          else if (part === '</b>') isBold = false;
          else if (part === '<y>') isYellow = true;
          else if (part === '</y>') isYellow = false;
          else if (part.length > 0) {
            const words = part.split(/(\s+)/);
            words.forEach(w => {
              if (w.length > 0) tokens.push({ text: w, bold: isBold, yellow: isYellow });
            });
          }
        });

        let lines: any[] = [];
        let currentLine: any[] = [];
        let currentLineWidth = 0;

        tokens.forEach(token => {
          context.font = token.bold ? bFont : normalFont;
          const width = context.measureText(token.text).width;
          if (token.text.trim() === '' && currentLineWidth === 0) return;
          if (currentLineWidth + width > maxWidth && token.text.trim() !== '') {
            lines.push({ tokens: currentLine, width: currentLineWidth });
            currentLine = [token];
            currentLineWidth = width;
          } else {
            currentLine.push(token);
            currentLineWidth += width;
          }
        });
        if (currentLine.length > 0) lines.push({ tokens: currentLine, width: currentLineWidth });

        let y = startY;
        lines.forEach(lineObj => {
          let trimWidth = lineObj.width;
          if (lineObj.tokens.length > 0 && lineObj.tokens[lineObj.tokens.length - 1].text.trim() === '') {
            context.font = lineObj.tokens[lineObj.tokens.length - 1].bold ? bFont : normalFont;
            trimWidth -= context.measureText(lineObj.tokens[lineObj.tokens.length - 1].text).width;
          }
          let x = centerX - (trimWidth / 2);

          lineObj.tokens.forEach(token => {
            context.font = token.bold ? bFont : normalFont;
            context.fillStyle = token.yellow ? '#9333ea' : '#000000';
            context.fillText(token.text, x, y);
            x += context.measureText(token.text).width;
          });
          y += lineHeight;
        });
      };
      
      drawRichTextCentered(ctx, paraText, canvas.width / 2, canvas.height * 0.52, canvas.width * 0.8, img.height * 0.04, baseFont, boldFont);

      // Draw Issue Date
      ctx.font = `bold ${Math.floor(img.height * 0.02)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(formatDate(selectedCert.issueDate), canvas.width * 0.52, canvas.height * 0.865);

      // Draw Certificate No / Verify ID
      ctx.font = `bold ${Math.floor(img.height * 0.015)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`CERTIFICATE NO: ${selectedCert.verifyId.replace('CERT-', 'CV-')}`, canvas.width * 0.95, canvas.height * 0.05);

      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${selectedCert.studentName.replace(/\s+/g, '_')}_${selectedCert.type.replace(/\s+/g, '_')}.pdf`);

      toast.success('Certificate downloaded successfully!');
    };

    img.onerror = () => {
      toast.error('Template image not found. Please add the template image to the /assets folder.');
    };
  };

  const handleIssueSubmit = async (e: any) => {
    e.preventDefault();
    if (!issueData.studentId || !issueData.courseId) {
      toast.error('Please select both student and course.');
      return;
    }

    // Date & Duration Validation from original code
    if (issueData.startDate && issueData.endDate) {
      const start = new Date(issueData.startDate);
      const end = new Date(issueData.endDate);
      
      if (end <= start) {
        toast.error("End Date must be after Start Date.");
        return;
      }

      if (issueData.durationMonths) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const months = parseInt(issueData.durationMonths);
        
        // Allow a reasonable margin (25 to 35 days per month)
        const minDays = months * 25;
        const maxDays = months * 35;
        
        if (diffDays < minDays || diffDays > maxDays) {
          toast.error(`Date range (${diffDays} days) doesn't match a ${months} month duration.`);
          return;
        }
      }
    }

    try {
      let finalType: any = 'COURSE_COMPLETION';
      if (issueData.type === 'Internship Completion') finalType = 'INTERNSHIP_COMPLETION';
      else if (issueData.type === 'Project Completion') finalType = 'PROJECT_COMPLETION';
      else if (issueData.type === 'Best Performance') finalType = 'BEST_PERFORMANCE';
      else if (issueData.type === 'All' || issueData.type === 'All Types (4 Certificates)') finalType = ['COURSE_COMPLETION', 'INTERNSHIP_COMPLETION', 'PROJECT_COMPLETION', 'BEST_PERFORMANCE'];

      await api.post('/certificates', {
        studentId: issueData.studentId,
        courseId: issueData.courseId,
        type: finalType,
        grade: 'A',
        startDate: issueData.startDate ? new Date(issueData.startDate).toISOString() : undefined,
        completionDate: new Date(issueData.endDate || issueData.issueDate || new Date()).toISOString(),
        durationMonths: issueData.durationMonths || undefined
      });

      toast.success('Certificate issued successfully!');
      mutateCertificates();
      setIsIssueModalOpen(false);
      setIssueData({ 
        studentId: '', courseId: '', type: 'Course Completion',
        startDate: '', endDate: '', durationMonths: '', issueDate: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue certificate');
    }
  };

  const handleVerifySubmit = async (e: any) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    try {
      const res = await api.get(`/certificates/verify/${verifyInput.trim()}`);
      const cert = res.data.data;

      let type = 'Course Completion';
      if (cert.type === 'INTERNSHIP_COMPLETION') type = 'Internship Completion';
      else if (cert.type === 'PROJECT_COMPLETION') type = 'Project Completion';
      else if (cert.type === 'BEST_PERFORMANCE') type = 'Best Performance';

      setVerifiedCert({
        ...cert,
        studentName: cert.student?.name || 'Student',
        courseName: cert.course?.title || 'Course',
        type,
        startDate: cert.startDate ? new Date(cert.startDate).toISOString().split('T')[0] : '',
        completionDate: new Date(cert.completionDate).toISOString().split('T')[0],
        issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : new Date(cert.completionDate).toISOString().split('T')[0]
      });
      toast.success('Certificate verified successfully!');
    } catch (err: any) {
      setVerifiedCert(null);
      toast.error(err.response?.data?.message || 'Invalid Certificate ID. Not found in records.');
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/certificates/${id}`);
      toast.success('Certificate deleted successfully!');
      mutateCertificates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete certificate');
    }
  };

  if (isCertificatesLoading || isCoursesLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Loading certificates...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#a855f7]" />
            {activeRole === 'student' ? 'My Certificates' : 'Certificate Issuance'}
          </h1>
          <p className="text-[14px] sm:text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
            {activeRole === 'student' 
              ? 'View and download certificates for completed courses.'
              : 'View all issued certificates.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsVerifyModalOpen(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:border-[#a855f7] text-slate-700 dark:text-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[14px] sm:text-[16px] font-bold transition shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Verify
          </button>
          
          {(activeRole === 'admin' || activeRole === 'faculty') && (
            <button 
              onClick={() => setIsIssueModalOpen(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#a855f7] hover:bg-purple-400 text-slate-950 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[14px] sm:text-[16px] font-bold transition shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Issue Certificate
            </button>
          )}
        </div>
      </div>

      {/* Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayCerts.length > 0 ? (
          displayCerts.map((cert: any, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              key={cert.id}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[14px] sm:text-[14px] font-bold text-slate-600">{cert.issueDate}</span>
              </div>
              
              <div className="mt-3 sm:mt-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">{cert.courseName}</h3>
                {activeRole !== 'student' && (
                  <p className="text-[14px] sm:text-[16px] text-slate-500 dark:text-slate-300 mt-1 font-medium">Issued to: <span className="text-slate-800 dark:text-slate-200">{cert.studentName}</span></p>
                )}
                <p className="text-[14px] sm:text-[16px] text-emerald-500 font-bold mt-1">Grade: {cert.grade || 'A'}</p>
                <p className="text-[10px] sm:text-[14px] text-slate-400 font-mono mt-1">ID: {cert.verifyId.replace('CERT-', 'CV-')}</p>
              </div>

              <div className="mt-4 sm:mt-6 flex items-center justify-end gap-2">
                {(activeRole === 'admin' || activeRole === 'faculty') && (
                  <button
                    onClick={() => confirmDelete(cert.id)}
                    className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-red-500 hover:text-white dark:bg-slate-900 transition text-slate-500"
                    title="Revoke Certificate"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleViewCertificate(cert)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-[#a855f7] text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#a855f7] dark:hover:text-slate-900 rounded-xl text-[14px] sm:text-[16px] font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> View
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 sm:py-20 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-300">
              <FileCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">No Certificates Yet</p>
              <p className="text-[14px] sm:text-[16px] text-slate-500 mt-1">Complete all tasks in a course to earn a certificate.</p>
            </div>
          </div>
        )}
      </div>

      {/* Certificate Modal - Mobile Responsive */}
      <AnimatePresence>
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedCert(null)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-4xl md:max-w-5xl lg:max-w-6xl  bg-white rounded-lg sm:rounded-2xl shadow-2xl z-10 p-4 sm:p-6 md:p-1 lg:p-12 text-center max-h-[98vh] overflow-y-hidden"
          >
            <button 
              onClick={() => setSelectedCert(null)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-slate-600 hover:text-slate-800 bg-slate-100 p-1.5 sm:p-2 rounded-full transition z-20"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleDownload}
              className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#a855f7] hover:bg-purple-400 text-slate-900 font-bold rounded-xl shadow-md transition text-[14px] sm:text-[16px] z-20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Download
            </button>
            
            {!imgError ? (
              <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-slate-200 shadow-lg bg-slate-50 dark:bg-slate-900">
                <img 
                  src={getTemplateForType(selectedCert.type)} 
                  alt="Certificate template" 
                  className="w-full h-auto block" 
                  onError={() => setImgError(true)}
                />
                
                {/* Overlay text - Responsive */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <div className="absolute w-full text-center" style={{ top: '44%', transform: 'translateY(-50%)' }}>
                    <span className="text-base sm:text-xl md:text-3xl lg:text-4xl text-black font-serif ">
                      {selectedCert.studentName}
                    </span>
                  </div>
                  
                  <div className="absolute w-[85%] sm:w-[80%] left-[7.5%] sm:left-[10%] text-center" style={{ top: '51%' }}>
                    <p className="text-[7px] sm:text-[11px] md:text-[17px] lg:text-[21px] text-black font-sans leading-relaxed">
                      {getParagraphText(selectedCert)}
                    </p>
                  </div>
                  
                  <div className="absolute text-center" style={{ top: '86.5%', left: '52%', transform: 'translate(-50%, -50%)' }}>
                    <span className="text-[7px] sm:text-[10px] md:text-[14px] lg:text-sm text-black font-sans font-bold">
                      {formatDate(selectedCert.issueDate)}
                    </span>
                  </div>
                  
                  <div className="absolute text-right" style={{ top: '5%', right: '5%' }}>
                    <span className="text-[4px] sm:text-[6px] md:text-[7px] lg:text-[14px] text-black font-sans font-bold uppercase">
                      CERTIFICATE NO: {selectedCert.verifyId.replace('CERT-', 'CV-')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-[8px] sm:border-[12px] border-[#a855f7] p-4 sm:p-6 md:p-8 lg:p-12 relative bg-white">
                {/* Corner Ornaments */}
                <div className="absolute top-0 left-0 w-10 h-10 sm:w-16 sm:h-16 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-purple-600" />
                <div className="absolute top-0 right-0 w-10 h-10 sm:w-16 sm:h-16 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-purple-600" />
                <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-16 sm:h-16 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-purple-600" />
                <div className="absolute bottom-0 right-0 w-10 h-10 sm:w-16 sm:h-16 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-purple-600" />

                <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 mb-2 sm:mb-3 flex items-center justify-center">
                  <img src="/assets/logo-codvedha.png" alt="CodVedha Logo" className="w-full h-full object-contain" />
                </div>
                <p className="text-sm sm:text-lg font-bold text-purple-700 font-display tracking-tight mb-1">CodVedha</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold mb-4 sm:mb-6">Master 4.0 Technologies</p>

                <h2 className="text-xl sm:text-3xl md:text-5xl font-display font-black text-slate-900 uppercase st mb-2 sm:mb-4">
                  {selectedCert.type || 'Certificate of Completion'}
                </h2>
                <div className="mx-auto w-24 h-1.5 bg-orange-500 rounded-full mb-4 sm:mb-6" />
                <p className="text-[14px] sm:text-sm text-slate-500 uppercase st font-semibold mb-4 sm:mb-8">This is to certify that</p>
                
                <h3 className="text-2xl sm:text-4xl md:text-5xl text-purple-700 mb-4 sm:mb-8 font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {selectedCert.studentName}
                </h3>
                
                <p className="text-[14px] sm:text-sm text-slate-600 mb-3 sm:mb-4 max-w-lg mx-auto ">
                  has successfully completed all requirements and coursework for the program:
                </p>
                
                <h4 className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">
                  {selectedCert.courseName}
                </h4>
                
                <p className="text-[14px] sm:text-sm font-semibold text-emerald-600 mb-3 sm:mb-4">
                  Final Grade: {selectedCert.grade || 'A'}
                </p>

                {(selectedCert.startDate || selectedCert.durationMonths) && (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-[10px] sm:text-[16px] text-slate-500 font-medium mb-4 sm:mb-8">
                    {selectedCert.startDate && <span>From: {formatDate(selectedCert.startDate)}</span>}
                    {selectedCert.completionDate && <span>To: {formatDate(selectedCert.completionDate)}</span>}
                    {selectedCert.durationMonths && <span>Duration: {selectedCert.durationMonths} Months</span>}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 sm:items-end mt-6 sm:mt-12 pt-4 sm:pt-8 px-2 sm:px-4 md:px-12">
                  <div className="text-center w-full sm:w-48">
                    <div className="border-b border-slate-400 mb-1 sm:mb-2 font-script text-base sm:text-xl text-slate-700 italic">{formatDate(selectedCert.issueDate)}</div>
                    <span className="text-[10px] sm:text-[16px] uppercase font-bold text-slate-500">Date of Issue</span>
                  </div>
                  
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-300 via-purple-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-white">
                    <Award className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                  </div>

                  <div className="text-center w-full sm:w-48">
                    <div className="border-b border-slate-400 mb-1 sm:mb-2 text-base sm:text-xl text-purple-700 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>CodVedha</div>
                    <span className="text-[10px] sm:text-[16px] uppercase font-bold text-slate-500">Authorised Signatory</span>
                  </div>
                </div>

                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-6 text-right">
                  <p className="text-[6px] sm:text-[14px] font-mono text-slate-400">Verify ID: {selectedCert.verifyId.replace('CERT-', 'CV-')}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Issue Certificate Modal - Responsive */}
      <AnimatePresence>
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setIsIssueModalOpen(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 max-h-[95vh] overflow-y-auto modal-content"
          >
            <div className="flex justify-between items-center mb-4 sm:mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-[16px] sm:text-sm text-slate-900 dark:text-white">Issue Certificate</h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-600 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3 sm:space-y-4 text-[14px] sm:text-[16px] font-semibold">
              <div>
                <label className="block text-slate-400 dark:text-slate-300 mb-1">Course</label>
                <select
                  value={issueData.courseId}
                  onChange={(e) => setIssueData(prev => ({ ...prev, courseId: e.target.value, studentId: '' }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-300 mb-1">Student</label>
                <select
                  value={issueData.studentId}
                  onChange={(e) => setIssueData(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                  required
                  disabled={!issueData.courseId}
                >
                  <option value="">Select Student</option>
                  {courseStudents.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-300 mb-1">Certificate Type</label>
                <select
                  value={issueData.type}
                  onChange={(e) => setIssueData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                >
                  <option value="Course Completion">Course Completion</option>
                  <option value="Internship Completion">Internship Completion</option>
                  <option value="Project Completion">Project Completion</option>
                  <option value="Best Performance">Best Performance</option>
                  <option value="All">All Types (4 Certificates)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-400 dark:text-slate-300 mb-1">Start Date (Opt)</label>
                  <input
                    type="date"
                    value={issueData.startDate}
                    onChange={(e) => setIssueData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-2 sm:px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-300 mb-1">End Date (Opt)</label>
                  <input
                    type="date"
                    value={issueData.endDate}
                    onChange={(e) => setIssueData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-2 sm:px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-400 dark:text-slate-300 mb-1">Duration Months</label>
                  <input
                    type="number"
                    value={issueData.durationMonths}
                    onChange={(e) => setIssueData(prev => ({ ...prev, durationMonths: e.target.value }))}
                    placeholder="e.g. 3"
                    className="w-full px-2 sm:px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueData.issueDate}
                    onChange={(e) => setIssueData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full px-2 sm:px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none text-[16px]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-bold rounded-xl transition mt-2 sm:mt-4 text-[16px] sm:text-sm cursor-pointer"
              >
                Issue Certificate
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Verify Certificate Modal - Responsive */}
      <AnimatePresence>
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => { setIsVerifyModalOpen(false); setVerifiedCert(null); setVerifyInput(''); }} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 max-h-[95vh] overflow-y-auto modal-content"
          >
            <div className="flex justify-between items-center mb-4 sm:mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-[16px] sm:text-sm text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> Verify Certificate</h3>
              <button onClick={() => { setIsVerifyModalOpen(false); setVerifiedCert(null); setVerifyInput(''); }} className="text-slate-600 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-3 sm:space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Enter Verify ID (e.g., CV-12345)"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] text-[14px] sm:text-sm"
                  required
                />
                <button
                  type="submit"
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center cursor-pointer"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </form>

            {verifiedCert && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="w-full min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base ">{verifiedCert.studentName}</h4>
                    <span className="text-[10px] sm:text-[14px] bg-emerald-200/50 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full font-bold mt-1 inline-block">Valid Certificate</span>
                    
                    <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-1.5 text-[14px] sm:text-[16px] text-slate-600 dark:text-slate-400">
                      <p><span className="font-semibold text-slate-700 dark:text-slate-300">Type:</span> {verifiedCert.type}</p>
                      <p><span className="font-semibold text-slate-700 dark:text-slate-300">Course:</span> {verifiedCert.courseName}</p>
                      <p><span className="font-semibold text-slate-700 dark:text-slate-300">Issue Date:</span> {formatDate(verifiedCert.completionDate)}</p>
                      <p><span className="font-semibold text-slate-700 dark:text-slate-300">Verify ID:</span> <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{verifiedCert.verifyId.replace('CERT-', 'CV-')}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Certificates;
