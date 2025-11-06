"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Auth, db } from "../../../lib/firebase";
import GithubImageUploader from "../../components/GithubImageUploader";
import Navbar from "../../components/Navbar";
import type { Ingredient, Recipe } from "../../../database/recipes";

interface UploadedImage {
  url: string;
  fileName: string;
  size: number;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState(1);
  const [coverImage, setCoverImage] = useState<string>("");
  const [recipeImages, setRecipeImages] = useState<UploadedImage[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", qty: 0, unit: "" }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(Auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleCoverImageUpload = (url: string, data: any) => {
    setCoverImage(url);
    setUploadStatus(`อัปโหลดรูปปกสำเร็จ: ${data.fileName}`);
    console.log("Cover image uploaded:", { url, data });
  };

  const handleRecipeImageUpload = (url: string, data: any) => {
    const newImage: UploadedImage = {
      url: url,
      fileName: data.fileName,
      size: data.size,
    };
    setRecipeImages(prev => [...prev, newImage]);
    setUploadStatus(`อัปโหลดรูปสูตรอาหารสำเร็จ: ${data.fileName}`);
    console.log("Recipe image uploaded:", { url, data });
  };

  const handleUploadError = (error: string) => {
    setUploadStatus(`เกิดข้อผิดพลาด: ${error}`);
    console.error("Upload error:", error);
  };

  const removeRecipeImage = (index: number) => {
    setRecipeImages(prev => prev.filter((_, i) => i !== index));
  };

  // Ingredient management
  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: "", qty: 0, unit: "" }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Steps management
  const addStep = () => {
    setSteps(prev => [...prev, ""]);
  };

  const updateStep = (index: number, value: string) => {
    setSteps(prev => prev.map((step, i) => i === index ? value : step));
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Save recipe
  const handleSaveRecipe = async () => {
    if (!currentUser || !title.trim() || !coverImage || ingredients.length === 0) {
      setUploadStatus("กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อสูตร, รูปปก, และส่วนผสม)");
      return;
    }

    // Validate ingredients
    const validIngredients = ingredients.filter(ing => ing.name.trim() && ing.qty > 0 && ing.unit.trim());
    if (validIngredients.length === 0) {
      setUploadStatus("กรุณากรอกส่วนผสมให้ครบถ้วน (ชื่อ, จำนวน, หน่วย)");
      return;
    }

    // Validate steps
    const validSteps = steps.filter(step => step.trim());
    if (validSteps.length === 0) {
      setUploadStatus("กรุณากรอกขั้นตอนการทำอย่างน้อย 1 ขั้นตอน");
      return;
    }

    setSaving(true);
    try {
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9ก-๏]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const recipeData = {
        authorId: currentUser.uid,
        title: title.trim(),
        slug: slug,
        coverUrl: coverImage,
        images: recipeImages.map(img => img.url),
        category: category || "อื่นๆ",
        servings: servings,
        ingredients: validIngredients,
        steps: validSteps,
        isPublished: true,
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        ratingAvg: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "recipes"), recipeData);
      setUploadStatus("✅ บันทึกสูตรอาหารสำเร็จ! กำลังไปยังหน้าโปรไฟล์...");
      
      // Redirect to profile after success
      setTimeout(() => {
        router.push(`/Profile/${currentUser.uid}`);
      }, 1500);
      
    } catch (error) {
      console.error("Error saving recipe:", error);
      setUploadStatus("❌ เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-peach">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-peach">
      <Navbar />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">เพิ่มสูตรอาหารใหม่</h1>

            {/* Status Message */}
            {uploadStatus && (
              <div className={`mb-6 p-4 rounded-md ${
                uploadStatus.includes("สำเร็จ") 
                  ? "bg-green-50 border border-green-200 text-green-800" 
                  : uploadStatus.includes("ผิดพลาด") || uploadStatus.includes("❌")
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : "bg-blue-50 border border-blue-200 text-blue-800"
              }`}>
                <p className="text-sm">{uploadStatus}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Recipe Basic Info */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">ข้อมูลพื้นฐาน</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อสูตรอาหาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="เช่น ข้าวผัดกุ้ง"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      หมวดหมู่
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      <option value="อาหารไทย">อาหารไทย</option>
                      <option value="อาหารจีน">อาหารจีน</option>
                      <option value="อาหารญี่ปุ่น">อาหารญี่ปุ่น</option>
                      <option value="อาหารเกาหลี">อาหารเกาหลี</option>
                      <option value="อาหารตะวันตก">อาหารตะวันตก</option>
                      <option value="ของหวาน">ของหวาน</option>
                      <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      จำนวนที่เสิร์ฟ (คน)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  รูปปกสูตรอาหาร <span className="text-red-500">*</span>
                </h2>
                <GithubImageUploader
                  folder="recipes/covers"
                  onUploadSuccess={handleCoverImageUpload}
                  onUploadError={handleUploadError}
                  className="max-w-lg"
                />
                
                {coverImage && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 text-sm font-medium">รูปปกที่เลือก:</p>
                    <div className="mt-2">
                      <img src={coverImage} alt="Cover preview" className="w-32 h-24 object-cover rounded" />
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  ส่วนผสม <span className="text-red-500">*</span>
                </h2>
                
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="ชื่อส่วนผสม เช่น ข้าวสวย"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, "name", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="จำนวน"
                        value={ingredient.qty || ""}
                        onChange={(e) => updateIngredient(index, "qty", Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <select
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">หน่วย</option>
                        <option value="ตัว">ตัว</option>
                        <option value="กรัม">กรัม</option>
                        <option value="กิโลกรัม">กิโลกรัม</option>
                        <option value="มิลลิลิตร">มิลลิลิตร</option>
                        <option value="ลิตร">ลิตร</option>
                        <option value="ช้อนชา">ช้อนชา</option>
                        <option value="ช้อนโต๊ะ">ช้อนโต๊ะ</option>
                        <option value="ถ้วย">ถ้วย</option>
                        <option value="ชิ้น">ชิ้น</option>
                        <option value="ฟอง">ฟอง</option>
                        <option value="หัว">หัว</option>
                        <option value="แผ่น">แผ่น</option>
                        <option value="ลูก">ลูก</option>
                        <option value="เม็ด">เม็ด</option>
                        <option value="แท่ง">แท่ง</option>
                        <option value="ใบ">ใบ</option>
                      </select>
                    </div>
                    <div className="flex space-x-1">
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="ลบส่วนผสม"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addIngredient}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + เพิ่มส่วนผสม
                </button>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  วิธีทำ <span className="text-red-500">*</span>
                </h2>
                
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <textarea
                        rows={3}
                        placeholder={`ขั้นตอนที่ ${index + 1} - อธิบายการทำอย่างละเอียด`}
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded mt-1"
                          title="ลบขั้นตอน"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addStep}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + เพิ่มขั้นตอน
                </button>
              </div>

              {/* Recipe Images Upload */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">รูปประกอบสูตรอาหาร</h2>
                <p className="text-sm text-gray-600">อัปโหลดรูปขั้นตอนการทำอาหารหรือรูปผลลัพธ์ (ไม่บังคับ)</p>
                
                <GithubImageUploader
                  folder="recipes/steps"
                  onUploadSuccess={handleRecipeImageUpload}
                  onUploadError={handleUploadError}
                  className="max-w-lg"
                />

                {/* Recipe Images List */}
                {recipeImages.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-800">รูปที่อัปโหลดแล้ว ({recipeImages.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recipeImages.map((image, index) => (
                        <div key={index} className="relative border rounded-lg p-3 bg-gray-50">
                          <div className="aspect-w-16 aspect-h-9 mb-2">
                            <img
                              src={image.url}
                              alt={`Recipe step ${index + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <p className="font-medium truncate">{image.fileName}</p>
                            <p>{(image.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={() => removeRecipeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            title="ลบรูป"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">สรุปข้อมูลที่กรอก</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ชื่อสูตร:</span>
                    <span className={title ? "text-green-600" : "text-red-400"}>
                      {title || "❌ ยังไม่ได้กรอก"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>หมวดหมู่:</span>
                    <span className="text-gray-600">{category || "อื่นๆ"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รูปปก:</span>
                    <span className={coverImage ? "text-green-600" : "text-red-400"}>
                      {coverImage ? "✅ อัปโหลดแล้ว" : "❌ ยังไม่ได้อัปโหลด"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ส่วนผสม:</span>
                    <span className={ingredients.filter(ing => ing.name.trim() && ing.qty > 0 && ing.unit.trim()).length > 0 ? "text-green-600" : "text-red-400"}>
                      {ingredients.filter(ing => ing.name.trim() && ing.qty > 0 && ing.unit.trim()).length} รายการ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ขั้นตอน:</span>
                    <span className={steps.filter(step => step.trim()).length > 0 ? "text-green-600" : "text-red-400"}>
                      {steps.filter(step => step.trim()).length} ขั้นตอน
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>รูปประกอบ:</span>
                    <span className="text-blue-600">{recipeImages.length} รูป</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button 
                  onClick={handleSaveRecipe}
                  disabled={saving || !title.trim() || !coverImage}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกสูตรอาหาร"}
                </button>
                <button 
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
