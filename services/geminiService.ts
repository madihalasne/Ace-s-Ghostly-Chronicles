
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Ghost, JournalEntry } from "../types";

// Safer way to access environment variables without crashing the browser if 'process' is missing
const getSafeApiKey = () => {
  try {
    // Try process.env first (standard for many build tools)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Try Vite's import.meta.env
    if ((import.meta as any).env && (import.meta as any).env.VITE_API_KEY) {
      return (import.meta as any).env.VITE_API_KEY;
    }
  } catch (e) {
    console.warn("Could not automatically detect API key location.");
  }
  return "";
};

const apiKey = getSafeApiKey();
const ai = new GoogleGenAI({ apiKey });

export const hasValidKey = () => !!apiKey && apiKey.length > 10;

export const getSpectralEncounter = async (level: number, roomTitle: string, inventory: string[], ghostVibe: string): Promise<Ghost> => {
  const ghostSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      type: { type: Type.STRING, description: "Must be either 'FRIENDLY' or 'MALEVOLENT'" },
      appearance: { type: Type.STRING },
      dialogue: { type: Type.STRING },
      hint: { type: Type.STRING }
    },
    required: ["name", "type", "appearance", "dialogue", "hint"]
  };

  const inventoryString = inventory.length > 0 ? inventory.join(", ") : "nothing but his courage";

  let relationshipContext = "";
  if (level <= 3) {
    relationshipContext = "The ghosts are distant, cold, and suspicious.";
  } else if (level <= 7) {
    relationshipContext = "The ghosts are beginning to show their humanity and a strange warmth toward Ace.";
  } else {
    relationshipContext = "The ghosts feel a deep bond with Ace, welcoming him as the final soul needed for the collection.";
  }

  try {
    if (!hasValidKey()) throw new Error("Key missing");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The character 'Ace' is in Level ${level}: '${roomTitle}'.
      Ghost Vibe for this level: ${ghostVibe}.
      Ace currently carries: ${inventoryString}.
      Relationship Stage: ${relationshipContext}
      
      Generate a ghost encounter. Use a spooky but kid-appropriate appearance.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: ghostSchema
      }
    });

    const ghostData = JSON.parse(response.text || "{}");
    return {
      ...ghostData,
      type: (ghostData.type === 'FRIENDLY' || ghostData.type === 'MALEVOLENT') ? ghostData.type : 'MALEVOLENT'
    };
  } catch (error) {
    console.error("Gemini service unavailable, using fallback ghost:", error);
    return {
      name: "The Whispering Fog",
      type: "MALEVOLENT",
      appearance: "A cloud of swirling grey mist.",
      dialogue: "You walk a lonely path, child. Be careful what you seek.",
      hint: "The shadows grow longer as the clock ticks."
    };
  }
};

export const generateJournalEntry = async (level: number, roomTitle: string, choiceMade: string, wasCorrect: boolean, inventory: string[]): Promise<JournalEntry> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING },
      mood: { type: Type.STRING }
    },
    required: ["content", "mood"]
  };

  try {
    if (!hasValidKey()) throw new Error("Key missing");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a short journal entry for 'Ace' who just finished an encounter in '${roomTitle}'. He chose: ${choiceMade}. Tone: immersive, eerie.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    const data = JSON.parse(response.text || "{}");
    return { level, content: data.content, mood: data.mood as any, cluesFound: inventory };
  } catch (e) {
    return { level, content: "The shadows here are strange. I can feel eyes on the back of my neck. I must keep moving.", mood: "SCARED", cluesFound: inventory };
  }
};

export const generateRoomImage = async (roomTitle: string, description: string): Promise<string | null> => {
  try {
    if (!hasValidKey()) return null;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Cinematic, ultra-detailed gothic horror art of a haunted room called '${roomTitle}'. Story context: ${description}. Eerie moonlight, no humans or ghosts. 16:9 aspect ratio.`,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateSpeech = async (text: string, level: number, isFriendly: boolean): Promise<string | null> => {
  try {
    if (!hasValidKey()) return null;
    const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const voice = voices[(level - 1) % voices.length];
    const tonePrefix = level > 7 ? 'Softly: ' : (isFriendly ? 'Kindly: ' : 'Ghostly: ');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${tonePrefix}${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
}
