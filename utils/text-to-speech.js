const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { AssetCache } = require("@11ty/eleventy-fetch");
const md5 = require("js-md5");
const { convert } = require("html-to-text");
const path = require("path");
const {encode} = require('html-entities');

async function convertHtmlToPlainText(html) {
  return convert(html, { wordwrap: 0 });
}

function chunkText(text) {
  const MAX_CHUNK_LENGTH = 7000;

  const textLines = text.split("\n");

  let chunks = [];
  let currentChunkLines = [];

  textLines.forEach((lineText) => {
    const currentChunkLength = currentChunkLines.join("\n").length;

    if (currentChunkLength > MAX_CHUNK_LENGTH) {
      chunks.push(currentChunkLines.join("\n"));
      currentChunkLines = [];
    } else {
      currentChunkLines.push(lineText);
    }
  });
  if (currentChunkLines.length > 0) chunks.push(currentChunkLines.join("\n"));

  return chunks;
}

async function convertTextToSpeech(text, options, contentMode="text", pageData={}) {
  // chunk text
  const chunks = chunkText(text);

  // convert chunks to audio buffers
  const audioBuffers = await Promise.all(
    chunks.map((chunk) => convertTextChunkToSpeech(chunk, options, contentMode, pageData))
  );

  // join the audio buffers
  return Buffer.concat(audioBuffers);
}

async function getSavedTimingsForMp3(mp3Url) {
  let cachedTimings = new AssetCache(`${mp3Url}_timing`)
  if (cachedTimings.isCacheValid('365d')) {
    return cachedTimings.getCachedValue();
  }
}

async function convertTextChunkToSpeech(text, options, contentMode="text", pageData={}) {
  const shouldSaveTimings = options.saveTimings === true
  // Check cache for generated audio based on unique hash of text content
  const textHash = md5(text);

  let cachedAudio = new AssetCache(textHash);
  const mp3Url = pageData.data?.mp3Url || pageData.mp3Url
  let cachedTimings = new AssetCache(`${mp3Url}_timing`)

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

  let timings = []

  // Generate MP3 with Azure API

  if (shouldSaveTimings) {
    synthesizer.wordBoundary = (_, event) => {
      const startTime = event.privAudioOffset * 0.0000001
      const startTimeRounded = parseFloat(
        startTime.toFixed(4)
      )
      const endTime = (event.privAudioOffset + event.privDuration) * 0.0000001
      const endTimeRounded = parseFloat(
        endTime.toFixed(4)
      )

      timings.push({
        startTime: startTimeRounded,
        endTime: endTimeRounded,
        text: event.privText.trim(), // trim the text in case it starts with a space (that will trip up when adding spans)
      })
    }
  }

  const audioArrayBuffer = await new Promise((resolve, reject) => {

    const encodedText = encode(text);

    const ssmlText = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="${options.voiceName.slice(0, 5)}">
      <voice name="${options.voiceName}">
      ${options.lexiconUrl ? `<lexicon uri="${options.lexiconUrl}" />` : ''}
      <prosody rate="${options.speed}" pitch="0%">
      ${encodedText}
      </prosody>
      </voice>
      </speak>`

    synthesizer.speakSsmlAsync(
      ssmlText,
      async (result) => {
        synthesizer.close();
        if (result) {
          resolve(result.privAudioData);
        } else {
          reject(result);
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

  if (shouldSaveTimings) {
    await cachedTimings.save(timings, "json");
  } 

  const audioBuffer = Buffer.from(audioArrayBuffer);
  await cachedAudio.save(audioBuffer, "buffer");

  return audioBuffer;
}

module.exports = {
  convertTextToSpeech,
  convertHtmlToPlainText,
  getSavedTimingsForMp3
};
