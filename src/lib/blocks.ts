import type { KnownBlock } from '@slack/bolt';
import ogs from 'open-graph-scraper';
import { gql, GraphQLClient } from 'graphql-request';

const graphQLClient = new GraphQLClient(process.env.VIDEOCOM_API ?? '');

/**
 *
 * Generates Blocks based on OG information from the URL
 *
 * @link https://api.slack.com/reference/block-kit/blocks
 * @param url URL to create blocks from
 */
export async function generateOGBlocks(url: string): Promise<KnownBlock[]> {
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
export async function generateMediaBlocks(
  url: string,
  mediaId: string,
): Promise<KnownBlock[]> {
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
      }
    }
  `;

  const response: any = await graphQLClient.request(query, variables);
  const { File } = response;

  const { result, error } = await ogs({ url });
  if (error) return [];

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
          text: `*${result.ogTitle}*`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${File.description}`,
      },
    },
    {
      type: 'video',
      title: { text: `${File.title}`, type: 'plain_text' },
      alt_text: `${File.title}`,
      thumbnail_url: `${File.thumbnail}`,
      video_url: `https://cloud.videocom.com/embed/${mediaId}`,
    },
  ];
}
