import { nanoid } from 'nanoid';

export interface EditSession {
  sessionId: string;
  variationIndex: number;
  imageUrl?: string;
  campaignId?: string;
  timestamp: number;
}

export function newEditSession(params: { variationIndex: number; imageUrl?: string; campaignId?: string }): EditSession {
  return {
    sessionId: nanoid(12),
    variationIndex: params.variationIndex,
    imageUrl: params.imageUrl,
    campaignId: params.campaignId,
    timestamp: Date.now(),
  };
}


