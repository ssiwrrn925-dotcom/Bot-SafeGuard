const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();

// =====================
// 🌐 PORT (Render ต้องใช้)
// =====================
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
  console.error("❌ TOKEN missing");
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
// 📊 DATA
// =====================
const spamMap = new Map();
let globalSpamAlert = false;

// =====================
// 📊 LOG FUNCTION
// =====================
function sendLog(guild, member, reason, channel) {
  if (!LOG_CHANNEL_ID) return;

  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  const embed = new EmbedBuilder()
    .setTitle("🚫 Anti-Spam System")
    .setColor("Red")
    .addFields(
      { name: "👤 User", value: `${member.user.tag}` },
      { name: "📌 Reason", value: reason },
      { name: "💬 Channel", value: `<#${channel.id}>` },
      { name: "⏰ Time", value: new Date().toLocaleString() }
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
    spamMap.set(id, { msgs: [], last: Date.now() });
  }

  const data = spamMap.get(id);

  if (Date.now() - data.last > 5000) {
    data.msgs = [];
  }

  data.msgs.push(msg);
  data.last = Date.now();

  if (data.msgs.length > 10) data.msgs.shift();

  const recent = data.msgs.filter(
    (m) => Date.now() - m.createdTimestamp < 5000
  );

  if (recent.length >= 5) {
    try {
      const deletable = data.msgs.slice(0, 100);

      await msg.channel.bulkDelete(deletable, true).catch(() => {});

      if (QUARANTINE_ROLE_ID) {
        await member.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
      }

      if (!globalSpamAlert) {
        globalSpamAlert = true;

        msg.channel.send(
          `🚫 Spam detected → ${member.user.tag}`
        ).catch(() => {});

        setTimeout(() => {
          globalSpamAlert = false;
        }, 60000);
      }

      sendLog(msg.guild, member, "Spam detected", msg.channel);

    } catch (err) {
      console.error(err);
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
// 🔥 DEBUG (สำคัญ)
// =====================
client.on("debug", console.log);
client.on("error", console.error);
client.on("warn", console.warn);

// =====================
// 💥 SAFETY
// =====================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// =====================
// 🔑 LOGIN (สำคัญมาก)
// =====================
console.log("🚀 Starting login...");

client.login(token)
  .then(() => {
    console.log("✅ LOGIN SUCCESS");
  })
  .catch((err) => {
    console.error("❌ LOGIN ERROR:", err);
  });
