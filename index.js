require("dotenv").config();
const lodashMerge = require("lodash.merge");
const fs = require("fs");
const fsPromises = require("fs/promises");

const { convertHtmlToAudio } = require("./utils/text-to-speech");

const TextToSpeechPlugin = (eleventyConfig, suppliedOptions) => {
  const defaultOptions = {
    mp3UrlDataKey: `mp3Url`,
    voiceName: "en-AU-WilliamNeural",
    resourceKey: process.env.AZURE_SPEECH_RESOURCE_KEY,
    region: process.env.AZURE_SPEECH_REGION,
  };

  const options = lodashMerge(defaultOptions, suppliedOptions);

  eleventyConfig.addGlobalData("textToSpeechPluginOptions", options);

  eleventyConfig.addCollection(
    "textToSpeechPluginPages",
    function (collectionApi) {
      return collectionApi.getAll().filter(function (item) {
        return options.mp3UrlDataKey in item.data;
      });
    }
  );

  const TMP_FOLDER_NAME = ".tmp-eleventy-plugin-text-to-speech";

  eleventyConfig.on("eleventy.before", async () => {
    if (!fs.existsSync(TMP_FOLDER_NAME))
      await fsPromises.mkdir(TMP_FOLDER_NAME);
  });

  eleventyConfig.on("eleventy.after", async () => {
    if (fs.existsSync(TMP_FOLDER_NAME))
      await fsPromises.rm(TMP_FOLDER_NAME, { recursive: true });
  });
};

class AudioVersionTemplate {
  data() {
    return {
      permalink: (data) =>
        data.mp3Page.data[data.textToSpeechPluginOptions.mp3UrlDataKey],
      pagination: {
        data: "collections.textToSpeechPluginPages",
        size: 1,
        alias: "mp3Page",
      },
    };
  }

  async render(data) {
    // console.log(data.mp3Page);
    return await convertHtmlToAudio(
      data.mp3Page.templateContent,
      data.mp3Page.data.textToSpeechPluginOptions
    );
  }
}

module.exports = {
  TextToSpeechPlugin,
  AudioVersionTemplate,
};
