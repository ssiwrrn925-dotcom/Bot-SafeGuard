const { Client, GatewayIntentBits, EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");
const http = require("http");
require("dotenv").config();

// --- 🌐 ระบบ Web Server ป้องกัน Render หลับ (ใช้ Port 10000) ---
http.createServer((req, res) => {
  res.write("Anti-Spam Bot is Online");
  res.end();
}).listen(process.env.PORT || 10000, "0.0.0.0");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, // ต้องเปิดสิทธิ์นี้ใน Discord Developer Portal ด้วย
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ⚙️ ตั้งค่าไอดี (เช็คให้ตรงกับในดิสคอร์ดคุณ) ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; // ยศกักบริเวณ

// --- 🛡️ ระบบตรวจจับสแปม ---
const messageCache = new Collection();

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  
  // ยกเว้นแอดมินไม่ต้องโดนกักบริเวณ
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

  userData.messages.push(message);

  if (now - userData.lastMessage < 3000) { // ระยะเวลา 3 วินาที
    userData.count++;
  } else {
    userData.count = 1;
    userData.messages = [message];
  }
  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  // 🔥 เมื่อสแปมครบ 4 ข้อความ
  if (userData.count >= 4) {
    const member = message.member;
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    try {
      // 1. ลบข้อความสแปม
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        userData.messages.forEach(msg => msg.delete().catch(() => {}));
      }

      // 2. ✨ ถอดยศทั้งหมดและกักบริเวณทันที ✨
      // .roles.set จะลบยศเก่าทิ้งทั้งหมด แล้วใส่แค่ยศกักบริเวณอย่างเดียว
      await member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปมอัตโนมัติ");

      // 3. ประกาศเตือนในห้อง
      await message.channel.send(`⚠️ **กวาดล้างสแปม:** <@${authorId}> ถูกถอดยศและกักบริเวณทันที!`);

      // 4. ส่งรายงานเข้าห้อง Log
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 รายงานการกวาดล้าง")
          .setColor("#ff0000")
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: "👤 ผู้กระทำผิด", value: `<@${authorId}>`, inline: true },
            { name: "🚫 ผลลัพธ์", value: "ถอดยศเดิม + กักบริเวณ", inline: true }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }

      messageCache.delete(authorId);
    } catch (error) {
      console.error(`[!] จัดการไม่ได้เพราะ: ${error.message}`);
    }
  }
});

client.once("ready", () => {
  console.log(`🧹 บอทกันสแปม (ถอดยศ) ออนไลน์แล้ว: ${client.user.tag}`);
});

client.login(TOKEN);
