const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder 
} = require("discord.js");
const http = require('http');

// 1. ระบบป้องกันบอทหลับสำหรับ Render
http.createServer((req, res) => {
  res.write("Anti-Spam Bot is running!");
  res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

// 2. การตั้งค่าระบบกันสแปม
const spamMessages = new Map();
const LIMIT = 5; // จำนวนข้อความสูงสุดที่อนุญาต
const TIME_WINDOW = 5000; // ภายในเวลา 5 วินาที
const QUARANTINE_ROLE_ID = "ใส่ไอดีบทบาทกักบริเวณตรงนี้"; // ไอดีบทบาทที่ใช้กักบริเวณ
const LOG_CHANNEL_ID = "ใส่ไอดีห้องแจ้งเตือนตรงนี้"; // ไอดีห้องสำหรับลง Log

client.once("ready", () => {
  console.log(`✅ บอทกันสแปมออนไลน์แล้ว: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();

  if (!spamMessages.has(userId)) {
    spamMessages.set(userId, []);
  }

  const userMessages = spamMessages.get(userId);
  userMessages.push(now);

  // กรองเฉพาะข้อความที่ส่งภายในช่วงเวลาที่กำหนด
  const recentMessages = userMessages.filter(timestamp => now - timestamp < TIME_WINDOW);
  spamMessages.set(userId, recentMessages);

  // ตรวจสอบว่าเกินขีดจำกัดหรือไม่
  if (recentMessages.length >= LIMIT) {
    try {
      // 1. ลบข้อความสแปม (ถ้ามีสิทธิ์)
      await message.channel.bulkDelete(recentMessages.length).catch(() => null);

      // 2. ให้บทบาทกักบริเวณ
      const member = message.member;
      const quarantineRole = message.guild.roles.cache.get(QUARANTINE_ROLE_ID);
      
      if (quarantineRole) {
        await member.roles.add(quarantineRole);
        
        // 3. ส่ง Log แจ้งเตือน
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🚫 ตรวจพบการสแปม!")
            .setDescription(`ผู้ใช้ <@${userId}> ถูกกักบริเวณเนื่องจากส่งข้อความรัวเกินไป`)
            .setColor(0xff0000)
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
      }

      // ล้างข้อมูลใน Map หลังจัดการแล้ว
      spamMessages.delete(userId);
      
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการจัดการสแปม:", err);
    }
  }
});

client.login(process.env.TOKEN);
