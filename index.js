const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  Collection, 
  PermissionsBitField 
} = require("discord.js");

const http = require("http");

// --- 🌐 Web Server ---
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web Server is running...");
});

// --- 🔥 DEBUG เริ่มต้น ---
console.log("🚀 เริ่มรันบอท...");

// --- TOKEN ---
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("❌ ไม่พบ TOKEN");
  process.exit(1);
}

// --- ID ---
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// --- Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- Anti-Spam ---
const messageCache = new Collection();
const SPAM_THRESHOLD = 4;
const SPAM_INTERVAL = 3000;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.member) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;

  const userData = messageCache.get(authorId) || {
    count: 0,
    lastMessage: now,
    messages: []
  };

  userData.messages.push(message);

  if (now - userData.lastMessage < SPAM_INTERVAL) {
    userData.count++;
  } else {
    userData.count = 1;
    userData.messages = [message];
  }

  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  if (userData.count >= SPAM_THRESHOLD) {
    const member = message.member;
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    try {
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        for (const msg of userData.messages) {
          await msg.delete().catch(() => {});
        }
      }

      await member.roles.set([QUARANTINE_ROLE_ID]).catch(err => {
        console.log(`❌ ปลดยศไม่ได้: ${err.message}`);
      });

      await message.channel.send(`🗑️ <@${authorId}> ถูกกักบริเวณแล้ว`);

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 Anti-Spam")
          .setColor("#ff0000")
          .setDescription(`👤 <@${authorId}> (${userData.count} ข้อความ)`)
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }

      messageCache.delete(authorId);

    } catch (error) {
      console.error("❌ ERROR:", error);
    }
  }
});

// --- READY ---
client.once("ready", () => {
  console.log(`✅ READY: ${client.user.tag}`);
});

// --- ERROR DEBUG ---
client.on("error", console.error);

client.on("shardError", error => {
  console.error("❌ SHARD ERROR:", error);
});

process.on("unhandledRejection", err => {
  console.error("❌ UNHANDLED:", err);
});

// --- LOGIN (มีครั้งเดียว!) ---
console.log("🔄 กำลัง Login...");

client.login(TOKEN)
  .then(() => console.log("✅ LOGIN SUCCESS"))
  .catch(err => {
    console.error("❌ LOGIN ERROR:", err);
  });
