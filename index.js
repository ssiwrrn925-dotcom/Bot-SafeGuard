const { Client, GatewayIntentBits, EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");
const http = require("http");

// --- 🌐 ระบบ Web Server เพื่อให้รันบน Render ได้ ---
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 3000); // Render จะใช้ Port นี้ในการเช็คสถานะ

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ⚙️ ตั้งค่า ID ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// --- 🛡️ ตั้งค่าระบบตรวจจับสแปม ---
const messageCache = new Collection();
const SPAM_THRESHOLD = 4; // พิมพ์เกิน 4 ข้อความ
const SPAM_INTERVAL = 3000; // ภายใน 3 วินาที

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

  // 🔥 เมื่อตรวจพบการสแปม
  if (userData.count >= SPAM_THRESHOLD) {
    const member = message.member;
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    try {
      // 1. ลบข้อความสแปมทั้งหมดทันที
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        userData.messages.forEach(msg => msg.delete().catch(() => {}));
      }

      // 2. ปลดยศทั้งหมดและใส่ยศกักบริเวณ
      await member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปมข้อความรัว").catch(err => {
        console.log(`[!] ปลดยศไม่ได้: ${err.message}`);
      });

      // 3. แท็กชื่อประจานในห้องเกิดเหตุ
      await message.channel.send(`🗑️ **กวาดล้างสแปม:** <@${authorId}> ข้อความถูกลบ และคุณถูกปลดยศกักบริเวณทันที!`);

      // 4. ส่งรายงานและแท็กชื่อในห้อง Log
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
  console.log(`🧹 Purge Guardian Online on Render: ${client.user.tag}`);
});

client.login(TOKEN);
