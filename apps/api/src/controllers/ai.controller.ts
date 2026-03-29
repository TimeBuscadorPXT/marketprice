import { Request, Response, NextFunction } from 'express';
import * as aiAnalyst from '../services/ai-analyst.service';
import * as chatService from '../services/chat.service';

export async function getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { region } = req.query as { region: string };
    const insights = await aiAnalyst.generateDailyInsights(req.user!.userId, region);
    res.json({ success: true, data: { insights } });
  } catch (err) {
    next(err);
  }
}

export async function analyzeDeal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dealId } = req.body as { dealId: string };
    const result = await aiAnalyst.evaluateDeal(dealId, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getModelSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { modelId, region } = req.query as { modelId: string; region: string };
    const result = await aiAnalyst.generateModelSummary(modelId, region);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function aiChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, context } = req.body as { message: string; context?: string };
    const reply = await chatService.chat(req.user!.userId, {
      message,
      history: [],
      region: context ?? 'BR',
    });
    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
}
