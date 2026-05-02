const http = require("http");
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, AuditLogEvent } = require("discord.js");

// 🌐 1. Server สำหรับ Keep-Alive (ป้องกันบอทหลับ)
http.createServer((req, res) => {
  res.write("Bot SafeGuard: Ultimate Security ONLINE");
  res.end();
}).listen(8080);

// 🤖 2. ตั้งค่าบอทและ Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

const TOKEN = process.env.TOKEN; 
const LOG_CHANNEL_ID = "1499134140841197628";
const QUARANTINE_ROLE_ID = "1496547872701943958";

// ⚪️ Whitelist: รายชื่อ ID บอทที่อนุญาตให้ทำงานได้ปกติ
const whitelistedBots = [
  "411916947773587456", "1369921212062629939", "493716749342998541",
  "788814313930096662", "491769129318088714", "292953664492929025",
  "240254129333731328", "275813801792634880"
];

// 📊 3. ระบบส่ง Log แจ้งเตือน
async function sendSecurityLog(guild, executor, action, targetName) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle("🛡️ ตรวจพบการบุกรุกและระงับสิทธิ์ทันที")
    .setColor("Red")
    .addFields(
      { name: "👤 ผู้กระทำ", value: `${executor?.tag || "Unknown"} (${executor?.id || "N/A"})` },
      { name: "🚫 การกระทำ", value: action },
      { name: "📝 เป้าหมาย", value: targetName || "ไม่ระบุ" },
      { name: "📌 สถานะ", value: "ลบสิ่งที่สร้าง + ถอดยศทั้งหมด + กักบริเวณเรียบร้อย" }
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] }).catch(() => {});
}

// 🚫 4. ฟังก์ชันลงโทษ (ถอดยศ + กักบริเวณ)
async function punishExecutor(guild, executorId) {
  try {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    if (executorId === client.user.id || whitelistedBots.includes(executorId)) return;

    const rolesToRemove = member.roles.cache.filter(r => r.name !== "@everyone");
    if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove).catch(() => {});
    await member.roles.add(QUARANTINE_ROLE_ID).catch(() => {});
  } catch (err) { console.log(`Error Punishing: ${err.message}`); }
}

// --- 🛡️ [ANTI-ALL CREATION] ตรวจจับการสร้างทุกอย่าง ---

// กันสร้างห้อง
client.on("channelCreate", async (channel) => {
  const audit = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
  const entry = audit?.entries.first();
  const executor = entry?.executor;
  if (executor && executor.id !== client.user.id && !whitelistedBots.includes(executor.id)) {
    await channel.delete().catch(() => {});
    await punishExecutor(channel.guild, executor.id);
    sendSecurityLog(channel.guild, executor, "สร้างห้อง (Channel)", channel.name);
  }
});

// กันสร้างยศ
client.on("roleCreate", async (role) => {
  const audit = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate }).catch(() => null);
  const entry = audit?.entries.first();
  const executor = entry?.executor;
  if (executor && executor.id !== client.user.id && !whitelistedBots.includes(executor.id)) {
    await role.delete().catch(() => {});
    await punishExecutor(role.guild, executor.id);
    sendSecurityLog(role.guild, executor, "สร้างยศ (Role)", role.name);
  }
});

// กันสร้างเธรด (Public & Private)
client.on("threadCreate", async (thread) => {
  const ownerId = thread.ownerId;
  if (ownerId && ownerId !== client.user.id && !whitelistedBots.includes(ownerId)) {
    await thread.delete().catch(() => {});
    await punishExecutor(thread.guild, ownerId);
    const owner = await client.users.fetch(ownerId).catch(() => null);
    sendSecurityLog(thread.guild, owner, "สร้างเธรด (Thread)", thread.name);
  }
});

// --- 🛡️ [ANTI-SPAM] กันสแปมข้อความเรทสูง ---
const spamMap = new Map();
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.id === client.user.id || whitelistedBots.includes(msg.author.id)) return;
  if (msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const id = msg.author.id;
  const now = Date.now();
  if (!spamMap.has(id)) spamMap.set(id, { count: 0, last: now, msgs: [] });
  const data = spamMap.get(id);

  if (now - data.last > 3000) { data.count = 0; data.msgs = []; }
  data.count++;
  data.last = now;
  data.msgs.push(msg);

  if (data.count >= 4) {
    const deletable = data.msgs.filter(m => !m.deleted);
    if (deletable.length > 0) await msg.channel.bulkDelete(deletable, true).catch(() => {});
    await punishExecutor(msg.guild, id);
    msg.channel.send(`❌ **${msg.author.tag}** ถูกระงับสิทธิ์เนื่องจากพยายามก่อกวนเซิร์ฟเวอร์!`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    spamMap.delete(id);
  }
});

client.once("ready", () => console.log(`🛡️ ${client.user.tag} ONLINE: ระบบป้องกันขั้นสูงสุดพร้อมทำงาน!`));
client.login(TOKEN);
