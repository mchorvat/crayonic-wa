//
// Crayonic Gateway WebAuthn Demo (crayonic-wa)
// 12/2021 Marek Chorvat
// v 1.0.0: 15.12.2021
//

const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

// const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');
const cors = require('cors');

const {Fido2Lib} = require('fido2-lib');
const crypto = require('crypto');
const base64url = require('base64url');

// const session = require('./middleware/session');

const fido = new Fido2Lib({
  timeout: 60000,
  rpId: 'localhost',
  rpName: 'WebAuthn Demo',
  rpIcon: 'https://crayonic.io/favicon.ico',
  challengeSize: 64,
  attestation: 'direct',
  cryptoParams: [-7, -257],
  authenticatorAttachment: 'cross-platform',
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: 'required'
});

const origin = 'https://localhost:8000';
const apiRoot = '/wa'; // crayonic.io/wa/

const app = express();
app.set('trust proxy', 1);  //if we are behind proxy (nginx/kubernetes)

// app.use(cookieParser('CrayonicKeyVaultFTW2022!'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json({limit: '10mb'}));
app.use(cors({
  origin,
  credentials: true
}));


app.use(session({
  secret: 'CrayonicKeyVaultFTW2022!',
  store: new FileStore({
      ttl: 1000 * 60 * 60 * 24 * 7  // session time to live - week 
    }),
    resave: false,
    saveUninitialized: false
}));

app.use(errorHandler());


app.get(`${apiRoot}/register-options`, async (req, res) => {
  const registrationOptions = await fido.attestationOptions();

  req.session.challenge = Buffer.from(registrationOptions.challenge);
  req.session.userHandle = crypto.randomBytes(32);

  registrationOptions.user.id = req.session.userHandle;
  registrationOptions.challenge = Buffer.from(registrationOptions.challenge);

  // iOS
  // registrationOptions.authenticatorSelection = {authenticatorAttachment: 'platform'};

  registrationOptions.authenticatorSelection = {authenticatorAttachment: 'cross-platform'};

  // req.session.save();

  res.status(200).json(registrationOptions);
});

app.post(`${apiRoot}/register`, async (req, res) => {

  if (!req.session) {
    console.log('error - no session', e);
    res.status(500).json({status: 'failed'});
  }

  // console.log(JSON.stringify(req.session));

  try {
    const {credential} = req.body;

    const challenge = new Uint8Array(req.session.challenge.data).buffer;
    credential.rawId = new Uint8Array(Buffer.from(credential.rawId, 'base64')).buffer;
    credential.response.attestationObject = base64url.decode(credential.response.attestationObject, 'base64');
    credential.response.clientDataJSON = base64url.decode(credential.response.clientDataJSON, 'base64');
  
    const attestationExpectations = {
      challenge,
      origin,
      factor: 'either'
    };  

    const regResult = await fido.attestationResult(credential, attestationExpectations);

    req.session.publicKey = regResult.authnrData.get('credentialPublicKeyPem');
    req.session.prevCounter = regResult.authnrData.get('counter');

    // req.session.save();

    res.status(200).json({status: 'ok'});
  }
  catch(e) {
    console.log('error', e);
    res.status(500).json({status: 'failed'});
  }

});

app.get(`${apiRoot}/authenticate-options`, async (req, res) => {
  const authnOptions = await fido.assertionOptions();

  req.session.challenge = Buffer.from(authnOptions.challenge);

  authnOptions.challenge = Buffer.from(authnOptions.challenge);

  // req.session.save();
  // console.log(JSON.stringify(authnOptions));

  res.status(200).json(authnOptions);
});

app.post(`${apiRoot}/authenticate`, async (req, res) => {

  if (!req.session) {
    console.log('error - no session', e);
    res.status(500).json({status: 'failed'});
  }

  if (!req.body) {
    console.log('error - no input params provided', e);
    res.status(500).json({status: 'failed'});
  }

  const {credential} = req.body;

  credential.rawId = new Uint8Array(Buffer.from(credential.rawId, 'base64')).buffer;

  const challenge = new Uint8Array(req.session.challenge.data).buffer;
  const {publicKey, prevCounter} = req.session;

  if(publicKey === 'undefined' || prevCounter === undefined) {
    res.status(404).json({status: 'not found'});
  }
  else {
    const assertionExpectations = {
      challenge,
      origin,
      factor: 'either',
      publicKey,
      prevCounter,
      userHandle: new Uint8Array(Buffer.from(req.session.userHandle, 'base64')).buffer
    };

    try {
      await fido.assertionResult(credential, assertionExpectations); // will throw on error

      // req.session.save();
      // console.log(JSON.stringify(credential));
      // console.log(JSON.stringify(assertionExpectations));      

      res.status(200).json({status: 'ok'});
    }
    catch(e) {
      console.log('error', e);
      res.status(500).json({status: 'failed'});
    }
  }
});

const certFile = (process.env.NODE_ENV == "prod") ? 'tls' : 'localhost';
const PORT = 3005;

https.createServer(
    {
      key: fs.readFileSync(`./${certFile}.key`), cert: fs.readFileSync(`./${certFile}.crt`),
    },
    app,
  )
  .listen(PORT, '0.0.0.0', () => {
    //
    // starting up
    //
    console.log('');
    console.log(`Crayonic WebAuthn Demo [crayonic-wa] started`);
    console.log(`Running on Node.js ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV}, Running at https://0.0.0.0:${PORT}`);
    console.log('');    
  });

module.exports = app;
