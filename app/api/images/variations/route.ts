import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToSupabase } from '@/server/images';

export const maxDuration = 60; // Allow up to 60 seconds for processing 6 variations

export async function POST(req: NextRequest) {
    try {
        const { baseImageUrl, campaignId } = await req.json();

        if (!baseImageUrl) {
            return NextResponse.json(
                { error: 'baseImageUrl is required' },
                { status: 400 }
            );
        }

        console.log(`🎨 Generating 6 variations for image: ${baseImageUrl}`);

        // Fetch the base image
        const imageResponse = await fetch(baseImageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Get original image metadata
        const imageMetadata = await sharp(imageBuffer).metadata();
        const originalWidth = imageMetadata.width || 1024;
        const originalHeight = imageMetadata.height || 1024;

        console.log(`📐 Original dimensions: ${originalWidth}x${originalHeight}`);

        const timestamp = Date.now();
        const variations: string[] = [];

        // Variation 1: Original (no changes, just re-upload for consistency)
        console.log('Creating variation 1/6: Original...');
        const variation1 = await sharp(imageBuffer)
            .png()
            .toBuffer();
        const url1 = await uploadToSupabase(
            variation1,
            `variation-1-original-${timestamp}.png`,
            campaignId
        );
        variations.push(url1);

        // Variation 2: Warm tone
        console.log('Creating variation 2/6: Warm tone...');
        const variation2 = await sharp(imageBuffer)
            .modulate({
                brightness: 1.05,
                saturation: 1.1,
                hue: 10
            })
            .png()
            .toBuffer();
        const url2 = await uploadToSupabase(
            variation2,
            `variation-2-warm-${timestamp}.png`,
            campaignId
        );
        variations.push(url2);

        // Variation 3: Cool tone
        console.log('Creating variation 3/6: Cool tone...');
        const variation3 = await sharp(imageBuffer)
            .modulate({
                brightness: 1.05,
                saturation: 1.1,
                hue: -10
            })
            .png()
            .toBuffer();
        const url3 = await uploadToSupabase(
            variation3,
            `variation-3-cool-${timestamp}.png`,
            campaignId
        );
        variations.push(url3);

        // Variation 4: High contrast
        console.log('Creating variation 4/6: High contrast...');
        const variation4 = await sharp(imageBuffer)
            .normalize()
            .modulate({
                saturation: 1.2
            })
            .png()
            .toBuffer();
        const url4 = await uploadToSupabase(
            variation4,
            `variation-4-contrast-${timestamp}.png`,
            campaignId
        );
        variations.push(url4);

        // Variation 5: Soft/muted
        console.log('Creating variation 5/6: Soft/muted...');
        const variation5 = await sharp(imageBuffer)
            .blur(0.5)
            .modulate({
                saturation: 0.8
            })
            .png()
            .toBuffer();
        const url5 = await uploadToSupabase(
            variation5,
            `variation-5-soft-${timestamp}.png`,
            campaignId
        );
        variations.push(url5);

        // Variation 6: Zoomed crop (extract center 85%, resize back)
        console.log('Creating variation 6/6: Zoomed crop...');
        const cropPercentage = 0.85;
        const newWidth = Math.floor(originalWidth * cropPercentage);
        const newHeight = Math.floor(originalHeight * cropPercentage);
        const left = Math.floor((originalWidth - newWidth) / 2);
        const top = Math.floor((originalHeight - newHeight) / 2);

        const variation6 = await sharp(imageBuffer)
            .extract({
                left,
                top,
                width: newWidth,
                height: newHeight
            })
            .resize(originalWidth, originalHeight, {
                fit: 'fill',
                kernel: 'lanczos3'
            })
            .png()
            .toBuffer();
        const url6 = await uploadToSupabase(
            variation6,
            `variation-6-zoom-${timestamp}.png`,
            campaignId
        );
        variations.push(url6);

        console.log(`✅ Successfully generated ${variations.length} variations`);

        return NextResponse.json({
            success: true,
            variations,
            baseImageUrl
        });

    } catch (error) {
        console.error('Error generating variations:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate variations',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

