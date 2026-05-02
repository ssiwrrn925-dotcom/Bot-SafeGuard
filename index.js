const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();

// =====================
// 🌐 WEB SERVER (สำหรับ Render)
// =====================
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot-SafeGuard is Online and Healthy! 🛡️");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web Server starts on port ${PORT}`);
});

// =====================
// 🤖 CLIENT SETUP
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =====================
// 📌 CONFIG (ดึงจาก Environment ของ Render)
// =====================
const token = process.env.TOKEN;
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

const spamMap = new Map();
let globalSpamAlert = false;

// =====================
// 📊 LOG FUNCTION
// =====================
function sendLog(guild, member, reason, channel) {
  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  const embed = new EmbedBuilder()
    .setTitle("🚫 Anti-Spam System")
    .setColor("Red")
    .addFields(
      { name: "👤 ผู้ใช้", value: `${member.user.tag} (${member.id})` },
      { name: "📌 เหตุผล", value: reason },
      { name: "💬 ห้อง", value: `<#${channel.id}>` },
      { name: "⏰ เวลา", value: new Date().toLocaleString("th-TH") }
    )
    .setTimestamp();

  log.send({ embeds: [embed] }).catch(err => console.error("Log error:", err.message));
}

// =====================
// 🚫 ANTI SPAM LOGIC
// =====================
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const member = msg.member;
  if (!member || member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  if (!spamMap.has(id)) {
    spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  }

  const data = spamMap.get(id);

  // Reset ข้อมูลถ้าผ่านไป 4 วินาทีแล้วไม่มีการส่งต่อ
  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  if (data.msgs.length > 10) data.msgs.shift();
  const recent = data.msgs.filter(m => Date.now() - m.createdTimestamp < 5000);

  // 🚨 ตรวจพบการสแปม (5 ข้อความใน 5 วินาที)
  if (recent.length >= 5) {
    try {
      // 🧨 ลบข้อความสแปม
      const deletable = data.msgs
        .filter(m => m && !m.deleted)
        .filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000)
        .slice(0, 100);

      await msg.channel.bulkDelete(deletable, true).catch(() => {});

      // 🚫 ใส่ยศกักบริเวณ
      await member.roles.add(QUARANTINE_ROLE_ID, "Spam detected").catch(err => 
        console.error("Role Error:", err.message)
      );

      // 🚨 ส่งข้อความเตือนในห้อง (จำกัดการแจ้งเตือนไม่ให้รกเกินไป)
      if (!globalSpamAlert) {
        globalSpamAlert = true;
        msg.channel.send(`🚫 **ตรวจพบการสแปม** → ${member} (${member.user.tag}) ถูกกักบริเวณแล้ว`).catch(() => {});
        setTimeout(() => { globalSpamAlert = false; }, 60000);
      }

      // 📊 ส่ง Log ไปยังห้องที่ตั้งไว้
      sendLog(msg.guild, member, "Spam detected (5+ messages/5s)", msg.channel);
    } catch (err) {
      console.log("Anti-spam error:", err.message);
    }
  }

  // ล้าง Memory เมื่อผ่านไป 1 นาที
  setTimeout(() => {
    if(spamMap.has(id)) spamMap.delete(id);
  }, 60000);
});

// =====================
// 🚀 READY
// =====================
client.once("ready", () => {
  console.log("------------------------------------");
  console.log(`🛡  ONLINE: ${client.user.tag}`);
  console.log("🛡  SAFE GUARD STATUS: READY");
  console.log("------------------------------------");
});

// =====================
// 🔑 LOGIN
// =====================
console.log("🚀 Starting login process...");

if (!token) {
  console.error("❌ ERROR: TOKEN is missing in Render Environment Variables!");
  process.exit(1);
} else {
  client.login(token)
    .then(() => console.log("✅ [SUCCESS] Discord Login Resolved"))
    .catch(err => {
      console.error("❌ [LOGIN FAILED]");
      console.error(err.message);
    });
}
