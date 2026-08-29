"use client";

import React, { useState, useEffect } from 'react';
import { useLMS } from '@/context/LMSContext';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Moon, Sun, User, Camera, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Avatar } from '@/components/common/Avatar';

export const Settings = () => {
  const { theme, toggleTheme, user, activeRole, refreshUser } = useLMS();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const router = useRouter();
  const routeBase = activeRole === 'faculty' ? '/teacher/settings' : `/${activeRole}/settings`;

  const [activeTab, setActiveTab] = useState('general');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Sync tab with URL queries ?tab=general, ?tab=theme, etc.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const tab = params.get('tab');
    if (tab && ['general', 'theme', 'notifications'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams.toString()]);

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset, watch, formState: { errors: profileErrors } } = useForm({
    defaultValues: {
      name: user ? user.name : '',
      email: user ? user.email : '',
      password: '',
      confirmPassword: '',
    }
  });

  const watchPassword = watch('password', '');

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
      });
      setAvatarUrl(user.avatar || null);
      setPreviewUrl(null);
    }
  }, [user, reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show temporary local object URL preview instantly
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setUploadingAvatar(true);
    try {
      const { uploadFileToS3 } = await import('@/lib/upload');
      const { url } = await uploadFileToS3(file, 'avatars');
      setAvatarUrl(url);
      toast.success('Display picture uploaded! Click "Save Profile Details" below to apply.');
    } catch (err: any) {
      toast.error('Failed to upload display picture');
      setPreviewUrl(null);
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onProfileSubmit = async (data: any) => {
    if (!user) return;
    if (data.password && data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const payload: any = { name: data.name, email: data.email, avatar: avatarUrl };
      if (data.password && data.password.trim() !== '') {
        payload.password = data.password;
      }
      await api.put(`/users/${user.id}`, payload);
      await refreshUser();
      reset({ name: data.name, email: data.email, password: '', confirmPassword: '' });
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-[#a855f7]" />
          System Settings
        </h1>
        <p className="text-[16px] text-slate-500 dark:text-slate-300 mt-0.5">
          Configure profile structures, toggle themes, and select notification protocols.
        </p>
      </div>

      {/* Settings Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Nav Tabs */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pr-0 lg:pr-6 text-[16px] font-semibold ">
          {[
            { id: 'general', label: 'My Profile Details', icon: User },
            { id: 'theme', label: 'System Theme Mode', icon: Moon },
            { id: 'notifications', label: 'System Alert Syncs', icon: Bell }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(`${routeBase}?tab=${tab.id}`)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition w-full whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#a855f7] text-slate-950 shadow-md font-semibold'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings pane */}
        <div className="lg:col-span-3 bg-white dark:bg-[#1E293B] border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-3xl shadow-sm">
          
          {/* 1. General Profile Forms */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#a855f7]" /> Profile Configuration
              </h3>
              
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4 text-[16px] font-semibold">
                {/* Avatar Upload Selection */}
                <div className="flex items-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative group cursor-pointer w-20 h-20 rounded-full overflow-hidden border-2 border-[#a855f7] shrink-0">
                    {uploadingAvatar ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm z-10">
                        <Loader2 className="w-6 h-6 text-[#a855f7] animate-spin" />
                      </div>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition duration-200 z-10 cursor-pointer text-white">
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px] font-semibold mt-1">Change DP</span>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    )}
                    <Avatar src={previewUrl || avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-semibold text-sm">Display Picture</h4>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Upload a premium display image to personalize your LMS dashboard profile.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-450 dark:text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      {...registerProfile('name')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-450 dark:text-slate-300 mb-1">Administrative Email</label>
                    <input
                      type="email"
                      {...registerProfile('email')}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-slate-450 dark:text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      {...registerProfile('password')}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-450 dark:text-slate-300 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      {...registerProfile('confirmPassword')}
                      placeholder="••••••••"
                      className={`w-full px-3 py-2 border bg-slate-50 dark:bg-slate-900 rounded-lg focus:outline-none text-slate-900 dark:text-white ${
                        watchPassword ? 'border-purple-400' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    />
                    {profileErrors.confirmPassword && (
                      <p className="text-red-500 text-[13px] mt-1">{(profileErrors.confirmPassword as any).message}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#a855f7] hover:bg-purple-400 text-slate-950 font-semibold rounded-xl transition"
                >
                  Save Profile Details
                </button>
              </form>
            </div>
          )}

          {/* 2. Theme Preferences */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-[#a855f7]" /> Appearance Settings
              </h3>
              <p className="text-[16px] text-slate-600 dark:text-slate-200">
                Select your preferred interface display. Themes automatically update sidebar nodes, charting, modules, and popups.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <button
                  onClick={() => { if (theme === 'dark') toggleTheme(); }}
                  className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition cursor-pointer ${
                    theme === 'light'
                      ? 'border-[#a855f7] bg-purple-400/5 text-slate-950 font-black'
                      : 'border-slate-800 text-slate-600 dark:text-slate-200 '
                  }`}
                >
                  <Sun className="w-8 h-8 text-[#a855f7]" />
                  <span className="text-[16px]">Light Theme</span>
                </button>
                
                <button
                  onClick={() => { if (theme === 'light') toggleTheme(); }}
                  className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#a855f7] bg-purple-400/5 text-[#a855f7] font-black'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Moon className="w-8 h-8 text-sky-400" />
                  <span className="text-[16px]">Dark Theme</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Notification Configurations */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#a855f7]" /> Notification Logs & Syncs
              </h3>
              
              <div className="space-y-4 pt-2 text-[16px] font-semibold text-slate-600 dark:text-slate-350">
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800 rounded-2xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#a855f7] focus:ring-0 bg-white dark:bg-slate-900" />
                  <div>
                    <p className="font-semibold text-slate-850 dark:text-slate-200">System Activity Toasts</p>
                    <p className="text-[14px] text-slate-600 font-medium mt-0.5">Show overlay alerts when materials are uploaded, graded, or submitted.</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800 rounded-2xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#a855f7] focus:ring-0 bg-white dark:bg-slate-900" />
                  <div>
                    <p className="font-semibold text-slate-850 dark:text-slate-200">Email Digest Digests</p>
                    <p className="text-[14px] text-slate-600 font-medium mt-0.5">Receive weekly calendar alerts outlining course schedules and pending assignment deadlines.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
