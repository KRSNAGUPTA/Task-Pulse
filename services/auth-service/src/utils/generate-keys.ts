import crypto from "crypto"


const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// console.log("\n\n----Public Key ----")
console.log(publicKey);
// console.log("\n\n----Private Key----")
console.log(privateKey)