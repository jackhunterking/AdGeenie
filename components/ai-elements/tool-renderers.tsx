"use client";

/**
 * Feature: Tool Result Renderers
 * Purpose: Centralize UI rendering for tool results in chat
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 */

import { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";
import { AdMockup } from "@/components/ad-mockup";

export function deriveEditDescription(inputPrompt?: string): string {
  const p = (inputPrompt || "").trim();
  const m = p.match(/make (?:the )?car\s+(.+)/i);
  if (m && m[1]) {
    const value = m[1].replace(/\.$/, "");
    return `The car has been changed to ${value}. Here's the updated image:`;
  }
  return `Here\'s the updated image:`;
}

export function renderEditImageResult(opts: {
  callId: string;
  keyId?: string;
  input: { imageUrl?: string; variationIndex?: number; prompt?: string };
  output: { editedImageUrl?: string; success?: boolean; error?: string };
  isSubmitting: boolean;
}): JSX.Element {
  const { callId, keyId, input, output } = opts;
  const desc = deriveEditDescription(input?.prompt);

  return (
    <Fragment key={keyId || callId}>
      <div key={(keyId || callId) + "-card"} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Image updated on canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check the ad variations above to see your edit</p>
          </div>
        </div>
      </div>
      <p className="text-base font-medium mb-2">{desc}</p>
      {output.editedImageUrl && (
        <div className="max-w-md mx-auto my-2">
          <AdMockup format="feed" imageUrl={output.editedImageUrl} />
        </div>
      )}
    </Fragment>
  );
}

export function renderRegenerateImageResult(opts: {
  callId: string;
  keyId?: string;
  output: { imageUrl?: string; success?: boolean; variationIndex?: number };
}): JSX.Element {
  const { callId, keyId, output } = opts;
  return (
    <Fragment key={keyId || callId}>
      <div key={(keyId || callId) + "-card"} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Variation regenerated on canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check the ad variations above to see the new version</p>
          </div>
        </div>
      </div>
      <p className="text-base font-medium mb-2">Here\'s the updated image:</p>
      {output.imageUrl && (
        <div className="max-w-md mx-auto my-2">
          <AdMockup format="feed" imageUrl={output.imageUrl} />
        </div>
      )}
    </Fragment>
  );
}


