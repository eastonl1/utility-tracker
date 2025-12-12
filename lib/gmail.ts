// lib/gmail.ts
import { google } from "googleapis";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth env vars");
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oAuth2Client;
}

export async function getGmailClient() {
  const auth = getOAuth2Client();
  return google.gmail({ version: "v1", auth });
}

export async function listMessages(gmail: any, query: string) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 10, // small for testing
  });

  return res.data.messages ?? [];
}

export async function getMessage(gmail: any, id: string) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
    metadataHeaders: ["Subject", "From", "Date"],
  });

  return res.data;
}

// lib/gmail.ts
export function extractBody(msg: any): string {
  function decodeBase64Url(data: string) {
    // Gmail uses base64url: - and _ instead of + and /
    let s = data.replace(/-/g, "+").replace(/_/g, "/");
    // Pad with = to multiple of 4
    while (s.length % 4) s += "=";
    return Buffer.from(s, "base64").toString("utf-8");
  }

  function walk(part: any): string {
    if (!part) return "";
    if (part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts && Array.isArray(part.parts)) {
      return part.parts.map(walk).join("\n");
    }
    return "";
  }

  return walk(msg.payload);
}

