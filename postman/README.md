# ทดสอบ VacQ ด้วย Postman และ Newman

คอลเลกชัน `VacQ_Final_Project.postman_collection.json` ทดสอบ FR1–FR9 และ A1–A13 แบบเรียงลำดับ ใช้วันจองในอนาคตและจับ token/ID อัตโนมัติ ไม่ต้องคัดลอก ID เอง

ชุด Runner นี้ปิด cookie jar ของแต่ละ request และใช้ Bearer token ที่จับได้โดยตรง เพื่อให้กรณีทดสอบที่ไม่มี token ไม่ได้รับสิทธิ์จาก cookie ของ request ก่อนหน้า ส่วนระบบจริงยังรองรับ cookie authentication

## เตรียมก่อนรัน

1. ใช้ฐานข้อมูลทดสอบ MongoDB Atlas หรือ replica set เพราะการป้องกันการจองชนกันใช้ transaction
2. ตั้งค่า backend ตาม `coworking/config/config.env.example` แล้วเริ่ม server
3. สร้างผู้ดูแลด้วยคำสั่ง `npm run create-admin` ในโฟลเดอร์ `coworking` ตาม README ของโครงการ
4. Import collection และ `VacQ_local.postman_environment.json` ใน Postman
5. ตั้ง `baseUrl` เป็น `http://localhost:5000/api/v1` และกรอก `adminEmail`, `adminPassword` ของผู้ดูแลใน environment ส่วนตัว ห้าม commit รหัสผ่านจริง
6. เลือก Run collection แล้วรันทุก request ตามลำดับ

รันผ่าน Newman จากโฟลเดอร์รากโครงการ:

```powershell
node coworking/node_modules/newman/bin/newman.js run postman/VacQ_Final_Project.postman_collection.json -e postman/VacQ_local.postman_environment.json --reporters cli,json --reporter-json-export tmp/api/newman-results.json
```

ไฟล์ environment ตัวอย่างตั้งรหัสผ่านว่างไว้ ต้องกรอกสำเนาส่วนตัวก่อนใช้ Newman เช่นเดียวกับ Postman หากมีรหัสผ่านในไฟล์สำเนา อย่านำไฟล์นั้นขึ้น GitHub ผล JSON ดิบของ Newman อาจมี token และข้อมูลรับรอง จึงเก็บไว้ใน `tmp/api` ที่ไม่ควร commit

## สิ่งที่ Runner ตรวจ

- สมัคร เข้าสู่ระบบ ออกจากระบบ เปลี่ยนรหัสผ่าน และเรียกดูหรือแก้ password hint
- ข้อมูลห้องและสิทธิ์ admin ในการสร้างหรือแก้ห้อง
- จองได้สูงสุด 3 รายการที่ยังไม่สิ้นสุด ตรวจเวลาชนกัน และยอมรับการจองที่เวลาต่อกันพอดี
- ผู้ใช้เข้าถึง แก้ และลบได้เฉพาะรายการจองตนเอง ผู้ดูแลทำกับรายการของผู้ใช้อื่นได้
- ปฏิเสธการแก้หรือลบเมื่อเหลือน้อยกว่า 1 ชั่วโมง
- รีวิวได้หนึ่งรายการต่อผู้ใช้ต่อห้อง แก้หรือลบแล้วสร้างใหม่ได้ มีจำนวนการจองที่ผ่านมา และซ่อนตัวตนเมื่อเลือก anonymous
- กรองรีวิว anonymous และเก็บโน้ตส่วนตัวไม่ให้ผู้ใช้อื่นหรือ admin อ่านได้
- ระงับชั่วคราวหรือถาวร ห้ามผู้ถูกระงับจองและเขียนรีวิว และยกเลิกการระงับได้

## ขอบเขตและข้อมูลที่สร้าง

Runner สร้างผู้ใช้สาธิต 2 คนและห้องชื่อ `Pu Runner <runId>` โดยใช้ชื่อสุ่มใหม่ทุกครั้ง การเก็บกวาดลบเฉพาะห้องและข้อมูลที่ Runner สร้าง จึงต้องรันกับฐานข้อมูลทดสอบ บัญชีสาธิตยังคงอยู่เพราะ API ไม่มีการลบบัญชี หาก Runner หยุดกลางทางอาจเหลือห้องหรือรายการสาธิตอยู่

การทดสอบจำนวน past bookings ที่มากกว่า 0, การหมดเวลาระงับ, การจองชนกันพร้อมกัน และเส้นแบ่ง 1 ชั่วโมงที่แม่นยำ ทำในชุด `coworking/tests` เพิ่มเติม การเห็นตัวเลข `pastBookings` ใน Runner เพียงอย่างเดียวไม่ยืนยันการนับย้อนหลังทุกกรณี

ชุดทดสอบฐานข้อมูลจริงใช้:

```powershell
$env:TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'
node --test coworking/tests/integration.test.js
```

ชุดนี้สร้างฐานข้อมูลชื่อ `vacq_test_<timestamp>_<pid>` แล้วลบฐานข้อมูลชื่อนั้นเมื่อทดสอบจบ ไม่ใช้ชื่อฐานข้อมูลจาก URI เป็นเป้าหมายลบ เมื่อไม่ตั้ง `TEST_MONGO_URI` ชุดนี้จะแสดง `SKIP` ซึ่งหมายความว่ายังไม่ได้ยืนยันกับฐานข้อมูลจริง

ทดสอบเงื่อนไขขอบเขตโดยไม่ใช้ฐานข้อมูล:

```powershell
node --test coworking/tests/booking.test.js
```

รันกับ MongoDB จำลองแบบ replica set จริงที่แยกจากบริการเดิม และทดสอบทั้ง HTTP กับ Newman โดยอัตโนมัติ:

```powershell
node coworking/tests/run-memory.cjs
```

ครั้งแรกคำสั่งนี้ต้องดาวน์โหลด MongoDB binary และเครื่องต้องอนุญาตการเชื่อมต่อ localhost ผลสรุปที่ตัด token ออกแล้วอยู่ใน `output/api/verification-summary.json` ส่วน JSON ดิบอยู่ใน `tmp/api` ไม่ควรนำขึ้น GitHub

ไฟล์ `VacQ_assignment7.1_7.2_10_original.postman_collection.json` เป็นสำเนาคอลเลกชันเดิมเพื่ออ้างอิง ไม่ใช่ชุด Runner หลัก และไม่ได้อัปเดตข้อมูลรับรองหรือรหัส ID ที่ฝังอยู่เดิม

หากแก้ขั้นตอนทดสอบ ให้แก้ `build-collection.cjs` แล้วรัน `node postman/build-collection.cjs` เพื่อสร้าง JSON ใหม่
