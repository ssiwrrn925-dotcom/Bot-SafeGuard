const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// --- Web Server สำหรับ Render ---
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ สำเร็จ! บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

// ใช้ TOKEN จาก Environment Variables ใน Render
client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Login ไม่สำเร็จ: " + err.message);
});
