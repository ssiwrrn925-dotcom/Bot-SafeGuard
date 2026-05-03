const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// สร้าง Server หลอกเพื่อให้ Render รู้ว่าบอทยังทำงาน
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot Check Status: Online");
});
server.listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

console.log("--- 🕵️ เริ่มระบบตรวจสอบเชิงลึก ---");

client.on("ready", () => {
  console.log(`✅ สำเร็จ 100%! บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

// ดักจับทุกความผิดพลาด
process.on('unhandledRejection', error => {
  console.error('❌ เกิดข้อผิดพลาดร้ายแรง:', error);
});

client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Login ล้มเหลว! สาเหตุจาก Discord:");
  console.error(err.message);
  
  if (err.message.includes("used an invalid token")) {
    console.error("👉 วิธีแก้: TOKEN ใน Render ผิดครับ ให้ไปก๊อปจาก Reset Token มาใหม่");
  } else if (err.message.includes("privileged gateway intents")) {
    console.error("👉 วิธีแก้: คุณเปิด Intents ในหน้า Developer Portal แล้วแต่ 'ลืมกดปุ่ม Save' ด้านล่างสุดครับ");
  }
});
