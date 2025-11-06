"use client";

import { useState } from "react";
import Loginform from "../components/Loginform";
import Registerform from "../components/registerform";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-softwhite p-9 grid place-items-center">
      <div className="w-full max-w-md bg-peach p-6 rounded-md shadow-md">
        {/* Toggle buttons */}
        <div className="flex mb-6 rounded overflow-hidden border">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              mode === "login" ? "bg-primary text-black border-black-300" : "bg-softwhite"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            เข้าสู่ระบบ
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              mode === "register" ? "bg-primary text-black border-l" : "bg-white text-gray-700"
            }`}
            onClick={() => setMode("register")}
            type="button"
          >
            สมัครสมาชิก
          </button>
        </div>

        {/* Form content */}
        {mode === "login" ? <Loginform /> : <Registerform />}

        {/* Inline link to switch */}
        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <button
              className="underline hover:no-underline"
              onClick={() => setMode("register")}
              type="button"
            >
              ยังไม่มีบัญชี? สมัครสมาชิก
            </button>
          ) : (
            <button
              className="underline hover:no-underline"
              onClick={() => setMode("login")}
              type="button"
            >
              มีบัญชีแล้ว? เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
