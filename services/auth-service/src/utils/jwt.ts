import jwt, { SignOptions } from "jsonwebtoken";

const dummyPublicKey =`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1Orqe1bW8H1RFoR7Tk1L
ngK+jk8RFgAyhPds3xqpINSUp4EIPfkXPqkgMgPnBuqmBWgs2ZOC/zZnrdA/qZza
OdIPX60fOmiiKIWtnC5IWx23vlfQaK4I1geLo+YTB3ZSXwdt6HjZMgkOrK+V5g6f
qy28AKGOZRK9E98tQGEvxqlXhm0WhfTpVfHroEh2nCTkAI27GQSqKVUGKVOuiLQI
p0OmwR2sZP9lU+hP2Ehm3gMdBXaDLbvx9YvtC3/DEsjgW7YQwX7QleSt3/LGWt6g
qlm2yV6+jiTrS7nGmPscvz7lEsbaQEtWfmXhcXEq7vCy/s+qCLIST742JWpJvgNs
UQIDAQAB
-----END PUBLIC KEY-----`

const dummyPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDU6up7VtbwfVEW
hHtOTUueAr6OTxEWADKE92zfGqkg1JSngQg9+Rc+qSAyA+cG6qYFaCzZk4L/Nmet
0D+pnNo50g9frR86aKIoha2cLkhbHbe+V9BorgjWB4uj5hMHdlJfB23oeNkyCQ6s
r5XmDp+rLbwAoY5lEr0T3y1AYS/GqVeGbRaF9OlV8eugSHacJOQAjbsZBKopVQYp
U66ItAinQ6bBHaxk/2VT6E/YSGbeAx0FdoMtu/H1i+0Lf8MSyOBbthDBftCV5K3f
8sZa3qCqWbbJXr6OJOtLucaY+xy/PuUSxtpAS1Z+ZeFxcSru8LL+z6oIshJPvjYl
akm+A2xRAgMBAAECggEAHbyo6XdcR16mm8epYGsbk7gxZ2HJR/KDcR5iIRoxoz6y
0QmMnk8y/RLqRrdUexr8ULFXNj92d8Y1nnPWjbi099y2k00ew+3Hhsj+JtvbSjKG
g6Sdxx5WE0J0MSdvN/HBbmP0ve0G9LM0I/qAAToV+Hac6n+l33L0X8P3UiW2DP+U
zwEMXMcJ7fr0wURCtoUszGd+H7gzHzw9X0U3QvuKOXCXYFWveDKIRGW/LmMPC3KS
Pv3hDC2Y4pOFsO9SCGfoMOPwsLfDoQGUD9ItxvSWBiJ4GlCU2CuphKeGfsoNLwgz
in5Gq1ZBdwN9iymVql2kpFaGufq9nofpcUMXnROMawKBgQDzVZaUdKz5oes9HUbJ
f5n7Myzf6Ry8SMdp26oxNaF9R4eJDeyz0AOupLf3tPyxw4UMAML15OV6ZIwdXxvL
uZp2wNxEDZF2z8JwSnniUHpCkb4FrEujsO1LMAUcpVK8jvilYOjFoC+LhtUQEmIl
HefRu3Tp521nc3q7MGSdoRwSvwKBgQDgAAcTCtBQaIdHXMvpfgGrJfJCP+irjnI/
7r1DKccj7IFYbl+HrmR+aLoAu5Fm76VsCQmjQb5jnFfTPZakLFODv0CysBBp1sTp
nbT1qpI+6OdLFNLNDbDsjRkUmJdSBSxuj1FNKkjAxjsHFJphYcukjHuPdJGMypdg
imtdTWkU7wKBgQDmVdoX5Onn0xGt5AyhqBvF4QdVXIBK6kl5Num/cxjOUetGHNw2
yWzy4BEUdUnNq1pBpmbmBCoE1TCcjO7uxV4lkyHteTp80OUpDhaZ17wjT3okPJfM
9ylnxqjQGN5chqlvQnCUwbC/zn3YnM4yfEB4E43z65FwH6vJjWFwpJTCWQKBgDDG
EMRGsIExoXMac5QNydM4Wf2u6LyiMaJWG4PKTwA1eRyGO+rRQDR+HTIXpVtihwR1
G1Ie+JO78Suf13M765teQ3ok+A3zo8CyhDqRv3JPSD2C9TuM5Z88Qd/IMfq8Aaa5
Mhy5PkorX6L1C4B0yOC1bhoYabDcVAXDXglc16qlAoGBALAr+PRO0COgNOOiEaVD
rYZ1HkpuOJZNm+OGefG2wQPo1lbojCzD1xo0ZZRo10BhQ8q7TF1twFtwupEjfPiw
u80REg1yIuWjDtguiGHdB+Mp5c9PyUIVYP7jsJYh9km6qKkzxqZXabmroqpcj7yE
txhpDNkU+qOpvTFoNULA3/+D
-----END PRIVATE KEY-----`


const JWT_PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || dummyPrivateKey).replace(/\\n/g, '\n');
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || dummyPublicKey).replace(/\\n/g, '\n');

export interface PayLoad {
  userId: string;
  email: string;
}

export function generateToken(
  payload: PayLoad,
  expiresIn: SignOptions['expiresIn'] = '1d'
): string {
  return jwt.sign(payload, JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: 'task-pulse-key-1', 
    expiresIn,
  });
}

export function verifyToken(token: string): PayLoad {
  return jwt.verify(token, JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
  }) as PayLoad;
}