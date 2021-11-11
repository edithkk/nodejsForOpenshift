const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const languageTranslator = new LanguageTranslatorV3({
  authenticator: new IamAuthenticator({ apikey: process.env.LANGUAGE_TRANSLATOR_APIKEY }),
  serviceUrl: process.env.LANGUAGE_TRANSLATOR_URL,
  version: '2018-05-01',
});

var payload;

async function translate (textToTranslate, srcLang, targetLang) {
    return new Promise((resolve, reject) =>{
        var payload = {
                text: textToTranslate,
                source: srcLang,
                target: targetLang
            }
        languageTranslator.translate(payload).then((response) => {
            console.log('translator translate success: ' + response.result.translations[0].translation);
            resolve (response.result.translations[0].translation);
        }).catch((err) => {
            console.log('translator translate error: ' + err);
        })
    })
}

async function identify (textToIdentify) {
    return new Promise((resolve, reject) =>{
        var payload = {text: textToIdentify}
        languageTranslator.identify(payload).then((response) => {
            console.log('translator identify success: ' + response.result.languages[0].language);
            resolve (response.result.languages[0].language);
        }).catch((err) => {
            console.log('translator identify error: ' + err);
        })
    })
}

module.exports = {
    translate: translate,
    identify: identify
}