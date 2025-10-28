/**
 * Feature: PromptBuilder for Image Generation
 * Purpose: Compose qualitative, guardrailed prompts without numeric safe-zones or camera f-numbers
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 */

export interface PromptBuilderInput {
    content: string;
}

/**
 * Build a qualitative prompt with strict negatives to prevent frames/labels/numbers.
 * This function intentionally avoids any numeric safe-zone percentages or camera f-numbers.
 */
export function buildImagePrompt({ content }: PromptBuilderInput): string {
    const parts: string[] = [];

    parts.push(content);

    parts.push(
        `\n\nHYPER-REALISTIC PHOTOGRAPHY REQUIREMENTS (MANDATORY):\n` +
        `- Style: HYPER-REALISTIC photography ONLY - must look like real DSLR/mirrorless camera photo\n` +
        `- NO illustrations, NO digital art, NO 3D renders, NO AI-looking imagery, NO stock photo aesthetics\n` +
        `- Authenticity: Real textures, natural skin tones, genuine materials, true-to-life lighting\n` +
        `- Camera: Shot with professional equipment (Canon/Sony/Nikon); use shallow depth of field when appropriate\n` +
        `- Lighting: Natural or professional studio lighting - authentic shadows, highlights, and reflections\n` +
        `- People: Real human expressions, natural poses, authentic emotions (if people are in the scene)\n` +
        `- Details: Sharp focus on subject, natural bokeh when applicable, realistic grain, proper color grading\n` +
        `- Quality: Ultra high-resolution, professional-grade photography, editorial quality`
    );

    parts.push(
        `\n\nSTRICT VISUAL GUARDRAILS:\n` +
        `- Realism Level: Must be indistinguishable from a real photograph\n` +
        `- NO cartoon elements, NO illustrated components, NO graphic design overlays\n` +
        `- NO unrealistic proportions, NO impossible lighting, NO fake-looking scenarios\n` +
        `- Natural imperfections: Include subtle real-world details\n` +
        `- Believable environment: Real-world settings with authentic props and backgrounds`
    );

    parts.push(
        `\n\nMETA FEED AESTHETIC:\n` +
        `- Native content style: Should look like organic user-generated content, not ads\n` +
        `- Mobile-first: Optimized for small screens, high visual impact at thumbnail size\n` +
        `- Scroll-stopping: Compelling composition that captures attention naturally\n` +
        `- Authentic vibe: Real moments, genuine scenarios, relatable scenes`
    );

    parts.push(
        `\n\nCOMPOSITION & FRAMING:\n` +
        `- Format: 1:1 square aspect ratio (perfect for Instagram/Facebook Feed)\n` +
        `- Edge safety: Keep edges clean; avoid placing critical content near edges; do not draw frames, borders, crop marks, or guides\n` +
        `- Center-weighted: Key elements in central area to prevent cropping\n` +
        `- Rule of thirds: Professional composition with balanced visual weight\n` +
        `- Clear focal point: Subject should be immediately recognizable and engaging`
    );

    parts.push(
        `\n\nTECHNICAL SPECIFICATIONS:\n` +
        `- Absolutely NO text, NO logos, NO watermarks, NO graphic overlays, NO design elements\n` +
        `- Do NOT include numbers, percentages, camera readouts, EXIF text, or corner labels\n` +
        `- Clean backgrounds: Uncluttered, complementary to subject, not competing for attention\n` +
        `- Professional color grading: Natural tones, proper white balance, magazine-quality finish\n` +
        `- Sharp focus: Crystal clear on main subject; natural depth of field when appropriate\n` +
        `- Proper exposure: Well-lit, no blown highlights or crushed shadows`
    );

    parts.push(`\n\nThe final image must pass as a professional photograph - indistinguishable from real camera photography.`);

    return parts.join('\n');
}


