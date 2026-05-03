const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// สร้าง Server หลอกๆ ให้ Render
http.createServer((req, res) => { res.write("Check Mode"); res.end(); }).listen(10000);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log("--- 🕵️ เริ่มระบบตรวจสอบ ---");
console.log("1. เช็ก Token ในเครื่อง:", process.env.TOKEN ? "✅ มีค่าอยู่" : "❌ ว่างเปล่า (ไปเติมใน Render Environment)");

client.login(process.env.TOKEN).then(() => {
    console.log("2. ผลการ Login: ✅ สำเร็จ! บอทออนไลน์แล้ว");
}).catch(err => {
    console.log("2. ผลการ Login: ❌ ล้มเหลว");
    console.log("สาเหตุที่ Discord ปฏิเสธ:", err.message);
});
