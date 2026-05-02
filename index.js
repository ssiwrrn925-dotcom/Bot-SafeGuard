const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// --- การตั้งค่า ID ---
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628"; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

// รายชื่อบอทที่อนุญาต (รวมบอทตัวนี้เองและบอทดีอื่นๆ)
const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541", 
  "788814313930096662", "491769129318088714", "292953664492929025", 
  "240254129333731328", "275813801792634880", "1369921212062629939"
];

// 🔨 ฟังก์ชันคัดกรอง: ปล่อยผ่านคน / จัดการบอท
async function executeOrder(target, actionType, name) {
  const guild = target.guild;
  
  // รอ Audit Log แป๊บเดียวเพื่อให้ข้อมูลนิ่ง
  setTimeout(async () => {
    try {
      const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[actionType] }).catch(() => null);
      const entry = audit?.entries.first();
      if (!entry) return;

      const { executor } = entry;

      // 🛡️ เช็คว่าเป็นบอทหรือไม่
      if (executor.bot) {
        // ถ้าเป็นบอท และ "ไม่อยู่ใน Whitelist" -> ลงโทษสถานหนัก
        if (!whitelistedBots.includes(executor.id)) {
          
          // 1. ลบสิ่งที่บอทสร้างทิ้งทันที
          await target.delete().catch(() => {});

          // 2. แบนบอทตัวนั้นทิ้งทันที
          const botMember = await guild.members.fetch(executor.id).catch(() => null);
          if (botMember) {
            await botMember.ban({ reason: `🚨 ระบบความปลอดภัย: บอทแปลกหน้าพยายามสร้าง ${name}` }).catch(() => {});
          }

          // 3. ตามหาคนดึงบอท (Inviter)
          const botAddLog = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.BotAdd }).catch(() => null);
          const inviterEntry = botAddLog?.entries.find(e => e.target.id === executor.id);
          const inviter = inviterEntry ? inviterEntry.executor : null;

          // 4. กักบริเวณคนดึงบอท (ยกเว้น Admin/Owner)
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
              .setTitle("⛔ ระงับการโจมตีจากบอทสแปม")
              .setColor("DarkRed")
              .setDescription(`**เหตุการณ์:** บอท <@${executor.id}> พยายามสร้าง ${name}\n**คนดึงบอท:** ${inviter ? `<@${inviter.id}>` : "ไม่พบข้อมูล"}`)
              .addFields({ name: "สถานะ", value: "💀 แบนบอทแล้ว\n🗑️ ลบสิ่งที่สร้างแล้ว\n🔒 กักบริเวณคนดึงแล้ว" })
              .setTimestamp();

            logChannel.send({ 
              content: `🚨 **จับตัวได้:** <@${inviter?.id || 'everyone'}> บอทที่คุณดึงมาถูกกำจัดแล้ว!`, 
              embeds: [embed] 
            }).catch(() => {});
          }
        } 
        // ถ้าเป็นบอทใน Whitelist -> ปล่อยผ่าน
      } else {
        // 👤 ถ้าเป็น "คน" (User) เป็นคนสร้าง -> ปล่อยผ่าน ไม่ทำอะไรเลย
        console.log(`[PASS] สมาชิก <@${executor.tag}> สร้าง ${name} ตามปกติ`);
      }
    } catch (e) { console.error(e); }
  }, 1000);
}

// --- การตรวจจับ Action ---
client.on("threadCreate", t => executeOrder(t, "ThreadCreate", "เธรด (Thread)"));
client.on("channelCreate", c => executeOrder(c, "ChannelCreate", "ห้อง (Channel)"));
client.on("roleCreate", r => executeOrder(r, "RoleCreate", "ยศ (Role)"));

client.once("ready", () => console.log(`🛡️ Bot SafeGuard Online: โหมดอนุญาตคน/แบนบอท พร้อมใช้งาน!`));
client.login(TOKEN);
