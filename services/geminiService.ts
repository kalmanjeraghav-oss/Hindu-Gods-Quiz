import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ImageSize, ChatMessage, Difficulty, Language } from "../types";

// Helper to ensure we have a fresh instance with the potentially updated key
const getAIClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateGodImage = async (godName: string, size: ImageSize, difficulty: Difficulty, language: Language = 'English'): Promise<{ imageUrl: string; description?: string }> => {
  const ai = getAIClient();
  
  let styleDescription = "";
  switch (difficulty) {
    case 'easy':
      styleDescription = "3D Animation Movie Style. Cute, charming, vibrant colors, soft lighting, clear and distinct features. Resembles a friendly character from a high-quality animated film for children.";
      break;
    case 'hard':
      styleDescription = "3D Animation Movie Style. Cinematic, dramatic lighting, detailed textures, atmospheric. Looks like a still frame from an epic fantasy animation. Mysterious, grand, and visually stunning.";
      break;
    default: // medium
      styleDescription = "3D Animation Movie Style. Majestic, heroic, magical glowing effects, rich colors. High-quality 3D render aesthetic with a divine and powerful aura.";
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

  let capturedDescription = "";

  // ATTEMPT 1: Fast Generation (Gemini 2.5 Flash Image)
  try {
    const prompt = `Generate a 3D Animation Movie Style image of the Hindu God ${godName}.
    Style: ${styleDescription}
    Requirement: You must generate an image.
    Also provide a brief 1-sentence description of who the deity is (mythology/significance) IN ${language.toUpperCase()}. Do NOT describe the visual style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const { img, desc } = parseResponse(response);
    if (desc) capturedDescription = desc.trim(); 
    if (img) return { imageUrl: img, description: desc.trim() };
    
    console.warn(`Attempt 1 (Flash) failed to return image. Text response: ${desc}`);
  } catch (error) {
    console.warn("Attempt 1 (Flash) error:", error);
  }

  // ATTEMPT 2: High Quality / Search Grounding (Gemini 3 Pro Image)
  try {
    const prompt = `Generate a high-quality 3D Animation Movie Style image of the Hindu Deity ${godName}.
    Style: ${styleDescription}
    Use your search tools to ensure accurate iconography within this animation style.
    Requirement: You must generate an image.
    Also provide a brief 1-sentence description of who the deity is IN ${language.toUpperCase()}. Do NOT describe the visual style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
        tools: [{googleSearch: {}}],
      },
    });

    const { img, desc } = parseResponse(response);
    if (desc) capturedDescription = desc.trim();
    if (img) return { imageUrl: img, description: desc.trim() };
    
    console.warn(`Attempt 2 (Pro) failed to return image. Text response: ${desc}`);
  } catch (error) {
    console.warn("Attempt 2 (Pro) error:", error);
  }

  // ATTEMPT 3: LAST RESORT (Flash Image ONLY)
  try {
    console.log("Attempting Last Resort: Image Only");
    const prompt = `Generate a 3D Animation Movie Style image of the Hindu God ${godName}.
    Style: ${styleDescription}
    Strict Requirement: Return ONLY the image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const { img } = parseResponse(response);
    
    if (img) {
      return { 
        imageUrl: img, 
        description: capturedDescription || `${godName} is a revered deity in Hinduism.` 
      };
    }
    
    throw new Error(`Last resort failed.`);
  } catch (error) {
    console.error("All image generation attempts failed:", error);
    throw new Error(`No image data found after all attempts. Last Description: ${capturedDescription}`);
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