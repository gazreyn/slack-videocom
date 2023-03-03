import type { KnownBlock } from '@slack/bolt';
import ogs from 'open-graph-scraper';
import { gql, GraphQLClient } from 'graphql-request';

type OGResult = Awaited<ReturnType<typeof ogs>>;

const graphQLClient = new GraphQLClient(process.env.VIDEOCOM_API ?? '');

const videoFileExtensions = ['mp4', 'webm'];

/**
 *
 * Generates Blocks based on OG information from the URL
 *
 * @link https://api.slack.com/reference/block-kit/blocks
 * @param url URL to create blocks from
 */
export async function generateOGBlocks(config: { url: string }): Promise<KnownBlock[]> {
  const { url } = config;
  const { result, error } = await ogs({ url });

  if (error) {
    // If we error, just return an empty array. This will just mean the link won't look "Unfurled"
    console.log(`⚠️ Error generating OG Tags: ${result.error}`);
    return [];
  }

  // TODO: Use fallback values if OG values don't exist.
  return [
    {
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url: `${result.ogUrl}${result.favicon}`,
          alt_text: `${result.ogTitle}`,
        },
        {
          type: 'mrkdwn',
          text: `*${result.ogUrl}*`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${result.ogDescription}`,
      },
    },
    {
      type: 'image',
      image_url: `${result.ogImageURL}`,
      alt_text: `${result.ogTitle}`,
    },
  ];
}

/**
 *
 * Generates Blocks based on VideoCom API and OG information from the URL
 *
 * @param url URL to create blocks from
 * @param mediaId ID of VideoCom Media
 */
export async function generateMediaBlocks(config: {
  url: string;
  mediaId: string;
}): Promise<KnownBlock[]> {
  const { url, mediaId } = config;

  const variables = {
    id: mediaId,
  };

  const query = gql`
    query getMedia($id: ID!) {
      File(id: $id) {
        title
        description
        thumbnail
        extension
        url
      }
    }
  `;

  type QueryResponse = {
    File: {
      title: string;
      description: string;
      thumbnail: string;
      extension: string;
      url: string;
    };
  };

  // TODO: Cache responses
  const promises: [gqlResult: QueryResponse, ogResult: OGResult] = await Promise.all([
    graphQLClient.request<QueryResponse>(query, variables),
    ogs({ url }),
  ]);

  const [gqlResponse, ogResponse] = promises;

  // TODO: Account for scenarios where GQL Result fails - wrong API URL + result being different
  // media will be undefined
  const { File: media } = gqlResponse;
  const { result: page, error: ogError } = ogResponse;

  if (ogError) return [];

  const blockBase: KnownBlock = {
    type: 'context',
    elements: [
      {
        type: 'image',
        image_url: `${page.ogUrl}${page.favicon}`,
        alt_text: `${page.ogTitle}`,
      },
      {
        type: 'mrkdwn',
        text: `*<${url}|${page.ogTitle}>*`,
      },
    ],
  };

  const blockDescription: KnownBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${media.description}`,
    },
  };

  const blockVideo: KnownBlock = {
    type: 'video',
    title: { text: `${media.title}`, type: 'plain_text' },
    alt_text: `${media.title}`,
    thumbnail_url: `${media.thumbnail}`,
    video_url: `https://cloud.videocom.com/embed/${mediaId}`,
  };

  const blockImage: KnownBlock = {
    type: 'image',
    image_url: `${media.url}`,
    alt_text: `${media.title}`,
  };

  const blocks: KnownBlock[] = [blockBase];

  // Conditionally insert description block depending if it's set.
  if (JSON.stringify(media.description) === '\n') {
    blocks.push(blockDescription);
  }

  videoFileExtensions.includes(media.extension)
    ? blocks.push(blockVideo)
    : blocks.push(blockImage);

  return blocks;
}
