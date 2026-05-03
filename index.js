const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// สร้าง Server ให้ Render ตรวจสอบสถานะได้
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is Active");
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

console.log("--- 🕵️ กำลังพยายามเชื่อมต่อ Discord ---");

client.once("ready", () => {
  console.log(`✅ สำเร็จ! ออนไลน์ในชื่อ: ${client.user.tag}`);
});

// บรรทัดนี้สำคัญมาก ห้ามแก้คำว่า process.env.TOKEN
client.login(process.env.TOKEN).catch(err => {
  console.log("❌ Discord ปฏิเสธการเข้าถึง!");
  console.log("เหตุผลจาก Discord: " + err.message);
});
