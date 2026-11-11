# Requirements และหลักฐานการทำงาน

Pu ดำเนินการเติมและ refactor โค้ดสำหรับข้อกำหนดหลัก 9 ข้อและ Additional Requirements 13 ข้อใน working copy นี้ รวม 22 ข้อ รายการนี้รักษาเครดิต Ta สำหรับโค้ดเดิม และไม่ใช้จำนวนข้อเป็นหลักฐานสัดส่วนคะแนนหรือสถิติ GitHub

สถานะของทุกแถวคือดำเนินการด้านโค้ดแล้ว ดูผลรันทดสอบจริง ข้อจำกัด และสิ่งที่ยังต้องทำใน `verification.md` การเตรียมโค้ดและชุดทดสอบไม่ใช่การยืนยันว่าผู้สอนอนุมัติ Extra Credits หรือมีวิดีโอแล้ว

| ข้อ | สิ่งที่ Pu ทำและเหตุผล | ตำแหน่งโค้ด | หลักฐานทดสอบ |
|---|---|---|---|
| FR1 | สมัครด้วย name/tel/email/password ตรวจชนิดข้อมูล อีเมลซ้ำ และไม่ให้สมัครเป็น admin | auth controller, User model | integration registration, Runner authentication |
| FR2 | login ตอบข้อมูลสอดคล้องกัน logout revoke token จริง รวม frontend session ที่เคยเก็บ undefined | auth controller/middleware, frontend authService | integration password/logout, HTTP suite |
| FR3 | แสดงข้อมูลห้องครบ จำกัด 3 รายการที่ยังไม่สิ้นสุด ป้องกันคำขอพร้อมกันทะลุเพดาน | rooms controller, reservations service, bookingTransaction | integration FR3/max3 concurrency, Runner reservations |
| FR4 | รายการและรายการเดี่ยวจำกัดเฉพาะเจ้าของ | reservations controller/service | integration ownership |
| FR5 | แก้ไขของตน รักษาเจ้าของเดิม ตรวจห้องใหม่และเวลาว่าง | reservations service | integration owner/admin update |
| FR6 | ลบของตน ตรวจ ownership และ cutoff | reservations service | integration owner delete/cutoff |
| FR7 | admin ดูของทุกคน รวมรายการเดี่ยวและรายการรวม | reservations controller/service | integration admin list/read |
| FR8 | admin แก้ของผู้อื่นโดยยังตรวจเวลาและ availability | reservations service | integration admin update |
| FR9 | admin ลบของผู้อื่นโดยยังตรวจ cutoff | reservations service | integration admin delete |
| A1 | ตรวจอย่างน้อย 8 ตัว พร้อม lower/upper/digit และไม่เกิน 72 UTF-8 bytes ก่อน bcrypt | utils/booking, User, auth controller | booking/model tests, integration weak-password cases |
| A2 | ตรวจรหัสเก่า ใช้นโยบายรหัสใหม่เดียวกับ register hash และ revoke token เดิม | auth controller, User | integration password change/token revocation |
| A3 | ตั้ง/แก้/ล้าง hint และเรียกเมื่อจำรหัสไม่ได้ ไม่ส่ง password/hash | auth controller/routes | integration hint, Runner hint requests |
| A4 | เพิ่ม endTime ตรวจ open-close Asia/Bangkok และ half-open overlap ภายใน transaction | utils/booking, reservations service | booking opening-hours tests, integration parallel overlap, Runner adjacency |
| A5 | รีวิวพร้อม pastBookings ที่ server นับจากรายการสิ้นสุดแล้ว | reviews controller | integration pastBookings=1 with completed fixture |
| A6 | แก้ได้เมื่อเหลืออย่างน้อย 1 ชั่วโมง ตรวจทั้งเวลาเริ่มเดิมและใหม่ | utils/booking, reservations service | exact-boundary unit test, integration cutoff |
| A7 | ลบได้เมื่อเหลืออย่างน้อย 1 ชั่วโมง รวม admin | utils/booking, reservations service | exact-boundary unit test, integration cutoff |
| A8 | โน้ตส่วนตัวระบุ owner จาก token ห้ามเปลี่ยน owner/room ไม่รั่วใน public rooms | notes controller, rooms controller | integration other user/admin cannot read, Runner notes |
| A9 | admin ระงับถาวร ชั่วคราว หรือปลดระงับ ตรวจ duration/expiry | auth controller, auth middleware | integration suspension/expiry, Runner suspension |
| A10 | unique index user+room ป้องกันรีวิวซ้ำ รวมคำขอพร้อมกัน แก้หรือลบก่อนสร้างใหม่ | Review model, reviews controller | model index test, integration duplicate/edit/delete/recreate |
| A11 | ผู้ถูกระงับสร้างหรือเลื่อนการจอง และสร้าง/แก้รีวิวไม่ได้ | auth middleware, transactional services/controllers | integration suspension403, Runner blocked requests |
| A12 | anonymous เป็นทางเลือก default false ลบ author identifier จาก response จริง | reviews controller/model | integration JSON has no user ID/email, Runner anonymous response |
| A13 | `includeAnonymous=false` กรอง anonymous จากรายการรีวิวรวมและรายห้อง | reviews controller | integration filter, Runner filter |

## Non Functional Requirements และ Constraints

ระบบเป็น REST Web API ใช้ Express และ MongoDB การจองแบบ atomic ต้องใช้ Atlas หรือ replica set มี Postman Runner/Newman, OpenAPI และชุดทดสอบให้ใช้งาน Frontend ไม่ใช่ข้อบังคับของรายการงาน จึงปรับเฉพาะ authentication และข้อความที่ผิดโดเมนใน frontend เดิม

Security ที่ตรวจมีการยืนยันตัวตนด้วย email/password, hashing, role/ownership, ความเป็นส่วนตัวของรายการจองและโน้ต, token revocation และการป้องกัน query/request keys ที่ไม่รองรับ ไม่มีการรับรองว่าระบบปลอดภัยสมบูรณ์จากการทดสอบชุดเดียว

เป้าหมายตอบภายใน 3 วินาทีต้องประเมินใน deployment จริงพร้อมฐานข้อมูล เครือข่าย และโหลดที่กำหนด ผล Newman ในฐานข้อมูลทดสอบเป็นหลักฐานเฉพาะรอบนั้น ไม่ได้พิสูจน์ SLA ทุกสภาพแวดล้อม

## เงื่อนไขที่ชี้แจงเพื่อให้ทดสอบได้ตรงกัน

ใช้ “3 รายการที่ยังไม่สิ้นสุด” สำหรับผู้ใช้ปกติ ผู้ดูแลคงสิทธิ์สร้างเกิน 3 จากระบบเดิม วันเวลาต้องมี timezone ชัดเจน ไม่รับวันที่อย่างเดียวเพราะตรวจเวลาห้องว่างไม่ได้ เมื่อไม่ส่ง endTime ให้มีช่วงเวลา 1 ชั่วโมง การจองยาวไม่เกิน 24 ชั่วโมง เวลาแก้/ลบที่เหลือ 1 ชั่วโมงพอดีอนุญาต กฎ cutoff ใช้กับ admin ด้วยเนื่องจากข้อกำหนดไม่ได้ให้ข้อยกเว้น

จำนวน pastBookings นับประวัติที่สิ้นสุดและยังคงอยู่ในฐานข้อมูลจากทุกห้อง การลบห้องแบบ cascade ลบประวัติที่อ้างห้องนั้นด้วยตามรูปแบบเดิม หากต้องการ audit history ที่ยังอยู่หลังลบห้อง ควรเปลี่ยนเป็น archive/soft delete เป็นข้อกำหนดแยก

## Extra Credits ที่พร้อมขอเคลม

มี implementation ครบ A1–A13 และชุดทดสอบครอบคลุมพฤติกรรมเหล่านี้ตามตาราง แต่ยังต้องบันทึกวิดีโอสอนสร้างและเพิ่ม URL จริง ผู้ใช้เลือกให้เตรียมสคริปต์ไว้ก่อน จึงไม่ได้สร้างลิงก์วิดีโอปลอม ดู `extra-credit-video-script.md` และ `presentation-script.md`
