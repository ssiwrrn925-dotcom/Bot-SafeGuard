const { 
  Client, GatewayIntentBits, EmbedBuilder, Collection, 
  PermissionsBitField 
} = require("discord.js");
const http = require("http");
require("dotenv").config();

// --- 🌐 ระบบ Web Server สำหรับ Render (Port 10000) ---
http.createServer((req, res) => {
  res.write("Anti-Spam System is Online");
  res.end();
}).listen(process.env.PORT || 10000, "0.0.0.0");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, // สำคัญมากสำหรับการจัดการยศ
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ⚙️ ตั้งค่าไอดี (นำมาจาก Discord ของคุณ) ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; // ไอดีพนักงานสอบสวน/กักบริเวณ

// --- 🛡️ ระบบตรวจจับ ---
const messageCache = new Collection();

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

  userData.messages.push(message);

  if (now - userData.lastMessage < 3000) { // ภายใน 3 วินาที
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

      // 2. ✨ ขั้นตอนถอดยศและกักบริเวณ ✨
      // การใช้ .roles.set([ID]) จะเป็นการลบยศเดิม "ทั้งหมด" และแทนที่ด้วยยศที่ระบุทันที
      await member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปม: ถอดยศอัตโนมัติ");

      // 3. ประกาศในห้องเกิดเหตุ
      await message.channel.send(`⚠️ **ลงโทษขั้นเด็ดขาด:** <@${authorId}> ถูกถอดยศทั้งหมดและกักบริเวณเนื่องจากพฤติกรรมสแปม!`);

      // 4. ส่งหลักฐานลงห้อง Log
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 รายงานการถอดยศและกักบริเวณ")
          .setColor("#ff0000")
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: "👤 ผู้กระทำผิด", value: `<@${authorId}> (${authorId})`, inline: true },
            { name: "🚫 การลงโทษ", value: "ถอดยศเดิมทั้งหมด + ใส่ยศกักบริเวณ", inline: true },
            { name: "📊 จำนวนข้อความ", value: `${userData.count} ข้อความ/3วินาที`, inline: false }
          )
          .setTimestamp();

        logChannel.send({ content: `🚨 **ตรวจพบสแปม:** <@${authorId}>`, embeds: [embed] });
      }

      messageCache.delete(authorId);
    } catch (error) {
      console.error(`[!] Error: ${error.message}`);
    }
  }
});

client.once("ready", () => {
  console.log(`🧹 ระบบกวาดล้างสแปม (ถอดยศอัตโนมัติ) พร้อมใช้งาน: ${client.user.tag}`);
});

client.login(TOKEN);
