import { Request, Response, NextFunction } from 'express';
import * as alertsService from '../services/alerts.service';

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await alertsService.getAlerts(req.user!.userId);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

export async function createAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await alertsService.createAlert(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

export async function updateAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await alertsService.updateAlert(req.user!.userId, req.params.id!, req.body);
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

export async function deleteAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await alertsService.deleteAlert(req.user!.userId, req.params.id!);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function checkAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await alertsService.checkAndTriggerAlerts(req.user!.userId, req.body);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

export async function testNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { channel, ...settings } = req.body;
    const success = await alertsService.testNotification(channel, settings);
    res.json({ success: true, data: { sent: success } });
  } catch (err) {
    next(err);
  }
}
