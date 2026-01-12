
import { GoogleGenAI, Type } from "@google/genai";
import { ShortsFactoryResponse } from "../types";

// Adhering to @google/genai initialization guidelines using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    video_analysis: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.NUMBER },
        main_topic: { type: Type.STRING },
        primary_emotion: { type: Type.STRING },
        viral_potential: { type: Type.NUMBER },
        trend_reasoning: { type: Type.STRING }
      },
      required: ["duration", "main_topic", "primary_emotion", "viral_potential", "trend_reasoning"]
    },
    best_clips: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          start: { type: Type.NUMBER },
          end: { type: Type.NUMBER },
          duration: { type: Type.NUMBER },
          hook: { type: Type.STRING },
          reason: { type: Type.STRING },
          energy: { type: Type.STRING }
        },
        required: ["id", "start", "end", "duration", "hook", "reason", "energy"]
      }
    },
    captions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clip_id: { type: Type.INTEGER },
          bn_main: { type: Type.STRING },
          en_sub: { type: Type.STRING },
          voiceover_script: { type: Type.STRING },
          vfx_suggestions: { type: Type.STRING },
          hashtags: {
            type: Type.OBJECT,
            properties: {
              bn: { type: Type.ARRAY, items: { type: Type.STRING } },
              en: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["bn", "en"]
          }
        },
        required: ["clip_id", "bn_main", "en_sub", "voiceover_script", "vfx_suggestions", "hashtags"]
      }
    },
    thumbnails: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clip_id: { type: Type.INTEGER },
          description: { type: Type.STRING }
        },
        required: ["clip_id", "description"]
      }
    },
    seo: {
      type: Type.OBJECT,
      properties: {
        titles: { type: Type.ARRAY, items: { type: Type.STRING } },
        best_time: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["titles", "best_time", "tags"]
    }
  },
  required: ["video_analysis", "best_clips", "captions", "thumbnails", "seo"]
};

/**
 * Analyzes video content using Gemini models to generate viral shorts data.
 * Adheres to Gemini API guidelines for complex reasoning tasks by using gemini-3-pro-preview.
 */
export async function analyzeVideoContent(videoMetadata: { name: string, size: number, type: string }, frames: string[]): Promise<ShortsFactoryResponse> {
  // Using gemini-3-pro-preview for advanced reasoning and multimodal analysis tasks
  const model = "gemini-3-pro-preview";
  
  const frameParts = frames.map(base64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64.split(",")[1]
    }
  }));

  const prompt = `
    You are the ULTIMATE YouTube Shorts Creator AI. 
    Analyze the provided video frames.
    
    1. EXTRACT: 5 Clips. MANDATORY: Each clip MUST be at least 59 seconds long, but strictly under 60 seconds (aim for exactly 59.5 seconds).
    2. CAPTIONS: One high-energy Bangla hook caption (25 words) and one English subtitle.
    3. NEW - VOICEOVER: Write a script for a Narrator. Include tone hints like [Suspenseful] or [Excited].
    4. NEW - VFX: Tell the user exactly where to add "Zoom In", "Emoji Overlay", or "Slow Motion" to maximize engagement.
    5. TREND: Explain WHY this will go viral based on current TikTok/Reels trends.

    Targeting vertical 9:16 composition. Ensure clips are high energy and meet the 59-second minimum requirement.
  `;

  // Always use ai.models.generateContent to query with both model name and prompt
  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [...frameParts, { text: prompt }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.9,
    }
  });

  // Accessing text as a property on GenerateContentResponse
  const text = response.text;
  if (!text) throw new Error("AI Processing Failed");
  
  const results = JSON.parse(text) as ShortsFactoryResponse;
  return results;
}
