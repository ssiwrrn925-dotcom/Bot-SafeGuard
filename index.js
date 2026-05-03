const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// สร้าง Server สำหรับ Render
http.createServer((req, res) => {
  res.write("Bot is Online!");
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

// ดึง Token จาก Environment
const token = process.env.TOKEN;

if (!token) {
  console.error("❌ หาค่า TOKEN ใน Environment ไม่เจอ!");
} else {
  client.login(token).catch(err => {
    console.error("❌ Discord ปฏิเสธการ Login: " + err.message);
    if (err.message.includes("Privileged gateway intents")) {
      console.error("👉 สาเหตุ: คุณลืมเปิด Intents ในหน้า Developer Portal (ต้อง Save ด้วยนะ)");
    }
  });
}
