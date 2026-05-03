const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const http = require('http');

// 1. ระบบ Web Server (พอร์ต 10000 สำหรับ Render)
http.createServer((req, res) => {
  res.write("Anti-Spam Bot is Online!");
  res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

// เก็บข้อมูลสแปม
const messageLog = new Map();

client.once("ready", () => {
  console.log(`✅ สำเร็จ! บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();
  
  if (!messageLog.has(userId)) messageLog.set(userId, []);
  const timestamps = messageLog.get(userId);
  timestamps.push(now);

  // ตรวจสอบ: ส่ง 5 ข้อความใน 5 วินาที
  const recentMessages = timestamps.filter(t => now - t < 5000);
  messageLog.set(userId, recentMessages);

  if (recentMessages.length >= 5) {
    try {
      await message.channel.send(`⚠️ <@${userId}> หยุดสแปม! คุณส่งข้อความรัวเกินไป`);
      // ถ้าจะให้ถอดยศหรือเตะ ต้องใส่ ID ยศกักบริเวณเพิ่มครับ
      messageLog.delete(userId);
    } catch (err) {
      console.log("Error handling spam: " + err.message);
    }
  }
});

// บรรทัดนี้ห้ามแก้! มันจะไปดึงค่าจากหน้า Environment เอง
client.login(process.env.TOKEN).catch(err => {
  console.log("❌ LOGIN FAILED: " + err.message);
});
