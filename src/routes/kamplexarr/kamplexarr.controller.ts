import { WebhookMessageCreateOptions } from 'discord.js';
import { NextFunction, Request, Response, Router } from 'express';

import { kamplexarrService } from './kamplexarr.service';

const router: Router = Router();

router.post('/webhook/:guild/:channel', async (req: Request<any, any, WebhookMessageCreateOptions>, res: Response, next: NextFunction) => {
  try {
    const guildId = req.params.guild;
    const channelId = req.params.channel;
    const result = await kamplexarrService.sendWebhook(guildId, channelId, req.body);
    res.status(200).send(result);
  } catch (e) {
    next(e);
  }
});

export const kamplexarr = router;