const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");

// 🌐 1. Keep-Alive Server (สำหรับ Render)
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(8080);

// 🤖 2. ตั้งค่าบอท
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// 📊 3. ระบบส่ง Log
function sendLog(guild, member, reason, channel) {
  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;
  const embed = new EmbedBuilder()
    .setTitle("🚫 Anti-Spam: ถอดยศเสร็จสิ้น")
    .setColor("Red")
    .addFields(
      { name: "👤 ผู้ใช้", value: `${member.user.tag} (${member.id})` },
      { name: "📌 การดำเนินการ", value: "ถอดยศทั้งหมด และกักบริเวณ" },
      { name: "💬 ห้องที่สแปม", value: `<#${channel.id}>` }
    )
    .setTimestamp();
  log.send({ embeds: [embed] }).catch(() => {});
}

// 🚫 4. ระบบตรวจจับการสแปม & ถอดยศ
const spamMap = new Map();

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  
  // ข้าม Administrator เพื่อป้องกันบอทเอ๋อใส่เจ้าของเซิร์ฟ
  if (msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  const data = spamMap.get(id);

  // Reset ถ้าหยุดพิมพ์เกิน 4 วินาที
  if (Date.now() - data.last > 4000) {
    data.count = 0;
    data.msgs = [];
  }

  data.count++;
  data.last = Date.now();
  data.msgs.push(msg);

  // 🚨 ตรวจพบการสแปม (5 ข้อความใน 4 วินาที)
  if (data.count >= 5) {
    try {
      // 1. ลบข้อความที่สแปม
      const deletable = data.msgs.filter(m => !m.deleted);
      if (deletable.length > 0) {
        await msg.channel.bulkDelete(deletable, true).catch(() => {});
      }

      // 2. 🔥 ถอดยศทั้งหมดออกทันที
      // กรองยศ @everyone ออก และยศที่บอทไม่มีสิทธิ์ถอด
      const rolesToRemove = msg.member.roles.cache.filter(role => role.name !== "@everyone");
      if (rolesToRemove.size > 0) {
        await msg.member.roles.remove(rolesToRemove, "Spam Detected - Stripping all roles").catch(console.error);
      }

      // 3. ใส่ยศกักบริเวณ
      await msg.member.roles.add(QUARANTINE_ROLE_ID, "Spam detected").catch(console.error);

      // 4. แจ้งเตือนในห้องนั้น
      msg.channel.send(`❌ **${msg.author.tag}** ถูกถอดยศทั้งหมดและกักบริเวณข้อหาสแปม!`).catch(() => {});

      // 5. ส่ง Log
      sendLog(msg.guild, msg.member, "Spam detected", msg.channel);

      // ล้าง Data เพื่อเริ่มนับใหม่ถ้าเขากลับมาสแปมอีก
      spamMap.delete(id);

    } catch (e) {
      console.log("Error in Spam Logic:", e.message);
    }
  }
});

// 🚀 5. เริ่มทำงาน
client.once("ready", () => {
  console.log(`🛡 ${client.user.tag} ONLINE - พร้อมถอดยศพวกสแปม!`);
});

client.login(TOKEN);
