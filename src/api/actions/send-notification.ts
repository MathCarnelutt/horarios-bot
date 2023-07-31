import { Bot } from 'grammy';
import { NotifyParams } from '../types/notify-params';
import { getUserFromApiKey, User } from '../../lib/user';
import { getNotificationByOwnerAndKeyword, Notification } from '../../lib/notification';
import { Context } from '../../common/types/context';
import { createNotificationHistory } from '../../lib/notification-history';

function parseMessage(message: string, variables: NotifyParams['variables']) {
	if (!variables) {
		return message;
	}

	return Object.entries(variables).reduce((acc, [key, value]) => {
		return acc.replace(`{{${key}}}`, value.toString());
	}, message);
}

interface SendNotificationAndLog {
	bot: Bot<Context>;
	user: User;
	notification: Notification;
	messageText: string;
}

async function sendNotificationAndLog({
	bot,
	user,
	notification,
	messageText
}: SendNotificationAndLog) {
	const message = await bot.api.sendMessage(user.telegramID, messageText);
	await createNotificationHistory({
		notificationID: notification.id,
		userID: user.id,
		messageID: message.message_id
	});
}

export const sendNotification = async (bot: Bot<Context>, params: NotifyParams) => {
	const user = await getUserFromApiKey(params.apiKey);
	if (!user) {
		throw new Error(`User not found: "${params.apiKey}"`);
	}

	const { notification, usersToNotify } = await getNotificationByOwnerAndKeyword(
		user.id!,
		params.keyword
	);

	if (!notification) {
		throw new Error(`Notification not found: "${params.keyword}"`);
	}

	const message = parseMessage(notification.message, params.variables);

	const results = await Promise.allSettled([
		sendNotificationAndLog({
			bot: bot,
			user: user,
			notification: notification,
			messageText: message
		}),
		...usersToNotify.map((user) =>
			sendNotificationAndLog({
				bot: bot,
				user: user,
				notification: notification,
				messageText: message
			})
		)
	]);

	const errors = results.filter(
		(result) => result.status === 'rejected'
	) as PromiseRejectedResult[];

	if (errors.length) {
		errors.forEach((error) => {
			console.warn(`Failed to send message to user: ${error.reason}`);
		});
	}
};
