const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// ===== 🌐 Web Server (กัน Render หลับ) =====
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web Server is running...");
});

// ===== 🔥 เริ่ม Debug =====
console.log("🚀 TEST BOT STARTING...");

// ===== ❗ TOKEN =====
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ ไม่พบ TOKEN ใน Environment Variables");
  process.exit(1);
}

// ===== 🤖 Client =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== ✅ READY =====
client.once("ready", () => {
  console.log(`✅ READY: ${client.user.tag}`);
});

// ===== ❗ ERROR DEBUG =====
client.on("error", (err) => {
  console.error("❌ CLIENT ERROR:", err);
});

client.on("shardError", (err) => {
  console.error("❌ SHARD ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED:", err);
});

// ===== 🌐 เช็คการเชื่อม Discord =====
const https = require("https");

https.get("https://discord.com/api/v10/gateway", (res) => {
  console.log("🌐 Discord API Status:", res.statusCode);
}).on("error", (e) => {
  console.error("❌ ต่อ Discord ไม่ได้:", e.message);
});

// ===== 🚀 LOGIN =====
console.log("🔄 กำลัง Login...");

client.login(TOKEN)
  .then(() => {
    console.log("✅ LOGIN SUCCESS");
  })
  .catch((err) => {
    console.error("❌ LOGIN ERROR:", err.message);
  });
