/**
 * Feature: Image Edit Progress Loader
 * Purpose: Animated step-by-step loader for image editing operations
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/components/loader
 */

"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface Step {
  id: number;
  label: string;
  duration: number; // milliseconds until this step completes
}

interface ImageEditProgressLoaderProps {
  type?: "edit" | "regenerate";
}

export function ImageEditProgressLoader({ type = "edit" }: ImageEditProgressLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Define steps based on operation type
  const steps: Step[] = type === "edit" 
    ? [
        { id: 0, label: "Analyzing image", duration: 1500 },
        { id: 1, label: "Applying changes", duration: 3500 },
        { id: 2, label: "Finalizing", duration: Infinity },
      ]
    : [
        { id: 0, label: "Generating concept", duration: 1500 },
        { id: 1, label: "Creating variations", duration: 3500 },
        { id: 2, label: "Finalizing", duration: Infinity },
      ];

  // Auto-advance through steps based on elapsed time
  useEffect(() => {
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // Find which step we should be on based on elapsed time
      for (let i = steps.length - 1; i >= 0; i--) {
        if (elapsed >= steps[i].duration) {
          setCurrentStep(i);
          break;
        } else if (i === 0 || elapsed >= steps[i - 1].duration) {
          setCurrentStep(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Calculate overall progress percentage (0-100)
  const totalDuration = 3500; // Expected total time
  const progress = Math.min((elapsedTime / totalDuration) * 100, 95); // Cap at 95% until complete

  return (
    <div className="flex flex-col gap-4 p-6 my-2 border rounded-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/50 max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const isComplete = currentStep > index;
          const isCurrent = currentStep === index;
          const isPending = currentStep < index;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isCurrent ? "scale-105" : "scale-100"
              }`}
            >
              {/* Step Icon */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  isComplete
                    ? "bg-green-500 border-green-500 scale-100"
                    : isCurrent
                    ? "bg-blue-500 border-blue-500 animate-pulse scale-110"
                    : "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 scale-95"
                }`}
              >
                {isComplete ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isComplete
                    ? "text-green-600 dark:text-green-400"
                    : isCurrent
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-500"
                }`}
              >
                {step.label}
                {isCurrent && (
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Add shimmer animation to globals.css or inline styles
// This creates a shimmering effect on the progress bar

