const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  Collection, 
  PermissionsBitField 
} = require("discord.js");

const http = require("http");

// --- 🌐 Web Server กันบอทหลับ (Render) ---
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
}).listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web Server is running...");
});

// --- ❗ ตรวจสอบ TOKEN ---
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("❌ ไม่พบ TOKEN ใน Render (Environment Variables)");
  process.exit(1);
}

// --- ⚙️ ตั้งค่า ID ---
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// --- 🤖 Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 🛡️ ระบบกันสแปม ---
const messageCache = new Collection();
const SPAM_THRESHOLD = 4;
const SPAM_INTERVAL = 3000;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // กัน error กรณี member null
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
      // ลบข้อความ
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        for (const msg of userData.messages) {
          await msg.delete().catch(() => {});
        }
      }

      // กักบริเวณ (เปลี่ยนยศ)
      await member.roles.set([QUARANTINE_ROLE_ID]).catch(err => {
        console.log(`❌ ปลดยศไม่ได้: ${err.message}`);
      });

      await message.channel.send(
        `🗑️ <@${authorId}> สแปมข้อความ → ถูกลบข้อความ + กักบริเวณแล้ว`
      );

      // ส่ง log
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 ระบบ Anti-Spam")
          .setColor("#ff0000")
          .setDescription(
            `👤 ผู้ใช้: <@${authorId}>\n📊 จำนวน: ${userData.count} ข้อความ`
          )
          .addFields({
            name: "สถานะ",
            value: "✅ ลบข้อความ\n✅ กักบริเวณ"
          })
          .setTimestamp();

        await logChannel.send({
          content: `🚨 แจ้งเตือนสแปม`,
          embeds: [embed]
        });
      }

      messageCache.delete(authorId);

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
});

// --- ✅ บอทออนไลน์ ---
client.once("ready", () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// --- 🚀 Login ---
console.log("🔄 กำลัง Login...");
client.login(TOKEN).catch(err => {
  console.error("❌ Login ไม่สำเร็จ:");
  console.error(err.message);

  if (err.message.includes("An invalid token")) {
    console.error("👉 TOKEN ผิด");
  }
  if (err.message.includes("Privileged intent")) {
    console.error("👉 ไปเปิด Intent ใน Discord Developer Portal");
  }
});
