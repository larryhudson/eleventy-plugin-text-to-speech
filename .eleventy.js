const { TextToSpeechPlugin } = require("./index");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TextToSpeechPlugin, {
    voiceName: "en-GB-LibbyNeural",
  });

  eleventyConfig.addGlobalData("myData", [
    {
      content: "My name is Larry",
      permalink: "/test",
      mp3Url: "/test.mp3",
    },
  ]);

  return {
    dir: {
      input: "test_input",
      output: "_site",
    },
  };
};
