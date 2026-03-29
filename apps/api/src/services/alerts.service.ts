import { prisma } from '../lib/prisma';
import { CreateAlertInput, UpdateAlertInput } from '../validators/alerts.validator';

// --- CRUD ---

export async function getAlerts(userId: string) {
  return prisma.alertRule.findMany({
    where: { userId },
    include: { model: { select: { brand: true, name: true, variant: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAlert(userId: string, input: CreateAlertInput) {
  return prisma.alertRule.create({
    data: {
      userId,
      name: input.name,
      modelId: input.modelId ?? null,
      region: input.region,
      condition: input.condition,
      threshold: input.threshold ?? null,
      channel: input.channel,
    },
  });
}

export async function updateAlert(userId: string, alertId: string, input: UpdateAlertInput) {
  const alert = await prisma.alertRule.findFirst({ where: { id: alertId, userId } });
  if (!alert) throw new Error('Alerta não encontrado');

  return prisma.alertRule.update({
    where: { id: alertId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.modelId !== undefined && { modelId: input.modelId }),
      ...(input.region !== undefined && { region: input.region }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.threshold !== undefined && { threshold: input.threshold }),
      ...(input.channel !== undefined && { channel: input.channel }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteAlert(userId: string, alertId: string) {
  const alert = await prisma.alertRule.findFirst({ where: { id: alertId, userId } });
  if (!alert) throw new Error('Alerta não encontrado');
  return prisma.alertRule.delete({ where: { id: alertId } });
}

// --- NOTIFICATION SENDING ---

export async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Alerts] Telegram send failed:', err);
    return false;
  }
}

export async function sendEmailAlert(apiKey: string, to: string, subject: string, body: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'MarketPrice <alertas@marketprice.app>',
        to: [to],
        subject,
        html: body,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Alerts] Email send failed:', err);
    return false;
  }
}

// --- CHECK & TRIGGER ---

interface AlertSettings {
  telegramBotToken?: string;
  telegramChatId?: string;
  emailAddress?: string;
  resendApiKey?: string;
}

export async function checkAndTriggerAlerts(userId: string, settings: AlertSettings) {
  const alerts = await prisma.alertRule.findMany({
    where: { userId, isActive: true },
    include: { model: { select: { id: true, brand: true, name: true, variant: true } } },
  });

  const results: Array<{ alertId: string; triggered: boolean; message?: string }> = [];

  for (const alert of alerts) {
    // Cooldown: don't trigger same alert within 1 hour
    if (alert.lastTriggered && Date.now() - alert.lastTriggered.getTime() < 3600000) {
      results.push({ alertId: alert.id, triggered: false });
      continue;
    }

    const regionFilter = alert.region.length <= 3
      ? { region: { endsWith: alert.region, mode: 'insensitive' as const } }
      : { region: { contains: alert.region, mode: 'insensitive' as const } };

    let triggered = false;
    let message = '';

    if (alert.condition === 'price_below' && alert.modelId && alert.threshold) {
      const listings = await prisma.listing.findMany({
        where: {
          modelId: alert.modelId,
          ...regionFilter,
          isOutlier: false,
          isActive: true,
          price: { lte: alert.threshold },
        },
        select: { title: true, price: true, fbUrl: true },
        orderBy: { price: 'asc' },
        take: 3,
      });
      if (listings.length > 0) {
        triggered = true;
        const modelName = alert.model ? `${alert.model.brand} ${alert.model.name} ${alert.model.variant}` : 'Modelo';
        message = `\u{1F4B0} <b>${alert.name}</b>\n\n${modelName} abaixo de R$${Number(alert.threshold)}:\n\n` +
          listings.map(l => `\u2022 R$${Number(l.price)} \u2014 <a href="${l.fbUrl}">Ver an\u00fancio</a>`).join('\n');
      }
    } else if (alert.condition === 'price_above' && alert.modelId && alert.threshold) {
      const listings = await prisma.listing.findMany({
        where: {
          modelId: alert.modelId,
          ...regionFilter,
          isOutlier: false,
          isActive: true,
          price: { gte: alert.threshold },
        },
        select: { title: true, price: true, fbUrl: true },
        orderBy: { price: 'desc' },
        take: 3,
      });
      if (listings.length > 0) {
        triggered = true;
        const modelName = alert.model ? `${alert.model.brand} ${alert.model.name} ${alert.model.variant}` : 'Modelo';
        message = `\u{1F4C8} <b>${alert.name}</b>\n\n${modelName} acima de R$${Number(alert.threshold)}:\n\n` +
          listings.map(l => `\u2022 R$${Number(l.price)} \u2014 <a href="${l.fbUrl}">Ver an\u00fancio</a>`).join('\n');
      }
    } else if (alert.condition === 'new_deal_hot') {
      // Check for hot deals in region
      const modelFilter = alert.modelId ? { modelId: alert.modelId } : {};

      const listings = await prisma.listing.findMany({
        where: {
          ...modelFilter,
          ...regionFilter,
          isOutlier: false,
          isActive: true,
          capturedAt: { gte: new Date(Date.now() - 3600000) }, // Last hour
        },
        select: { title: true, price: true, fbUrl: true, model: { select: { brand: true, name: true, variant: true } } },
        take: 5,
      });

      if (listings.length > 0) {
        triggered = true;
        message = `\u{1F525} <b>${alert.name}</b>\n\n${listings.length} novos an\u00fancios na \u00faltima hora:\n\n` +
          listings.map(l => `\u2022 ${l.model.brand} ${l.model.name} ${l.model.variant} \u2014 R$${Number(l.price)}`).join('\n');
      }
    } else if (alert.condition === 'price_drop' && alert.modelId) {
      // Check if average dropped significantly in last 24h vs last week
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [recentListings, olderListings] = await Promise.all([
        prisma.listing.findMany({
          where: { modelId: alert.modelId, ...regionFilter, isOutlier: false, capturedAt: { gte: oneDayAgo } },
          select: { price: true },
        }),
        prisma.listing.findMany({
          where: { modelId: alert.modelId, ...regionFilter, isOutlier: false, capturedAt: { gte: sevenDaysAgo, lt: oneDayAgo } },
          select: { price: true },
        }),
      ]);

      if (recentListings.length >= 3 && olderListings.length >= 3) {
        const recentAvg = recentListings.reduce((s, l) => s + Number(l.price), 0) / recentListings.length;
        const olderAvg = olderListings.reduce((s, l) => s + Number(l.price), 0) / olderListings.length;
        const dropPercent = ((olderAvg - recentAvg) / olderAvg) * 100;

        if (dropPercent >= 5) {
          triggered = true;
          const modelName = alert.model ? `${alert.model.brand} ${alert.model.name} ${alert.model.variant}` : 'Modelo';
          message = `\u{1F4C9} <b>${alert.name}</b>\n\n${modelName} caiu ${dropPercent.toFixed(1)}% nas \u00faltimas 24h!\nM\u00e9dia anterior: R$${Math.round(olderAvg)}\nM\u00e9dia atual: R$${Math.round(recentAvg)}`;
        }
      }
    }

    if (triggered && message) {
      // Send notifications
      if ((alert.channel === 'telegram' || alert.channel === 'both') && settings.telegramBotToken && settings.telegramChatId) {
        await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, message);
      }
      if ((alert.channel === 'email' || alert.channel === 'both') && settings.resendApiKey && settings.emailAddress) {
        const htmlMessage = message.replace(/\n/g, '<br>');
        await sendEmailAlert(settings.resendApiKey, settings.emailAddress, `MarketPrice: ${alert.name}`, htmlMessage);
      }

      // Update lastTriggered
      await prisma.alertRule.update({
        where: { id: alert.id },
        data: { lastTriggered: new Date() },
      });
    }

    results.push({ alertId: alert.id, triggered, message: triggered ? message : undefined });
  }

  return results;
}

// --- TEST NOTIFICATION ---

export async function testNotification(channel: 'telegram' | 'email', settings: AlertSettings): Promise<boolean> {
  if (channel === 'telegram' && settings.telegramBotToken && settings.telegramChatId) {
    return sendTelegramMessage(
      settings.telegramBotToken,
      settings.telegramChatId,
      '\u2705 <b>MarketPrice</b>\n\nNotifica\u00e7\u00e3o de teste! Seus alertas do Telegram est\u00e3o funcionando.'
    );
  }
  if (channel === 'email' && settings.resendApiKey && settings.emailAddress) {
    return sendEmailAlert(
      settings.resendApiKey,
      settings.emailAddress,
      'MarketPrice \u2014 Teste de Notifica\u00e7\u00e3o',
      '<h2>\u2705 Teste de Notifica\u00e7\u00e3o</h2><p>Seus alertas de email est\u00e3o funcionando!</p>'
    );
  }
  return false;
}
