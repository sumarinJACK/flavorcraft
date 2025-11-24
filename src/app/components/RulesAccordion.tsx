"use client";

import { useState } from "react";

interface RulesAccordionProps {
  accepted: boolean;
  onAcceptChange: (value: boolean) => void;
}

export default function RulesAccordion({ accepted, onAcceptChange }: RulesAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full mt-4 border rounded-xl p-4 bg-white shadow-sm">
      {/* ปุ่มเปิด/ปิด */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left text-lg font-semibold"
      >
        <span>ข้อห้ามสำหรับการเผยแพร่สูตรอาหาร</span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {/* เนื้อหาด้านใน */}
      {open && (
        <div className="mt-3 text-gray-700 space-y-2">
          <p>• ห้ามใช้เนื้อหา / รูปภาพ / สูตรอาหารที่มีลิขสิทธิ์โดยไม่ได้รับอนุญาต</p>
          <p>• ห้ามคัดลอกสูตรผู้ใช้อื่นแล้วอ้างว่าเป็นของตัวเอง โดยไม่ให้เครดิต</p>
          <p>• ห้ามโพสต์ภาพหรือเนื้อหาที่ไม่เหมาะสม ผิดกฎหมาย หรือรุนแรง และเกี่ยวข้องกับการเมือง</p>
          <p>• ห้ามใส่ข้อมูลเท็จที่อาจทำให้ผู้บริโภคเกิดอันตราย</p>
          <p>• ห้ามใส่ลิงก์อันตราย ลิงก์สแปม หรือโฆษณาแฝง</p>
        </div>
      )}

      {/* Checkbox "ยอมรับเงื่อนไข" */}
      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAcceptChange(e.target.checked)}
        />
        <span className="text-sm text-gray-700">ฉันยอมรับข้อห้ามทั้งหมด</span>
      </label>
    </div>
  );
}