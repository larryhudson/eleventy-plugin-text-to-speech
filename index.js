require("dotenv").config();
const lodashMerge = require("lodash.merge");
const fs = require("fs");
const fsPromises = require("fs/promises");
const htmlToText = require("html-to-text");

const { convertTextToSpeech } = require("./utils/text-to-speech");

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
  //
  mp3PagesArray = "collections.textToSpeechPluginPages";
  getContentFromData = (mp3Page) => mp3Page.templateContent;
  getMp3UrlFromData = (mp3Page) =>
    mp3Page.data[mp3Page.data.textToSpeechPluginOptions.mp3UrlDataKey];

  preprocessContent = (content) => content;

  convertContentToPlainText = async (content) =>
    htmlToText.convert(content, { wordwrap: 0 });

  data() {
    return {
      permalink: (data) => this.getMp3UrlFromData(data.mp3Page),
      pagination: {
        data: this.mp3PagesArray,
        size: 1,
        alias: "mp3Page",
      },
    };
  }

  async render(data) {
    console.log(data.mp3Page);

    const preprocessedContent = await this.preprocessContent(
      this.getContentFromData(data.mp3Page)
    );

    const plainTextContent = await this.convertContentToPlainText(
      preprocessedContent
    );

    return await convertTextToSpeech(
      plainTextContent,
      data.textToSpeechPluginOptions
    );
  }
}

module.exports = {
  TextToSpeechPlugin,
  AudioVersionTemplate,
};
