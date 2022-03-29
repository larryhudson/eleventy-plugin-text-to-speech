const { TTSAudioPlugin } = require("./index");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TTSAudioPlugin, {
    textToSpeech: {
      language: "en-IE",
      voiceName: "en-IE-EmilyNeural",
    },
    podcast: {
      generateFeed: true,
      feedData: {
        title: "My silly title",
      },
    },
  });

  return {
    dir: {
      input: "test_input",
      output: "_site",
    },
  };
};
