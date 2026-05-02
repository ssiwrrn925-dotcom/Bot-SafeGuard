const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration
  ]
});

// --- การตั้งค่าระบบป้องกัน ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; // ห้องส่ง Log และแท็กประจาน
const QUARANTINE_ROLE_ID = "1496547872701943958"; // ยศสำหรับกักบริเวณคนดึงบอท

// รายชื่อบอทที่อนุญาต (Whitelist)
const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541", 
  "788814313930096662", "491769129318088714", "292953664492929025", 
  "240254129333731328", "275813801792634880"
];

// --- ฟังก์ชันหลักในการกำจัดบอทและลงโทษคน ---

async function guardianSystem(target, actionType, name) {
  const guild = target.guild;
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

  // 1. ลบสิ่งที่บอทสแปมสร้างทิ้งทันที
  await target.delete().catch(() => {});

  setTimeout(async () => {
    try {
      const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[actionType] }).catch(() => null);
      const entry = audit?.entries.first();
      if (!entry) return;

      const { executor } = entry;

      // ตรวจสอบว่าเป็นบอทแปลกหน้า (ไม่อยู่ใน Whitelist)
      if (executor.bot && !whitelistedBots.includes(executor.id)) {
        
        // 2. แบนบอทตัวป่วนทันที
        const botMember = await guild.members.fetch(executor.id).catch(() => null);
        if (botMember) {
          await botMember.ban({ reason: `Anti-Raid: พยายามสร้าง ${name}` }).catch(() => {
            console.log(`[!] ไม่สามารถแบน ${executor.tag} ได้ (ตรวจสอบลำดับยศบอท)`);
          });
        }

        // 3. สืบหาคนดึงบอท (Inviter) จาก Audit Log
        const botAddLog = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.BotAdd }).catch(() => null);
        const inviterEntry = botAddLog?.entries.find(e => e.target.id === executor.id);
        const inviter = inviterEntry ? inviterEntry.executor : null;

        // 4. ลงโทษคนดึงบอท (กักบริเวณ)
        if (inviter) {
          const inviterMember = await guild.members.fetch(inviter.id).catch(() => null);
          if (inviterMember && !inviterMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // ถอดยศเดิมทั้งหมดและใส่ยศกักบริเวณตาม ID ที่แจ้งมา
            await inviterMember.roles.set([QUARANTINE_ROLE_ID]).catch(() => {});
          }
        }

        // 5. ส่ง Log แจ้งเตือนและแท็กชื่อคนดึง
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🛡️ ตรวจพบการพยายามป่วนเซิร์ฟเวอร์")
            .setColor("#ff0000")
            .setDescription(`**สิ่งที่เกิดขึ้น:** พยายามสร้าง ${name}\n**บอทผู้กระทำ:** <@${executor.id}>\n**คนดึงบอทเข้า:** ${inviter ? `<@${inviter.id}>` : "ไม่พบข้อมูล"}`)
            .addFields(
              { name: "ผลการดำเนินการ", value: "🗑️ ลบสิ่งที่สร้าง\n🔨 แบนบอทป่วน\n🔒 กักบริเวณคนดึง" }
            )
            .setTimestamp();

          logChannel.send({ 
            content: `🚨 **แจ้งเตือนความปลอดภัย:** <@${inviter?.id || 'everyone'}> บอทที่คุณดึงมาพยายามป่วนเซิร์ฟเวอร์ คุณถูกกักบริเวณเรียบร้อยแล้ว`, 
            embeds: [embed] 
          }).catch(() => {});
        }
      }
    } catch (e) { console.error(e); }
  }, 1000);
}

// --- การเฝ้าระวัง Action ต่างๆ ---

client.on("threadCreate", (t) => guardianSystem(t, "ThreadCreate", "เธรด (Thread)"));
client.on("channelCreate", (c) => guardianSystem(c, "ChannelCreate", "ห้อง (Channel)"));
client.on("roleCreate", (r) => guardianSystem(r, "RoleCreate", "ยศ (Role)"));

client.once("ready", () => {
  console.log(`🛡️ Guardian Bot Online: ${client.user.tag}`);
  console.log(`📡 Log Channel: ${LOG_CHANNEL_ID}`);
  console.log(`🔒 Quarantine Role: ${QUARANTINE_ROLE_ID}`);
});

client.login(TOKEN);
