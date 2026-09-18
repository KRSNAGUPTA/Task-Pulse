import { Request, Response, Router } from "express";
import * as jose from 'jose'



let jwksCache: { keys: object[] } | null = null;


async function getJwks() {
  if (jwksCache) return jwksCache;

  const publicKeyPem = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

  if (!publicKeyPem) {
    throw new Error('JWT_PUBLIC_KEY is not defined in environment variables.');
  }

  // Import the SPKI PEM public key
  const publicKey = await jose.importSPKI(publicKeyPem, 'RS256');

  // Export as a public JSON Web Key (JWK)
  const jwk = await jose.exportJWK(publicKey);

  jwksCache = {
    keys: [
      {
        ...jwk,
        kid: 'task-pulse-key-1',
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };

  return jwksCache;

}



const router = Router();
router.get("/.well-known/jwks.json", async (req: Request, res: Response) => {

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    const jwks = await getJwks();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader("Content-Type", "application/json")
    return res.json(jwks);
  } catch (error) {

  }
})
export default router;