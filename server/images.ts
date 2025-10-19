"use server";

import { generateText } from 'ai';
import fs from 'node:fs';
import { supabaseServer } from '@/lib/supabase/server';

// Upload image buffer to Supabase Storage (exported for reuse in API routes)
export async function uploadToSupabase(
    imageBuffer: Buffer,
    fileName: string,
    campaignId?: string
): Promise<string> {
    try {
        // Generate path with campaign folder if provided
        const path = campaignId 
            ? `campaigns/${campaignId}/${fileName}`
            : `temp/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabaseServer
            .storage
            .from('campaign-assets')
            .upload(path, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseServer
            .storage
            .from('campaign-assets')
            .getPublicUrl(path);

        console.log(`✅ Uploaded to Supabase: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        throw error;
    }
}

// Meta-specific prompt enhancement for visual guardrails
function enhancePromptWithMetaGuardrails(userPrompt: string, isEdit: boolean = false): string {
    const baseEnhancement = `
${userPrompt}

CRITICAL VISUAL REQUIREMENTS:
- Style: Super-realistic, natural photography (NOT stock photo or artificial CGI)
- Quality: High-resolution, professional lighting, authentic human moments
- Composition: Mobile-optimized, centered or rule-of-thirds subject placement with format flexibility
- Background: Clean, bright, neutral, non-competing with subject
- Aesthetic: Native Meta feed style - should not look like an advertisement
- Format Flexibility: Design should work beautifully in both square (1:1) and vertical (9:16) formats
- Central Weighting: Keep key visual elements in the center safe zone to allow format adaptation

SAFE ZONES & PADDING (CRITICAL):
- ALWAYS maintain 10-12% padding/margins on ALL edges (top, bottom, left, right)
- This ensures content is never cropped by platform UI elements
- Keep main subject and important details within the central 80% of the frame
- Design with breathing room - never position elements at extreme edges
- Centrally-weighted composition allows seamless adaptation between aspect ratios

NO RESTRICTIONS:
- NO text overlays, NO logos, NO watermarks, NO graphic design elements
- NO banner layouts, NO heavy borders, NO cluttered compositions

IMAGE SPECIFICATIONS:
- Aspect ratio: Typically 1:1 (square feed) unless user specifically requests Stories/Reels format (9:16)
- Resolution: High quality, sharp focus on main subject
- Color: Balanced, natural tones with soft contrast
- Focal point: Clear, unobstructed, positioned in center safe zone to avoid platform UI overlap

The image should look like professional, authentic content that stops the scroll naturally and works perfectly across multiple Meta placements.`;

    return baseEnhancement;
}

export async function generateImage(prompt: string, campaignId?: string) {
    try {
        // Enhance prompt with Meta guardrails
        const enhancedPrompt = enhancePromptWithMetaGuardrails(prompt);
        
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            prompt: enhancedPrompt,
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
        });

        let publicUrl = '';

        // Upload generated images to Supabase
        for (const file of result.files) {
            if (file.mediaType.startsWith('image/')) {
                const timestamp = Date.now();
                const fileName = `generated-${timestamp}.png`;
                const imageBuffer = Buffer.from(file.uint8Array);

                // Upload to Supabase Storage
                publicUrl = await uploadToSupabase(imageBuffer, fileName, campaignId);

                // Also save to generated_assets table if we have a campaign
                if (campaignId) {
                    try {
                        await supabaseServer
                            .from('generated_assets')
                            .insert({
                                campaign_id: campaignId,
                                user_id: 'temp-user-id', // TODO: Replace with actual user ID
                                asset_type: 'image',
                                storage_path: campaignId ? `campaigns/${campaignId}/${fileName}` : `temp/${fileName}`,
                                public_url: publicUrl,
                                file_size: file.uint8Array.length,
                                dimensions: { width: null, height: null }, // Could extract if needed
                                generation_params: { prompt, model: 'gemini-2.5-flash-image-preview' }
                            });
                    } catch (dbError) {
                        console.error('Error saving to generated_assets:', dbError);
                        // Don't fail the whole operation if DB save fails
                    }
                }
            }
        }

        if (!publicUrl) {
            throw new Error('No image was generated');
        }

        return publicUrl;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function editImage(imageUrl: string, editPrompt: string, campaignId?: string) {
    try {
        let imageBuffer: Buffer;

        // Check if URL is from Supabase or local
        if (imageUrl.includes('supabase.co')) {
            // Fetch from Supabase URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } else {
            // Read from local public folder (legacy)
            const imagePath = imageUrl.startsWith('/') 
                ? `public${imageUrl}` 
                : imageUrl;
            imageBuffer = await fs.promises.readFile(imagePath);
        }
        
        // Determine media type from URL
        let mediaType = 'image/png';
        if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
            mediaType = 'image/jpeg';
        } else if (imageUrl.endsWith('.webp')) {
            mediaType = 'image/webp';
        }
        
        // Enhance edit prompt with Meta guardrails
        const enhancedEditPrompt = enhancePromptWithMetaGuardrails(editPrompt, true);
        
        // Use messages format with file input
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Edit this image with the following instructions: ${enhancedEditPrompt}

IMPORTANT: Maintain Meta's native ad aesthetic - natural, realistic, mobile-optimized with proper safe zones.`,
                        },
                        {
                            type: 'file',
                            mediaType: mediaType,
                            data: imageBuffer,
                        },
                    ],
                },
            ],
        });

        let publicUrl = '';

        // Upload edited image to Supabase
        for (const file of result.files) {
            if (file.mediaType.startsWith('image/')) {
                const timestamp = Date.now();
                const fileName = `edited-${timestamp}.png`;
                const editedBuffer = Buffer.from(file.uint8Array);

                // Upload to Supabase Storage
                publicUrl = await uploadToSupabase(editedBuffer, fileName, campaignId);

                // Save to generated_assets table if we have a campaign
                if (campaignId) {
                    try {
                        await supabaseServer
                            .from('generated_assets')
                            .insert({
                                campaign_id: campaignId,
                                user_id: 'temp-user-id', // TODO: Replace with actual user ID
                                asset_type: 'image',
                                storage_path: campaignId ? `campaigns/${campaignId}/${fileName}` : `temp/${fileName}`,
                                public_url: publicUrl,
                                file_size: file.uint8Array.length,
                                dimensions: { width: null, height: null },
                                generation_params: { 
                                    editPrompt, 
                                    originalUrl: imageUrl,
                                    model: 'gemini-2.5-flash-image-preview' 
                                }
                            });
                    } catch (dbError) {
                        console.error('Error saving to generated_assets:', dbError);
                    }
                }
            }
        }

        if (!publicUrl) {
            throw new Error('No image was generated from edit');
        }

        return publicUrl;
    } catch (error) {
        console.error('Error editing image:', error);
        throw error;
    }
}