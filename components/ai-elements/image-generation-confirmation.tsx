"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenIcon } from "lucide-react";
import { useState } from "react";

type ImageGenerationConfirmationProps = {
  prompt: string;
  onConfirm: (editedPrompt: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
};

export const ImageGenerationConfirmation = ({ 
  prompt, 
  onConfirm, 
  onCancel,
  isGenerating 
}: ImageGenerationConfirmationProps) => {
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  
  return (
    <div className="border rounded-lg p-4 my-2 bg-card max-w-2xl mx-auto">
      <p className="mb-3 font-medium text-lg">Generate this ad?</p>
      
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <PenIcon className="size-3.5" />
          Edit the prompt if needed
        </label>
        <Textarea 
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          disabled={isGenerating}
          className="min-h-[120px] text-sm"
          placeholder="Describe the ad creative you want to generate..."
        />
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={() => onConfirm(editedPrompt)}
          disabled={isGenerating || !editedPrompt.trim()}
          className="flex-1"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isGenerating}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

