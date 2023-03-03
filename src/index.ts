import type { MessageAttachment, LinkUnfurls } from '@slack/bolt';
import { getSlackConnection } from './lib/slack';
import { generateOGBlocks, generateMediaBlocks } from './lib/blocks';

function getMediaIdFromLink(url: string): string | null {
  const urlRegex = /(?:https?):\/\/cloud\.videocom\.com\/(media|embed)\/(\w+)/;
  const urlTest = url.match(urlRegex);

  if (!urlTest) return null;

  const [, , mediaId] = urlTest;

  return mediaId;
}

async function mediaAttachmentFromLink(link: { domain: string; url: string }) {
  const { url } = link;
  const mediaId = getMediaIdFromLink(url);

  const attachment: MessageAttachment = {
    blocks: [],
  };

  if (!mediaId) {
    // The provided link is NOT a piece of media, so we should just use OG info
    attachment.blocks = [...(await generateOGBlocks(url))];
  } else {
    attachment.blocks = [...(await generateMediaBlocks(url, mediaId))];
  }

  return attachment;
}

async function main() {
  const slack = await getSlackConnection();

  slack.event('link_shared', async ({ event }) => {
    const { links } = event;

    let unfurls: LinkUnfurls = {};
    const attatchments = await Promise.all(links.map(mediaAttachmentFromLink));
    attatchments.forEach((attachment, index) => {
      if (!attachment) return;
      unfurls[links[index].url] = attachment;
    });

    try {
      await slack.client.chat.unfurl({
        ts: event.message_ts,
        channel: event.channel,
        unfurls,
      });
    } catch (err: any) {
      console.log(err);
      console.log(err.data.response_metadata);
    }
  });
}

main();
