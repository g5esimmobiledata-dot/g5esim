import { Router, type Request, type Response } from "express";
import { requireAdmin } from "server/lib/middleware";
import { openAIService } from "server/services/ai/openai-service";

const router = Router();

const languageNames: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  hi: "Hindi",
  pl: "Polish",
  sv: "Swedish",
};

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const text = String(req.body?.text || "").trim();
    const targetLanguage = String(req.body?.targetLanguage || "en").trim().toLowerCase();
    const languageName = languageNames[targetLanguage] || targetLanguage;

    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const result = await openAIService.chatCompletion(text, {
      model: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 1600,
      systemPrompt: [
        `Translate the user's text into ${languageName}.`,
        "Preserve names, prices, package codes, URLs, phone numbers, order IDs, SIP details, and technical terms exactly when possible.",
        "Keep the same tone and formatting.",
        "Return only the translated text, with no explanation.",
      ].join("\n"),
    });

    if (!result.success || !result.content?.trim()) {
      return res.status(400).json({
        success: false,
        message: result.error || "Translation failed",
      });
    }

    return res.json({
      success: true,
      data: {
        translatedText: result.content.trim(),
        targetLanguage,
        targetLanguageName: languageName,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Translation failed",
    });
  }
});

export default router;
