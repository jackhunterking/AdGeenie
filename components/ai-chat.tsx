"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState, useEffect, useMemo, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { ThumbsUpIcon, ThumbsDownIcon, CopyIcon, Sparkles, ChevronRight, MapPin, CheckCircle2, XCircle } from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { Actions, Action } from "@/components/ai-elements/actions";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Button } from "@/components/ui/button";
import { generateImage, editImage } from "@/server/images";
import { SocialPreview } from "@/components/ai-elements/social-preview";
import { ImageGenerationConfirmation } from "@/components/ai-elements/image-generation-confirmation";
import { FormSelectionUI } from "@/components/ai-elements/form-selection-ui";
import { useAdPreview } from "@/lib/context/ad-preview-context";
import { searchLocations, getLocationBoundary } from "@/app/actions/geocoding";
import { useGoal } from "@/lib/context/goal-context";
import { useLocation } from "@/lib/context/location-context";
import { useAudience } from "@/lib/context/audience-context";
import { AdReferenceCard } from "@/components/ad-reference-card-example";
import { AudienceContextCard } from "@/components/audience-context-card";
import { useRef } from "react";

// Type definitions
interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  parts: MessagePart[];
  [key: string]: unknown;
}

interface LocationInput {
  name: string;
  coordinates?: [number, number];
  radius?: number;
}

interface LocationToolInput {
  locations: LocationInput[];
}

interface LocationOutput {
  name: string;
  type: string;
  mode?: string;
  radius?: number;
}

interface AudienceToolInput {
  description: string;
  interests?: string;
  demographics?: string;
}

interface GoalToolInput {
  goalType: string;
  conversionMethod: string;
}

interface CustomEvent<T = unknown> extends Event {
  detail: T;
}

interface AudienceEventDetail {
  adContent?: { headline?: string; body?: string };
  locations?: Array<{ name: string }>;
}

interface AudienceContext {
  demographics?: string;
  interests?: string;
  currentAudience?: {
    demographics?: string;
    interests?: string;
  };
}

interface ToolResult {
  tool: string;
  toolCallId: string;
  output: string | undefined;
  errorText?: string;
}

interface AIChatProps {
  initialPrompt?: string | null;
}

const AIChat = ({ initialPrompt }: AIChatProps = {}) => {
  const [input, setInput] = useState("");
  const [model] = useState<string>("openai/gpt-4o");
  const { setAdContent } = useAdPreview();
  const { goalState, setFormData, setError, resetGoal } = useGoal();
  const { locationState, addLocations, updateStatus: updateLocationStatus } = useLocation();
  const { setAudienceTargeting, updateStatus: updateAudienceStatus } = useAudience();
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [editingImages, setEditingImages] = useState<Set<string>>(new Set());
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [processingLocations, setProcessingLocations] = useState<Set<string>>(new Set());
  const [pendingLocationCalls, setPendingLocationCalls] = useState<Array<{ toolCallId: string; input: LocationToolInput }>>([]);
  const [adEditReference, setAdEditReference] = useState<AudienceContext | null>(null);
  const [audienceContext, setAudienceContext] = useState<AudienceContext | null>(null);
  const [customPlaceholder, setCustomPlaceholder] = useState("Type your message...");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          model: model,
        },
      }),
    [model]
  );
  
  const { messages, sendMessage, addToolResult, status, stop } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const handleSubmit = (message: PromptInputMessage, e: React.FormEvent) => {
    e.preventDefault();
    
    // If streaming, stop instead of sending
    if (status === 'streaming') {
      stop();
      return;
    }
    
    // Check if we have text or files
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    
    if (!(hasText || hasAttachments)) {
      return;
    }
    
    // Send the message with files
    sendMessage({ 
      text: message.text || 'Sent with attachments',
      files: message.files 
    });
    setInput("");
    
    // Clear the ad edit reference after sending the first edit message
    if (adEditReference) {
      setTimeout(() => {
        setAdEditReference(null);
        setCustomPlaceholder("Type your message...");
      }, 1000);
    }
    
    // Clear the audience context after sending the first message
    if (audienceContext) {
      setTimeout(() => {
        setAudienceContext(null);
        setCustomPlaceholder("Type your message...");
      }, 1000);
    }
  };

  const handleLike = (messageId: string) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if present
        setDislikedMessages(prevDisliked => {
          const newDisliked = new Set(prevDisliked);
          newDisliked.delete(messageId);
          return newDisliked;
        });
      }
      return newSet;
    });
  };

  const handleDislike = (messageId: string) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if present
        setLikedMessages(prevLiked => {
          const newLiked = new Set(prevLiked);
          newLiked.delete(messageId);
          return newLiked;
        });
      }
      return newSet;
    });
  };

  const handleCopy = (message: ChatMessage) => {
    const textParts = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    navigator.clipboard.writeText(textParts);
  };

  const handleImageGeneration = async (toolCallId: string, prompt: string, confirmed: boolean) => {
    if (confirmed) {
      // Add to loading state
      setGeneratingImages(prev => new Set(prev).add(toolCallId));
      
      try {
        const imageUrl = await generateImage(prompt);
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: imageUrl,
        });
      } catch {
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: undefined,
          errorText: 'Failed to generate image',
        } as ToolResult);
      } finally {
        // Remove from loading state
        setGeneratingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(toolCallId);
          return newSet;
        });
      }
    } else {
      addToolResult({
        tool: 'generateImage',
        toolCallId,
        output: undefined,
        errorText: 'Image generation cancelled by user',
      } as ToolResult);
    }
  };

  const handleImageEdit = async (toolCallId: string, imageUrl: string, prompt: string, confirmed: boolean) => {
    if (confirmed) {
      // Add to loading state
      setEditingImages(prev => new Set(prev).add(toolCallId));
      
      try {
        const editedImageUrl = await editImage(imageUrl, prompt);
        addToolResult({
          tool: 'editImage',
          toolCallId,
          output: editedImageUrl,
        });
      } catch {
        addToolResult({
          tool: 'editImage',
          toolCallId,
          output: undefined,
          errorText: 'Failed to edit image',
        } as ToolResult);
      } finally {
        // Remove from loading state
        setEditingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(toolCallId);
          return newSet;
        });
      }
    } else {
      addToolResult({
        tool: 'editImage',
        toolCallId,
        output: undefined,
        errorText: 'Image editing cancelled by user',
      } as ToolResult);
    }
  };

  // Process pending location calls in useEffect (not during render)
  useEffect(() => {
    if (pendingLocationCalls.length === 0) return;

    const processCalls = async () => {
      for (const { toolCallId, input } of pendingLocationCalls) {
        if (processingLocations.has(toolCallId)) continue;

        setProcessingLocations(prev => new Set(prev).add(toolCallId));

        try {
          // Geocode locations and fetch boundary data from OpenStreetMap
          const locationsWithCoords = await Promise.all(
            input.locations.map(async (loc) => {
              let coordinates = loc.coordinates;
              let bbox = null;
              let geometry = null;
              
              // Get coordinates via geocoding if not provided
              if (!coordinates) {
                const results = await searchLocations(loc.name);
                if (results.length > 0) {
                  coordinates = results[0].center;
                  bbox = results[0].bbox;
                } else {
                  // Geocoding failed - return null to filter out later
                  console.error(`Failed to geocode location: ${loc.name}`);
                  return null;
                }
              }
              
              // Validate coordinates are valid numbers
              if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2 || 
                  typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' ||
                  isNaN(coordinates[0]) || isNaN(coordinates[1])) {
                console.error(`Invalid coordinates for location: ${loc.name}`, coordinates);
                return null;
              }
              
              // For non-radius types, fetch actual boundary geometry from OpenStreetMap
              if (loc.type !== "radius" && coordinates) {
                const boundaryData = await getLocationBoundary(coordinates, loc.name, loc.type);
                if (boundaryData) {
                  geometry = boundaryData.geometry;
                  // Update bbox with better boundary data if available
                  if (boundaryData.bbox) {
                    bbox = boundaryData.bbox;
                  }
                }
              }
              
              return {
                id: `${Date.now()}-${Math.random()}`,
                name: loc.name,
                coordinates,
                radius: loc.radius || 30,
                type: loc.type,
                mode: loc.mode,
                bbox,
                geometry,
              };
            })
          );
          
          // Filter out any null values (failed geocoding)
          const validLocations = locationsWithCoords.filter(loc => loc !== null);
          
          // Check if any locations were successfully geocoded
          if (validLocations.length === 0) {
            throw new Error('Failed to geocode any locations. Please check the location names and try again.');
          }

          // Update location context with full data
          updateLocationStatus("setup-in-progress");
          addLocations(validLocations);
          
          // Send FULL data (with geometry) to the map
          window.dispatchEvent(new CustomEvent('locationsUpdated', { 
            detail: validLocations 
          }));

          // Switch to location tab
          window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'location' }));

          // Send MINIMAL data to AI conversation (no geometry - it's too large!)
          addToolResult({
            tool: 'locationTargeting',
            toolCallId,
            output: {
              locations: validLocations.map(loc => ({
                id: loc.id,
                name: loc.name,
                coordinates: loc.coordinates,
                radius: loc.radius,
                type: loc.type,
                mode: loc.mode,
                // Exclude geometry and bbox from conversation - they can be massive
              })),
              explanation: input.explanation,
              failedCount: input.locations.length - validLocations.length,
            },
          });
        } catch {
          addToolResult({
            tool: 'locationTargeting',
            toolCallId,
            output: undefined,
            errorText: 'Failed to set location targeting',
          } as ToolResult);
        } finally {
          setProcessingLocations(prev => {
            const newSet = new Set(prev);
            newSet.delete(toolCallId);
            return newSet;
          });
        }
      }

      // Clear pending calls after processing
      setPendingLocationCalls([]);
    };

    processCalls();
  }, [pendingLocationCalls, processingLocations, addLocations, updateLocationStatus, addToolResult]);

  // Listen for goal setup trigger from canvas
  useEffect(() => {
    const handleGoalSetup = (event: CustomEvent<{ goalType: string }>) => {
      const { goalType } = event.detail;
      
      // Send a message to AI to start goal setup
      sendMessage({
        text: `I want to set up ${goalType} goal with instant forms`,
      });
    };

    window.addEventListener('triggerGoalSetup', handleGoalSetup);
    return () => window.removeEventListener('triggerGoalSetup', handleGoalSetup);
  }, [sendMessage]);

  // Listen for location setup trigger from canvas
  useEffect(() => {
    const handleLocationSetup = () => {
      const hasExistingLocations = locationState.locations.length > 0;
      
      // Send appropriate message based on whether locations already exist
      sendMessage({
        text: hasExistingLocations 
          ? `Add more locations to my current targeting setup`
          : `Help me set up location targeting for my ad`,
      });
    };

    window.addEventListener('triggerLocationSetup', handleLocationSetup);
    return () => window.removeEventListener('triggerLocationSetup', handleLocationSetup);
  }, [sendMessage, locationState.locations.length]);

  // Listen for audience setup trigger from canvas
  useEffect(() => {
    const handleAudienceSetup = () => {
      // Send a message to AI to start audience targeting
      sendMessage({
        text: `Set up AI Advantage+ audience targeting for my ad`,
      });
    };

    window.addEventListener('triggerAudienceSetup', handleAudienceSetup);
    return () => window.removeEventListener('triggerAudienceSetup', handleAudienceSetup);
  }, [sendMessage]);

  // Listen for audience generation (when user clicks "Find My Audience with AI")
  useEffect(() => {
    const handleAudienceGeneration = (event: CustomEvent<AudienceEventDetail>) => {
      const { adContent, locations } = event.detail;
      
      // Build comprehensive context message
      // NOTE: We do NOT include goal here - goal comes AFTER finding the audience
      // The correct flow is: Creative → Copy → Location → Audience → Goal
      const contextParts = [];
      
      if (adContent) {
        if (adContent.headline) {
          contextParts.push(`Ad headline: "${adContent.headline}"`);
        }
        if (adContent.body) {
          contextParts.push(`Ad message: "${adContent.body}"`);
        }
      }
      
      if (locations && locations.length > 0) {
        const locationNames = locations.map((l) => l.name).join(', ');
        contextParts.push(`Targeting locations: ${locationNames}`);
      }
      
      const fullContext = contextParts.length > 0 
        ? contextParts.join('. ') 
        : 'No specific context provided yet';
      
      // Send comprehensive message to AI
      sendMessage({
        text: `Based on my campaign details, generate an AI Advantage+ audience profile that makes perfect sense for this campaign. 

Campaign Context: ${fullContext}

Please analyze this information and create a detailed, natural language audience targeting strategy. Include:
1. A simple description of who will see the ad
2. Relevant interests based on the campaign
3. Appropriate demographics (age, gender if relevant)

Make it conversational and easy to understand for a business owner.`,
      });
    };

    window.addEventListener('generateAudience', handleAudienceGeneration);
    return () => window.removeEventListener('generateAudience', handleAudienceGeneration);
  }, [sendMessage]);

  // Listen for audience chat opening (when user clicks "Change This")
  useEffect(() => {
    const handleOpenAudienceChat = (event: CustomEvent<AudienceContext>) => {
      const context = event.detail;
      // Store the audience context for display
      setAudienceContext(context.currentAudience);
      
      // Set placeholder with natural language
      setCustomPlaceholder("What would you like to change about who sees this?");
      
      // Focus chat input
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      
      // Optionally send a message to AI about updating audience
      sendMessage({
        text: `I want to update who sees my ad. Currently targeting: ${context.currentAudience?.demographics || 'general audience'}${context.currentAudience?.interests ? `, ${context.currentAudience.interests}` : ''}`,
      });
    };

    window.addEventListener('openAudienceChat', handleOpenAudienceChat);
    return () => window.removeEventListener('openAudienceChat', handleOpenAudienceChat);
  }, [sendMessage]);

  // Listen for ad edit events from preview panel
  useEffect(() => {
    const handleOpenEditInChat = (event: CustomEvent<AudienceContext>) => {
      const context = event.detail;
      
      // Route to appropriate reference based on type
      if (context.type === 'audience_reference') {
        // Store as audience context
        setAudienceContext(context.content);
        setCustomPlaceholder("Describe how you'd like to change the audience targeting...");
      } else {
        // Store as ad edit reference (for ad copy/creative)
        setAdEditReference(context);
        setCustomPlaceholder(`Describe the changes you'd like to make to ${context.variationTitle}...`);
      }
      
      // Focus chat input
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    };

    const handleSendMessageToAI = (event: CustomEvent<{ message: string; reference?: { action?: string } }>) => {
      const { message, reference } = event.detail;
      
      // Only used for other purposes, not for edit button
      // Edit button only uses openEditInChat event
      if (message && !reference?.action) {
        sendMessage({ text: message });
      }
    };

    window.addEventListener('openEditInChat', handleOpenEditInChat);
    window.addEventListener('sendMessageToAI', handleSendMessageToAI);
    
    return () => {
      window.removeEventListener('openEditInChat', handleOpenEditInChat);
      window.removeEventListener('sendMessageToAI', handleSendMessageToAI);
    };
  }, [sendMessage]);

  // Listen for step navigation to clear editing references
  useEffect(() => {
    const handleStepNavigation = () => {
      // Clear ad edit reference when navigating between steps
      if (adEditReference) {
        setAdEditReference(null);
        setCustomPlaceholder("Type your message...");
      }
      
      // Clear audience context when navigating between steps
      if (audienceContext) {
        setAudienceContext(null);
        setCustomPlaceholder("Type your message...");
      }
    };

    window.addEventListener('stepNavigation', handleStepNavigation);
    
    return () => {
      window.removeEventListener('stepNavigation', handleStepNavigation);
    };
  }, [adEditReference, audienceContext]);

  // Auto-submit initial prompt if provided (from email verification flow)
  useEffect(() => {
    if (initialPrompt && !hasAutoSubmitted && status !== 'streaming') {
      setHasAutoSubmitted(true);
      // Small delay to ensure everything is ready
      setTimeout(() => {
        sendMessage({ text: initialPrompt });
      }, 500);
    }
  }, [initialPrompt, hasAutoSubmitted, status, sendMessage]);

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <Conversation>
        <ConversationContent>
            {/* Show ad edit reference card if active */}
            {adEditReference && (
              <AdReferenceCard 
                reference={adEditReference}
                onDismiss={() => {
                  setAdEditReference(null);
                  setCustomPlaceholder("Type your message...");
                }}
              />
            )}
            
            {/* Show audience context card if active */}
            {audienceContext && (
              <AudienceContextCard 
                currentAudience={audienceContext}
                onDismiss={() => {
                  setAudienceContext(null);
                  setCustomPlaceholder("Type your message...");
                }}
              />
            )}
            
            {messages.map((message, messageIndex) => {
              const isLastMessage = messageIndex === messages.length - 1;
              const isLiked = likedMessages.has(message.id);
              const isDisliked = dislikedMessages.has(message.id);
              
              return (
                <Fragment key={message.id}>
                  <div>
                    {message.role === "assistant" && (
                      <Sources>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "source-url":
                              return (
                                <Fragment key={`${message.id}-${i}`}>
                                  <SourcesTrigger
                                    count={
                                      message.parts.filter(
                                        (part) => part.type === "source-url"
                                      ).length
                                    }
                                  />
                                  <SourcesContent>
                                    <Source
                                      href={part.url}
                                      title={part.url}
                                    />
                                  </SourcesContent>
                                </Fragment>
                              );
                          }
                        })}
                      </Sources>
                    )}
                    <Message from={message.role}>
                      <MessageContent>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "text":
                              return (
                                <Response key={`${message.id}-${i}`}>
                                  {part.text}
                                </Response>
                              );
                            case "reasoning":
                              return (
                                <Reasoning
                                  key={`${message.id}-${i}`}
                                  className="w-full"
                                  isStreaming={status === "streaming"}
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>{part.text}</ReasoningContent>
                                </Reasoning>
                              );
                            case "tool-generateImage": {
                              const callId = part.toolCallId;
                              const isGenerating = generatingImages.has(callId);
                              const input = part.input as { prompt: string; brandName?: string; caption?: string };
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing...</div>;
                                
                                case 'input-available':
                                  // Show native Loader when generating
                                  if (isGenerating) {
                                    return (
                                      <div key={callId} className="flex items-center gap-3 justify-center p-6 my-2 border rounded-lg bg-card max-w-md mx-auto">
                                        <Loader size={20} />
                                        <span className="text-sm text-muted-foreground">Generating your social media ad...</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <ImageGenerationConfirmation
                                      key={callId}
                                      prompt={input.prompt}
                                      isGenerating={isGenerating}
                                      onConfirm={(editedPrompt) => handleImageGeneration(callId, editedPrompt, true)}
                                      onCancel={() => handleImageGeneration(callId, input.prompt, false)}
                                    />
                                  );
                                
                                case 'output-available':
                                  return (
                                    <SocialPreview
                                      key={callId}
                                      imageUrl={part.output as string}
                                      originalPrompt={input.prompt}
                                      brandName={input.brandName || "Your Brand Name"}
                                      caption={input.caption || "Your caption text goes here..."}
                                      onApprove={(currentImageUrl) => {
                                        // Populate preview panel with approved content (using current image URL which may be edited/regenerated)
                                        setAdContent({
                                          imageUrl: currentImageUrl,
                                          headline: input.brandName || "Your Brand Name",
                                          body: input.caption || "Your caption text goes here...",
                                          cta: "Learn More"
                                        });
                                      }}
                                      onEdit={async (imageUrl: string, editPrompt: string) => {
                                        // Call editImage directly and return the new URL
                                        try {
                                          const newImageUrl = await editImage(imageUrl, editPrompt);
                                          return newImageUrl;
                                        } catch (error) {
                                          console.error('Edit image failed:', error);
                                          throw error;
                                        }
                                      }}
                                      onRegenerate={async (prompt: string) => {
                                        // Call generateImage directly with the same prompt to create a new variation
                                        try {
                                          const newImageUrl = await generateImage(prompt);
                                          return newImageUrl;
                                        } catch (error) {
                                          console.error('Regenerate failed:', error);
                                          throw error;
                                        }
                                      }}
                                    />
                                  );
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4 my-2">
                                      <p className="font-medium mb-1">Generation Failed</p>
                                      <p className="text-xs">{part.errorText}</p>
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            case "tool-editImage": {
                              const callId = part.toolCallId;
                              const isEditing = editingImages.has(callId);
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing image edit...</div>;
                                case 'input-available': {
                                  const input = part.input as { imageUrl: string; prompt: string };
                                  return (
                                    <div key={callId} className="border rounded-lg p-4 my-2 bg-card">
                                      <p className="mb-2 font-medium">Edit this image?</p>
                                      <img 
                                        src={input.imageUrl} 
                                        alt="Image to edit" 
                                        className="my-2 rounded-lg max-w-xs shadow-md"
                                      />
                                      <p className="text-sm text-muted-foreground mb-4">
                                        <span className="font-medium">Changes:</span> &quot;{input.prompt}&quot;
                                      </p>
                                      {isEditing && (
                                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                                          <Loader size={14} />
                                          <span>Editing image...</span>
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <Button 
                                          onClick={() => handleImageEdit(callId, input.imageUrl, input.prompt, true)}
                                          disabled={isEditing}
                                        >
                                          {isEditing ? (
                                            <span className="flex items-center gap-2">
                                              <Loader size={14} />
                                              Editing...
                                            </span>
                                          ) : (
                                            'Apply Edit'
                                          )}
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => handleImageEdit(callId, input.imageUrl, input.prompt, false)}
                                          disabled={isEditing}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }
                                case 'output-available':
                                  return (
                                    <div key={callId} className="my-4">
                                      <p className="text-sm font-medium text-muted-foreground mb-2">Edited image:</p>
                                      <img
                                        src={part.output as string}
                                        alt="Edited image"
                                        className="rounded-lg shadow-lg max-w-full h-auto"
                                      />
                                    </div>
                                  );
                                case 'output-error':
                                  return <div key={callId} className="text-sm text-destructive">Error: {part.errorText}</div>;
                              }
                              break;
                            }
                            case "tool-locationTargeting": {
                              const callId = part.toolCallId;
                              const isProcessing = processingLocations.has(callId);
                              const input = part.input as LocationToolInput;

                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Setting up location targeting...</div>;
                                
                                case 'input-available':
                                  if (isProcessing) {
                                    return (
                                      <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                                        <Loader size={16} />
                                        <span className="text-sm text-muted-foreground">Geocoding locations...</span>
                                      </div>
                                    );
                                  }
                                  // Schedule processing (don't call during render!)
                                  if (!pendingLocationCalls.some(c => c.toolCallId === callId)) {
                                    setTimeout(() => {
                                      setPendingLocationCalls(prev => [...prev, { toolCallId: callId, input }]);
                                    }, 0);
                                  }
                                  return null;
                                
                                case 'output-available': {
                                  const output = part.output as { locations: LocationOutput[]; explanation: string };
                                  
                                  const getLocationTypeLabel = (loc: LocationOutput) => {
                                    switch (loc.type) {
                                      case "radius": return loc.radius ? `${loc.radius} mile radius` : "Radius"
                                      case "city": return "City"
                                      case "region": return "Province/Region"
                                      case "country": return "Country"
                                      default: return loc.type
                                    }
                                  };
                                  
                                  return (
                                    <div key={callId} className="w-full my-4 space-y-2">
                                      {output.locations.map((loc, idx: number) => {
                                        const isExcluded = loc.mode === "exclude";
                                        
                                        return (
                                          <div
                                            key={`${callId}-${idx}`}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                                              isExcluded 
                                                ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" 
                                                : "panel-surface hover:border-purple-500/50"
                                            }`}
                                            onClick={() => {
                                              // Switch to the location targeting tab
                                              const event = new CustomEvent('switchToTab', { detail: 'location' });
                                              window.dispatchEvent(event);
                                            }}
                                          >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isExcluded ? "bg-red-500/10 text-red-600" : "bg-purple-500/10 text-purple-600"
                                              }`}>
                                                <MapPin className="h-4 w-4" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                  <p className="font-medium text-xs truncate">{loc.name}</p>
                                                  {isExcluded && (
                                                    <span className="text-[10px] text-red-600 font-medium flex-shrink-0">
                                                      Excluded
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{getLocationTypeLabel(loc)}</p>
                                              </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4">
                                      {part.errorText}
                                    </div>
                                  );
                              }
                              break;
                            }
                            case "tool-audienceTargeting": {
                              const callId = part.toolCallId;
                              const input = part.input as AudienceToolInput;

                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Finding your people...</div>;
                                
                                case 'input-available':
                                  // Auto-process - AI Advantage+ requires no confirmation
                                  setTimeout(() => {
                                    updateAudienceStatus("setup-in-progress");
                                    
                                    // Set the audience targeting
                                    setAudienceTargeting({
                                      mode: 'ai',
                                      description: input.description,
                                      interests: input.interests,
                                      demographics: input.demographics
                                    });

                                    // Complete the tool call
                                    addToolResult({
                                      tool: 'audienceTargeting',
                                      toolCallId: callId,
                                      output: {
                                        success: true,
                                        mode: 'ai',
                                        description: input.description
                                      }
                                    });

                                    // Switch to audience tab
                                    window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'audience' }));
                                  }, 0);
                                  
                                  return (
                                    <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                                      <Loader size={16} />
                                      <span className="text-sm text-muted-foreground">Finding your people...</span>
                                    </div>
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { success: boolean; mode: string; description: string };
                                  
                                  return (
                                    <div key={callId} className="w-full my-4 space-y-3">
                                      <div
                                        className="flex items-center justify-between p-4 rounded-lg border panel-surface hover:border-cyan-500/50 transition-colors cursor-pointer"
                                        onClick={() => {
                                          window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'audience' }));
                                        }}
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="font-semibold text-sm">Got it! We&apos;ll show your ad to these people</p>
                                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{output.description}</p>
                                          </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors flex-shrink-0 ml-2" />
                                      </div>
                                      
                                      {/* Quick Action Chips */}
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground px-1">Want to adjust? Try asking:</p>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            onClick={() => {
                                              setInput("Make them younger");
                                              chatInputRef.current?.focus();
                                            }}
                                            className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/30 transition-colors"
                                          >
                                            Make them younger
                                          </button>
                                          <button
                                            onClick={() => {
                                              setInput("Focus on families");
                                              chatInputRef.current?.focus();
                                            }}
                                            className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:border-purple-500/30 transition-colors"
                                          >
                                            Focus on families
                                          </button>
                                          <button
                                            onClick={() => {
                                              setInput("Add more interests");
                                              chatInputRef.current?.focus();
                                            }}
                                            className="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:border-blue-500/30 transition-colors"
                                          >
                                            Add more interests
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4">
                                      {part.errorText}
                                    </div>
                                  );
                              }
                              break;
                            }
                            case "tool-setupGoal": {
                              const callId = part.toolCallId;
                              const input = part.input as GoalToolInput;

                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Setting up goal...</div>;
                                
                                case 'input-available':
                                  // Show interactive form selection UI instead of auto-processing
                                  return (
                                    <FormSelectionUI
                                      key={callId}
                                      onCreateNew={(formData) => {
                                        addToolResult({
                                          tool: 'setupGoal',
                                          toolCallId: callId,
                                          output: {
                                            success: true,
                                            goalType: input.goalType,
                                            conversionMethod: input.conversionMethod,
                                            formData: {
                                              formId: `form-${Date.now()}`,
                                              formName: formData.name,
                                              createNew: true,
                                              fields: formData.fields
                                            },
                                            explanation: `Created new instant form: ${formData.name} with ${formData.fields.length} fields`,
                                          },
                                        });
                                      }}
                                      onSelectExisting={(formId: string, formName: string) => {
                                        addToolResult({
                                          tool: 'setupGoal',
                                          toolCallId: callId,
                                          output: {
                                            success: true,
                                            goalType: input.goalType,
                                            conversionMethod: input.conversionMethod,
                                            formData: {
                                              formId,
                                              formName,
                                              createNew: false
                                            },
                                            explanation: `Using existing form: ${formName}`,
                                          },
                                        });
                                      }}
                                      onCancel={() => {
                                        // Reset goal state back to idle immediately
                                        resetGoal();
                                        
                                        addToolResult({
                                          tool: 'setupGoal',
                                          toolCallId: callId,
                                          output: undefined,
                                          errorText: 'Form selection cancelled by user',
                                        } as ToolResult);
                                      }}
                                    />
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { success?: boolean; formData?: { formId: string } } | undefined;
                                  
                                  // Handle cancellation or no selection (output is undefined or null)
                                  if (!output || output === null) {
                                    // Already reset in onCancel, no need to reset again
                                    return (
                                      <div key={callId} className="border rounded-lg p-4 my-2 bg-red-500/5 border-red-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <XCircle className="h-5 w-5 text-red-600" />
                                          <p className="font-medium text-red-600">Goal Setup Cancelled</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Feel free to try again or ask me anything else!</p>
                                      </div>
                                    );
                                  }
                                  
                                  // Update goal context with form data only if successful
                                  // Only update if we haven't already set this form data (prevents re-setting after reset)
                                  if (output.success) {
                                    const currentFormId = goalState.formData?.id;
                                    const newFormId = output.formData?.formId;
                                    
                                    // Only update if:
                                    // 1. We're in setup-in-progress state (actively setting up)
                                    // 2. OR the form is different and we're not in idle/completed state
                                    const isActiveSetup = goalState.status === 'setup-in-progress';
                                    const isNewForm = currentFormId !== newFormId && 
                                                     goalState.status !== 'idle' && 
                                                     goalState.status !== 'completed';
                                    
                                    if (isActiveSetup || isNewForm) {
                                      setTimeout(() => {
                                        setFormData({
                                          id: output.formData?.formId,
                                          name: output.formData?.formName || "New Instant Form",
                                          type: output.conversionMethod,
                                        });
                                      }, 100);
                                    }
                                  }
                                  
                                  // Show success message
                                  return (
                                    <div key={callId} className="border rounded-lg p-4 my-2 bg-green-500/5 border-green-500/30">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <p className="font-medium text-green-600">Goal Setup Complete</p>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{output.explanation || "Your goal has been set up successfully!"}</p>
                                    </div>
                                  );
                                }
                                
                                case 'output-error':
                                  // Check if it's a cancellation (not a real error)
                                  const isCancellation = part.errorText?.includes('cancelled');
                                  
                                  // Reset to idle for cancellation, or show error for real errors
                                  if (isCancellation) {
                                    // Already reset in onCancel, no additional action needed
                                  } else {
                                    setTimeout(() => {
                                      setError(part.errorText || "Failed to set up goal");
                                    }, 100);
                                  }
                                  
                                  // Show friendly message for cancellation, error message for real errors
                                  return (
                                    <div key={callId} className={`border rounded-lg p-4 my-2 ${
                                      isCancellation 
                                        ? 'bg-red-500/5 border-red-500/20' 
                                        : 'bg-destructive/5 border-destructive/50'
                                    }`}>
                                      {isCancellation ? (
                                        <>
                                          <div className="flex items-center gap-2 mb-2">
                                            <XCircle className="h-5 w-5 text-red-600" />
                                            <p className="font-medium text-red-600">Goal Setup Cancelled</p>
                                          </div>
                                          <p className="text-sm text-muted-foreground">Feel free to try again or ask me anything else!</p>
                                        </>
                                      ) : (
                                        <p className="text-sm text-destructive font-medium">
                                          {part.errorText || 'Failed to set up goal'}
                                        </p>
                                      )}
                                    </div>
                                  );
                              }
                              break;
                            }
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  </div>
                  
                  {/* Add Actions after assistant messages */}
                  {message.role === "assistant" && isLastMessage && (
                    <Actions className="ml-14 mt-2">
                      <Action
                        onClick={() => handleCopy(message)}
                        label="Copy"
                        tooltip="Copy to clipboard"
                      >
                        <CopyIcon className="size-3" />
                      </Action>
                      <Action
                        onClick={() => handleLike(message.id)}
                        label="Like"
                        tooltip={isLiked ? "Unlike" : "Like"}
                        variant={isLiked ? "default" : "ghost"}
                      >
                        <ThumbsUpIcon className="size-3" />
                      </Action>
                      <Action
                        onClick={() => handleDislike(message.id)}
                        label="Dislike"
                        tooltip={isDisliked ? "Remove dislike" : "Dislike"}
                        variant={isDisliked ? "default" : "ghost"}
                      >
                        <ThumbsDownIcon className="size-3" />
                      </Action>
                    </Actions>
                  )}
                </Fragment>
              );
            })}
            {status === "submitted" && <Loader />}
          </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput 
            onSubmit={handleSubmit}
            multiple
            globalDrop
            accept="image/*"
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024}
            onError={(err) => {
              console.error('File upload error:', err);
            }}
          >
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                ref={chatInputRef}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder={customPlaceholder}
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit 
                disabled={!input && status !== 'streaming'} 
                status={status}
                type={status === 'streaming' ? 'button' : 'submit'}
                onClick={status === 'streaming' ? stop : undefined}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
