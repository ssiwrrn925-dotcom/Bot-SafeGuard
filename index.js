const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require("discord.js");
const http = require("http");

// --- 🌐 ป้องกัน Render หลับ (Web Server) ---
http.createServer((req, res) => {
  res.write("SafeGuard Bot is Online!");
  res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ดึงค่าจาก Environment Variables ใน Render
const TOKEN = process.env.TOKEN; 
const QUARANTINE_ROLE_ID = "1496547872701943958"; 

const messageCache = new Collection();

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const now = Date.now();
  const authorId = message.author.id;
  const userData = messageCache.get(authorId) || { count: 0, lastMessage: now, messages: [] };

  userData.messages.push(message);
  if (now - userData.lastMessage < 3000) { userData.count++; } 
  else { userData.count = 1; userData.messages = [message]; }
  userData.lastMessage = now;
  messageCache.set(authorId, userData);

  if (userData.count >= 4) { // ตรวจเจอสแปม 4 ข้อความ
    try {
      userData.messages.forEach(msg => msg.delete().catch(() => {}));
      await message.member.roles.set([QUARANTINE_ROLE_ID]);
      await message.channel.send(`🗑️ **กวาดล้างสแปม:** <@${authorId}> ถูกถอดยศและกักบริเวณแล้ว!`);
      messageCache.delete(authorId);
    } catch (err) { console.error(err); }
  }
});

client.once("ready", () => {
  console.log(`✅ บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
});

client.login(TOKEN);
