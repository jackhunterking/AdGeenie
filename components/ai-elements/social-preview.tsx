"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";
import { ImageIcon, Layers, Eye } from "lucide-react";

type SocialPreviewProps = {
  imageUrl: string;
  originalPrompt: string;
  brandName?: string;
  caption?: string;
  onApprove?: (currentImageUrl: string) => void;
  onRegenerate?: (prompt: string) => Promise<string>;
  onEdit?: (imageUrl: string, editPrompt: string) => Promise<string>;
};

export const SocialPreview = ({
  imageUrl,
  originalPrompt,
  brandName = "Your Brand Name",
  caption = "Your caption text goes here...",
  onApprove,
  onRegenerate,
  onEdit,
}: SocialPreviewProps) => {
  const [activeFormat, setActiveFormat] = useState<"feed" | "story">("feed");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [editError, setEditError] = useState<string | null>(null);

  const handleApplyEdit = async () => {
    if (editPrompt.trim() && onEdit) {
      setIsEditing(true);
      setEditError(null);
      try {
        const newImageUrl = await onEdit(currentImageUrl, editPrompt);
        setCurrentImageUrl(newImageUrl);
        setIsEditMode(false);
        setEditPrompt("");
      } catch (error) {
        console.error('Edit failed:', error);
        setEditError('Failed to edit image. Please try again.');
      } finally {
        setIsEditing(false);
      }
    }
  };

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsRegenerating(true);
      setEditError(null);
      try {
        const newImageUrl = await onRegenerate(originalPrompt);
        setCurrentImageUrl(newImageUrl);
      } catch (error) {
        console.error('Regenerate failed:', error);
        setEditError('Failed to regenerate image. Please try again.');
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  return (
    <div className="my-4 space-y-4">
      {/* Format Toggle - Mobile Optimized */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          <Button
            variant={activeFormat === "feed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFormat("feed")}
            className="px-4"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
            Feed
          </Button>
          <Button
            variant={activeFormat === "story" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFormat("story")}
            className="px-4"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Story
          </Button>
        </div>
      </div>

      {/* Feed Preview */}
      {activeFormat === "feed" && (
        <div className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Feed Post Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{brandName}</p>
                <p className="text-xs text-muted-foreground">Sponsored</p>
              </div>
            </div>

            {/* Image */}
            <div className="aspect-square relative overflow-hidden">
              <img
                src={currentImageUrl}
                alt="Generated ad"
                className="w-full h-full object-cover"
              />
              {/* Loading Overlay */}
              {(isEditing || isRegenerating) && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader size={32} />
                  <span className="text-white text-sm font-medium">
                    {isEditing ? 'Editing image...' : 'Regenerating image...'}
                  </span>
                </div>
              )}
            </div>

            {/* Feed Post Actions */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                {/* Heart/Like icon */}
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {/* Comment icon */}
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {/* Share icon */}
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <p className="text-sm">
                <span className="font-semibold">1,234 likes</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">{brandName}</span> {caption}
              </p>
              <p className="text-xs text-muted-foreground">View all 45 comments</p>
            </div>
          </div>
        </div>
      )}

      {/* Story Preview */}
      {activeFormat === "story" && (
        <div className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="aspect-[9/16] rounded-2xl border-2 border-border bg-card overflow-hidden relative">
            {/* Story Background with Generated Image */}
            <div className="absolute inset-0">
              <img
                src={currentImageUrl}
                alt="Generated ad"
                className="w-full h-full object-cover"
              />
              {/* Overlay for text readability */}
              <div className="absolute inset-0 bg-black/20" />
              {/* Loading Overlay */}
              {(isEditing || isRegenerating) && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-20">
                  <Loader size={32} />
                  <span className="text-white text-sm font-medium">
                    {isEditing ? 'Editing image...' : 'Regenerating image...'}
                  </span>
                </div>
              )}
            </div>

            {/* Story Header */}
            <div className="relative z-10 p-4">
              <div className="h-1 bg-white/30 rounded-full mb-4">
                <div className="h-full w-1/3 bg-white rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white" />
                <p className="text-white text-sm font-semibold drop-shadow-lg">{brandName}</p>
                <p className="text-white/90 text-xs drop-shadow-lg">2h</p>
              </div>
            </div>

            {/* Story CTA */}
            <div className="absolute bottom-8 left-0 right-0 px-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full py-3 px-6 text-center">
                <p className="text-white font-semibold text-sm drop-shadow-lg">Learn More</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Input - Shows below the preview */}
      {isEditMode && (
        <div className="px-4 max-w-md mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="text-sm font-medium block">
            Describe your changes:
          </label>
          <textarea 
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="e.g., Make the colors warmer, add text at the top, change background to blue..."
            className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            autoFocus
            disabled={isEditing}
          />
          {editError && (
            <p className="text-sm text-destructive">{editError}</p>
          )}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleApplyEdit}
              disabled={!editPrompt.trim() || isEditing}
              className="flex-1"
            >
              {isEditing ? (
                <span className="flex items-center gap-2">
                  <Loader size={14} />
                  Applying...
                </span>
              ) : (
                'Apply Changes'
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setIsEditMode(false);
                setEditPrompt("");
                setEditError(null);
              }}
              disabled={isEditing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons - 3 buttons only */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center px-4 max-w-md mx-auto">
        <Button 
          onClick={() => onApprove?.(currentImageUrl)}
          className="flex-1"
          size="sm"
          disabled={isEditMode || isEditing || isRegenerating}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Add to Preview
        </Button>
        <Button 
          onClick={() => setIsEditMode(!isEditMode)}
          variant={isEditMode ? "default" : "outline"}
          className="flex-1"
          size="sm"
          disabled={isEditing || isRegenerating}
        >
          ✎ {isEditMode ? "Editing..." : "Edit"}
        </Button>
        <Button 
          onClick={handleRegenerate}
          variant="outline"
          className="flex-1"
          size="sm"
          disabled={isEditMode || isEditing || isRegenerating}
        >
          {isRegenerating ? (
            <span className="flex items-center gap-2">
              <Loader size={14} />
              Regenerating...
            </span>
          ) : (
            '↻ Regenerate'
          )}
        </Button>
      </div>
    </div>
  );
};

