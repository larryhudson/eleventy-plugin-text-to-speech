const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { AssetCache } = require("@11ty/eleventy-fetch");
const md5 = require("js-md5");
const { convert } = require("html-to-text");
const path = require("path");

async function convertHtmlToPlainText(html) {
  return convert(html, { wordwrap: 0 });
}

async function convertHtmlToAudio(html, options) {
  const text = await convertHtmlToPlainText(html);

  // Check cache for generated audio based on unique hash of text content
  const textHash = md5(text);

  console.log(options);

  let cachedAudio = new AssetCache(textHash);

  if (cachedAudio.isCacheValid("365d")) {
    console.log(
      `[eleventy-plugin-text-to-speech] Using cached MP3 data for hash ${textHash}`
    );
    return cachedAudio.getCachedValue();
  } else {
    console.log(
      `[eleventy-plugin-text-to-speech] Asking Microsoft API to generate MP3 for hash ${textHash}`
    );
  }

  // Setup Azure Text to Speech API

  if (!options.resourceKey)
    throw new Error(
      `[eleventy-plugin-text-to-speech] resourceKey is not set in the text to speech options.\n Either add the environment variable AZURE_SPEECH_RESOURCE_KEY or set 'resourceKey' in the 'textToSpeech' options when adding the plugin`
    );

  if (!options.region)
    throw new Error(
      `[eleventy-plugin-text-to-speech] region is not set in the text to speech options.\n Either add the environment variable AZURE_SPEECH_REGION or set 'region' in the 'textToSpeech' options when adding the plugin`
    );

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    options.resourceKey,
    options.region
  );

  speechConfig.speechSynthesisLanguage = options.voiceName.slice(0, 5);
  speechConfig.speechSynthesisVoiceName = options.voiceName;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const TMP_FOLDER_NAME = `.tmp-eleventy-plugin-text-to-speech`;

  const tmpFilePath = path.join(TMP_FOLDER_NAME, `${textHash}.mp3`);

  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tmpFilePath);

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  // Generate MP3 with Azure API

  const audioArrayBuffer = await new Promise((resolve) => {
    synthesizer.speakTextAsync(
      text,
      async (result) => {
        synthesizer.close();
        if (result) {
          //
          resolve(result.privAudioData);
        }
      },
      (error) => {
        console.log(
          `[eleventy-plugin-text-to-speech] Error while generating MP3`
        );
        synthesizer.close();
        throw new Error(error);
      }
    );
  });

  // Save in cache for next time

  const audioBuffer = Buffer.from(audioArrayBuffer);
  await cachedAudio.save(audioBuffer, "buffer");
  return audioBuffer;
}

module.exports = {
  convertHtmlToAudio,
  convertHtmlToPlainText,
};
