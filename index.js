const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const { token } = require("./config.json");

// =====================
// 🤖 CLIENT
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
// 📌 CONFIG
// =====================
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// =====================
// 📌 DATA
// =====================
const spamMap = new Map();
let globalSpamAlert = false;

// =====================
// 📊 LOG
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
  if (!member) return;

  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;

  if (!spamMap.has(id)) {
    spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  }

  const data = spamMap.get(id);

  // reset
  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  if (data.msgs.length > 10) data.msgs.shift();

  const recent = data.msgs.filter(m => Date.now() - m.createdTimestamp < 5000);

  // 🚨 detect spam
  if (recent.length >= 5) {
    try {
      // 🧨 ลบข้อความ
      const deletable = data.msgs
        .filter(m => m && !m.deleted)
        .filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000)
        .slice(0, 100);

      await msg.channel.bulkDelete(deletable, true).catch(() => {});

      // 🚫 ใส่ยศกัก
      await member.roles.add(QUARANTINE_ROLE_ID, "Spam detected").catch(() => {});

      // 🚨 แจ้งแค่ 1 ครั้ง + แสดงชื่อคน
      if (!globalSpamAlert) {
        globalSpamAlert = true;

        msg.channel.send(
          `🚫 ตรวจพบการสแปม → ${member} (${member.user.tag}) ถูกกักบริเวณ`
        ).catch(() => {});

        setTimeout(() => {
          globalSpamAlert = false;
        }, 60000);
      }

      // 📊 log
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
  console.log("🛡 SAFE GUARD FULL NAME DISPLAY ONLINE");
});

client.login(token);
