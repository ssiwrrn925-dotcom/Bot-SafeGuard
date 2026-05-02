const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, AuditLogEvent } = require("discord.js");

// 🌐 1. Server สำหรับ Keep-Alive
http.createServer((req, res) => { res.write("Security System: Identification Mode ONLINE"); res.end(); }).listen(8080);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildModeration
  ]
});

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// ⚪️ Whitelist: บอทที่ได้รับอนุญาต
const whitelistedBots = ["411916947773587456", "1369921212062629939", "493716749342998541", "788814313930096662", "491769129318088714", "292953664492929025", "240254129333731328", "275813801792634880"];

// 📊 2. ระบบส่ง Log พร้อมแท็กชื่อ (Mention)
async function sendActionLog(guild, target, action, reason, extraInfo = "") {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;
  
  const embed = new EmbedBuilder()
    .setTitle("🛡️ รายงานการลงโทษผู้กระทำผิด")
    .setColor(action.includes("BAN") ? "#FF0000" : "#FFA500")
    .setDescription(`**ผู้กระทำผิด:** <@${target.id}> (${target.tag})\n**การลงโทษ:** ${action}\n**สาเหตุ:** ${reason}\n${extraInfo}`)
    .setTimestamp();
    
  // แท็กชื่อใน Log ด้วยเพื่อให้แอดมินรู้ตัวทันที
  logChannel.send({ content: `🚨 **ตรวจพบเหตุการณ์จาก:** <@${target.id}>`, embeds: [embed] }).catch(() => {});
}

// 🔨 3. ฟังก์ชันลงโทษแยกประเภท (บอท = แบน | คน = กักบริเวณ + แท็กประจาน)
async function punishTarget(guild, userId, reason, channel = null) {
  try {
    if (whitelistedBots.includes(userId) || userId === client.user.id) return;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    if (member.user.bot) {
      // 🤖 จัดการบอท -> แบน
      await member.ban({ reason: `[ANTI-BOT] ${reason}` })
        .then(() => sendActionLog(guild, member.user, "🔨 BAN (แบนถาวร)", reason))
        .catch(() => {});
    } else {
      // 👤 จัดการคน -> กักบริเวณ + แท็กชื่อในห้องเกิดเหตุ
      const roles = member.roles.cache.filter(r => r.name !== "@everyone");
      await member.roles.remove(roles).catch(() => {});
      await member.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
      
      if (channel) {
        channel.send(`🔒 **ระงับสิทธิ์:** <@${userId}> คุณถูกถอดยศและกักบริเวณเนื่องจาก: ${reason}`).catch(() => {});
      }
      sendActionLog(guild, member.user, "🔒 QUARANTINE (กักบริเวณ)", reason);
    }
  } catch (err) { console.error(err); }
}

// 🛡️ 4. ตรวจจับการสแปม (ลบ + แท็กชื่อคนทำ)
const spamMap = new Map();
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.id === client.user.id || whitelistedBots.includes(msg.author.id)) return;

  const id = msg.author.id;
  const now = Date.now();
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: now, msgs: [] });
  const data = spamMap.get(id);

  if (now - data.last > 2500) { data.count = 0; data.msgs = []; }
  data.count++;
  data.last = now;
  data.msgs.push(msg);

  if (data.count >= 3) {
    const toDelete = data.msgs.filter(m => !m.deleted);
    if (toDelete.length > 0) await msg.channel.bulkDelete(toDelete, true).catch(() => {});
    
    await punishTarget(msg.guild, id, "สแปมข้อความก่อกวน", msg.channel);
    spamMap.delete(id);
  }
});

// 🛡️ 5. ตรวจจับคนดึงบอท (แท็กทั้งบอทและคนดึง)
client.on("guildMemberAdd", async (member) => {
  if (!member.user.bot || whitelistedBots.includes(member.id)) return;

  const audit = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd }).catch(() => null);
  const inviter = audit?.entries.first()?.executor;

  if (inviter) {
    // แบนบอท
    await punishTarget(member.guild, member.id, "บอทไม่ได้รับอนุญาต");
    // กักบริเวณคนดึง พร้อมระบุใน Log ว่าดึงบอทตัวไหนมา
    await punishTarget(member.guild, inviter.id, `แอบดึงบอทแปลกหน้าเข้าเซิร์ฟเวอร์ (<@${member.id}>)`);
    sendActionLog(member.guild, inviter, "🔒 QUARANTINE", `ดึงบอทสแปม <@${member.id}> เข้ามา`, `**บอทที่ถูกดึง:** ${member.user.tag}`);
  }
});

// 🛡️ 6. กันสร้างทุกอย่าง (แท็กชื่อคนสร้าง)
const handleAbuse = async (target, type) => {
  const audit = await target.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent[type] }).catch(() => null);
  const executor = audit?.entries.first()?.executor;
  
  if (executor && executor.id !== client.user.id && !whitelistedBots.includes(executor.id)) {
    await target.delete().catch(() => {}); 
    await punishTarget(target.guild, executor.id, `พยายามสร้าง ${type} โดยไม่ได้รับอนุญาต`);
  }
};

client.on("channelCreate", c => handleAbuse(c, "ChannelCreate"));
client.on("roleCreate", r => handleAbuse(r, "RoleCreate"));
client.on("threadCreate", t => handleAbuse(t, "ThreadCreate"));

client.once("ready", () => console.log(`🛡️ ${client.user.tag} ONLINE: ระบบแท็กระบุตัวตนพร้อมทำงาน!`));
client.login(TOKEN);
