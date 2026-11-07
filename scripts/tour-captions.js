// Captions for the product tour, timed from the chapter marks that scripts/record-tour.js measures.
// Bengali and Thai lines need a native speaker's review before launch (see docs/STATUS.md).
const fs = require('fs');
const path = require('path');

const CUES = {
  brief: {
    en: ["Paste your client's brief on the home page. No signup.", 'Pick your rate and buffer, then run the AI estimate.'],
    bn: ['হোম পেজে ক্লায়েন্টের ব্রিফ পেস্ট করুন। সাইন আপ লাগবে না।', 'আপনার রেট আর বাফার দিন, তারপর AI এস্টিমেট চালান।'],
    th: ['วางบรีฟของลูกค้าในหน้าแรก ไม่ต้องสมัครสมาชิก', 'ใส่เรตและบัฟเฟอร์ของคุณ แล้วกดให้ AI ประเมินงาน'],
  },
  estimate: {
    en: ['The AI breaks the brief into features, user stories and hours.', 'Price = hours × your rate + buffer. The AI never sets the price.'],
    bn: ['AI ব্রিফটিকে ফিচার, ইউজার স্টোরি আর ঘণ্টায় ভাগ করে।', 'দাম = ঘণ্টা × আপনার রেট + বাফার। দাম AI ঠিক করে না।'],
    th: ['AI แยกบรีฟออกเป็นฟีเจอร์ ยูสเซอร์สตอรี่ และจำนวนชั่วโมง', 'ราคา = ชั่วโมง × เรตของคุณ + บัฟเฟอร์ AI ไม่ได้เป็นคนตั้งราคา'],
  },
  project: {
    en: ['Save the estimate into a project for your client.'],
    bn: ['এস্টিমেটটি ক্লায়েন্টের প্রজেক্টে সেভ করুন।'],
    th: ['บันทึกการประเมินไว้ในโปรเจกต์ของลูกค้า'],
  },
  agreement: {
    en: ['One click turns it into an agreement: sections, terms and a 50/50 payment schedule.', 'Preview it, then create a sealed link for your client.'],
    bn: ['এক ক্লিকে এটি চুক্তি হয়ে যায়: সেকশন, শর্ত আর ৫০/৫০ পেমেন্ট শিডিউল।', 'প্রিভিউ দেখুন, তারপর ক্লায়েন্টের জন্য সিল করা লিংক তৈরি করুন।'],
    th: ['คลิกเดียวกลายเป็นสัญญา: หัวข้อ เงื่อนไข และตารางชำระเงิน 50/50', 'ดูตัวอย่าง แล้วสร้างลิงก์ที่ปิดผนึกส่งให้ลูกค้า'],
  },
  client: {
    en: ['Your client opens the link, accepts each line and signs. No account needed.', "Both of you get a receipt with the document's fingerprint."],
    bn: ['ক্লায়েন্ট লিংক খুলে প্রতিটি লাইন গ্রহণ করে সাইন করেন। কোনো অ্যাকাউন্ট লাগে না।', 'আপনারা দুজনেই ডকুমেন্টের ফিঙ্গারপ্রিন্টসহ রসিদ পান।'],
    th: ['ลูกค้าเปิดลิงก์ ยอมรับทีละรายการ แล้วเซ็น ไม่ต้องมีบัญชี', 'ทั้งสองฝ่ายได้ใบรับรองพร้อมลายนิ้วมือของเอกสาร'],
  },
  payment: {
    en: ['Request the deposit with your PromptPay or bank details.', 'Your client pays you directly. SignedScope never holds the money.'],
    bn: ['আপনার PromptPay বা ব্যাংকের তথ্য দিয়ে অগ্রিম চান।', 'ক্লায়েন্ট সরাসরি আপনাকে টাকা দেন। SignedScope কখনো টাকা রাখে না।'],
    th: ['ขอเงินมัดจำพร้อมข้อมูล PromptPay หรือบัญชีธนาคารของคุณ', 'ลูกค้าโอนให้คุณโดยตรง SignedScope ไม่เคยถือเงินแทน'],
  },
};
const ORDER = ['brief', 'estimate', 'project', 'agreement', 'client', 'payment'];
const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };

function vtt(marks, lang) {
  const out = ['WEBVTT', ''];
  ORDER.forEach((k, i) => {
    const start = marks[k], end = marks[ORDER[i + 1]] ?? marks.end;
    const lines = CUES[k][lang], step = (end - start) / lines.length;
    lines.forEach((line, j) => { out.push(`${k}-${j + 1}`, `${ts(start + j * step)} --> ${ts(start + (j + 1) * step - 0.05)}`, line, ''); });
  });
  return out.join('\n');
}
function write(marks, dir) { for (const lang of ['en', 'bn', 'th']) fs.writeFileSync(path.join(dir, `tour.${lang}.vtt`), vtt(marks, lang)); }
module.exports = { write, vtt, CUES, ORDER };
