const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// --- การตั้งค่าระบบป้องกัน (ใช้ ID ตามที่ระบุ) ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; // ห้องส่ง Log และแท็กชื่อคนทำ
const QUARANTINE_ROLE_ID = "1496547872701943958"; // ยศกักบริเวณ (ถอดยศเดิมออกหมด)

// รายชื่อบอทที่ได้รับอนุญาต (Whitelist)
const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541", 
  "788814313930096662", "491769129318088714", "292953664492929025", 
  "240254129333731328", "275813801792634880"
];

// 🔨 ฟังก์ชันพิฆาต: แบนบอททันที + กักบริเวณคนดึง
async function executeOrder(target, actionType, name) {
  const guild = target.guild;
  
  // 1. ลบสิ่งที่บอทสแปมพยายามสร้างทิ้งทันทีในเสี้ยววินาที
  await target.delete().catch(() => {});

  // 2. ดึงข้อมูลจาก Audit Log เพื่อหาตัวคนทำ
  const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[actionType] }).catch(() => null);
  const entry = audit?.entries.first();
  if (!entry) return;

  const { executor } = entry;

  // ตรวจสอบว่าเป็น "บอท" และ "ไม่อยู่ใน Whitelist"
  if (executor.bot && !whitelistedBots.includes(executor.id)) {
    
    // 3. สั่งแบนบอทสแปม (เช่น Shalltear) ออกจากเซิร์ฟเวอร์ทันที
    const botMember = await guild.members.fetch(executor.id).catch(() => null);
    if (botMember) {
      await botMember.ban({ reason: `โหมดทำลายล้าง: พยายามป่วนเซิร์ฟเวอร์ด้วยการสร้าง ${name}` }).catch(() => {
        console.log(`[!] แบนบอท ${executor.tag} ไม่สำเร็จ (ตรวจสอบลำดับยศบอทเรา)`);
      });
    }

    // 4. ย้อนรอยหา "คนดึงบอท" (Inviter)
    const botAddLog = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.BotAdd }).catch(() => null);
    const inviterEntry = botAddLog?.entries.find(e => e.target.id === executor.id);
    const inviter = inviterEntry ? inviterEntry.executor : null;

    // 5. ลงโทษคนดึง (กักบริเวณทันที)
    if (inviter) {
      const inviterMember = await guild.members.fetch(inviter.id).catch(() => null);
      // กักบริเวณถ้าคนดึงไม่ใช่เจ้าของเซิร์ฟ หรือ Admin
      if (inviterMember && inviter.id !== guild.ownerId && !inviterMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
        // ถอดยศเดิมทั้งหมดออก และใส่ยศกักบริเวณตาม ID ที่ระบุ
        await inviterMember.roles.set([QUARANTINE_ROLE_ID]).catch(() => {});
      }
    }

    // 6. ส่งรายงานและแท็กประจานคนดึงในห้อง Log
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🚨 ระงับเหตุป่วนเซิร์ฟเวอร์ขั้นเด็ดขาด")
        .setColor("DarkRed")
        .setDescription(`**เหตุการณ์:** บอทพยายามสร้าง ${name}\n**บอทสแปม:** <@${executor.id}>\n**คนดึงเข้ามา:** ${inviter ? `<@${inviter.id}>` : "ไม่พบข้อมูล"}`)
        .addFields({ name: "สถานะการดำเนินการ", value: "💀 แบนบอททิ้งแล้ว\n🔒 กักบริเวณคนดึงแล้ว\n🗑️ ลบสิ่งที่สร้างทิ้งแล้ว" })
        .setTimestamp();

      logChannel.send({ 
        content: `🚨 **ประกาศจับ:** <@${inviter?.id || 'everyone'}> คุณถูกกักบริเวณฐานดึงบอทป่วน <@${executor.id}> เข้าเซิร์ฟเวอร์!`, 
        embeds: [embed] 
      }).catch(() => {});
    }
  }
}

// --- ระบบเฝ้าระวัง Action (เธรด / ห้อง / ยศ) ---

client.on("threadCreate", t => executeOrder(t, "ThreadCreate", "เธรด (Thread)"));
client.on("channelCreate", c => executeOrder(c, "ChannelCreate", "ห้อง (Channel)"));
client.on("roleCreate", r => executeOrder(r, "RoleCreate", "ยศ (Role)"));

client.once("ready", () => {
  console.log(`🔥 Destruction Mode Online: ${client.user.tag}`);
  console.log(`📡 Log & Tag: ${LOG_CHANNEL_ID}`);
  console.log(`🔒 Quarantine Role: ${QUARANTINE_ROLE_ID}`);
});

client.login(TOKEN);
