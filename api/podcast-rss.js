import { getList, KEYS } from '../lib/storage.js';
import { seedMedia, seedEvents } from '../lib/seed.js';

const PODCAST_TITLE = 'Lost Limb Riders Podcast';
const PODCAST_DESC = 'Real conversations about limb loss, recovery, purpose, and the open road. Hosted by John Thompson.';
const PODCAST_URL = 'https://lostlimbriders.org';
const ARTWORK_URL = PODCAST_URL + '/assets/LLR-COVER-PODCAST.png';
const AUTHOR = 'John Thompson';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');

  try {
    const list = await getList(KEYS.media);
    const podcasts = (Array.isArray(list) && list.length ? list : seedMedia)
      .filter((m) => m.type === 'podcast')
      .sort((a, b) => {
        const da = new Date(b.date || b.createdAt || 0);
        const db = new Date(a.date || a.createdAt || 0);
        return da - db;
      });

    const items = podcasts.map((ep, i) => {
      const pubDate = new Date(ep.createdAt || new Date()).toUTCString();
      const id = ep.id || `episode-${i + 1}`;
      const guid = `${PODCAST_URL}/media.html#${id}`;
      const duration = ep.durationSec || 0;
      const url = ep.audioUrl || `${PODCAST_URL}/api/podcast-rss#${id}`;
      const title = escapeXml(ep.title || `Episode ${ep.num || i + 1}`);
      const desc = escapeXml(ep.desc || PODCAST_DESC);
      const epNum = escapeXml(ep.num || String(i + 1));
      const season = escapeXml(ep.season || '1');

      return `    <item>
      <title>${title}</title>
      <guid>${guid}</guid>
      <link>${guid}</link>
      <pubDate>${pubDate}</pubDate>
      <itunes:episode>${epNum}</itunes:episode>
      <itunes:season>${season}</itunes:season>
      <description>${desc}</description>
      <enclosure url="${escapeXml(url)}" type="audio/mpeg" length="0" />
      <itunes:duration>${duration}</itunes:duration>
    </item>`;
    });

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://punkwood.com/2019/itunes-redirect.xml" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${PODCAST_TITLE}</title>
    <link>${PODCAST_URL}/media.html</link>
    <description>${PODCAST_DESC}</description>
    <language>en-us</language>
    <copyright>© 2026 ${AUTHOR}. All rights reserved.</copyright>
    <itunes:author>${AUTHOR}</itunes:author>
    <itunes:summary>${PODCAST_DESC}</itunes:summary>
    <itunes:image href="${ARTWORK_URL}" />
    <itunes:category text="Society & Culture" />
    <itunes:type>episodic</itunes:type>
    <image>
      <url>${ARTWORK_URL}</url>
      <title>${PODCAST_TITLE}</title>
      <link>${PODCAST_URL}/media.html</link>
    </image>
${items.length ? items.join('\n') : '    <!-- No episodes yet -->'}
  </channel>
</rss>`;

    res.status(200).send(rss);
  } catch (e) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>Failed to generate podcast feed.</description></channel></rss>');
  }
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
