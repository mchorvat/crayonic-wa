
# Web Authentication demo
A simple HTML/Javascript (Frontend) / NodeJs (Backend) passwordless authentication demo using Web Authentication API (WebAuthn).

Code is based on https://github.com/DannyMoerkerke/webauthn-demo


### Install and run: localhost
*Prerequisites:* 
- SSL certs for localhost (localhost.crt, localhost.key) must be present in app root directory. This is required for correct WebAuthn functionality (it works only via HTTPS)

To run the demo, run `npm install` once and then `npm run local`. Demo page can be accessed at
[https://localhost:8000](https://localhost:8000)

The WebAuthn server will be running at [https://localhost:3005/wa](https://localhost:3005/wa)


### Install and run: online/prod

*Prerequisites:* 
- env variable `HOST` shall be set to target host, e.g. `crayonic.io`
- env variable `NODE_ENV` shall be set to `prod`
- `apiUrl` (HOST URL) shall be changed in gateway-wa.js (default: const apiUrl = 'https://localhost:3005/wa')
- SSL certs (tls.crt, tls.key) must be present in app root directory
- reverse proxy shall be configured, so that app is accessible

To run the demo on your infrastructure, run `npm install` once and then `npm run start`. 

To view the demo, go to [https://crayonic.io](https://crayonic.io)

The WebAuthn server will be running at [https://crayonic.io:3005/wa](https://crayonic.io:3005/wa)

Note: replace `crayonic.io` with your HOST value in the links above.


### Setting up HTTPS support locally

Websites that want to use WebAuthn must be served over HTTPS, including during development! Fortunately it's simple to generate SSL certificates to host the site locally over HTTPS:
1. Install mkcert as per its instructions (brew install mkcert)
2. Run mkcert -install to initialize mkcert
3. Run the following command from within the example/ directory to generate SSL certificates for localhost:

```./example/ $> mkcert -key-file localhost.key -cert-file localhost.crt localhost```

This command should generate the following two files:
- example/localhost.key
- example/localhost.crt

The SSL certificate has been successfully generated if you see these two files. If these files don't exist, make sure you're in the example/ directory before retrying the last step.