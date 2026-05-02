const { Client, GatewayIntentBits, EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ตั้งค่า ID ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// --- ตั้งค่าระบบตรวจจับ ---
const messageCache = new Collection();
const SPAM_THRESHOLD = 4; // พิมพ์เกิน 4 ข้อความ
const SPAM_INTERVAL = 3000; // ภายใน 3 วินาที

client.on("messageCreate", async (message) => {
  // ไม่ทำงานใน DM, ไม่ตรวจจับบอท, และไม่ตรวจจับ Administrator
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

  // บันทึกข้อความที่ส่งมาเพื่อเตรียมลบทิ้ง
  userData.messages.push(message);

  if (now - userData.lastMessage < SPAM_INTERVAL) {
    userData.count++;
  } else {
    userData.count = 1;
    userData.messages = [message]; // เริ่มนับใหม่ ล้างรายการข้อความเก่า
  }
  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  // 🔥 เมื่อตรวจพบการสแปม (ถึงจุดเดือด)
  if (userData.count >= SPAM_THRESHOLD) {
    const member = message.member;
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    try {
      // 1. ลบข้อความสแปมทั้งหมดทันที
      // ดึงข้อความทั้งหมดที่บันทึกไว้ในแคชมาลบทิ้ง
      if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        userData.messages.forEach(msg => msg.delete().catch(() => {}));
      }

      // 2. ปลดยศทั้งหมดและใส่ยศกักบริเวณทันที
      await member.roles.set([QUARANTINE_ROLE_ID], "กวาดล้างสแปมข้อความรัว").catch(err => {
        console.log(`[!] ไม่สามารถปลดยศ <@${authorId}> ได้: ${err.message}`);
      });

      // 3. แท็กประจานในห้องที่เกิดเหตุ
      await message.channel.send({ 
        content: `🗑️ **กวาดล้างสแปม:** <@${authorId}> ข้อความของคุณถูกลบทั้งหมด และคุณถูกปลดยศกักบริเวณทันที!` 
      }).catch(() => {});

      // 4. ส่ง Log และแท็กชื่อในห้อง Log
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🧹 ระบบกวาดล้างสแปมทำงาน")
          .setColor("#ff0000")
          .setThumbnail(message.author.displayAvatarURL())
          .setDescription(`**ผู้กระทำผิด:** <@${authorId}>\n**พฤติกรรม:** สแปมข้อความรัว (${userData.count} ข้อความ)`)
          .addFields({ name: "การดำเนินการ", value: "✅ ลบข้อความสแปมทั้งหมดแล้ว\n✅ ปลดยศเดิมออกทั้งหมดแล้ว\n✅ ใส่ยศกักบริเวณแล้ว" })
          .setTimestamp();

        logChannel.send({ 
          content: `🚨 **รายงานเหตุ:** <@${authorId}> ถูกกำจัดออกจากการใช้งานปกติเรียบร้อยแล้ว`, 
          embeds: [embed] 
        }).catch(() => {});
      }

      // ล้างข้อมูลแคชหลังจัดการเสร็จ
      messageCache.delete(authorId);

    } catch (error) {
      console.error(`Error in Purge System: ${error.message}`);
    }
  }
});

client.once("ready", () => {
  console.log(`🧹 Purge Guardian Online: ${client.user.tag}`);
});

client.login(TOKEN);
