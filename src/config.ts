import type { AppOptions } from '@slack/bolt';

export const slackConfig: AppOptions = {
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    port: Number(process.env.PORT ?? '3120'),
    socketMode: true,
};
