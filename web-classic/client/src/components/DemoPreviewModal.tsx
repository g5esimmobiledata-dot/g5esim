'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Types/Interfaces
export interface DemoShowcaseCardProps {
  logo: string | null;
  title: string;
  tagline: string;
  themeColor?: string;
  docsLink?: string;
  infoNote?: React.ReactNode;
  demoUrl: string;
  applicationdemoUrl: string;
  superAdmin?: { email: string; password: string };
  demoAdmin?: { email: string; password: string };
  applicationdemoAdmin?: { email: string; password: string };
  tenant?: { email: string; password: string };
  buttonLabel?: string;
  buttonLink?: string;
  youtubeLink?: string; // ✅ YouTube link prop added
  bottomHelp?: string;
  supportEmail?: string;
}

export interface DemoPreviewModalProps extends DemoShowcaseCardProps {
  screenshot: string;
  blurIntensity?: 'sm' | 'md' | 'lg' | 'xl';
  overlayOpacity?: number;
}

const DemoPreviewModal: React.FC<DemoPreviewModalProps> = ({
  screenshot,
  blurIntensity = 'lg',
  overlayOpacity = 90,
  logo,
  title,
  tagline,
  themeColor = '#4F46E5',
  docsLink,
  infoNote,
  demoUrl,
  superAdmin,
  demoAdmin,
  tenant,
  buttonLabel = 'Visit Demo Now',
  buttonLink,
  youtubeLink, // ✅ YouTube link destructured
  bottomHelp,
  supportEmail,
  applicationdemoUrl,
  applicationdemoAdmin,
}) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden pt-5">
      {/* Background Screenshot */}
      <img
        src={screenshot}
        alt="Demo background"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-top select-none"
        draggable="false"
      />

      {/* Blur + Overlay */}
      <div className={`absolute inset-0 z-10 backdrop-blur-${blurIntensity}`} />

      {/* Animated Card */}
      <motion.div
        className="relative z-20 flex min-h-screen w-full items-center justify-center px-4"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Card Content */}
        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header with Gradient */}
          <div className="flex flex-col items-center justify-center py-7 bg-primary-gradient">
            {logo && (
              <img
                src={logo}
                className="mb-2 h-12  rounded border object-contain p-2 "
                alt="Product Logo"
              />
            )}
            <h1 className="text-center text-2xl font-bold text-white">{title}</h1>
            <div className="text-center text-sm text-white opacity-90">{tagline}</div>
          </div>

          {/* Info Note */}
          <div className="p-6">
            {infoNote && (
              <div className="mb-4 rounded-lg bg-indigo-50 p-4 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="mt-0.5 mr-2 text-indigo-600">💡</span>
                  <span>{infoNote}</span>
                </div>
              </div>
            )}

            {/* Demo Credentials Box */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px]">
              <div className="mb-3">
                <span className="font-semibold">Demo URL: </span>
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  {demoUrl}
                </a>
              </div>

              {/* Demo Admin Account */}
              {demoAdmin && (
                <div className="mb-3 pb-3 border-b border-slate-200">
                  <span className="block font-semibold text-gray-800 mb-1">
                    👤 Demo Admin Account:
                  </span>
                  <span className="block text-gray-700">
                    Email:{' '}
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {demoAdmin.email}
                    </span>
                  </span>
                  <span className="block text-gray-700 mt-1">
                    Password:{' '}
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {demoAdmin.password}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px]">
              <div className="mb-3">
                <span className="font-semibold">App URL: </span>
                <a
                  href={applicationdemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  {applicationdemoUrl}
                </a>
              </div>

              {/* Demo Admin Account */}
              {applicationdemoAdmin && (
                <div className="mb-3 pb-3 border-b border-slate-200">
                  <span className="block text-gray-800 mb-2">
                    Sign up with your email to try the app.
                  </span>
                  <span className="block font-semibold text-gray-800 mb-1">
                    👤 Application Demo Login:
                  </span>
                  <span className="block text-gray-700">
                    Email:{' '}
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {applicationdemoAdmin.email}
                    </span>
                  </span>
                  <span className="block text-gray-700 mt-1">
                    Password:{' '}
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {applicationdemoAdmin.password}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* CTA Button - Visit Demo */}
            {buttonLink && (
              <a
                href={buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg py-3 text-center text-base font-semibold text-white transition hover:opacity-90 bg-primary-gradient"
              >
                {buttonLabel}
              </a>
            )}

            {/* ✅ YouTube Tutorial Button */}
            {youtubeLink && (
              <a
                href={youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 flex items-center justify-center gap-3 rounded-lg py-3 px-4 text-center text-base font-semibold transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg
                  className="w-6 h-6 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span>Watch Tutorial Videos</span>
              </a>
            )}

            {/* Bottom Help Text */}
            <div className="mt-2 text-center text-xs text-gray-500">
              {bottomHelp ||
                'This demo environment is reset periodically. All changes made during your testing will not affect production data.'}
            </div>
          </div>

          {/* Support Email */}
          {supportEmail && (
            <div className="border-t border-gray-100 pt-2 pb-4 text-center text-sm">
              For support or questions:{' '}
              <a href={`mailto:${supportEmail}`} className="text-indigo-600 underline">
                {supportEmail}
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DemoPreviewModal;
