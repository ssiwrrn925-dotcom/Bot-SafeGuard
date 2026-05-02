const http = require("http");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

// =====================
// 🌐 KEEP ALIVE SERVER
// =====================
http.createServer((req, res) => {
  res.write("Bot is online!");
  res.end();
}).listen(8080);

// =====================
// 🤖 CLIENT & CONFIG
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ดึงค่า TOKEN จาก Environment Variables ที่ตั้งไว้ใน Render
const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// =====================
// 📌 DATA
// =====================
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
      { name: "⏰ เวลา", value: new Date().toLocaleString() }
    );

  log.send({ embeds: [embed] }).catch(() => {});
}

// =====================
// 🚫 ANTI SPAM SYSTEM
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

  // Reset counters
  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  if (data.msgs.length > 10) data.msgs.shift();

  const recent = data.msgs.filter(m => Date.now() - m.createdTimestamp < 5000);

  // 🚨 Detect spam
  if (recent.length >= 5) {
    try {
      const deletable = data.msgs
        .filter(m => m && !m.deleted)
        .filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      if (deletable.length > 0) {
        await msg.channel.bulkDelete(deletable, true).catch(() => {});
      }

      await member.roles.add(QUARANTINE_ROLE_ID, "Spam detected").catch(() => {});

      if (!globalSpamAlert) {
        globalSpamAlert = true;
        msg.channel.send(`🚫 ตรวจพบการสแปม → ${member} (${member.user.tag}) ถูกกักบริเวณ`).catch(() => {});
        setTimeout(() => { globalSpamAlert = false; }, 60000);
      }

      sendLog(msg.guild, member, "Spam detected (bulk delete)", msg.channel);

    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  setTimeout(() => spamMap.delete(id), 60000);
});

// =====================
// 🚀 READY
// =====================
client.once("ready", () => {
  console.log(`🛡 ${client.user.tag} ONLINE & PROTECTING`);
});

// Login ด้วย TOKEN จาก Environment Variable
if (TOKEN) {
  client.login(TOKEN).catch(err => console.error("Login Error:", err.message));
} else {
  console.error("ERROR: TOKEN is missing in Environment Variables!");
}
