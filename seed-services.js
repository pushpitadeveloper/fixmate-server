// server/seed-services.js
// Run: node seed-services.js
require("dotenv").config();
const mongoose = require("mongoose");

const services = [
  { title: "Laptop Screen Replacement", category: "Laptop", description: "Venge jawa / dag pora laptop screen original display diye change kora hoy. 30 min e complete.", price: 2500, duration: "1 hour", technician: "Test Technician" },
  { title: "Laptop Battery Replacement", category: "Laptop", description: "Charge thake na, fule gese - original battery diye replace kora hoy. 90 din warranty.", price: 1800, duration: "1 hour", technician: "Test Technician" },
  { title: "Laptop Keyboard Repair", category: "Laptop", description: "Key kaj kore na, pani porse - keyboard clean / replace kora hoy.", price: 1200, duration: "1 hour", technician: "Test Technician" },
  { title: "Laptop Motherboard Repair", category: "Laptop", description: "Laptop on hoy na, motherboard short - chip level repair kora hoy.", price: 3500, duration: "3 hours", technician: "Test Technician" },
  { title: "Laptop Charging Port Repair", category: "Laptop", description: "Charger lagaleo charge hoy na - charging port / adapter pin thik kora hoy.", price: 900, duration: "1 hour", technician: "Test Technician" },
  { title: "Laptop Software Setup", category: "Laptop", description: "Windows setup, virus clean, software install, speed barano hoy.", price: 800, duration: "2 hours", technician: "Test Technician" },
  { title: "Mobile Screen Replacement", category: "Mobile", description: "Mobile er vanga display original OLED / LCD diye change kora hoy. Touch soho test kore deya hoy.", price: 1800, duration: "1 hour", technician: "Test Technician" },
  { title: "Mobile Battery Replacement", category: "Mobile", description: "Battery drain, fule jawa - original battery diye replace, health 100 percent.", price: 1200, duration: "45 min", technician: "Test Technician" },
  { title: "Mobile Charging Port Repair", category: "Mobile", description: "Charge hoy na, cable dhore rakhte hoy - charging port clean / replace kora hoy.", price: 700, duration: "1 hour", technician: "Test Technician" },
  { title: "Mobile Camera Repair", category: "Mobile", description: "Camera ghola, focus hoy na, black screen - camera module replace kora hoy.", price: 1500, duration: "1 hour", technician: "Test Technician" },
  { title: "Mobile Software Unlock", category: "Mobile", description: "Password vule gese, hang kore, software problem - flash / unlock kora hoy.", price: 600, duration: "1 hour", technician: "Test Technician" },
  { title: "Mobile Water Damage Repair", category: "Mobile", description: "Pani te porse - ultrasonic clean + motherboard dry + full checkup kora hoy.", price: 2000, duration: "3 hours", technician: "Test Technician" },
  { title: "PC Motherboard Repair", category: "PC", description: "Desktop on hoy na, beep dey - motherboard chip level repair kora hoy.", price: 3000, duration: "3 hours", technician: "Test Technician" },
  { title: "PC Power Supply Repair", category: "PC", description: "PC bar bar off hoye jay, power ase na - PSU repair / replace kora hoy.", price: 1500, duration: "1 hour", technician: "Test Technician" },
  { title: "PC RAM Upgrade", category: "PC", description: "PC slow, hang kore - RAM upgrade + SSD setup kore speed barano hoy.", price: 1000, duration: "1 hour", technician: "Test Technician" },
  { title: "PC Data Recovery", category: "PC", description: "Delete hoye jawa / format hoye jawa file, photo, document recover kora hoy.", price: 2500, duration: "4 hours", technician: "Test Technician" },
  { title: "Tablet Screen Replacement", category: "Tablet", description: "Tablet er vanga screen original display diye change kora hoy.", price: 2200, duration: "1 hour", technician: "Test Technician" },
  { title: "Tablet Battery Replacement", category: "Tablet", description: "Tablet charge thake na - original battery diye replace kora hoy.", price: 1600, duration: "1 hour", technician: "Test Technician" },
  { title: "Printer Repair", category: "PC", description: "Printer paper atkay, print ghola ase - full service + cartridge thik kora hoy.", price: 900, duration: "1 hour", technician: "Test Technician" },
  { title: "WiFi Router Setup", category: "PC", description: "Router setup, WiFi slow, coverage problem - full setup + config kora hoy.", price: 1200, duration: "1 hour", technician: "Test Technician" },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB Connected");
    const db = mongoose.connection.db;
    const col = db.collection("services");
    await col.deleteMany({});
    const res = await col.insertMany(services);
    console.log(res.insertedCount + " ta service add hoise!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.log("Error:", e.message);
    process.exit(1);
  }
}
run();
