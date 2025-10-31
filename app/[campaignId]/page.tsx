import { supabaseServer } from '@/lib/supabase/server';
import { UIMessage } from 'ai';
import { sanitizeParts } from '@/lib/ai/schema';
import { Dashboard } from '@/components/dashboard';
import type { Database } from '@/lib/supabase/database.types';

// Database message row type (from generated types)
type MessageRow = Database['public']['Tables']['messages']['Row'];

// Convert DB storage to UIMessage (following AI SDK docs)
// Now restores complete UIMessage format from storage
function dbToUIMessage(stored: MessageRow): UIMessage {
  let parts = sanitizeParts(stored.parts as unknown);
  
  // Safety fallback: If parts is empty but we have content, create a text part
  // This ensures messages always have displayable content
  if (parts.length === 0 && stored.content) {
    console.log(`[SERVER] Creating text part from content for message ${stored.id}`);
    parts = [{
      type: 'text',
      text: stored.content
    }];
  }
  
  const toolInv: unknown = stored.tool_invocations as unknown;
  const hasToolInvocations = Array.isArray(toolInv) && toolInv.length > 0;
  const uiMessage = {
    id: stored.id,
    role: stored.role,
    parts: parts,
    ...(hasToolInvocations ? { toolInvocations: toolInv } : {})
  } as UIMessage;
  
  const toolPartsCount = Array.isArray(uiMessage.parts)
    ? uiMessage.parts.filter((p) => typeof (p as { type?: unknown })?.type === 'string' && String((p as { type?: unknown }).type).startsWith('tool-')).length
    : 0;

  console.log(`[SERVER] Converted message ${stored.id}:`, {
    role: uiMessage.role,
    partsCount: uiMessage.parts?.length || 0,
    toolPartsCount
  });
  
  return uiMessage;
}

export default async function CampaignPage({ 
  params 
}: { 
  params: Promise<{ campaignId: string }> 
}) {
  const { campaignId } = await params;
  
  console.log(`[SERVER] Loading messages for campaign ${campaignId}`);
  
  // Load campaign data including goal
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select(`
      *,
      campaign_states (*)
    `)
    .eq('id', campaignId)
    .single();
  
  // Extract goal from campaign_states
  const goalData = (campaign?.campaign_states as Database['public']['Tables']['campaign_states']['Row'] | null | undefined)?.goal_data as unknown as Record<string, unknown> | null | undefined;
  const campaignMetadata = {
    initialGoal: (goalData as { selectedGoal?: string } | null | undefined)?.selectedGoal ?? null,
    initialPrompt: ((campaign?.metadata as unknown as { initialPrompt?: string } | null | undefined)?.initialPrompt) || undefined,
  };
  
  console.log(`[SERVER] Campaign metadata:`, campaignMetadata);
  
  // Load messages server-side via conversation (correct table)
  // Step 1: Get conversation for this campaign
  const { data: conversation } = await supabaseServer
    .from('conversations')
    .select('id')
    .eq('campaign_id', campaignId)
    .single();
  
  const conversationId = conversation?.id || null;
  
  console.log(`[SERVER] Conversation ID for chat:`, conversationId);
  
  // Step 2: Load messages from that conversation
  let dbMessages: MessageRow[] | null = null;
  let error = null;
  
  if (conversation) {
    const result = await supabaseServer
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('seq', { ascending: true });
    
    dbMessages = (result.data as MessageRow[] | null);
    error = result.error;
  }

  if (error) {
    console.error(`[SERVER] Error loading messages:`, error);
  }

  if (dbMessages && dbMessages.length > 0) {
    console.log(`[SERVER] Found ${dbMessages.length} raw messages in DB`);
    const [first] = dbMessages;
    if (first) {
      console.log(`[SERVER] First message:`, { id: first.id, role: first.role, has_parts: !!first.parts });
    }
  }

  const messages: UIMessage[] = (dbMessages || []).map(dbToUIMessage);
  
  console.log(`[SERVER] Loaded ${messages.length} messages`);
  console.log(`[SERVER] Messages being passed to Dashboard:`, JSON.stringify(messages.map(m => ({ 
    id: m.id, 
    role: m.role, 
    partsCount: m.parts?.length || 0 
  }))));

  return (
    <Dashboard 
      messages={messages}
      campaignId={campaignId}
      conversationId={conversationId}
      campaignMetadata={campaignMetadata}
    />
  );
}
