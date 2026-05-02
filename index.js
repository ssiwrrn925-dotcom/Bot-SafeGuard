const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  EmbedBuilder 
} = require("discord.js");
const express = require("express");

// ==========================================
// 🌐 ส่วนที่ 1: WEB SERVER (ป้องกัน Render ปิดบอท)
// ==========================================
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🛡️ SafeGuard Bot is running 24/7!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`📡 Web Server is ready on port ${PORT}`);
});

// ==========================================
// 🤖 ส่วนที่ 2: ตั้งค่า Discord Bot
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ดึงข้อมูลจาก Environment Variables ใน Render
const token = process.env.TOKEN;
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

const spamMap = new Map();
let globalSpamAlert = false;

// ฟังก์ชันส่ง Log
async function sendLog(guild, member, reason, channel) {
  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  const embed = new EmbedBuilder()
    .setTitle("🚫 Anti-Spam Alert")
    .setColor("Red")
    .addFields(
      { name: "👤 User", value: `${member.user.tag} (${member.id})` },
      { name: "📌 Reason", value: reason },
      { name: "💬 Channel", value: `<#${channel.id}>` },
      { name: "⏰ Time", value: new Date().toLocaleString("th-TH") }
    )
    .setTimestamp();

  log.send({ embeds: [embed] }).catch(() => {});
}

// ==========================================
// 🚫 ส่วนที่ 3: ระบบ ANTI-SPAM (Logic)
// ==========================================
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const member = msg.member;
  if (!member || member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  if (!spamMap.has(id)) {
    spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  }

  const data = spamMap.get(id);

  // Reset ข้อมูลถ้าทิ้งช่วงเกิน 4 วินาที
  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  // เก็บประวัติข้อความแค่ 10 ข้อความล่าสุด
  if (data.msgs.length > 10) data.msgs.shift();

  // ตรวจสอบความถี่ (5 ข้อความภายใน 5 วินาที)
  const recent = data.msgs.filter(m => Date.now() - m.createdTimestamp < 5000);

  if (recent.length >= 5) {
    try {
      // 1. ลบข้อความที่สแปม
      const deletable = data.msgs.filter(m => m && !m.deleted);
      await msg.channel.bulkDelete(deletable, true).catch(() => {});

      // 2. ให้ยศกักบริเวณ
      await member.roles.add(QUARANTINE_ROLE_ID).catch(e => console.log("Role Error:", e.message));

      // 3. แจ้งเตือนในห้อง (จำกัด 1 ครั้งต่อนาทีไม่ให้บอทสแปมเอง)
      if (!globalSpamAlert) {
        globalSpamAlert = true;
        msg.channel.send(`🚫 **ตรวจพบสแปม!** ${member} ถูกกักบริเวณชั่วคราว`).catch(() => {});
        setTimeout(() => { globalSpamAlert = false; }, 60000);
      }

      // 4. ส่ง Log
      sendLog(msg.guild, member, "Spamming detected (5+ messages/5s)", msg.channel);
      
      // ล้างข้อมูลผู้ใช้คนนี้หลังโดนลงโทษ
      spamMap.delete(id);
    } catch (err) {
      console.log("System Error:", err.message);
    }
  }
});

// ==========================================
// 🚀 ส่วนที่ 4: เริ่มต้นทำงาน
// ==========================================
client.once("ready", () => {
  console.log("------------------------------------");
  console.log(`🛡️  SYSTEM ONLINE: ${client.user.tag}`);
  console.log(`📊  Monitoring ${client.guilds.cache.size} Servers`);
  console.log("------------------------------------");
});

if (!token) {
  console.error("❌ ERROR: TOKEN is missing in Environment Variables!");
} else {
  client.login(token).catch(err => {
    console.error("❌ FAILED TO LOGIN:");
    console.error(err.message);
  });
}
