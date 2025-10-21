import { useState, useEffect } from 'react';
import { UIMessage } from 'ai';

export interface CampaignState {
  goal_data: any;
  location_data: any;
  audience_data: any;
  ad_copy_data: any;
  ad_preview_data: any;
  budget_data: any;
  generated_images: any[];
}

export interface RestoredState {
  campaignState: CampaignState | null;
  chatMessages: UIMessage[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Comprehensive hook to restore all campaign state including:
 * - Context states (goal, location, audience, budget, ad copy, ad preview)
 * - Generated images and variations
 * - Chat message history
 */
export function useCampaignStateRestoration(campaignId: string | undefined): RestoredState {
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    const loadCampaignState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Starting campaign state restoration for:', campaignId);

        // Load state and messages in parallel
        const [stateResponse, messagesResponse] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}/state`),
          fetch(`/api/campaigns/${campaignId}/messages`)
        ]);

        // Handle state response
        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          if (stateData.state) {
            setCampaignState(stateData.state);
            console.log('✅ Campaign state loaded:', stateData.state);
          }
        } else {
          console.warn('⚠️ Failed to load campaign state:', await stateResponse.text());
        }

        // Handle messages response
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          const messages: UIMessage[] = (messagesData.messages || []).map((msg: any) => {
            // Handle different content formats
            let content = '';
            let parts = [];
            
            if (typeof msg.content === 'string') {
              content = msg.content;
            } else if (msg.content && typeof msg.content === 'object') {
              const contentObj = msg.content as any;
              parts = contentObj.parts || [];
              
              // Extract text from parts array if content.text is empty
              if (!contentObj.text && parts.length > 0) {
                const textParts = parts
                  .filter((p: any) => p.type === 'text' && p.text)
                  .map((p: any) => p.text);
                content = textParts.join(' ');
              } else {
                content = contentObj.text || '';
              }
            }
            
            return {
              id: msg.id,
              role: msg.role as 'user' | 'assistant' | 'system',
              content,
              parts,
              toolInvocations: msg.tool_calls,
            };
          });

          setChatMessages(messages);
          console.log('✅ Chat messages loaded:', messages.length);
        } else {
          console.warn('⚠️ Failed to load chat messages:', await messagesResponse.text());
        }

      } catch (err) {
        console.error('❌ Error restoring campaign state:', err);
        setError(err instanceof Error ? err.message : 'Failed to restore state');
      } finally {
        setIsLoading(false);
        console.log('✅ Campaign state restoration complete');
      }
    };

    loadCampaignState();
  }, [campaignId]);

  return {
    campaignState,
    chatMessages,
    isLoading,
    error,
  };
}

/**
 * Debounced state saver - saves campaign state after a delay
 */
export function useDebouncedStateSaver(campaignId: string | undefined, delay: number = 1000) {
  const saveState = async (stateUpdates: Partial<CampaignState>) => {
    if (!campaignId) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateUpdates),
      });

      if (!response.ok) {
        throw new Error('Failed to save state');
      }

      console.log('💾 Campaign state saved:', Object.keys(stateUpdates));
    } catch (err) {
      console.error('❌ Error saving campaign state:', err);
    }
  };

  return { saveState };
}

