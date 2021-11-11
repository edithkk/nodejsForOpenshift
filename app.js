/**
 *
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const { IamAuthenticator, BearerTokenAuthenticator } = require('ibm-watson/auth');
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
let translator = require ('./API/translator');
const { spawn, exec, execFile } = require('child_process');

var app = express();
require('./health/health')(app);

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());


// Create the service wrapper

let authenticator;
if (process.env.ASSISTANT_IAM_APIKEY) {
  authenticator = new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY
  });
} else if (process.env.BEARER_TOKEN) {
  authenticator = new BearerTokenAuthenticator({
    bearerToken: process.env.BEARER_TOKEN
  });
}

var assistant = new AssistantV2({
  version: '2021-06-14',
  serviceName: 'assistant',
  authenticator: authenticator,
  serviceUrl: process.env.ASSISTANT_URL,
  disableSslVerification: process.env.DISABLE_SSL_VERIFICATION === 'true' ? true : false
});

var session_id = null;
assistant.createSession({
  assistantId: process.env.ASSISTANT_ID   //ASSISTANT_ID is taken from the assistant, not skill !
})
  .then(res => {
    session_id = res.result.session_id;
    console.log(JSON.stringify(res.result, null, 2));
  })
  .catch(err => {
    console.log(err);
});


// Endpoint to be call from the client side
app.post('/api/message', async function(req, res) {
  let assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      output: {
        text:
          'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' +
          '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' +
          'Once a workspace has been defined the intents may be imported from ' +
          '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.',
      },
    });
  }

  var textIn = '';

  if (req.body.input) {
    textIn = req.body.input.text;
  }
  
    //Edith Identify input language
  if (textIn != '') {
    var lang = await translator.identify(textIn).catch((err) => {
        console.log(err);
    });
    if (lang == 'he') {

      // edith from here - calling Power shell   --------------
      /*console.log ('start calling shell');

      const child = spawn("powershell.exe",["C:\\Workspaces\\PowerShell\\psScript1.ps1"]);
      child.stdout.on("data",function(data){
          console.log("Powershell Data: " + data);
      });
      child.stderr.on("data",function(data){
          console.log("Powershell Errors: " + data);
      });
      child.on("exit",function(){
          console.log("Powershell Script finished");
      });
      child.stdin.end(); //end input
      */
      // edith till here - calling Power shell END --------------

      console.log ('language identified is Hebrew');
      var translatedText = '';
      translatedText = await translator.translate(textIn, 'he', 'en').catch((err) => {
        console.log(err);
      });
      if (translatedText != '') {
        textIn = translatedText;
      }
    }
  }
  //Edith Add Translation Here


  var payload = {
    assistantId: assistantId,
    sessionId: session_id,
    input: {
      message_type: 'text',
      text: textIn,
    },
  };


  // Send the input to the assistant service
  assistant.message(payload, async function(err, data) {
    if (err) {
      const status = err.code !== undefined && err.code > 0 ? err.code : 500;
      return res.status(status).json(err);
    }

    /* edith from here */
    var returnMessage = data.result.output.generic;
    for (var i=0; i < returnMessage.length; i++) {
      if (returnMessage[i].response_type == "text") {
          translatedText = await translator.translate(returnMessage[i].text, 'en', 'he').catch((err) => {
            console.log(err);
          });
          if (translatedText != '') {
            data.result.output.generic[i].text = translatedText;
          }
      }
      
      if (returnMessage[i].response_type == "option") {
          translatedText = await translator.translate(returnMessage[i].title, 'en', 'he').catch((err) => {
            console.log(err);
          });
          if (translatedText != '') {
            data.result.output.generic[i].title = translatedText;
          }

          for (var op = 0; op < returnMessage[i].options.length; op++ ) {
                  translatedText = await translator.translate(returnMessage[i].options[op].label, 'en', 'he').catch((err) => {
                  console.log(err);
                });
                if (translatedText != '') {
                  data.result.output.generic[i].options[op].label = translatedText;
                }
          }
      }



    }
    /* edith till here */
    return res.json(data);
  });
});


module.exports = app;
