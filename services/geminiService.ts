import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ImageSize, ChatMessage, Difficulty } from "../types";

// Helper to ensure we have a fresh instance with the potentially updated key
const getAIClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateGodImage = async (godName: string, size: ImageSize, difficulty: Difficulty): Promise<{ imageUrl: string; description?: string }> => {
  const ai = getAIClient();
  
  let styleDescription = "";
  switch (difficulty) {
    case 'easy':
      styleDescription = "A close-up, very clear, and traditional calendar-art style portrait. Bright, vibrant colors with distinct, easily recognizable iconographic attributes. The deity should be the sole focus, facing forward, with perfect clarity.";
      break;
    case 'hard':
      styleDescription = "An ancient, weathered stone sculpture style or a faded mural found in a lost temple. Atmospheric, mystical, with dramatic shadows and slightly abstract features. The deity should be recognizable but require close observation.";
      break;
    default: // medium
      styleDescription = "A highly detailed, majestic, and refined artistic portrait. Style: Tanjore painting with dramatic lighting and a divine aura. Focus on the face and upper body.";
      break;
  }

  // Helper to extract image and description from response
  const parseResponse = (response: any) => {
    let img = "";
    let desc = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        img = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        desc += part.text;
      }
    }
    return { img, desc };
  };

  // ATTEMPT 1: Fast Generation (Gemini 2.5 Flash Image)
  // This is significantly faster than Pro.
  try {
    const prompt = `Create a respectful, artistic illustration of Hindu God ${godName}.
    ${styleDescription}
    Also provide a brief 1-sentence description.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        // Flash does not support imageSize, but supports aspectRatio
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const { img, desc } = parseResponse(response);
    if (img) return { imageUrl: img, description: desc.trim() };
    
    console.warn(`Attempt 1 (Flash) failed/refused. Model response: ${desc}`);
  } catch (error) {
    console.warn("Attempt 1 (Flash) error:", error);
  }

  // ATTEMPT 2: High Quality / Search Grounding (Gemini 3 Pro Image)
  // Fallback if Flash fails or triggers safety filters.
  try {
    const prompt = `Generate a high-quality, respectful image of the Hindu Deity ${godName}.
    ${styleDescription}
    Use your search tools to ensure accurate iconography (weapons, attire, posture).
    Also provide a brief 1-sentence description.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
        tools: [{googleSearch: {}}],
      },
    });

    const { img, desc } = parseResponse(response);
    if (img) return { imageUrl: img, description: desc.trim() };
    
    // If both fail, throw error to be caught by the UI
    throw new Error(`No image data found. Model response: ${desc}`);
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

export const createChatSession = () => {
  const ai = getAIClient();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: "You are a wise and respectful expert on Hindu Mythology, Vedas, and Puranas. You help users learn about Hindu Gods. Be concise, polite, and educational. If the user asks about the current quiz image, answer based on general knowledge of that deity.",
    },
  });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result = await chat.sendMessage({ message });
    return result.text || "I apologize, I could not generate a response.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Something went wrong. Please try asking again.";
  }
};

// Check for API Key presence
export const checkApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (typeof win.aistudio !== 'undefined') {
      return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

// Open Key Selection
export const requestApiKey = async (): Promise<void> => {
   const win = window as any;
   if (typeof win.aistudio !== 'undefined') {
      await win.aistudio.openSelectKey();
   }
};
