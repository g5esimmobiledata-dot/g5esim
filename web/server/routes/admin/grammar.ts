import { Router, type Request, type Response } from "express";
import { requireAdmin } from "server/lib/middleware";
import { openAIService } from "server/services/ai/openai-service";

const router = Router();

router.post("/polish", requireAdmin, async (req: Request, res: Response) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const result = await openAIService.chatCompletion(text, {
      model: "gpt-4o-mini",
      temperature: 0.15,
      maxTokens: 1600,
      systemPrompt: [
        "Correct grammar, spelling, punctuation, and sentence flow.",
        "Make the text professional, clear, polite, and suitable for customer support.",
        "Preserve the original meaning, names, prices, package codes, URLs, phone numbers, order IDs, SIP details, and technical terms.",
        "Do not add promises, facts, dates, or details that are not in the original text.",
        "Return only the corrected text, with no explanation.",
      ].join("\n"),
    });

    if (!result.success || !result.content?.trim()) {
      return res.status(400).json({
        success: false,
        message: result.error || "Grammar correction failed",
      });
    }

    return res.json({
      success: true,
      data: {
        correctedText: result.content.trim(),
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Grammar correction failed",
    });
  }
});

export default router;
