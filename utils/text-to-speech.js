const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");
const fsPromises = require("fs/promises");
const { AssetCache } = require("@11ty/eleventy-fetch");
const md5 = require("js-md5");
const { convert } = require("html-to-text");
const path = require("path");

async function convertHtmlToPlainText(html) {
  return convert(html, { wordwrap: 0 });
}

async function convertHtmlToAudio(html, ttsOptions) {
  const text = await convertHtmlToPlainText(html);
  const textHash = md5(text);

  let cachedAudio = new AssetCache(textHash);

  if (cachedAudio.isCacheValid("365d")) {
    console.log(`Using cached MP3 data for hash ${textHash}`);
    return cachedAudio.getCachedValue();
  } else {
    console.log(`Asking Microsoft API to generate MP3 for hash ${textHash}`);
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    ttsOptions.resourceKey,
    ttsOptions.region
  );

  speechConfig.speechSynthesisLanguage = ttsOptions.language;
  speechConfig.speechSynthesisVoiceName = ttsOptions.voiceName;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const TMP_FOLDER_NAME = `.tmp-eleventy-plugin-text-to-speech`;

  const tmpFilePath = path.join(TMP_FOLDER_NAME, `${textHash}.mp3`);

  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tmpFilePath);

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  const audioArrayBuffer = await new Promise((resolve) => {
    synthesizer.speakTextAsync(
      text,
      async (result) => {
        synthesizer.close();
        if (result) {
          resolve(result.privAudioData);
        }
      },
      (error) => {
        console.log(error);
        synthesizer.close();
      }
    );
  });

  const audioBuffer = Buffer.from(audioArrayBuffer);

  await cachedAudio.save(audioBuffer, "buffer");
  return audioBuffer;
}

module.exports = {
  convertHtmlToAudio,
  convertHtmlToPlainText,
};
