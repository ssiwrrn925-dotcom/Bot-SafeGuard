const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, AuditLogEvent } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildModeration
  ]
});

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// รายชื่อบอทที่อนุญาต (Whitelist)
const whitelistedBots = ["411916947773587456", "1369921212062629939", "493716749342998541", "788814313930096662", "491769129318088714", "292953664492929025", "240254129333731328", "275813801792634880"];

// 📊 ฟังก์ชันรายงานพร้อมแท็กชื่อผู้กระทำผิด
async function reportViolator(guild, botUser, executor, actionType) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle("🛡️ ยับยั้งการป่วนเซิร์ฟเวอร์")
    .setDescription(`**เหตุการณ์:** พยายามสร้าง ${actionType}\n**สถานะ:** ลบสิ่งที่สร้างและแบนบอทแล้ว`)
    .addFields(
      { name: "🤖 บอทที่ป่วน", value: `<@${botUser.id}>`, inline: true },
      { name: "👤 คนดึงบอทมา", value: `<@${executor.id}>`, inline: true }
    )
    .setColor("Red")
    .setTimestamp();

  logChannel.send({ 
    content: `🚨 **แจ้งเตือนความปลอดภัย:** <@${executor.id}> คุณถูกกักบริเวณเนื่องจากดึงบอท <@${botUser.id}> มาสร้างความวุ่นวาย`, 
    embeds: [embed] 
  }).catch(() => {});
}

// 🔨 ฟังก์ชันลงโทษคู่ (แบนบอทแปลกหน้า + กักบริเวณคนดึง)
async function punishSystem(guild, botId, actionType) {
  if (whitelistedBots.includes(botId)) return;

  const botMember = await guild.members.fetch(botId).catch(() => null);
  if (!botMember || !botMember.user.bot) return;

  // 1. หาคนดึงบอทตัวนี้เข้ามา
  const botAudit = await guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.BotAdd }).catch(() => null);
  const botEntry = botAudit?.entries.find(e => e.target.id === botId);
  const inviterId = botEntry ? botEntry.executor.id : null;

  // 2. แบนบอททันที
  await botMember.ban({ reason: `บอทแปลกหน้าพยายามสร้าง ${actionType}` }).catch(() => {});

  // 3. กักบริเวณคนดึง (ถ้าไม่ใช่ Admin)
  if (inviterId) {
    const executorMember = await guild.members.fetch(inviterId).catch(() => null);
    if (executorMember && !executorMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const roles = executorMember.roles.cache.filter(r => r.name !== "@everyone" && !r.managed);
      await executorMember.roles.remove(roles).catch(() => {});
      await executorMember.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
      
      await reportViolator(guild, botMember.user, executorMember.user, actionType);
    }
  }
}

// 🛡️ ระบบตรวจจับ Action จากบอท (ห้อง/ยศ/เธรด)
const handleBotAction = async (target, type) => {
  // รอข้อมูล Audit Log แปปเดียว
  setTimeout(async () => {
    const audit = await target.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[type] }).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;

    const { executor } = entry;

    // ถ้าผู้ทำเป็นบอท และไม่อยู่ใน Whitelist
    if (executor.bot && !whitelistedBots.includes(executor.id)) {
      // ลบสิ่งที่บอทสร้างทันที
      await target.delete().catch(() => {});
      // ลงโทษ
      await punishSystem(target.guild, executor.id, type);
    }
  }, 1000);
};

// 🔴 สั่งงาน: บอทสร้างอะไร ลบทิ้งและแบนทันที
client.on("channelCreate", c => handleBotAction(c, "ChannelCreate"));
client.on("roleCreate", r => handleBotAction(r, "RoleCreate"));
client.on("threadCreate", t => handleBotAction(t, "ThreadCreate")); // กันบอทสร้างเธรด

client.once("ready", () => console.log(`🛡️ ${client.user.tag} : เฝ้าระวังเธรด/ห้อง/ยศ พร้อมแท็กคนทำ!`));
client.login(TOKEN);
