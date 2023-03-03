import { App } from '@slack/bolt';
import { slackConfig } from '@/config';

let slack: App;

export async function getSlackConnection() {
    if (slack) {
        return slack;
    }

    slack = new App({
        ...slackConfig,
    });

    await slack.start();
    console.log(`⚡️ Slack app is running on port ${slackConfig.port}`);

    return slack;
}
