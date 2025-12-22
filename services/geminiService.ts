
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { ImageSize, ChatMessage, Difficulty, Language } from "../types";

const getAIClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const checkApiKey = async (): Promise<boolean> => {
  if ((window as any).aistudio?.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async (): Promise<void> => {
  if ((window as any).aistudio?.openSelectKey) {
    await (window as any).aistudio.openSelectKey();
  }
};

const INDIAN_ART_STYLES = [
  "Tanjore Painting (Thanjavur) style with vibrant colors and embossed gold leaf textures",
  "Madhubani (Mithila) art style with intricate geometrical patterns and natural pigments",
  "Pattachitra style from Odisha with high detail, rich colors, and mythological narrative flair",
  "Classic Raja Ravi Varma oil painting style, elegant, realistic yet divine with Victorian influence",
  "Kangra Miniature painting style, delicate lines and poetic natural settings",
  "Mysore Painting style with subtle colors and gesso work",
  "Kalighat Art style, bold lines and expressive features from Bengal"
];

/**
 * Strips away meta-labels or conversational filler often returned by AI models.
 */
const cleanDescription = (text: string): string => {
  return text
    .replace(/^(Description|Significance|Divine Knowledge|About|Note|Info|Meaning|Deity Description|Answer):\s*/i, '')
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .trim();
};

export const generateGodImage = async (godName: string, size: ImageSize, difficulty: Difficulty, language: Language = 'English'): Promise<{ imageUrl: string; description?: string }> => {
  const ai = getAIClient();
  
  let styleDescription = "";
  let useSearch = false;

  switch (difficulty) {
    case 'easy':
      styleDescription = "Professional 3D Animation Movie Style (Pixar/Disney aesthetic). High-quality 3D character render, cute, friendly, vibrant colors, expressive features, and soft cinematic lighting.";
      break;
    case 'medium':
      useSearch = true;
      const mediumStyles = [
        "Cinematic high-definition 3D Animation Movie Style render",
        "High-resolution realistic devotional representation, lifelike textures, professional lighting, authentic traditional photography"
      ];
      styleDescription = mediumStyles[Math.floor(Math.random() * mediumStyles.length)];
      break;
    case 'hard':
      useSearch = true;
      const randomArtStyle = INDIAN_ART_STYLES[Math.floor(Math.random() * INDIAN_ART_STYLES.length)];
      styleDescription = `Exquisite Traditional Indian Art: ${randomArtStyle}. High artistry, refined brushwork, traditional iconography, and cultural depth.`;
      break;
  }

  const parseResponse = (response: any) => {
    let img = "";
    let desc = "";
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          img = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          desc += part.text;
        }
      }
    }
    return { img, desc: cleanDescription(desc) };
  };

  let lastDescription = "";

  // Attempt 1: Target Model with Search Grounding for accurate iconography
  try {
    const modelToUse = useSearch ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const prompt = `Task: Generate a highly refined and artistic image of the Hindu Deity ${godName} AND a 1-sentence spiritual significance.
    Artistic Style: ${styleDescription}
    Iconography: Ensure accurate representation of weapons, vahanas (mounts), and mudras.
    Description Request: Provide exactly one sentence in ${language.toUpperCase()} explaining the deity's significance. 
    IMPORTANT: Do not include labels like "Description:" or "Significance:". Return ONLY the descriptive sentence about the deity.`;

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
        ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });

    const { img, desc } = parseResponse(response);
    if (desc) lastDescription = desc;
    if (img) return { imageUrl: img, description: lastDescription };
  } catch (error) {
    console.warn("Primary generation attempt failed:", error);
  }

  // Attempt 2: Fallback to Flash
  try {
    const fallbackPrompt = `High-quality refined artistic image of the deity ${godName} in the style: ${styleDescription}. Also include a 1-sentence description in ${language} without any labels.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: fallbackPrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    const { img, desc } = parseResponse(response);
    if (img) return { imageUrl: img, description: desc || lastDescription || `${godName} is a revered figure in Indian spirituality.` };
  } catch (error) {
    console.warn("Fallback generation failed:", error);
  }

  // Attempt 3: Ultimate Fallback (Basic Manifestation)
  try {
    const ultraFallbackPrompt = `A beautiful and respectful painting of ${godName}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: ultraFallbackPrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    const { img } = parseResponse(response);
    if (img) return { imageUrl: img, description: lastDescription || `${godName} is a manifestation of the divine.` };
  } catch (error) {
    console.error("All generation attempts failed:", error);
  }

  throw new Error("Unable to manifest the image. Please try again or check your API key.");
};

export const createChatSession = () => {
  const ai = getAIClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are a wise and respectful expert on Hindu Mythology. You help users learn about Hindu Gods. Be concise, polite, and educational.",
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
