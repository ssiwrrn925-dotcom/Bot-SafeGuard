const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");

// 🌐 1. สร้าง Server เพื่อแก้ปัญหา Port Timeout ใน Render
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(8080);

// 🤖 2. ตั้งค่าบอทและ Intents
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

// ⚪️ รายชื่อ ID บอทที่อนุญาต (Whitelist) - บอทเหล่านี้จะสแปมได้ไม่โดนจัดการ
const whitelistedBots = [
  "411916947773587456",
  "1369921212062629939",
  "493716749342998541",
  "788814313930096662",
  "491769129318088714",
  "292953664492929025",
  "240254129333731328",
  "275813801792634880"
];

// 📊 3. ระบบส่ง Log แจ้งเตือน
function sendLog(guild, member, reason, channel) {
  const log = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;
  const embed = new EmbedBuilder()
    .setTitle("🚨 ระบบป้องกันสแปม: ดำเนินการขั้นเด็ดขาด")
    .setColor("DarkRed")
    .addFields(
      { name: "👤 ผู้กระทำ", value: `${member.user.tag} ${member.user.bot ? "🤖 (BOT)" : "👤 (USER)"}` },
      { name: "📌 การดำเนินการ", value: "ถอดยศทั้งหมด และกักบริเวณ" },
      { name: "💬 ห้องที่เกิดเหตุ", value: `<#${channel.id}>` }
    )
    .setTimestamp();
  log.send({ embeds: [embed] }).catch(() => {});
}

// 🚫 4. ระบบตรวจจับสแปม (คน & บอทอื่น)
const spamMap = new Map();

client.on("messageCreate", async (msg) => {
  // ⛔ ข้ามบอทตัวเอง และบอทที่อยู่ใน Whitelist
  if (msg.author.id === client.user.id) return;
  if (whitelistedBots.includes(msg.author.id)) return;
  if (!msg.guild) return;
  
  // ⛔ ข้ามคนที่มีสิทธิ์ Administrator
  if (msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: Date.now(), msgs: [] });
  const data = spamMap.get(id);

  // Reset ข้อมูลถ้าทิ้งช่วงพิมพ์นานเกิน 4 วินาที
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
      // 1. ลบข้อความที่สแปมทั้งหมด
      const deletable = data.msgs.filter(m => !m.deleted);
      if (deletable.length > 0) {
        await msg.channel.bulkDelete(deletable, true).catch(() => {});
      }

      // 2. ถอดยศทั้งหมดออกทันที
      const rolesToRemove = msg.member.roles.cache.filter(role => role.name !== "@everyone");
      
      if (rolesToRemove.size > 0) {
        await msg.member.roles.remove(rolesToRemove, "Spam Detected - Stripping all roles")
          .then(() => console.log(`✅ Stripped roles from ${msg.author.tag}`))
          .catch(err => console.error(`❌ Cannot strip roles: ${err.message}`));
      }

      // 3. ใส่ยศกักบริเวณ
      await msg.member.roles.add(QUARANTINE_ROLE_ID, "Spam detected")
        .catch(err => console.error(`❌ Cannot add quarantine role: ${err.message}`));

      // 4. แจ้งเตือนในห้องและส่ง Log
      msg.channel.send(`⚠️ ตรวจพบการสแปมจาก **${msg.author.tag}** ทำการถอดยศและกักบริเวณทันที!`).catch(() => {});
      sendLog(msg.guild, msg.member, "Automated Spam Protection", msg.channel);

      // ล้างข้อมูลเพื่อเริ่มนับใหม่
      spamMap.delete(id);

    } catch (e) {
      console.log("Error logic:", e.message);
    }
  }
});

// 🚀 5. เริ่มทำงาน
client.once("ready", () => {
  console.log(`🛡 ${client.user.tag} ONLINE - เฝ้าระวังทั้งคนและบอท (ยกเว้น Whitelist แล้ว)`);
});

client.login(TOKEN);
