# eleventy-plugin-text-to-speech

This is a plugin for Eleventy that generates audio versions of your page content using Microsoft's Cognitive Services Speech API.

This is a work in progress - I'm still working out the best way to make this a plugin.

This plugin is based on the example project here: [https://11ty-text-to-mp3.netlify.app/](https://11ty-text-to-mp3.netlify.app/)

## To do list

- Generated audio cuts off at 10 mins - this is a limitation with Azure's API. We can get around this by splitting up the text into chunks and sending separate requests, then concatenating the audio buffer
- Should allow you to iterate over any data, not just an Eleventy collection - should make this configurable so you can loop over global data etc. Should be able to use any content, not just templateContent.

## How to get started

1. Install the package with npm or yarn:

```
npm install https://github.com/larryhudson/eleventy-plugin-text-to-speech
OR
yarn add https://github.com/larryhudson/eleventy-plugin-text-to-speech
```

2. Sign up for an [Azure account](https://portal.azure.com/)
3. Once you're logged into the Azure portal, add a new resource connected to the 'Cognitive Services - Speech service'. You can choose the free tier. Take note of the 'location' or 'region' that you choose when you create the resource.
4. Once you've created the new resource, click 'Manage keys' and get your API key
5. Go to the [list of Azure regions](https://gist.github.com/ausfestivus/04e55c7d80229069bf3bc75870630ec8) and find the short name (in the last column) of the region you chose above.
6. Create a `.env` file with the following variables:

```
AZURE_SPEECH_RESOURCE_KEY=<API KEY FOR YOUR AZURE SPEECH SERVICE>
AZURE_SPEECH_REGION=<SHORT NAME FOR THE RESOURCE REGION>
```

7. Add the plugin to your `.eleventy.js` file:

```
const {TextToSpeechPlugin} = require('eleventy-plugin-text-to-speech')

// inside your eleventyConfig function

eleventyConfig.addPlugin(TextToSpeechPlugin, {
    textToSpeech: {
        voiceName: 'en-US-JennyNeural' // get voice name from here: https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=speechtotext#prebuilt-neural-voices
    }
})

```

8. Add a new file `mp3-version.11ty.js` to your input directory with this code:

```
const { AudioVersionTemplate } = require("eleventy-plugin-text-to-speech");

module.exports = AudioVersionTemplate;
```

9. On the pages that you want to generate a MP3 from, add `mp3Url` to the frontmatter, pointing to the URL you would like the generated MP3 to have, eg. `/mp3/blog-post-1.mp3`

10. Try running `npm run build` to test the API works with your new resource.

## Options

### Choosing a voice

You can try out the API's different voice options on the Microsoft site: [Text to Speech - Microsoft Azure](https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/#overview)

Once you've found a voice you like, you can find the 'short name' on this page: [Language support - Speech service](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=speechtotext#prebuilt-neural-voices). The short name is the string that starts with a language code, followed by the character name, for example: `en-GB-LibbyNeural`
