const path = require("path");
const fsPromises = require("fs/promises");
const mp3Duration = require("mp3-duration");
const { Podcast } = require("podcast");

async function generatePodcastFeed(options) {
  // Read the generated podcast info JSON file

  if (!options.podcast.generateFeed) return;

  const SITE_OUTPUT_DIR = options.siteOutputDir;
  const PODCAST_INFO_FILENAME = options.podcast.infoFilename;

  const PODCAST_INFO_FILEPATH = path.join(
    SITE_OUTPUT_DIR,
    PODCAST_INFO_FILENAME
  );

  const podcastItemsFromJson = await fsPromises
    .readFile(PODCAST_INFO_FILEPATH)
    .then((data) => JSON.parse(data));

  //   Add file size and duration to each episode

  const podcastItems = await Promise.all(
    podcastItemsFromJson.map(async (podcastItem) => {
      const mp3FilePath = path.join(SITE_OUTPUT_DIR, podcastItem.mp3Url);

      // Get file size frmo the MP3 file

      const size = await fsPromises
        .stat(mp3FilePath)
        .then((fileStats) => fileStats.size);

      const duration = await mp3Duration(mp3FilePath);

      return {
        ...podcastItem,
        duration,
        size,
      };
    })
  );

  //   Create the podcast feed with the options set when adding plugin

  const feed = new Podcast(options.podcast.feedInfo);

  podcastItems.forEach((podcastItem) => {
    feed.addItem({
      title: podcastItem.title,
      description: podcastItem.description,
      url: podcastItem.pageUrlWithSite,
      date: podcastItem.date,
      itunesDuration: podcastItem.duration,
      itunesSummary: podcastItem.description,
      content: podcastItem.description,
      enclosure: {
        url: podcastItem.mp3UrlWithSite,
        size: podcastItem.size,
      },
    });
  });

  // Write the podcast XML file

  const podcastFeedXml = feed.buildXml();

  const PODCAST_FEED_OUTPUT_FILENAME = options.podcast.feedOutputPath;
  const PODCAST_FEED_OUTPUT_FILEPATH = path.join(
    SITE_OUTPUT_DIR,
    PODCAST_FEED_OUTPUT_FILENAME
  );

  await fsPromises.writeFile(PODCAST_FEED_OUTPUT_FILEPATH, podcastFeedXml);

  // Delete the temporary podcast info file
  await fsPromises.rm(PODCAST_INFO_FILEPATH);
}

module.exports = {
  generatePodcastFeed,
};
