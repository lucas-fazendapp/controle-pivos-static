const crypto = require('node:crypto');

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let tokenCache;

function readServiceAccount() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.EE_SERVICE_ACCOUNT_JSON;

  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      client_email: parsed.client_email,
      private_key: String(parsed.private_key || '').replace(/\\n/g, '\n'),
    };
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.EE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.EE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  throw new Error('Configure GOOGLE_SERVICE_ACCOUNT_JSON ou compartilhe a planilha com a service account existente.');
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const claim = {
    iss: serviceAccount.client_email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsignedJwt = `${base64Url(header)}.${base64Url(claim)}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(serviceAccount.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedJwt}.${signature}`;
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const serviceAccount = readServiceAccount();
  const assertion = signJwt(serviceAccount);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Falha ao autenticar no Google Sheets.');
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function readSheetValues({ spreadsheetId, sheetName, range }) {
  const accessToken = await getAccessToken();
  const encodedRange = encodeURIComponent(`${sheetName}!${range}`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}` +
    '?valueRenderOption=FORMATTED_VALUE';
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Falha ao ler dados do Google Sheets.');
  }

  return data.values || [];
}

module.exports = {
  readSheetValues,
};
