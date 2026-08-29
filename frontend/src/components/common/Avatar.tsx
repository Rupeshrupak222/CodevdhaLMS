import React, { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User',
  className = 'w-9 h-9 rounded-full object-cover',
  fallbackClassName = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (src && src.trim() !== '' && !imgError) {
    const isRelative = !src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:');
    const baseUrl = API_BASE_URL.replace('/api', '');
    const finalSrc = isRelative ? `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}` : src;

    return <img src={finalSrc} alt={alt} className={className} onError={() => setImgError(true)} />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#c9c9c9] dark:bg-slate-700 text-white overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 ${className} ${fallbackClassName}`}
    >
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M12 14.5c-4.5 0-8.2 3.1-8.9 7.2a0.5 0.5 0 00.5.6h16.8a0.5 0.5 0 00.5-.6c-.7-4.1-4.4-7.2-8.9-7.2z" />
      </svg>
    </div>
  );
};
