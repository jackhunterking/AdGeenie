"use server";

import { generateText } from 'ai';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';

// Upload image buffer to Supabase Storage (exported for reuse in API routes)
export async function uploadToSupabase(
    imageBuffer: Buffer,
    fileName: string,
    campaignId?: string,
    metadata?: { variationType: string; category: string }
): Promise<string> {
    try {
        // Validate Supabase is configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured. Please add it to .env.local');
        }
        
        // Generate path with campaign folder if provided
        const path = campaignId 
            ? `campaigns/${campaignId}/${fileName}`
            : `temp/${fileName}`;

        console.log(`📤 Uploading to Supabase: ${path} (${imageBuffer.length} bytes)`, metadata ? `[${metadata.category}]` : '');

        // Upload to Supabase Storage with variation metadata
        const { data, error } = await supabaseServer
            .storage
            .from('campaign-assets')
            .upload(path, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false,
                metadata: metadata || {}
            });

        if (error) {
            console.error('Supabase upload error:', {
                fileName,
                campaignId,
                path,
                errorMessage: error.message,
                errorName: error.name,
            });
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
        console.error('Error uploading to Supabase:', {
            fileName,
            campaignId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

// Meta-specific prompt enhancement for visual guardrails
function enhancePromptWithMetaGuardrails(userPrompt: string, variationType?: string, goalType?: string): string {
let goalSpecificGuidance = '';
if (goalType) {
  if (goalType === 'calls') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Calls): Create visuals that suggest personal connection, accessibility, and trust. Imagery should contextually imply calling/contact as the natural next action without being too literal.\n`;
  } else if (goalType === 'leads') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Leads): Create visuals that suggest information gathering, professional consultation, or value exchange. Imagery should inspire trust and convey expertise that makes viewers want to learn more.\n`;
  } else if (goalType === 'website-visits') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Website Visits): Create visuals that suggest browsing, discovery, and digital engagement. Imagery should inspire curiosity and showcase products/services that viewers want to explore online.\n`;
  }
}

const baseEnhancement = `
${userPrompt}${goalSpecificGuidance}

HYPER-REALISTIC PHOTOGRAPHY REQUIREMENTS (MANDATORY):
- Style: HYPER-REALISTIC photography ONLY - must look like real DSLR/mirrorless camera photo
- NO illustrations, NO digital art, NO 3D renders, NO AI-looking imagery, NO stock photo aesthetics
- Authenticity: Real textures, natural skin tones, genuine materials, true-to-life lighting
- Camera: Shot with professional equipment (Canon/Sony/Nikon), shallow depth of field when appropriate
- Lighting: Natural or professional studio lighting - authentic shadows, highlights, and reflections
- People: Real human expressions, natural poses, authentic emotions (if people are in the scene)
- Details: Sharp focus on subject, natural bokeh, realistic grain, proper color grading
- Quality: Ultra high-resolution, professional-grade photography, editorial quality

STRICT VISUAL GUARDRAILS:
- Realism Level: Must be indistinguishable from a real photograph taken by a professional photographer
- NO cartoon elements, NO illustrated components, NO graphic design overlays
- NO unrealistic proportions, NO impossible lighting, NO fake-looking scenarios
- Natural imperfections: Include subtle real-world details (slight texture variations, natural wear, etc.)
- Believable environment: Real-world settings with authentic props and backgrounds

META FEED AESTHETIC:
- Native content style: Should look like organic user-generated content, not ads
- Mobile-first: Optimized for small screens, high visual impact at thumbnail size
- Scroll-stopping: Compelling composition that captures attention naturally
- Authentic vibe: Real moments, genuine scenarios, relatable scenes

COMPOSITION & FRAMING:
- Format: 1:1 square aspect ratio (perfect for Instagram/Facebook Feed)
- Safe zones: 10-12% padding on ALL edges (top, bottom, left, right) - CRITICAL for platform UI
- Center-weighted: Key elements in central 80% to prevent cropping
- Rule of thirds: Professional composition with balanced visual weight
- Clear focal point: Subject should be immediately recognizable and engaging

TECHNICAL SPECIFICATIONS:
- NO text, NO logos, NO watermarks, NO graphic overlays, NO design elements
- Clean backgrounds: Uncluttered, complementary to subject, not competing for attention
- Professional color grading: Natural tones, proper white balance, magazine-quality finish
- Sharp focus: Crystal clear on main subject, natural depth of field
- Proper exposure: Well-lit, no blown highlights or crushed shadows

The final image must pass as a professional photograph - indistinguishable from real camera photography.`;

    return baseEnhancement;
}

export async function generateImage(
    prompt: string, 
    campaignId?: string,
    numberOfImages: number = 6,
    goalType?: string
): Promise<string[]> {
    try {
        console.log(`🎨 Generating ${numberOfImages} AI-powered image variations...`);
        
        // Create unique batch ID to link all variations
        const batchId = crypto.randomUUID();
        
        // Define 6 distinct variation types - each offering a different creative approach
        // All variations MUST maintain hyper-realistic photography standards
        const variationPrompts = [
            { 
                type: 'hero_shot', 
                category: 'Classic & Professional',
                suffix: 'Hero shot: Clean, professional composition with subject centered. Balanced lighting, neutral tones, editorial magazine style. Shot with 50mm lens at f/2.8. Perfect for professional, trustworthy brand image.'
            },
            { 
                type: 'lifestyle_authentic', 
                category: 'Lifestyle & Authentic',
                suffix: 'Lifestyle photography: Natural, candid moment captured in real environment. Warm, inviting golden hour lighting. Shot with 35mm lens at f/1.8. Authentic, relatable, human-centric feel - perfect for emotional connection.'
            },
            { 
                type: 'editorial_dramatic', 
                category: 'Editorial & Bold',
                suffix: 'Editorial style: High-contrast, dramatic lighting with bold shadows. Cinematic color grading, moody atmosphere. Shot with 85mm lens at f/1.4. Eye-catching, sophisticated, premium brand positioning.'
            },
            { 
                type: 'bright_modern', 
                category: 'Bright & Contemporary',
                suffix: 'Modern commercial: Bright, airy, clean aesthetic with soft shadows. Cool color temperature, fresh look. Shot with 24-70mm lens at f/4. Contemporary, optimistic, energetic vibe - perfect for modern brands.'
            },
            { 
                type: 'detail_closeup', 
                category: 'Detail & Intimate',
                suffix: 'Macro detail shot: Intimate close-up showcasing textures and details. Shallow depth of field, beautiful bokeh. Shot with 100mm macro lens at f/2. Emphasizes quality, craftsmanship, sensory appeal.'
            },
            { 
                type: 'action_dynamic', 
                category: 'Dynamic & Energetic',
                suffix: 'Action photography: Dynamic angle capturing movement and energy. Sharp subject with motion blur in background. Shot with 24mm wide lens at f/5.6. Exciting, engaging, active lifestyle appeal.'
            }
        ];

        // Generate all variations in parallel
        const generationPromises = variationPrompts.slice(0, numberOfImages).map(async (variation, index) => {
            try {
                // Enhance prompt with Meta guardrails and variation-specific styling
                const enhancedPrompt = enhancePromptWithMetaGuardrails(
                    `${prompt}\n\n${variation.suffix}`,
                    variation.type,
                    goalType
                );
                
                console.log(`  → Generating variation ${index + 1}/${numberOfImages}: ${variation.category} (${variation.type})`);
                
                const result = await generateText({
                    model: 'google/gemini-2.5-flash-image-preview',
                    prompt: enhancedPrompt,
                    providerOptions: {
                        google: { 
                            responseModalities: ['TEXT', 'IMAGE'] 
                        },
                    },
                });

                // Process the generated image
                for (const file of result.files) {
                    if (file.mediaType.startsWith('image/')) {
                        const timestamp = Date.now();
                        const fileName = `generated-${variation.type}-${timestamp}-${index}.png`;
                        const imageBuffer = Buffer.from(file.uint8Array);

                        // Upload to Supabase Storage with variation metadata
                        const publicUrl = await uploadToSupabase(
                            imageBuffer, 
                            fileName, 
                            campaignId,
                            {
                                variationType: variation.type,
                                category: variation.category
                            }
                        );

                        // Image URL is tracked in campaign_states.ad_preview_data
                        // No need for separate asset metadata table
                        console.log(`  ✅ Variation ${index + 1} saved: ${variation.category} (${variation.type})`);

                        return publicUrl;
                    }
                }

                throw new Error(`No image generated for variation ${index + 1}`);
            } catch (error) {
                console.error(`Error generating variation ${index + 1} (${variation.type}):`, error);
                throw error;
            }
        });

        // Wait for all variations to complete
        const imageUrls = await Promise.all(generationPromises);
        
        console.log(`✅ Successfully generated ${imageUrls.length} AI variations!`);
        console.log(`   Batch ID: ${batchId}`);
        
        return imageUrls;
    } catch (error) {
        console.error('Error generating images:', error);
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
        const enhancedEditPrompt = enhancePromptWithMetaGuardrails(editPrompt);
        
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

                // Image URL is tracked in campaign_states.ad_preview_data
                // No need for separate asset metadata table
                console.log('  ✅ Edited image saved to storage');
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