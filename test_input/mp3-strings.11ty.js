const { AudioVersionTemplate } = require("../index");

class MyAudioVersionTemplate extends AudioVersionTemplate {

    mp3PagesArray = "strings";

    getContentFromData = (string) => string.text;

    getMp3UrlFromData = (string) => string.mp3Url;


}

module.exports = MyAudioVersionTemplate;
