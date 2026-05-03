const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder } = require("discord.js");
const http = require("http");
require("dotenv").config();

// --- 🌐 1. ระบบ Web Server (หัวใจสำคัญเพื่อให้ Render ไม่ปิดบอท) ---
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("SafeGuard Bot is Online and Running!");
  res.end();
}).listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("🌐 Web Server stands by on port 10000");
});

// --- 🛡️ 2. ตั้งค่าบอท ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ดึงค่าจากหน้า Environment ใน Render
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

const messageCache = new Collection();

// --- 🛡️ 3. ระบบกวาดล้างสแปม ---
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

  userData.messages.push(message);
  if (now - userData.lastMessage < 3000) { 
    userData.count++; 
  } else { 
    userData.count = 1; 
    userData.messages = [message]; 
  }
  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  if (userData.count >= 4) {
    try {
      // ลบข้อความสแปม
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        userData.messages.forEach(msg => msg.delete().catch(() => {}));
      }
      // ✨ ถอดยศและกักบริเวณ
      await message.member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปมอัตโนมัติ");
      await message.channel.send(`🗑️ **กวาดล้างสแปม:** <@${authorId}> ถูกถอดยศและกักบริเวณทันที!`);
      messageCache.delete(authorId);
    } catch (err) {
      console.error(`[Error]: ไม่สามารถจัดการยศได้เพราะ ${err.message}`);
    }
  }
});

// --- 🚀 4. ระบบเปิดตัว ---
client.once("ready", () => {
  console.log(`✅ บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

// ดัก Error ตอน Login
client.login(TOKEN).catch(err => {
  console.error("❌ Login ไม่สำเร็จ! เช็ก TOKEN ในหน้า Environment ของ Render ด่วน");
  console.error(`สาเหตุ: ${err.message}`);
});
