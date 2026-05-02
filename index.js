const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, AuditLogEvent } = require("discord.js");

// 🌐 1. Server สำหรับ Keep-Alive (ป้องกันบอทหลับใน Replit/Render)
http.createServer((req, res) => {
  res.write("Bot SafeGuard: Ultimate Security Mode ONLINE");
  res.end();
}).listen(8080);

// 🤖 2. ตั้งค่าบอทและ Intents (เปิดสิทธิ์การอ่านข้อมูลที่จำเป็น)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

// ดึงค่า Token จาก Secrets (รูปแม่กุญแจ)
const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// ⚪️ รายชื่อบอทที่อนุญาต (Whitelist) - บอทเหล่านี้จะทำทุกอย่างได้ปกติ
const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541",
  "788814313930096662", "491769129318088714", "292953664492929025",
  "240254129333731328", "275813801792634880"
];

// 📊 3. ระบบส่ง Log แจ้งเตือนความปลอดภัย
async function sendSecurityLog(guild, executor, action, targetName) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle("🛡️ ระบบรักษาความปลอดภัยขั้นสูงตรวจพบเหตุการณ์")
    .setColor("LuminousVividPink")
    .addFields(
      { name: "👤 ผู้ฝ่าฝืน", value: `${executor?.tag || "ไม่ระบุ"} (${executor?.id || "Unknown ID"})` },
      { name: "🚫 การกระทำ", value: `พยายามสร้าง: ${action}` },
      { name: "📝 ชื่อสิ่งที่สร้าง", value: targetName || "ไม่ระบุ" },
      { name: "📌 การดำเนินการ", value: "ลบทิ้งทันที + ถอดยศทั้งหมด + กักบริเวณ" }
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] }).catch(() => {});
}

// 🚫 4. ฟังก์ชันลงโทษ (ถอดยศทั้งหมด + ใส่ยศกักบริเวณ)
async function punishExecutor(guild, executorId) {
  try {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return;
    
    // ข้ามถ้าเป็น Admin หรือ บอทตัวเอง หรือ Whitelist
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    if (executorId === client.user.id || whitelistedBots.includes(executorId)) return;

    // ถอดยศทั้งหมด
    const rolesToRemove = member.roles.cache.filter(r => r.name !== "@everyone");
    if (rolesToRemove.size > 0) {
      await member.roles.remove(rolesToRemove, "Security Breach - Stripping Roles").catch(() => {});
    }
    
    // ใส่ยศกักบริเวณ
    await member.roles.add(QUARANTINE_ROLE_ID, "Security Breach - Quarantine").catch(() => {});
  } catch (err) {
    console.log(`[!] ลงโทษไม่ได้: ${err.message}`);
  }
}

// --- 🛡️ [ANTI-THREAD] กันการสร้างเธรดทุกประเภท ---
client.on("threadCreate", async (thread) => {
  try {
    const auditLogs = await thread.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ThreadCreate }).catch(() => null);
    const entry = auditLogs?.entries.first();
    const executor = entry?.executor;
    const ownerId = thread.ownerId || executor?.id;

    if (ownerId && ownerId !== client.user.id && !whitelistedBots.includes(ownerId)) {
      await thread.delete("Anti-Thread Spam").catch(() => {});
      await punishExecutor(thread.guild, ownerId);
      if (executor) sendSecurityLog(thread.guild, executor, "เธรด (Thread)", thread.name);
    }
  } catch (e) { console.log("Thread Error:", e.message); }
});

// --- 🛡️ [ANTI-CHANNEL] กันการสร้างห้อง ---
client.on("channelCreate", async (channel) => {
  try {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
    const entry = auditLogs?.entries.first();
    const executor = entry?.executor;

    if (executor && executor.id !== client.user.id && !whitelistedBots.includes(executor.id)) {
      await channel.delete("Anti-Channel Creation").catch(() => {});
      await punishExecutor(channel.guild, executor.id);
      sendSecurityLog(channel.guild, executor, "ห้อง (Channel)", channel.name);
    }
  } catch (e) { console.log("Channel Error:", e.message); }
});

// --- 🛡️ [ANTI-ROLE] กันการสร้างยศ ---
client.on("roleCreate", async (role) => {
  try {
    const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate }).catch(() => null);
    const entry = auditLogs?.entries.first();
    const executor = entry?.executor;

    if (executor && executor.id !== client.user.id && !whitelistedBots.includes(executor.id)) {
      await role.delete("Anti-Role Creation").catch(() => {});
      await punishExecutor(role.guild, executor.id);
      sendSecurityLog(role.guild, executor, "ยศ (Role)", role.name);
    }
  } catch (e) { console.log("Role Error:", e.message); }
});

// --- 🛡️ [ANTI-SPAM] กันสแปมข้อความเรทสูง ---
const spamMap = new Map();
client.on("messageCreate", async (msg) => {
  if (msg.author.id === client.user.id || whitelistedBots.includes(msg.author.id) || !msg.guild) return;
  if (msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  const now = Date.now();
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: now, msgs: [] });
  const data = spamMap.get(id);

  if (now - data.last > 3000) { data.count = 0; data.msgs = []; }
  data.count++;
  data.last = now;
  data.msgs.push(msg);

  // ตรวจพบสแปม (4 ข้อความใน 3 วินาที)
  if (data.count >= 4) {
    const deletable = data.msgs.filter(m => !m.deleted);
    if (deletable.length > 0) await msg.channel.bulkDelete(deletable, true).catch(() => {});
    await punishExecutor(msg.guild, id);
    msg.channel.send(`❌ **${msg.author.tag}** ถูกระงับสิทธิ์ทันทีเนื่องจากสแปม!`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    spamMap.delete(id);
  }
});

// 🚀 5. เริ่มทำงาน
client.once("ready", () => {
  console.log(`🛡️ ${client.user.tag} ONLINE! ระบบป้องกันสูงสุดทำงานแล้ว`);
});

if (TOKEN) {
  client.login(TOKEN).catch(err => console.error("❌ Token ผิดพลาด:", err.message));
} else {
  console.error("❌ ไม่พบ Token ใน Secrets!");
}
