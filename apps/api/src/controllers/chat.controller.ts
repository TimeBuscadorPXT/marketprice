import { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reply = await chatService.chat(req.user!.userId, req.body);
    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
}
