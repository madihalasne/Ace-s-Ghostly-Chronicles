
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Ghost, JournalEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    relationshipContext = "The ghosts are distant, cold, and suspicious. They see Ace as a mere intruder.";
  } else if (level <= 7) {
    relationshipContext = "The ghosts are beginning to show their humanity. They feel a strange warmth from Ace's presence and speak with a hint of regret or longing.";
  } else {
    relationshipContext = "The ghosts feel a deep bond with Ace. They see him as the final soul needed to complete the house's collection. Their dialogue should be soft, vulnerable, and almost familial, as they prepare him for his eternal stay.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The character 'Ace' is in Level ${level}: '${roomTitle}'.
      Ghost Vibe for this level: ${ghostVibe}.
      Ace currently carries: ${inventoryString}.
      Relationship Stage: ${relationshipContext}
      
      Generate a ghost encounter. 
      The ghost should have a specific name and a spooky but kid-appropriate appearance.
      
      CRITICAL: The dialogue and hint MUST reflect the progressive relationship. 
      - Level 10 ghost should speak as if they are welcoming Ace to join them forever.
      - Dialogue should be dramatic, atmospheric, and emotionally resonant.`,
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
    console.error("Gemini failed:", error);
    return {
      name: "The Nameless One",
      type: "MALEVOLENT",
      appearance: "A hovering shadow of grey mist.",
      dialogue: "You do not belong in this house, child. But you will stay anyway.",
      hint: "All paths here lead to the same cold grave."
    };
  }
};

export const generateJournalEntry = async (level: number, roomTitle: string, choiceMade: string, wasCorrect: boolean, inventory: string[]): Promise<JournalEntry> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "A short diary entry (2-3 sentences) from Ace's POV about what happened in this room." },
      mood: { type: Type.STRING, description: "BRAVE, SCARED, or CURIOUS" }
    },
    required: ["content", "mood"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a short journal entry for 'Ace' who just finished an encounter in '${roomTitle}' (Level ${level}).
      He chose to: ${choiceMade}.
      The outcome was: ${wasCorrect ? "Success" : "Failure"}.
      He currently carries: ${inventory.join(", ") || "nothing"}.
      The tone should be immersive, slightly eerie, and reflective of a child's inner thoughts in a haunted house.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    const data = JSON.parse(response.text || "{}");
    return { level, content: data.content, mood: data.mood as any, cluesFound: inventory };
  } catch (e) {
    return { level, content: "The shadows here are strange. I keep moving, even if I'm afraid.", mood: "SCARED", cluesFound: inventory };
  }
};

export const generateRoomImage = async (roomTitle: string, description: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A cinematic, ultra-detailed, dark fantasy concept art piece of a room inside a haunted manor called '${roomTitle}'. Story context: ${description}. The environment should be hauntingly beautiful, with eerie moonlight, swirling dust motes, and a heavy sense of mystery. Art style: gothic horror, atmospheric, 16:9, high contrast. Strictly NO humans or ghosts in the frame, just the environment itself.`,
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
    console.error("Room image generation failed:", error);
    return null;
  }
};

export const generateSpeech = async (text: string, level: number, isFriendly: boolean): Promise<string | null> => {
  try {
    const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const voiceIndex = (level - 1) % voices.length;
    const voice = voices[voiceIndex];

    const tonePrefix = level > 7 ? 'Softly and welcomingly: ' : (isFriendly ? 'Kindly: ' : 'Threateningly: ');

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
};
