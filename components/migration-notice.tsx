/**
 * Feature: Migration Notice Component
 * Purpose: Inform users about backend architecture upgrade
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MigrationNoticeProps {
  // Optional: auto-dismiss after a certain time
  autoDismissAfter?: number; // milliseconds
}

export function MigrationNotice({ autoDismissAfter }: MigrationNoticeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the notice
    const dismissed = localStorage.getItem('migration-notice-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Show notice after a short delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    // Auto-dismiss if configured
    if (autoDismissAfter) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, autoDismissAfter);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    }

    return () => clearTimeout(showTimer);
  }, [autoDismissAfter]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('migration-notice-dismissed', 'true');
    
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setIsDismissed(true);
    }, 300);
  };

  const handleLearnMore = () => {
    // Open documentation in new tab
    window.open('/BACKEND_RESTRUCTURE_PROGRESS.md', '_blank');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="relative overflow-hidden rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 p-4 shadow-lg backdrop-blur-sm">
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl" />
        
        {/* Content */}
        <div className="relative">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-1.5">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                System Upgrade Complete!
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              We\'ve upgraded our backend architecture for better performance and scalability.
            </p>
            
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                <span>10x faster message loading</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                <span>AI SDK v5 Core integration</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                <span>Enhanced security & scalability</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleDismiss}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
            >
              Got it!
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLearnMore}
              className="flex-1"
            >
              Learn More
            </Button>
          </div>

          {/* Footer note */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Your existing campaigns and data are safe and preserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// Compact version for header/banner
export function MigrationBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('migration-banner-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('migration-banner-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="border-b border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-1.5">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground sm:text-sm">
              System Upgraded! 
              <span className="ml-2 hidden text-muted-foreground sm:inline">
                Faster performance, better scalability.
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

