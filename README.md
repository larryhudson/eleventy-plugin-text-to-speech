# eleventy-plugin-text-to-speech

This is a plugin for Eleventy that generates audio versions of your page content using Microsoft's Cognitive Services Speech API.

This plugin is based on the example project here: [https://11ty-text-to-mp3.netlify.app/](https://11ty-text-to-mp3.netlify.app/)

## What this does

- Generates high quality audio versions of your Eleventy content using Azure's neural voices
- Caches generated audio, so that it only regenerates when the text content changes

## To do list

- Generated audio cuts off at 10 mins - this is a limitation with Azure's API. We can get around this by splitting up the text into chunks and sending separate requests, then concatenating the audio buffer

## Getting started

### Create your Azure resource

1. Sign up for an [Azure account](https://portal.azure.com/)
2. In the Azure portal, add a new resource with the 'Cognitive Services - Speech service'. Choose the free tier. Take note of the 'location' or 'region' that you choose when you create the resource.
3. Once you've created the new resource, click 'Manage keys' and get your API key
4. Go to the [list of Azure regions](https://gist.github.com/ausfestivus/04e55c7d80229069bf3bc75870630ec8) and find the short name (in the last column) of the region you chose above.
5. Create a `.env` file with the following variables:

```
AZURE_SPEECH_RESOURCE_KEY=<API KEY FOR YOUR AZURE SPEECH SERVICE>
AZURE_SPEECH_REGION=<SHORT NAME FOR THE RESOURCE REGION>
```

### Install the plugin

1. Install the package with npm or yarn:

```
npm install https://github.com/larryhudson/eleventy-plugin-text-to-speech
OR
yarn add https://github.com/larryhudson/eleventy-plugin-text-to-speech
```

2. Add the plugin to your `.eleventy.js` file:

```js
const { TextToSpeechPlugin } = require("eleventy-plugin-text-to-speech");

// inside your eleventyConfig function

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TextToSpeechPlugin, {
    textToSpeech: {
      voiceName: "en-US-JennyNeural", // see below for voice options
    },
  });
};
```

### Add the template file to your input directory

1. Add a new file `mp3-version.11ty.js` (you can name this whatever you want) to your input directory with this code:

```js
const { AudioVersionTemplate } = require("eleventy-plugin-text-to-speech");

// see below for options to extend the default template class
module.exports = AudioVersionTemplate;
```

2. On the pages that you want to generate a MP3 from, add `mp3Url` to the frontmatter, pointing to the desired permalink of the generated MP3 file, eg. `/mp3/blog-post-1.mp3`. See below for more configuration options.

3. Run your Eleventy build and it will generate audio versions of your content. Then, you can refer to the `mp3Url` in your templates to point to the generated MP3 file.

## Recommended: caching between Netlify builds

If you're using Netlify to host your Eleventy site, it's a great idea to use the `netlify-plugin-cache` package to cache the generated audio between Netlify builds. This will help you save on your Azure API free tier quota, and will keep your builds fast.

To cache between Netlify builds:

1. run `npm install netlify-plugin-cache`
2. add `netlify.toml` to your base directory with:

```toml
[[plugins]]
package = "netlify-plugin-cache"

  [plugins.inputs]
  paths = [ ".cache" ]
```

## Configuration options

### Plugin configuration options

Below are the default options when adding the plugin to your `.eleventy.js` file:

```js
eleventyConfig.addPlugin(TextToSpeechPlugin, {
  // data key that the plugin uses to create a custom collection, and creates MP3 files for each page
  // when it creates the MP3 file, the value for this key becomes the permalink
  // for example, a page with mp3Url: /mp3/page1.mp3 would generate an MP3 file at that path.
  mp3UrlDataKey: `mp3Url`,

  // voice name to use for text to speech. see below to find list of voices
  voiceName: "en-AU-WilliamNeural",

  // Azure resource key. By default it will look for this environment variable
  resourceKey: process.env.AZURE_SPEECH_RESOURCE_KEY,

  // Azure region. By default it will look for this environment variable
  region: process.env.AZURE_SPEECH_REGION,
});
```

### Choosing a voice

You can try out the API's different voice options on the Azure site: [Text to Speech - Microsoft Azure](https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/#overview)

Once you've found a voice you like, you can find the 'short name' on this page: [Language support - Speech service](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=speechtotext#prebuilt-neural-voices). The short name is the string that starts with a language code, followed by the character name, for example: `en-GB-LibbyNeural`.

### Choosing what content becomes MP3 files

By default, the plugin creates a collection of pages that have `mp3Url` set in the data cascade. The value of the `mp3Url` key becomes the permalink of the generated MP3. This could be set in Markdown frontmatter, or set in any other way that Eleventy supports. If you'd like to use a different key instead of `mp3Url`, you can set the `mp3UrlDataKey` option when adding the plugin.

#### Extending the AudioVersionTemplate class

If you need more flexibility, you can extend the `AudioVersionTemplate` class in your input directory.

The options here make it possible to:

- use global data as your source, rather than an Eleventy collection
- preprocess your content before it gets converted to plain text
- use your own function to convert content to plain text. This is useful if your content is not HTML (eg. JSON)

Here's an example of how you could extend the `AudioVersionTemplate` class:

```js
const { AudioVersionTemplate } = require("eleventy-plugin-text-to-speech");
const {removeCodeBlocks, convertContentToPlainText} = require('../imaginary-utils')

Class CustomAudioVersionTemplate extends AudioVersionTemplate {
    // string pointing to data in the Eleventy data cascade
    mp3PagesArray = `myGlobalDataVariable` // Default = `collections.textToSpeechPluginPages`

    // function that gets the content from the page data
    getContentFromData = (mp3Page) => mp3Page.content // Default = (mp3Page) => mp3Page.templateContent

    // function that gets the desired MP3 url (permalink) from the page data
    getMp3UrlFromData = (mp3Page) => `/mp3/${mp3Page.slug}` // Default = (mp3Page) => mp3Page.data[mp3Page.data.textToSpeechPluginOptions.mp3UrlDataKey]

    // optional function to do something with the content before converting to plain text
    preprocessContent = async (content) => await removeCodeBlocks(content) // Default = (content) => content

    // function that converts your content to plain text, ready for text to speech
    convertContentToPlainText = async (content) => await convertContentToPlainText(content) // default = (content) => htmlToText.convert(content, {wordwrap: 0}) (from html-to-text library)
}

module.exports = CustomAudioVersionTemplate;
```
