const { Client, GatewayIntentBits, EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");
const http = require("http");

// --- 🌐 ระบบ Web Server เพื่อให้รันบน Render ได้ ---
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ⚙️ ตั้งค่า ID ---
// มั่นใจว่าใน Render ตั้งชื่อ Key ว่า TOKEN (ตัวพิมพ์ใหญ่)
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// --- 🛡️ ตั้งค่าระบบตรวจจับสแปม ---
const messageCache = new Collection();
const SPAM_THRESHOLD = 4;
const SPAM_INTERVAL = 3000;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

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
        userData.messages.forEach(msg => msg.delete().catch(() => {}));
      }

      await member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปมข้อความรัว").catch(err => {
        console.log(`[!] ปลดยศไม่ได้: ${err.message}`);
      });

      await message.channel.send(`🗑️ **กวาดล้างสแปม:** <@${authorId}> ข้อความถูกลบ และคุณถูกปลดยศกักบริเวณทันที!`);

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 ระบบกวาดล้างสแปมทำงาน (Render)")
          .setColor("#ff0000")
          .setDescription(`**ผู้กระทำผิด:** <@${authorId}>\n**พฤติกรรม:** สแปมข้อความรัว (${userData.count} ข้อความ)`)
          .addFields({ name: "สถานะ", value: "✅ ลบข้อความแล้ว\n✅ ปลดยศแล้ว\n✅ กักบริเวณแล้ว" })
          .setTimestamp();

        logChannel.send({ 
          content: `🚨 **รายงาน:** <@${authorId}> ถูกกักบริเวณเรียบร้อยแล้ว`, 
          embeds: [embed] 
        });
      }

      messageCache.delete(authorId);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }
});

client.once("ready", () => {
  console.log(`✅ [SUCCESS] 🧹 Purge Guardian Online: ${client.user.tag}`);
});

// --- 🛠️ ส่วนที่แก้ไข: เพิ่มการตรวจสอบการเข้าสู่ระบบ ---
if (!TOKEN) {
  console.error("❌ [ERROR] ไม่พบค่า TOKEN ใน Environment Variables ของ Render!");
} else {
  console.log("🚀 [INFO] กำลังพยายามเชื่อมต่อกับ Discord...");
  client.login(TOKEN).catch(err => {
    console.error("❌ [ERROR] บอทล็อกอินไม่ได้! สาเหตุ:");
    if (err.message.includes("An invalid token was provided")) {
      console.error("  -> Token ที่ใช้ไม่ถูกต้อง หรือ Copy มาไม่ครบ");
    } else if (err.message.includes("Privileged intent")) {
      console.error("  -> ลืมเปิดสวิตช์ Intents ใน Discord Developer Portal");
    } else {
      console.error("  -> " + err.message);
    }
  });
}
