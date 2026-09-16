const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL?.trim() || "https://g5esim.mobile/telegram";

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok || !json.ok) {
    throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  }
  return json.result;
}

const me = await telegram("getMe", {});

await telegram("setMyCommands", {
  commands: [
    { command: "start", description: "Open G5eSIM" },
    { command: "app", description: "Launch the Mini App" },
    { command: "help", description: "Get support" },
  ],
});

await telegram("setChatMenuButton", {
  menu_button: {
    type: "web_app",
    text: "Open G5eSIM",
    web_app: { url: miniAppUrl },
  },
});

console.log(
  JSON.stringify(
    {
      ok: true,
      bot: me?.username,
      miniAppUrl,
      launchUrl: `https://t.me/${me?.username || "G5esimBot"}?startapp=home`,
    },
    null,
    2,
  ),
);
