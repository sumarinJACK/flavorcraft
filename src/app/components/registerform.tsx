  "use client";

  import { useState } from "react";
  import { useRouter } from "next/navigation";
  import { createUser } from "../../lib/authService";
  import GithubImageUploader from "./GithubImageUploader";
  import RulesAccordion from "./RulesAccordion";

  export default function Registerform() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      if (!accepted) {
      setError("กรุณายอมรับเงื่อนไขการใช้งานก่อนสมัครสมาชิก");
      return;
      }
      try {
        await createUser(email, password, displayName, profileImageUrl || undefined);
        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    const handleImageUploadSuccess = (url: string) => {
      setProfileImageUrl(url);
    };

    const handleImageUploadError = (error: string) => {
      setError(`การอัปโหลดรูปภาพล้มเหลว: ${error}`);
    };

    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800">สร้างบัญชีใหม่</h2>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}
        
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">ชื่อที่แสดง *</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border border-peach rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="ใส่ชื่อที่จะแสดงในโปรไฟล์"
            required
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">อีเมล *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-peach rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="example@email.com"
            required
            autoComplete="email"
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">รหัสผ่าน *</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-peach rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="ใส่รหัสผ่าน"
            required
            autoComplete="new-password"
            minLength={6}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">
            รูปโปรไฟล์ <span className="text-gray-500">(ไม่บังคับ)</span>
          </span>
          <div className="border border-gray-200 rounded-lg p-3">
            <GithubImageUploader
              folder="profiles"
              onUploadSuccess={handleImageUploadSuccess}
              onUploadError={handleImageUploadError}
              maxSizeMB={5}
              acceptedTypes={["image/png", "image/jpeg", "image/webp"]}
              className="w-full"
            />
            {profileImageUrl && (
              <div className="mt-3 p-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">✅ รูปโปรไฟล์พร้อมใช้งาน</p>
              </div>
            )}
          </div>
        </div>

        <RulesAccordion 
          accepted={accepted} 
          onAcceptChange={setAccepted} 
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-primary text-black rounded-lg px-4 py-3 font-medium hover:bg-primary disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </button>
        
        
      </form>
    );
  };