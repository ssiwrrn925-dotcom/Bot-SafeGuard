const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541", 
  "788814313930096662", "491769129318088714", "292953664492929025", 
  "240254129333731328", "275813801792634880"
];

async function fastExecution(target, actionType, name) {
  const guild = target.guild;
  
  // 1. ลบสิ่งที่สร้างทิ้งทันที
  await target.delete().catch(() => {});

  // 2. ตรวจสอบ Audit Log ทันที
  const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[actionType] }).catch(() => null);
  const entry = audit?.entries.first();
  if (!entry) return;

  const { executor } = entry;

  // ถ้าเป็นบอทและไม่อยู่ใน Whitelist
  if (executor.bot && !whitelistedBots.includes(executor.id)) {
    const botMember = await guild.members.fetch(executor.id).catch(() => null);
    
    // 3. แบนบอทป่วนทันที
    if (botMember) {
      await botMember.ban({ reason: `Hard-Defense: พยายามสร้าง ${name}` }).catch(() => {
        console.log("⚠️ แบนไม่ได้! ตรวจสอบว่ายศ Bot SafeGuard อยู่สูงกว่าเป้าหมายหรือยัง");
      });
    }

    // 4. ตามหาคนดึงและกักบริเวณ
    const botAddLog = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.BotAdd }).catch(() => null);
    const inviterEntry = botAddLog?.entries.find(e => e.target.id === executor.id);
    const inviter = inviterEntry ? inviterEntry.executor : null;

    if (inviter) {
      const inviterMember = await guild.members.fetch(inviter.id).catch(() => null);
      if (inviterMember && inviter.id !== guild.ownerId && !inviterMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await inviterMember.roles.set([QUARANTINE_ROLE_ID]).catch(() => {});
      }
    }

    // 5. ส่ง Log แจ้งเตือน
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🚨 ระงับเหตุป่วนเซิร์ฟเวอร์")
        .setColor("DarkRed")
        .setDescription(`**เป้าหมาย:** <@${executor.id}> ถูกแบนแล้ว\n**สาเหตุ:** พยายามสร้าง ${name}\n**ผู้รับผิดชอบ (คนดึง):** ${inviter ? `<@${inviter.id}>` : "ไม่พบข้อมูล"}`)
        .setTimestamp();

      logChannel.send({ content: `🚨 **แจ้งเตือน:** พบการพยายามบุกรุกโดย <@${inviter?.id || 'unknown'}>`, embeds: [embed] }).catch(() => {});
    }
  }
}

client.on("threadCreate", t => fastExecution(t, "ThreadCreate", "เธรด (Thread)"));
client.on("channelCreate", c => fastExecution(c, "ChannelCreate", "ห้อง (Channel)"));
client.on("roleCreate", r => fastExecution(r, "RoleCreate", "ยศ (Role)"));

client.once("ready", () => console.log(`🛡️ Bot SafeGuard Online & Fast-Ban Mode Active!`));
client.login(TOKEN);
