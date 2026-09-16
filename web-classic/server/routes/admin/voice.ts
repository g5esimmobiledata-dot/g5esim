import { Router, type Request, type Response } from "express";
import { requireAdmin } from "server/lib/middleware";
import { openAIService } from "server/services/ai/openai-service";

const router = Router();

router.post("/speak", requireAdmin, async (req: Request, res: Response) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const speech = await openAIService.textToSpeech(text, {
      model: "gpt-4o-mini-tts",
      voice: "cedar",
      speed: 0.98,
      instructions:
        "Read this like a real live customer-support person, not an announcer. Use natural conversational English, calm confidence, small human pauses between sentences, and clear pronunciation. Keep a normal speaking speed, do not sound robotic, and do not overact.",
    });

    if (!speech.success || !speech.audio) {
      return res.status(400).json({
        success: false,
        message: speech.error || "Unable to create professional voice audio",
      });
    }

    res.setHeader("Content-Type", speech.contentType);
    res.setHeader("Cache-Control", "no-store");
    return res.send(speech.audio);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to create professional voice audio",
    });
  }
});

export default router;
