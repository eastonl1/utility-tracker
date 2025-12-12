require("dotenv").config({ path: ".env.local" });
const { google } = require("googleapis");
const readline = require("readline");

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = "urn:ietf:wg:oauth:2.0:oob";

  if (!clientId || !clientSecret) {
    console.log("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
  });

  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\nPaste the code here: ", async (code) => {
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\nTokens:");
    console.log(tokens);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
