const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();

// =====================
// 🌐 SERVER (Render)
// =====================
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot-SafeGuard is running!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web Server starts on port ${PORT}`);
});

// =====================
// 🔐 TOKEN CHECK
// =====================
const token = process.env.TOKEN;
console.log("🔍 [SYSTEM] TOKEN CHECK:", token ? "FOUND (Value present) ✅" : "MISSING ❌");

if (!token) {
  console.error("❌ [CRITICAL] No TOKEN provided in Environment Variables!");
  process.exit(1);
}

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
// 📊 DATA & CONFIG
// =====================
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const QUARANTINE_ROLE_ID = process.env.QUARANTINE_ROLE_ID;

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
      { name: "⏰ Time", value: new Date().toLocaleString("th-TH") }
    )
    .setTimestamp();

  log.send({ embeds: [embed] }).catch(err => console.error("❌ Error sending log:", err.message));
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
    spamMap.set(id, { msgs: [], last: Date.now() });
  }

  const data = spamMap.get(id);

  // Clear old data (5 seconds window)
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
      // Delete spam messages
      await msg.channel.bulkDelete(data.msgs.slice(0, 100), true).catch(() => {});

      // Add Quarantine Role
      if (QUARANTINE_ROLE_ID) {
        await member.roles.add(QUARANTINE_ROLE_ID).catch(err => 
            console.error(`❌ Role Add Error: ${err.message}`)
        );
      }

      if (!globalSpamAlert) {
        globalSpamAlert = true;
        msg.channel.send(`🚫 **Spam detected** → ${member.user.tag} has been restricted.`)
          .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
          .catch(() => {});

        setTimeout(() => { globalSpamAlert = false; }, 60000);
      }

      sendLog(msg.guild, member, "Spam detected (5+ messages in 5s)", msg.channel);

    } catch (err) {
      console.error("❌ Anti-spam action error:", err);
    }
  }

  // Cleanup map memory
  setTimeout(() => {
    if(spamMap.has(id)) spamMap.delete(id);
  }, 60000);
});

// =====================
// 🚀 READY & DEBUG
// =====================
client.once("ready", () => {
  console.log("-----------------------------------------");
  console.log(`🛡  ONLINE: ${client.user.tag}`);
  console.log(`📡  Serving ${client.guilds.cache.size} servers`);
  console.log("-----------------------------------------");
});

client.on("error", (err) => console.error("❌ [CLIENT ERROR]", err));
client.on("warn", (warn) => console.warn("⚠️ [CLIENT WARN]", warn));

// =====================
// 🔑 LOGIN
// =====================
console.log("🚀 Starting login process...");

client.login(token)
  .then(() => {
    console.log("✅ [SUCCESS] Discord Login Promise Resolved");
  })
  .catch((err) => {
    console.error("❌ [LOGIN FAILED] Details below:");
    console.error(err);
    console.log("👉 Suggestion: Check if your TOKEN is still valid and Intents are ON in Dev Portal.");
  });
