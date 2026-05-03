// ==========================================
// 1. ระบบป้องกันบอทหลับ (แก้ปัญหา Port scan timeout)
// ==========================================
const http = require('http');

http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(8080);

// ==========================================
// 2. ตั้งค่าบอท Discord
// ==========================================
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const token = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
});

// ==========================================
// 3. ข้อมูลยศโซนและจังหวัด
// ==========================================
const regions = {
  โซนเหนือ: ["🍡 зโซนเชียงราย®","🍡 зโซนเชียงใหม่®","🍡 зโซนแม่ฮ่องสอน®","🍡 зโซนพะเยา®","🍡 зโซนน่าน®","🍡 зโซนแพร่®","🍡 зโซนลำปาง®","🍡 зโซนลำพูน®","🍡 зโซนอุตรดิตถ์®"],
  โซนอีสาน: ["🧩 зโซนบึงกาฬ®","🧩 зโซนหนองคาย®","🧩 зโซนเลย®","🧩 зโซนอุดรธานี®","🧩 зโซนหนองบัวลำภู®","🧩 зโซนสกลนคร®","🧩 зโซนนครพนม®","🧩 зโซนมุกดาหาร®","🧩 зโซนกาฬสินธุ์®","🧩 зโซนขอนแก่น®","🧩 зโซนร้อยเอ็ด®","🧩 зโซนมหาสารคาม®","🧩 зโซนชัยภูมิ®","🧩 зโซนยโสธร®","🧩 зโซนอำนาจเจริญ®","🧩 зโซนนครราชสีมา®","🧩 зโซนบุรีรัมย์®","🧩 зโซนสุรินทร์®","🧩 зโซนศรีสะเกษ®","🧩 зโซนอุบลราชธานี®"],
  โซนกลาง: ["🔥 зโซนกรุงเทพมหานคร®","🔥 зโซนนครสวรรค์®","🔥 зโซนสุโขทัย®","🔥 зโซนลพบุรี®","🔥 зโซนสิงห์บุรี®","🔥 зโซนอ่างทอง®","🔥 зโซนสระบุรี®","🔥 зโซนพระนครศรีอยุธยา®","🔥 зโซนสุพรรณบุรี®","🔥 зโซนปทุมธานี®","🔥 зโซนนนทบุรี®","🔥 зโซนนครปฐม®","🔥 зโซนสมุทรปราการ®","🔥 зโซนสมุทรสงคราม®","🔥 зโซนสมุทรสาคร®","🔥 зโซนชัยนาท®","🔥 зโซนกำแพงเพชร®","🔥 зโซนนครนายก®","🔥 зโซนพิจิตร®","🔥 зโซนพิษณุโลก®","🔥 зโซนเพชรบูรณ์®","🔥 зโซนอุทัยธานี®"],
  โซนตะวันออก: ["🏹 зโซนฉะเชิงเทรา®","🏹 зโซนตราด®","🏹 зโซนสระแก้ว®","🏹 зโซนปราจีนบุรี®","🏹 зโซนจันทบุรี®","🏹 зโซนชลบุรี®","🏹 зโซนระยอง®"],
  โซนตะวันตก: ["🪸 зโซนตาก®","🪸 зโซนกาญจนบุรี®","🪸 зโซนเพชรบุรี®","🪸 зโซนราชบุรี®","🪸 зโซนประจวบคีรีขันธ์®"],
  โซนใต้: ["🌊 зโซนชุมพร®","🌊 зโซนระนอง®","🌊 зโซนสุราษฎร์ธานี®","🌊 зโซนพังงา®","🌊 зโซนกระบี่®","🌊 зโซนนครศรีธรรมราช®","🌊 зโซนภูเก็ต®","🌊 зโซนตรัง®","🌊 зโซนพัทลุง®","🌊 зโซนสงขลา®","🌊 зโซนสตูล®","🌊 зโซนปัตตานี®","🌊 зโซนยะลา®","🌊 зโซนนราธิวาส®"],
};

const allProvinces = Object.values(regions).flat();

function normalize(t) {
  return t.replace(/[^ก-๙a-zA-Z0-9]/g, "").toLowerCase();
}

// ==========================================
// 4. ส่วนของเมนูและปุ่ม
// ==========================================
function regionMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("region")
      .setPlaceholder("🌕 เลือกภูมิภาคของคุณ")
      .addOptions([
        { label: "โซนเหนือ", value: "โซนเหนือ", emoji: "🍡" },
        { label: "โซนอีสาน", value: "โซนอีสาน", emoji: "🧩" },
        { label: "โซนกลาง", value: "โซนกลาง", emoji: "🔥" },
        { label: "โซนตะวันออก", value: "โซนตะวันออก", emoji: "🏹" },
        { label: "โซนตะวันตก", value: "โซนตะวันตก", emoji: "🪸" },
        { label: "โซนใต้", value: "โซนใต้", emoji: "🌊" },
      ])
  );
}

function provinceMenu(region) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("province")
      .setPlaceholder("📍 เลือกยศโซนของคุณ")
      .addOptions(
        regions[region].map((p) => ({
          label: p,
          value: p,
        }))
      )
  );
}

function resetBtn() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset")
      .setLabel("🔄 รีเซ็ตยศโซน")
      .setStyle(ButtonStyle.Danger)
  );
}

// ==========================================
// 5. การทำงานของบอท
// ==========================================
client.once("ready", () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  // คำสั่งเริ่มระบบ /start
  if (interaction.isChatInputCommand() && interaction.commandName === "start") {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("📢 ระบบเลือกยศโซนอัตโนมัติ")
      .setDescription("กรุณาเลือกภูมิภาคและจังหวัดของคุณเพื่อรับยศและเข้าห้อง\n\n**หมายเหตุ:** คุณจะมียศโซนได้เพียงที่เดียวเท่านั้น")
      .setImage("https://i.ibb.co/mCKGhcHd/image.png")
      .setColor(0x2b2dff);

    await interaction.channel.send({
      embeds: [embed],
      components: [regionMenu(), resetBtn()],
    });

    return interaction.deleteReply();
  }

  // เมื่อเลือกภูมิภาค
  if (interaction.isStringSelectMenu() && interaction.customId === "region") {
    const region = interaction.values[0];
    return interaction.reply({
      content: `📌 **คุณเลือก : ${region}**\n📍 กรุณาเลือกโซนของคุณ`,
      components: [provinceMenu(region), resetBtn()],
      ephemeral: true,
    });
  }

  // เมื่อเลือกจังหวัด (ให้ยศ)
  if (interaction.isStringSelectMenu() && interaction.customId === "province") {
    const province = interaction.values[0];
    try {
      const member = interaction.member;
      const role = interaction.guild.roles.cache.find(
        (r) => normalize(r.name) === normalize(province)
      );

      if (!role) {
        return interaction.reply({
          content: `❌ หาชื่อยศ "${province}" ในเซิร์ฟเวอร์ไม่เจอ (เช็คชื่อยศอีกครั้ง)`,
          ephemeral: true,
        });
      }

      // ลบยศโซนเก่าออกก่อน
      const rolesToRemove = member.roles.cache.filter((r) =>
        allProvinces.some((p) => normalize(p) === normalize(r.name))
      );
      if (rolesToRemove.size) await member.roles.remove(rolesToRemove);

      // เพิ่มยศใหม่
      await member.roles.add(role);
      return interaction.reply({
        content: `✅ คุณได้รับยศ **${province}** เรียบร้อยแล้ว!`,
        ephemeral: true,
      });

    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ เกิดข้อผิดพลาด! บอทอาจจะมียศต่ำกว่ายศโซน หรือไม่มีสิทธิ์จัดการยศ",
        ephemeral: true,
      });
    }
  }

  // ปุ่มรีเซ็ต
  if (interaction.isButton() && interaction.customId === "reset") {
    try {
      const member = interaction.member;
      const rolesToRemove = member.roles.cache.filter((r) =>
        allProvinces.some((p) => normalize(p) === normalize(r.name))
      );

      if (!rolesToRemove.size) {
        return interaction.reply({ content: "คุณยังไม่มียศโซนให้รีเซ็ต", ephemeral: true });
      }

      await member.roles.remove(rolesToRemove);
      return interaction.reply({ content: "🔄 : รีเซ็ตยศโซนทั้งหมดของคุณแล้ว", ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ ไม่สามารถรีเซ็ตยศได้", ephemeral: true });
    }
  }
});

client.login(token);
