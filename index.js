require("dotenv").config();
const lodashMerge = require("lodash.merge");
const fsPromises = require("fs/promises");
const { generatePodcastFeed } = require("./utils/podcast-feed");
const { convertHtmlToAudio } = require("./utils/text-to-speech");

const TTSAudioPlugin = (eleventyConfig, suppliedOptions) => {
  const defaultOptions = {
    mp3UrlDataKey: `mp3Url`,
    siteOutputDir: `_site`,
    textToSpeech: {
      language: "en-AU",
      voiceName: "en-AU-WilliamNeural",
      resourceKey: process.env.AZURE_SPEECH_RESOURCE_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      tmpDirName: `.tmp-eleventy-plugin-text-to-speech`, // don't make this settable
    },
    podcast: {
      generateFeed: false,
      infoFilename: `/podcast-info.json`,
      feedOutputPath: `/podcast.xml`,
      feedInfo: {},
    },
  };

  const options = lodashMerge(defaultOptions, suppliedOptions);

  eleventyConfig.addGlobalData("ttsAudioOptions", options);

  eleventyConfig.addCollection("generateMp3", function (collectionApi) {
    return collectionApi.getAll().filter(function (item) {
      return options.mp3UrlDataKey in item.data;
    });
  });

  eleventyConfig.on("eleventy.before", async () => {
    await fsPromises.mkdir(".tmp-eleventy-plugin-text-to-speech");
  });

  eleventyConfig.on("eleventy.after", async () => {
    await fsPromises.rmdir(".tmp-eleventy-plugin-text-to-speech");
  });

  if (options.podcast.generateFeed) {
    eleventyConfig.on("eleventy.after", () => generatePodcastFeed(options));
  }
};

class AudioVersionTemplate {
  data() {
    return {
      permalink: (data) =>
        data.mp3Page.data[data.ttsAudioOptions.mp3UrlDataKey],
      pagination: {
        data: "collections.generateMp3",
        size: 1,
        alias: "mp3Page",
      },
    };
  }

  async render(data) {
    return await convertHtmlToAudio(
      data.mp3Page.templateContent,
      data.ttsAudioOptions.textToSpeech
    );
  }
}

class PodcastInfoTemplate {
  data() {
    return {
      permalink: (data) => data.ttsAudioOptions.podcast.infoFilename,
    };
  }

  async render(data) {
    console.log(data);
    return JSON.stringify(
      data.collections.generateMp3.map((mp3Page) => ({
        title: mp3Page.data.title,
        description: mp3Page.data.description,
        date: mp3Page.data.date,
        mp3Url: mp3Page.data[data.ttsAudioOptions.mp3UrlDataKey],
        pageUrlWithSite: `${data.ttsAudioOptions.podcast.feedInfo.siteUrl}${mp3Page.url}`,
        mp3UrlWithSite: `${data.ttsAudioOptions.podcast.feedInfo.siteUrl}${
          mp3Page.data[data.ttsAudioOptions.mp3UrlDataKey]
        }`,
      })),
      null,
      2
    );
  }
}

module.exports = {
  TTSAudioPlugin,
  AudioVersionTemplate,
  PodcastInfoTemplate,
};
