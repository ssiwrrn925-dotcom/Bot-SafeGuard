const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

// =====================
// 🌐 EXPRESS (สำหรับ Render)
// =====================
const express = require("express");
const app = express();

const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT not found");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// =====================
// 🔐 TOKEN
// =====================
const token = process.env.TOKEN;

if (!token) {
  console.error("❌ TOKEN หาย ไปตั้งใน Render");
  process.exit(1);
}

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
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const QUARANTINE_ROLE_ID = process.env.QUARANTINE_ROLE_ID;

// =====================
// 📌 DATA
// =====================
const spamMap = new Map();
let globalSpamAlert = false;

// =====================
// 📊 LOG
// =====================
function sendLog(guild, member, reason, channel) {
  if (!LOG_CHANNEL_ID) return;

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
// 🚫 ANTI SPAM
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

  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  if (data.msgs.length > 10) data.msgs.shift();

  const recent = data.msgs.filter(
    (m) => Date.now() - m.createdTimestamp < 5000
  );

  if (recent.length >= 5) {
    try {
      const deletable = data.msgs
        .filter((m) => m && !m.deleted)
        .slice(0, 100);

      await msg.channel.bulkDelete(deletable, true).catch(() => {});
      if (QUARANTINE_ROLE_ID) {
        await member.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
      }

      if (!globalSpamAlert) {
        globalSpamAlert = true;

        msg.channel.send(
          `🚫 ตรวจพบการสแปม → ${member} (${member.user.tag}) ถูกกักบริเวณ`
        ).catch(() => {});

        setTimeout(() => {
          globalSpamAlert = false;
        }, 60000);
      }

      sendLog(msg.guild, member, "Spam detected", msg.channel);

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
  console.log(`🛡 ONLINE: ${client.user.tag}`);
});

// =====================
// ❗ DEBUG EVENTS (สำคัญมาก)
// =====================
client.on("error", console.error);
client.on("warn", console.warn);
client.on("shardError", console.error);

// =====================
// 💥 กันบอทดับ
// =====================
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err);
});
process.on("uncaughtException", (err) => {
  console.error("CRASH:", err);
});

// =====================
// 🔑 LOGIN (มี debug)
// =====================
console.log("🚀 Starting bot login...");

client.login(token)
  .then(() => {
    console.log("✅ LOGIN SUCCESS");
  })
  .catch((err) => {
    console.error("❌ LOGIN ERROR:", err);
  });
