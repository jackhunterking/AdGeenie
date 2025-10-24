"use client";

/**
 * Feature: Generation state scoping for overlays
 * Purpose: Limit global generating overlay to active work only so ad-copy selection remains visible when the assistant is idle.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway (streaming semantics): https://vercel.com/docs/ai-gateway/openai-compat
 *  - Supabase Next.js SSR (state persistence): https://supabase.com/docs/guides/auth/server-side/nextjs
 */

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
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState, useEffect, useMemo, Fragment, useRef } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { ThumbsUpIcon, ThumbsDownIcon, CopyIcon, Sparkles, ChevronRight, MapPin, CheckCircle2, XCircle, Reply, X, Flag } from "lucide-react";
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
import { DefaultChatTransport, ChatStatus } from "ai";
import { generateImage } from "@/server/images";
import { ImageGenerationConfirmation } from "@/components/ai-elements/image-generation-confirmation";
import { FormSelectionUI } from "@/components/ai-elements/form-selection-ui";
import { ImageEditProgressLoader } from "@/components/ai-elements/image-edit-progress-loader";
import { renderEditImageResult, renderRegenerateImageResult, renderEditAdCopyResult } from "@/components/ai-elements/tool-renderers";
import { useAdPreview } from "@/lib/context/ad-preview-context";
import { searchLocations, getLocationBoundary } from "@/app/actions/geocoding";
import { useGoal } from "@/lib/context/goal-context";
import { useLocation } from "@/lib/context/location-context";
import { useAudience } from "@/lib/context/audience-context";
import { AdReferenceCard } from "@/components/ad-reference-card-example";
import { AudienceContextCard } from "@/components/audience-context-card";
import { useGeneration } from "@/lib/context/generation-context";
import { emitBrowserEvent } from "@/lib/utils/browser-events";
import { useCampaignContext } from "@/lib/context/campaign-context";
import { toZeroBasedIndex } from "@/lib/utils/variation";

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

// AI SDK v5 Message Metadata interface (for proper typing)
interface MessageMetadata {
  timestamp: string;
  source: 'chat_input' | 'auto_submit' | 'tool_response';
  editMode?: boolean;
  editingReference?: {
    type?: string;
    variationTitle?: string;
    variationNumber?: number;
    variationIndex?: number;
    format?: 'feed' | 'story' | 'reel';
    imageUrl?: string;
    content?: {
      primaryText?: string;
      headline?: string;
      description?: string;
    };
    gradient?: string;
    editSession?: { sessionId: string; variationIndex: number };
  };
  audienceContext?: {
    demographics?: string;
    interests?: string;
  };
}

interface LocationInput {
  name: string;
  coordinates?: [number, number];
  radius?: number;
  type?: string;
  mode?: string;
}

interface LocationToolInput {
  locations: LocationInput[];
  explanation?: string;
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
  type?: string;
  variationNumber?: number;
  variationTitle?: string;
  copyNumber?: number;
  format?: 'feed' | 'story' | 'reel';
  gradient?: string;
  imageUrl?: string;
  content?: {
    primaryText?: string;
    headline?: string;
    description?: string;
    demographics?: string;
    interests?: string;
  };
  preview?: {
    brandName?: string;
    headline?: string;
    body?: string;
    gradient?: string;
    imageUrl?: string;
    dimensions?: {
      width: number;
      height: number;
      aspect: string;
    };
  };
}

interface ToolResult {
  tool: string;
  toolCallId: string;
  output: string | object | undefined;  // Allow objects for complex tool results
  errorText?: string;
}

interface AIChatProps {
  campaignId?: string;
  conversationId?: string | null;  // Stable conversation ID from server (AI SDK native pattern)
  messages?: UIMessage[];  // AI SDK v5 prop name
  campaignMetadata?: {
    initialPrompt?: string;
    initialGoal?: string | null;
  };
}

const AIChat = ({ campaignId, conversationId, messages: initialMessages = [], campaignMetadata }: AIChatProps = {}) => {
  const [input, setInput] = useState("");
  const [model] = useState<string>("openai/gpt-4o");
  const { campaign } = useCampaignContext();
  const { adContent, setAdContent } = useAdPreview();
  const { goalState, setFormData, setError, resetGoal } = useGoal();
  const { locationState, addLocations, updateStatus: updateLocationStatus } = useLocation();
  const { setAudienceTargeting, updateStatus: updateAudienceStatus } = useAudience();
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  // removed unused editingImages setter
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  
  // Track dispatched events to prevent duplicates (infinite loop prevention)
  const dispatchedEvents = useRef<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [processingLocations, setProcessingLocations] = useState<Set<string>>(new Set());
  const [pendingLocationCalls, setPendingLocationCalls] = useState<Array<{ toolCallId: string; input: LocationToolInput }>>([]);
  const [adEditReference, setAdEditReference] = useState<AudienceContext | null>(null);
  const [audienceContext, setAudienceContext] = useState<AudienceContext | null>(null);
  const [activeEditSession, setActiveEditSession] = useState<{ sessionId: string; variationIndex: number } | null>(null);
  const [customPlaceholder, setCustomPlaceholder] = useState("Type your message...");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const { setIsGenerating, setGenerationMessage, generationMessage } = useGeneration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Extract goal from campaign metadata for context enrichment
  const goalType = campaignMetadata?.initialGoal || goalState?.selectedGoal || null;
  
  console.log('[AI-CHAT] Goal context:', { goalType, campaignMetadata, goalState: goalState?.selectedGoal });
  
  // AI SDK Native Pattern: Use stable conversationId from server
  // This prevents ID changes that would cause useChat to reset
  // Priority: conversationId from server > campaign.conversationId > campaignId
  const chatId = conversationId || campaign?.conversationId || campaignId;
  
  // Simple transport following AI SDK pattern
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id }) {
          const lastMessage = messages[messages.length - 1];
          
          // Enrich message metadata with goal context (AI SDK v5 pattern)
          const existingMetaUnknown = (lastMessage as { metadata?: unknown }).metadata;
          const existingMeta =
            existingMetaUnknown && typeof existingMetaUnknown === 'object'
              ? (existingMetaUnknown as Record<string, unknown>)
              : undefined;
          const enrichedMessage = {
            ...lastMessage,
            metadata: {
              ...(existingMeta || {}),
              goalType: goalType,
            },
          };
          
          // DEBUG: Log what we're sending (AI SDK v5 pattern - metadata field)
          console.log(`[TRANSPORT] ========== SENDING MESSAGE ==========`);
          console.log(`[TRANSPORT] message.id:`, lastMessage.id);
          console.log(`[TRANSPORT] message.role:`, lastMessage.role);
          console.log(`[TRANSPORT] message.metadata:`, (enrichedMessage as { metadata?: unknown }).metadata);
          console.log(`[TRANSPORT] goalType included:`, goalType);
          
          return {
            body: {
              message: enrichedMessage,
              id,
              model: model,
            },
          };
        },
      }),
    [model, goalType]
  );
  
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG === '1';
  if (DEBUG) {
    console.log(`[AI-CHAT] ========== INITIALIZATION ==========`);
    console.log(`[AI-CHAT] conversationId (from server):`, conversationId);
    console.log(`[AI-CHAT] campaignId:`, campaignId);
    console.log(`[AI-CHAT] campaign?.conversationId:`, campaign?.conversationId);
    console.log(`[AI-CHAT] STABLE chatId being used:`, chatId);
    console.log(`[AI-CHAT] messages.length:`, initialMessages.length);
    console.log(`[AI-CHAT] messages:`, initialMessages.map(m => {
      const firstTextPart = m.parts?.find((p: { type: string }) => p.type === 'text') as { text?: string } | undefined;
      return {
        id: m.id, 
        role: m.role,
        textPreview: firstTextPart?.text?.substring(0, 50) || 'no-text',
        partsCount: m.parts?.length || 0
      };
    }));
  }

  // Simple useChat initialization - AI SDK native pattern (following docs exactly)
  // Uses conversationId for proper AI SDK conversation history
  const chatHelpers = useChat({
    id: chatId, // Use conversationId (or campaignId for backward compat)
    messages: initialMessages,  // AI SDK v5 prop name
    transport,
  });
  
  const { messages, sendMessage, addToolResult, status, stop } = chatHelpers as {
    messages: UIMessage[];
    sendMessage: (input: { text?: string; files?: File[]; metadata?: Record<string, unknown> }) => void;
    addToolResult: (r: { tool: string; toolCallId: string; output?: unknown; errorText?: string }) => void;
    status: 'idle' | 'streaming' | 'submitted';
    stop: () => void;
  };
  
  if (DEBUG) console.log(`[AI-CHAT] useChat returned ${messages.length} messages immediately`);

  // Debug logging for message display
  useEffect(() => {
    if (DEBUG) {
      console.log(`[CLIENT] ========== MESSAGES STATE ==========`);
      console.log(`[CLIENT] Current messages.length: ${messages.length}`);
      console.log(`[CLIENT] loaded messages.length: ${initialMessages.length}`);
      console.log(`[CLIENT] chatId: ${chatId}`);
      console.log(`[CLIENT] status: ${status}`);
    }
    
    if (messages.length > 0) {
      if (DEBUG) {
        console.log(`[CLIENT] ✅ Messages are displaying:`, messages.map(m => ({
          id: m.id,
          role: m.role,
          partsCount: m.parts?.length || 0
        })));
        console.log(`[CLIENT] First message details:`, {
          id: messages[0].id,
          role: messages[0].role,
          partsCount: messages[0].parts?.length || 0,
          parts: messages[0].parts
        });
      }
    } else if (initialMessages.length > 0) {
      if (DEBUG) {
        console.error(`[CLIENT] ❌ MESSAGES LOST! Loaded ${initialMessages.length} but messages array is EMPTY`);
        console.error(`[CLIENT] This means useChat cleared the messages. Possible causes:`);
        console.error(`[CLIENT] 1. ID mismatch between save and load`);
        console.error(`[CLIENT] 2. ID changed after useChat initialization`);
        console.error(`[CLIENT] 3. Message format incompatible with AI SDK`);
      }
    } else {
      console.log(`[CLIENT] No messages (expected for new campaign)`);
    }
  }, [messages, initialMessages.length, chatId, status, DEBUG]);

  // Track chatId changes (which would cause useChat to reset)
  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      if (DEBUG) {
        console.warn(`[CLIENT] ⚠️ chatId CHANGED from ${prevChatIdRef.current} to ${chatId}`);
        console.warn(`[CLIENT] This will cause useChat to RESET and clear messages!`);
      }
      prevChatIdRef.current = chatId;
    }
  }, [chatId, DEBUG]);

  // Store latest sendMessage in ref (doesn't cause re-renders)
  const sendMessageRef = useRef(sendMessage);
  
  // Update ref when sendMessage changes (no deps needed elsewhere)
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // AUTO-SUBMIT INITIAL PROMPT (AI SDK Native Pattern)
  useEffect(() => {
    // Only run once when component mounts with campaign metadata
    if (!campaignId || !campaignMetadata?.initialPrompt) return
    
    // Don't auto-submit if messages already exist
    if (initialMessages.length > 0) {
      console.log(`[CLIENT] Campaign has ${initialMessages.length} messages - skipping auto-submit`)
      return
    }
    
    // Don't auto-submit if already streaming
    if (status === 'streaming') return
    
    // Check if we've already auto-submitted for this campaign
    const autoSubmitKey = `auto-submitted-${campaignId}`
    if (sessionStorage.getItem(autoSubmitKey)) {
      console.log('[CLIENT] Already auto-submitted for this campaign')
      return
    }
    
    console.log('[CLIENT] Auto-submitting initial prompt:', campaignMetadata.initialPrompt)
    
    // Mark as submitted BEFORE calling sendMessage
    sessionStorage.setItem(autoSubmitKey, 'true')
    
    // Use AI SDK's sendMessage() to submit the message
    sendMessage({
      text: campaignMetadata.initialPrompt,
    })
  }, [campaignId, campaignMetadata, initialMessages.length, status, sendMessage]);

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
    
    // Build metadata for message (AI SDK v5 native pattern)
    const messageMetadata: MessageMetadata = {
      timestamp: new Date().toISOString(),
      source: 'chat_input',
    };
    
    if (adEditReference) {
      console.log(`[SUBMIT] ========== AD EDIT REFERENCE ==========`);
      console.log(`[SUBMIT] adEditReference:`, adEditReference);
      
      const normalizedIndexForMeta = toZeroBasedIndex({
        variationIndex: (adEditReference as unknown as { variationIndex?: number }).variationIndex,
        variationNumber: (adEditReference as unknown as { variationNumber?: number }).variationNumber,
      });
      messageMetadata.editingReference = {
        ...(adEditReference.type && { type: adEditReference.type }),
        ...(adEditReference.variationTitle && { variationTitle: adEditReference.variationTitle }),
        ...(typeof normalizedIndexForMeta === 'number' && { variationIndex: normalizedIndexForMeta }),
        ...(adEditReference.format && { format: adEditReference.format }),
        ...(adEditReference.imageUrl && { imageUrl: adEditReference.imageUrl }),
        ...(adEditReference.content && { content: adEditReference.content }),
        ...(adEditReference.gradient && { gradient: adEditReference.gradient }),
        ...(activeEditSession?.sessionId && typeof normalizedIndexForMeta === 'number' && {
          editSession: { sessionId: activeEditSession.sessionId, variationIndex: normalizedIndexForMeta }
        })
      };
      messageMetadata.editMode = true;
      
      console.log(`[SUBMIT] messageMetadata.editingReference:`, messageMetadata.editingReference);
      
      // Set immediate feedback for image edits
      setIsSubmitting(true);
      setIsGenerating(true);
      setGenerationMessage("Editing image...");
    }
    
    if (audienceContext) {
      messageMetadata.audienceContext = {
        demographics: audienceContext.demographics,
        interests: audienceContext.interests,
      };
      messageMetadata.editMode = true;
    }
    
    console.log(`[SUBMIT] Sending message with metadata:`, messageMetadata);
    
    // Send the message with metadata (AI SDK v5 native - preserved through entire flow)
    sendMessage({ 
      text: message.text || 'Sent with attachments',
      files: message.files?.map(f => ('file' in f ? (f as { file: File }).file : f as unknown as File)),
      metadata: messageMetadata as unknown as Record<string, unknown>, // ✅ This field is preserved by AI SDK v5
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
      
      // Set generation message
      setIsGenerating(true);
      setGenerationMessage("Generating 6 AI-powered creative variations...");
      
      try {
        // Generate 6 unique AI variations in one call
        const imageUrls = await generateImage(prompt, campaignId, 6);
        
        console.log('[IMAGE-GEN] ✅ Generated 6 variations:', imageUrls);
        
        // Set all 6 variations immediately
        const newContent = {
          headline: adContent?.headline || '',
          body: adContent?.body || '',
          cta: adContent?.cta || 'Learn More',
          baseImageUrl: imageUrls[0],
          imageVariations: imageUrls, // All 6 URLs
        };
        
        console.log('[IMAGE-GEN] 📤 Setting adContent with variations:', {
          imageCount: imageUrls.length,
          baseImageUrl: imageUrls[0],
          hasHeadline: !!newContent.headline,
        });
        
        setAdContent(newContent);
        
        // Auto-switch to ad copy canvas to show the variations
        emitBrowserEvent('switchToTab', 'copy');
        
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: {
            success: true,
            variations: imageUrls,
            count: imageUrls.length
          },
        });
      } catch (error) {
        console.error('Image generation error:', error);
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: undefined,
          errorText: 'Failed to generate images',
        } as ToolResult);
      } finally {
        // Remove from loading state
        setGeneratingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(toolCallId);
          return newSet;
        });
        setIsGenerating(false);
      }
    } else {
      // User cancelled - send cancellation result
      // The AI will respond with text confirmation
      addToolResult({
        tool: 'generateImage',
        toolCallId,
        output: {
          cancelled: true,
          message: 'User cancelled the image generation'
        },
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
                  coordinates = results[0].center as [number, number];
                  bbox = results[0].bbox as [number, number, number, number];
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
                const boundaryData = await getLocationBoundary(coordinates, loc.name);
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
                type: loc.type as "radius" | "city" | "region" | "country",
                mode: loc.mode as "include" | "exclude",
                bbox: bbox || undefined,
                geometry,
              };
            })
          );
          
          // Filter out any null values (failed geocoding)
          const validLocations = locationsWithCoords.filter((loc): loc is NonNullable<typeof loc> => loc !== null);
          
          // Check if any locations were successfully geocoded
          if (validLocations.length === 0) {
            throw new Error('Failed to geocode any locations. Please check the location names and try again.');
          }

          // Update location context with full data
          updateLocationStatus("setup-in-progress");
          addLocations(validLocations);
          
          // Send FULL data (with geometry) to the map
          emitBrowserEvent('locationsUpdated', validLocations);

          // Switch to location tab
          emitBrowserEvent('switchToTab', 'location');

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
      
      sendMessageRef.current({
        text: `I want to set up ${goalType} goal with instant forms`,
      });
    };

    window.addEventListener('triggerGoalSetup', handleGoalSetup as EventListener);
    return () => window.removeEventListener('triggerGoalSetup', handleGoalSetup as EventListener);
  }, []);

  // Listen for location setup trigger from canvas
  useEffect(() => {
    const handleLocationSetup = () => {
      const hasExistingLocations = locationState.locations.length > 0;
      
      sendMessageRef.current({
        text: hasExistingLocations 
          ? `Add more locations to my current targeting setup`
          : `Help me set up location targeting for my ad`,
      });
    };

    window.addEventListener('triggerLocationSetup', handleLocationSetup);
    return () => window.removeEventListener('triggerLocationSetup', handleLocationSetup);
  }, [locationState.locations.length]);

  // Listen for audience setup trigger from canvas
  useEffect(() => {
    const handleAudienceSetup = () => {
      sendMessageRef.current({
        text: `Set up AI Advantage+ audience targeting for my ad`,
      });
    };

    window.addEventListener('triggerAudienceSetup', handleAudienceSetup);
    return () => window.removeEventListener('triggerAudienceSetup', handleAudienceSetup);
  }, []);

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
      
      sendMessageRef.current({
        text: `Based on my campaign details, generate an AI Advantage+ audience profile that makes perfect sense for this campaign. 

Campaign Context: ${fullContext}

Please analyze this information and create a detailed, natural language audience targeting strategy. Include:
1. A simple description of who will see the ad
2. Relevant interests based on the campaign
3. Appropriate demographics (age, gender if relevant)

Make it conversational and easy to understand for a business owner.`,
      });
    };

    window.addEventListener('generateAudience', handleAudienceGeneration as EventListener);
    return () => window.removeEventListener('generateAudience', handleAudienceGeneration as EventListener);
  }, []);

  // Listen for audience chat opening (when user clicks "Change This")
  useEffect(() => {
    const handleOpenAudienceChat = (event: CustomEvent<AudienceContext>) => {
      const context = event.detail;
      // Store the audience context for display
      setAudienceContext(context.currentAudience || null);
      
      // Set placeholder with natural language
      setCustomPlaceholder("What would you like to change about who sees this?");
      
      // Focus chat input
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      
      sendMessageRef.current({
        text: `I want to update who sees my ad. Currently targeting: ${context.currentAudience?.demographics || 'general audience'}${context.currentAudience?.interests ? `, ${context.currentAudience.interests}` : ''}`,
      });
    };

    window.addEventListener('openAudienceChat', handleOpenAudienceChat as EventListener);
    return () => window.removeEventListener('openAudienceChat', handleOpenAudienceChat as EventListener);
  }, []);

  // Listen for ad edit events from preview panel
  useEffect(() => {
    const handleOpenEditInChat = (event: CustomEvent<AudienceContext>) => {
      const context = event.detail;
      
      // Route to appropriate reference based on type
      if (context.type === 'audience_reference') {
        // Store as audience context
        setAudienceContext(context.content as AudienceContext | null || null);
        setCustomPlaceholder("Describe how you'd like to change the audience targeting...");
      } else {
        // Store as ad edit reference (for ad copy/creative) with normalized index
        const normalizedIndex = toZeroBasedIndex({
          variationIndex: (context as unknown as { variationIndex?: number }).variationIndex,
          variationNumber: (context as unknown as { variationNumber?: number }).variationNumber,
        });
        setAdEditReference({
          ...context,
          variationIndex: normalizedIndex,
        } as unknown as AudienceContext);
        if ((context as unknown as { editSession?: { sessionId?: string } }).editSession?.sessionId && typeof normalizedIndex === 'number') {
          setActiveEditSession({ sessionId: (context as unknown as { editSession?: { sessionId?: string } }).editSession!.sessionId!, variationIndex: normalizedIndex });
        }
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
        sendMessageRef.current({ text: message });
      }
    };

    window.addEventListener('openEditInChat', handleOpenEditInChat as EventListener);
    window.addEventListener('sendMessageToAI', handleSendMessageToAI as EventListener);
    
    return () => {
      window.removeEventListener('openEditInChat', handleOpenEditInChat as EventListener);
      window.removeEventListener('sendMessageToAI', handleSendMessageToAI as EventListener);
    };
  }, []);

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

  // Track generation state for showing animations on ad mockups
  useEffect(() => {
    // Check if AI just asked a question (last message is from assistant)
    if (messages.length > 0) {
      
      // Or if AI is actively streaming/processing
      const isActivelyGenerating = status === 'streaming' || status === 'submitted';
      
      // Or if generating images
      const isGeneratingImage = generatingImages.size > 0;
      
      // Or if processing locations
      const isProcessingLocations = processingLocations.size > 0;
      
      // Only show global generating overlay during active work; do not block UI when merely awaiting user input
      const shouldShowGenerating = isActivelyGenerating || isGeneratingImage || isProcessingLocations;
      
      setIsGenerating(shouldShowGenerating);
      
      // Set appropriate message
      if (isGeneratingImage) {
        setGenerationMessage("Generating creative...");
      } else if (isProcessingLocations) {
        setGenerationMessage("Setting up locations...");
      } else if (isActivelyGenerating) {
        setGenerationMessage("AI is thinking...");
      }
    } else {
      setIsGenerating(false);
    }
  }, [messages, status, generatingImages, processingLocations, setIsGenerating, setGenerationMessage]);

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      {/* Goal Indicator Badge */}
      {goalType && (
        <div className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground">
                Campaign Goal:
              </span>
              <span className="text-xs font-semibold text-foreground capitalize">
                {goalType}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              All suggestions will align with this goal
            </span>
          </div>
        </div>
      )}
      
      <Conversation>
        <ConversationContent>
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
                        {(
                          message.parts
                            // Filter out cancelled tool invocations (AI SDK best practice)
                            .filter((part) => {
                              const partAny = part as { type: string; toolCallId?: string; output?: { cancelled?: boolean } };
                              
                              // Hide tool-result parts that indicate cancellation
                              if (part.type === 'tool-result') {
                                const output = partAny.output;
                                if (output && typeof output === 'object' && output.cancelled === true) {
                                  return false; // Don't render cancelled tool results
                                }
                              }
                              
                              // Hide tool-call parts if their corresponding result was cancelled
                              if (part.type === 'tool-call') {
                                const toolCallId = partAny.toolCallId;
                                // Check if there's a cancelled result for this tool call
                                const hasCancelledResult = message.parts.some(p => 
                                  p.type === 'tool-result' && 
                                  'toolCallId' in p && p.toolCallId === toolCallId &&
                                  'output' in p && typeof p.output === 'object' && p.output && 'cancelled' in p.output && (p.output as { cancelled?: boolean }).cancelled === true
                                );
                                if (hasCancelledResult) {
                                  return false; // Don't render tool call if it was cancelled
                                }
                              }
                              
                              return true; // Render all other parts
                            })
                            .map((part, i, allParts) => {
                            switch (part.type) {
                            case "text": {
                                // Suppress assistant text when tool parts are present in same message
                                const hasToolParts = allParts?.some((p: { type?: string }) => typeof p?.type === 'string' && (p.type as string).startsWith('tool-'));
                                if (message.role === 'assistant' && hasToolParts) {
                                  return null;
                                }
                                return (
                                  <Response 
                                    key={`${message.id}-${i}`}
                                    isAnimating={status === "streaming" && isLastMessage}
                                  >
                                    {part.text}
                                  </Response>
                                );
                              }
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
                              
                              console.log('[CLIENT] generateImage tool state:', part.state, 'isGenerating:', isGenerating);
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing...</div>;
                                
                                case 'input-available':
                                  // Show native Loader when generating
                                  if (isGenerating) {
                                    return (
                                      <div key={callId} className="flex flex-col items-center gap-3 justify-center p-6 my-2 border rounded-lg bg-card max-w-md mx-auto">
                                        <div className="relative">
                                          <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
                                          <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-transparent border-r-blue-300 animate-spin" style={{ animationDelay: '150ms' }} />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-sm font-medium text-foreground">{generationMessage}</span>
                                          <div className="flex gap-1">
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                          </div>
                                        </div>
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
                                
                                case 'output-available': {
                                  const output = part.output as { success?: boolean; variations?: string[]; count?: number; cancelled?: boolean };
                                  
                                  // Don't show anything if cancelled
                                  if (output?.cancelled) {
                                    return null;
                                  }
                                  
                                  // Only show success if we actually have generated images
                                  if (output?.success && output?.variations && output.variations.length > 0) {
                                    return (
                                      <div key={callId} className="border rounded-lg p-4 my-2 bg-green-500/5 border-green-500/30 max-w-md mx-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                          <p className="font-medium text-green-600">{output.count} Variations Created!</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Check them out on the canvas →
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  // If output exists but no variations yet, don't show anything (still processing)
                                  return null;
                                }
                                
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
                              const input = part.input as { imageUrl?: string; variationIndex?: number; prompt?: string };
                              
                              // DEBUG: Log all states to see execution flow
                              console.log(`[TOOL-editImage] State: ${part.state}, callId: ${callId}`);
                              const hasOutput = typeof (part as { output?: unknown }).output !== 'undefined';
                              const hasResult = typeof (part as { result?: unknown }).result !== 'undefined';
                              console.log(`[TOOL-editImage] Has output:`, hasOutput);
                              console.log(`[TOOL-editImage] Has result:`, hasResult);
                              
                              switch (part.state) {
                                case 'input-streaming':
                                case 'input-available':
                                  // Server-side execution - keep animated progress loader visible until output arrives
                                  return <ImageEditProgressLoader key={callId} type="edit" />;
                                
                                case 'output-available': {
                                  // AI SDK v5: Server-executed tools might use 'result' instead of 'output'
                                  const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                    success?: boolean; 
                                    editedImageUrl?: string; 
                                    variationIndex?: number; 
                                    error?: string 
                                  };
                                  
                                  // DEBUG: Log the entire output to see what we're receiving
                                  console.log(`[EDIT-OUTPUT] ========== OUTPUT RECEIVED ==========`);
                                  console.log(`[EDIT-OUTPUT] output.success:`, output.success);
                                  console.log(`[EDIT-OUTPUT] output.editedImageUrl:`, output.editedImageUrl);
                                  console.log(`[EDIT-OUTPUT] output.variationIndex:`, output.variationIndex);
                                  console.log(`[EDIT-OUTPUT] input.variationIndex:`, input.variationIndex);
                                  console.log(`[EDIT-OUTPUT] Full output object:`, JSON.stringify(output, null, 2));
                                  console.log(`[EDIT-OUTPUT] =======================================`);
                                  
                                  // Reset submitting state
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  if (!output.success || output.error) {
                                    return (
                                      <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                        Error: {output.error || 'Failed to edit image'}
                                      </div>
                                    );
                                  }
                                  
                                  // Dispatch event to update canvas with edited image
                                  // 4-tier fallback strategy for variationIndex (AI SDK pattern)
                                  if (output.editedImageUrl) {
                                    // Determine index strictly from part (result → input). Do NOT use activeEditSession.
                                    const finalVariationIndex = output.variationIndex ?? input.variationIndex;
                                    if (typeof finalVariationIndex === 'number' && finalVariationIndex >= 0) {
                                      const eventKey = `${callId}-${finalVariationIndex}`;
                                      
                                      if (!dispatchedEvents.current.has(eventKey)) {
                                        dispatchedEvents.current.add(eventKey);
                                        
                                        setTimeout(() => {
                                          emitBrowserEvent('imageEdited', { 
                                            sessionId: (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).output?.sessionId || (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).result?.sessionId,
                                            variationIndex: finalVariationIndex,
                                            newImageUrl: output.editedImageUrl 
                                          });
                                          console.log(`[EDIT-COMPLETE] ✅ Dispatched imageEdited event for variation ${finalVariationIndex}`);
                                        }, 0);
                                      }
                                    } else {
                                      console.error(`[EDIT-COMPLETE] ❌ Could not determine variationIndex for canvas update`);
                                    }
                                  }
                                  
                                  // Centralized renderer: success card + one-liner + mockup preview
                                  return renderEditImageResult({
                                    callId,
                                    keyId: `${callId}-output-available`,
                                    input,
                                    output,
                                    isSubmitting,
                                  });
                                }
                                
                                case 'output-error':
                                  // Reset submitting state on error
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {part.errorText || 'Failed to edit image'}
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            case "tool-regenerateImage": {
                              const callId = part.toolCallId;
                              const input = part.input as { variationIndex?: number };
                              
                              // DEBUG: Log all states to see execution flow
                              console.log(`[TOOL-regenerateImage] State: ${part.state}, callId: ${callId}`);
                              const hasOutput2 = typeof (part as { output?: unknown }).output !== 'undefined';
                              const hasResult2 = typeof (part as { result?: unknown }).result !== 'undefined';
                              console.log(`[TOOL-regenerateImage] Has output:`, hasOutput2);
                              console.log(`[TOOL-regenerateImage] Has result:`, hasResult2);
                              
                              switch (part.state) {
                                case 'input-streaming':
                                case 'input-available':
                                  // Server-side execution - keep animated progress loader visible until output arrives
                                  return <ImageEditProgressLoader key={callId} type="regenerate" />;
                                
                                case 'output-available': {
                                  // AI SDK v5: Server-executed tools might use 'result' instead of 'output'
                                  const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                    success?: boolean; 
                                    imageUrl?: string; 
                                    imageUrls?: string[]; 
                                    variationIndex?: number; 
                                    count?: number; 
                                    error?: string 
                                  };
                                  
                                  // DEBUG: Log the entire output to see what we're receiving
                                  console.log(`[REGENERATE-OUTPUT] ========== OUTPUT RECEIVED ==========`);
                                  console.log(`[REGENERATE-OUTPUT] output.success:`, output.success);
                                  console.log(`[REGENERATE-OUTPUT] output.imageUrl:`, output.imageUrl);
                                  console.log(`[REGENERATE-OUTPUT] output.variationIndex:`, output.variationIndex);
                                  console.log(`[REGENERATE-OUTPUT] input.variationIndex:`, input.variationIndex);
                                  console.log(`[REGENERATE-OUTPUT] Full output object:`, JSON.stringify(output, null, 2));
                                  console.log(`[REGENERATE-OUTPUT] =======================================`);
                                  
                                  // Reset submitting state
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  if (!output.success || output.error) {
                                    return (
                                      <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                        Error: {output.error || 'Failed to regenerate image'}
                                      </div>
                                    );
                                  }
                                  
                                  // Handle single variation regeneration (edit mode)
                                  // 4-tier fallback strategy for variationIndex (AI SDK pattern)
                                  if (output.imageUrl) {
                                    const finalVariationIndex = output.variationIndex ?? input.variationIndex;
                                    if (typeof finalVariationIndex === 'number' && finalVariationIndex >= 0) {
                                      const eventKey = `${callId}-regen-${finalVariationIndex}`;
                                      if (!dispatchedEvents.current.has(eventKey)) {
                                        dispatchedEvents.current.add(eventKey);
                                        setTimeout(() => {
                                          emitBrowserEvent('imageEdited', {
                                            sessionId: (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).output?.sessionId || (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).result?.sessionId,
                                            variationIndex: finalVariationIndex,
                                            newImageUrl: output.imageUrl,
                                          });
                                          console.log(`[REGEN-COMPLETE] ✅ Dispatched imageEdited event for variation ${finalVariationIndex}`);
                                        }, 0);
                                      }
                                      return renderRegenerateImageResult({ callId, keyId: `${callId}-regen-output`, output });
                                    } else {
                                      console.error(`[REGEN-COMPLETE] ❌ Could not determine variationIndex for canvas update`);
                                      return (
                                        <div key={callId} className="border rounded-lg p-3 my-2 bg-yellow-500/5 border-yellow-500/30">
                                          <p className="text-sm text-yellow-600">Image regenerated but couldn&apos;t update canvas position</p>
                                        </div>
                                      );
                                    }
                                  }
                                  
                                  // Handle multiple variations regeneration (batch regeneration)
                                  if (output.imageUrls && output.imageUrls.length > 0) {
                                    // Update ad content with regenerated variations
                                    // This ensures the new images are saved and persist across refreshes
                                    setTimeout(() => {
                                      console.log('[REGEN] 📤 Setting regenerated variations:', output.imageUrls);
                                      setAdContent({
                                        headline: adContent?.headline || '',
                                        body: adContent?.body || '',
                                        cta: adContent?.cta || 'Learn More',
                                        imageVariations: output.imageUrls,
                                        baseImageUrl: output.imageUrls![0],
                                      });
                                    }, 0);
                                  
                                    return (
                                      <div key={callId} className="my-4">
                                        <p className="text-sm font-medium text-green-600 mb-3">
                                          ✨ Successfully generated {output.count || output.imageUrls.length} new variations!
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                          {output.imageUrls.map((url, idx) => (
                                            <img
                                              key={`${callId}-${idx}`}
                                              src={url}
                                              alt={`Variation ${idx + 1}`}
                                              className="rounded-lg shadow-md w-full h-auto"
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {part.errorText || 'Failed to regenerate images'}
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                          case "tool-editAdCopy": {
                            const callId = part.toolCallId;
                            const input = part.input as { prompt?: string; current?: { primaryText?: string; headline?: string; description?: string } };

                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return <ImageEditProgressLoader key={callId} type="edit" />;
                              case 'output-available': {
                                const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                  success?: boolean;
                                  variationIndex?: number;
                                  copy?: { primaryText: string; headline: string; description: string };
                                  error?: string;
                                };

                                if (isSubmitting) {
                                  setTimeout(() => {
                                    setIsSubmitting(false);
                                    setIsGenerating(false);
                                  }, 0);
                                }

                                if (!output?.success || output?.error) {
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {output?.error || 'Failed to edit ad copy'}
                                    </div>
                                  );
                                }

                                // Dispatch adCopyEdited event
                                if (output.copy && typeof output.variationIndex === 'number') {
                                  const eventKey = `${callId}-${output.variationIndex}`;
                                  if (!dispatchedEvents.current.has(eventKey)) {
                                    dispatchedEvents.current.add(eventKey);
                                    setTimeout(() => {
                                      emitBrowserEvent('adCopyEdited', {
                                        variationIndex: output.variationIndex,
                                        newCopy: output.copy,
                                      });
                                    }, 0);
                                  }
                                }

                                // Resolve the correct image and format to mirror the preview mock-up
                                const variationIndex = output.variationIndex;
                                const resolvedFormat =
                                  (adEditReference as unknown as { format?: 'feed' | 'story' })?.format ?? 'feed';

                                const resolvedImageUrl =
                                  typeof variationIndex === 'number'
                                    ? (adContent?.imageVariations?.[variationIndex] ??
                                       (adEditReference as unknown as { imageUrl?: string })?.imageUrl ??
                                       adContent?.imageUrl)
                                    : (adEditReference as unknown as { imageUrl?: string })?.imageUrl ??
                                      adContent?.imageUrl;

                                return renderEditAdCopyResult({
                                  callId,
                                  keyId: `${callId}-output-available`,
                                  input,
                                  output,
                                  imageUrl: resolvedImageUrl,
                                  format: resolvedFormat,
                                });
                              }
                              case 'output-error':
                                if (isSubmitting) {
                                  setTimeout(() => {
                                    setIsSubmitting(false);
                                    setIsGenerating(false);
                                  }, 0);
                                }
                                return (
                                  <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                    Error: {part.errorText || 'Failed to edit ad copy'}
                                  </div>
                                );
                              default:
                                return null;
                            }
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
                                              emitBrowserEvent('switchToTab', 'location');
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
                                      interests: input.interests ? (Array.isArray(input.interests) ? input.interests : [input.interests]) : undefined,
                                      demographics: typeof input.demographics === 'object' ? input.demographics : undefined
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
                                    emitBrowserEvent('switchToTab', 'audience');
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
                                        onClick={() => emitBrowserEvent('switchToTab', 'audience')}
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
                                          name: "New Instant Form",
                                          type: undefined,
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
                                      <p className="text-sm text-muted-foreground">Your goal has been set up successfully!</p>
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
                        })
                        )}
                      </MessageContent>
                    </Message>
                  </div>
                  
                  {/* Add Actions after assistant messages */}
                  {message.role === "assistant" && isLastMessage && (
                    <Actions className="ml-14 mt-2">
                      <Action
                        onClick={() => handleCopy(message as unknown as ChatMessage)}
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
            
            {/* Show ad edit reference card if active - appears at bottom after all messages */}
            {adEditReference && (
              <AdReferenceCard 
                reference={adEditReference}
                onDismiss={() => {
                  setAdEditReference(null);
                  setCustomPlaceholder("Type your message...");
                }}
              />
            )}
            
            {/* Show audience context card if active - appears at bottom after all messages */}
            {audienceContext && (
              <AudienceContextCard 
                currentAudience={audienceContext}
                onDismiss={() => {
                  setAudienceContext(null);
                  setCustomPlaceholder("Type your message...");
                }}
              />
            )}
            
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
              {/* Reference Badge - shows when editing */}
              {(adEditReference || audienceContext) && (
                <div className="w-full px-3 pt-3 pb-1">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 w-fit">
                    <Reply className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {adEditReference 
                        ? `Editing: ${adEditReference.variationTitle}` 
                        : `Editing: Audience Targeting`}
                    </span>
                    <button
                      onClick={() => {
                        if (adEditReference) {
                          setAdEditReference(null);
                        }
                        if (audienceContext) {
                          setAudienceContext(null);
                        }
                        setCustomPlaceholder("Type your message...");
                      }}
                      className="p-0.5 rounded hover:bg-blue-500/10 transition-colors"
                      aria-label="Clear reference"
                      type="button"
                    >
                      <X className="h-3 w-3 text-blue-500" />
                    </button>
                  </div>
                </div>
              )}
              
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
            <PromptInputFooter>
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
                status={status as ChatStatus}
                type={status === 'streaming' ? 'button' : 'submit'}
                onClick={status === 'streaming' ? stop : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
