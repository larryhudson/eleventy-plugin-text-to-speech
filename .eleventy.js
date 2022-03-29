const { TextToSpeechPlugin } = require("./index");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TextToSpeechPlugin, {
    voiceName: "en-GB-LibbyNeural",
  });

  return {
    dir: {
      input: "test_input",
      output: "_site",
    },
  };
};
