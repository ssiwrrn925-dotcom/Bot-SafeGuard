const { Client, GatewayIntentBits, EmbedBuilder, Collection, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- ตั้งค่า ID และเกณฑ์การตรวจจับ ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; // ห้องส่ง Log
const QUARANTINE_ROLE_ID = "1496547872701943958"; // ยศกักบริเวณ

const messageCache = new Collection();
const SPAM_THRESHOLD = 5; // ส่งเกิน 5 ข้อความ
const SPAM_INTERVAL = 3000; // ภายใน 3 วินาที

client.on("messageCreate", async (message) => {
  // ไม่ทำงานใน DM, ไม่ตรวจจับบอท, และไม่ตรวจจับคนที่มีสิทธิ์ Administrator
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now };

  if (now - userData.lastMessage < SPAM_INTERVAL) {
    userData.count++;
  } else {
    userData.count = 1;
  }
  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  // เมื่อตรวจพบการสแปมข้อความ
  if (userData.count >= SPAM_THRESHOLD) {
    const member = message.member;
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    try {
      // 1. ปลดยศทั้งหมดและใส่ยศกักบริเวณทันที
      // ระบบจะทำการล้างยศเก่าออกหมด (Clear all roles) และใส่แค่ยศกักบริเวณอย่างเดียว
      await member.roles.set([QUARANTINE_ROLE_ID], "ตรวจพบการสแปมข้อความ").catch(err => {
        console.log(`[!] ปลดยศ <@${authorId}> ไม่สำเร็จ: ${err.message}`);
      });

      // 2. แท็กประจานในห้องที่เกิดเหตุทันที
      await message.channel.send({ 
        content: `⚠️ **ระงับการใช้งาน:** <@${authorId}> คุณถูกปลดยศและกักบริเวณฐานสแปมข้อความรัว!` 
      }).catch(() => {});

      // 3. ส่ง Log รายงานพร้อมแท็กชื่อในห้อง Log
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🔒 ดำเนินการกักบริเวณผู้สแปม")
          .setColor("#ff9900")
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: "👤 ผู้กระทำผิด", value: `<@${authorId}> (ID: ${authorId})`, inline: true },
            { name: "📝 พฤติกรรม", value: `ส่ง ${userData.count} ข้อความ ภายใน ${SPAM_INTERVAL / 1000} วินาที`, inline: true },
            { name: "🛡️ การลงโทษ", value: "ปลดยศเดิมออกทั้งหมด + ใส่ยศกักบริเวณ" }
          )
          .setTimestamp();

        logChannel.send({ 
          content: `🚨 **แจ้งรายงานการลงโทษ:** <@${authorId}> ถูกกักบริเวณเรียบร้อยแล้ว`, 
          embeds: [embed] 
        }).catch(() => {});
      }

      // ล้างข้อมูลแคชสแปมของผู้ใช้คนนี้
      messageCache.delete(authorId);

    } catch (error) {
      console.error(`เกิดข้อผิดพลาดในการจัดการสแปม: ${error.message}`);
    }
  }
});

client.once("ready", () => {
  console.log(`✅ ระบบ Guardian Anti-Spam ออนไลน์แล้ว!`);
  console.log(`📡 ตรวจจับที่: ${SPAM_THRESHOLD} ข้อความ / ${SPAM_INTERVAL / 1000} วินาที`);
});

client.login(TOKEN);
