import { VercelRequest, VercelResponse } from '@vercel/node';
import { webhookCallback } from 'grammy';

import { createBot } from '../src/bot.js';

const { BOT_TOKEN } = process.env;

export default async (req: VercelRequest, res: VercelResponse) => {
	const reqSecret = req.query.secret;
	if (reqSecret !== BOT_TOKEN) {
		res.status(401).send({
			message: 'You do not have access.'
		});
		return;
	}

	const { bot } = createBot();

	webhookCallback(bot, 'https')(req, res);
};
