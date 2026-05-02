const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");

// 🌐 1. สร้าง Server เพื่อแก้ปัญหา Port Timeout ใน Render
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(8080);

// 🤖 2. ตั้งค่าบอท (ใช้ค่าจาก Environment Variables)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// 📊 3. ระบบส่ง Log
function sendLog(guild, member, reason, channel) {
  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;
  const embed = new EmbedBuilder()
    .setTitle("🚫 Anti-Spam System")
    .setColor("Red")
    .addFields(
      { name: "👤 ผู้ใช้", value: `${member.user.tag}` },
      { name: "📌 เหตุผล", value: reason },
      { name: "💬 ห้อง", value: `<#${channel.id}>` }
    );
  log.send({ embeds: [embed] }).catch(() => {});
}

// 🚫 4. ระบบตรวจจับการสแปม
const spamMap = new Map();
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  if (msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  const data = spamMap.get(id);

  if (Date.now() - data.last > 4000) { data.count = 0; data.msgs = []; }
  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  if (data.count >= 5) {
    try {
      const deletable = data.msgs.filter(m => !m.deleted);
      if (deletable.length > 0) await msg.channel.bulkDelete(deletable, true).catch(() => {});
      await msg.member.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
      sendLog(msg.guild, msg.member, "Spam detected", msg.channel);
    } catch (e) { console.log(e.message); }
  }
});

// 🚀 5. เริ่มทำงาน
client.once("ready", () => console.log(`🛡 ${client.user.tag} ONLINE`));
client.login(TOKEN);
