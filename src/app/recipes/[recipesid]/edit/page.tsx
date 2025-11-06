'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Auth } from '@/lib/firebase';
import { fetchRecipeById, updateRecipe, deleteRecipe } from '@/lib/authService';
import GithubImageUploader from '../../../components/GithubImageUploader';

interface Ingredient {
    name: string;
    qty: number;
    unit: string;
}

export default function EditRecipePage() {
    const params = useParams();
    const router = useRouter();
    const [user] = useAuthState(Auth);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Recipe data
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('อาหารไทย');
    const [servings, setServings] = useState(1);
    const [coverUrl, setCoverUrl] = useState('');
    const [additionalImages, setAdditionalImages] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', qty: 1, unit: 'กรام' }]);
    const [steps, setSteps] = useState<string[]>(['']);
    const [isPublished, setIsPublished] = useState(true);

    const recipeId = params!.recipesid as string;

    // Load existing recipe data
    useEffect(() => {
        const loadRecipe = async () => {
            if (!recipeId) return;
            
            try {
                setLoading(true);
                const recipe = await fetchRecipeById(recipeId) as any;
                
                if (!recipe) {
                    setError('ไม่พบสูตรอาหารที่ต้องการแก้ไข');
                    return;
                }
                
                // Check if user is the author
                if (!user || user.uid !== recipe.authorId) {
                    setError('คุณไม่มีสิทธิ์แก้ไขสูตรนี้');
                    return;
                }
                
                // Pre-fill form data
                setTitle(recipe.title || '');
                setCategory(recipe.category || 'อาหารไทย');
                setServings(recipe.servings || 1);
                setCoverUrl(recipe.coverUrl || '');
                setAdditionalImages(recipe.images || []);
                setIngredients(recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', qty: 1, unit: 'กรام' }]);
                setSteps(recipe.steps && recipe.steps.length > 0 ? recipe.steps : ['']);
                setIsPublished(recipe.isPublished ?? true);
                
            } catch (err) {
                console.error('Error loading recipe:', err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setLoading(false);
            }
        };

        if (user !== undefined) { // Wait for auth state to be determined
            loadRecipe();
        }
    }, [recipeId, user]);

    // Redirect if not authenticated
    useEffect(() => {
        if (user === null) { // User is definitely not logged in
            router.push('/login');
        }
    }, [user, router]);

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        setIngredients(prev => prev.map((ingredient, i) => 
            i === index ? { ...ingredient, [field]: value } : ingredient
        ));
    };

    const addIngredient = () => {
        setIngredients(prev => [...prev, { name: '', qty: 1, unit: 'กรام' }]);
    };

    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            setIngredients(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleStepChange = (index: number, value: string) => {
        setSteps(prev => prev.map((step, i) => i === index ? value : step));
    };

    const addStep = () => {
        setSteps(prev => [...prev, '']);
    };

    const removeStep = (index: number) => {
        if (steps.length > 1) {
            setSteps(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleCoverUpload = async (url: string) => {
        // Delete old cover image if exists
        if (coverUrl && coverUrl !== url) {
            try {
                await fetch("/api/delete-github-image", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        filePath: extractFilePathFromUrl(coverUrl),
                    }),
                });
            } catch (error) {
                console.warn("Failed to delete old cover image from GitHub:", error);
            }
        }
        
        setCoverUrl(url);
    };

    const handleAdditionalImageUpload = (url: string) => {
        setAdditionalImages(prev => [...prev, url]);
    };

    const removeAdditionalImage = async (index: number, imageUrl: string) => {
        try {
            // Delete image from GitHub
            await fetch("/api/delete-github-image", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    filePath: extractFilePathFromUrl(imageUrl),
                }),
            });
        } catch (error) {
            console.warn("Failed to delete image from GitHub:", error);
        }
        
        // Remove from local state regardless of GitHub deletion result
        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    };

    // Helper function to extract file path from GitHub URL
    const extractFilePathFromUrl = (url: string): string | null => {
        try {
            const urlParts = url.split('/');
            const pathStartIndex = urlParts.findIndex(part => part === 'main' || part === 'master') + 1;
            
            if (pathStartIndex > 0 && pathStartIndex < urlParts.length) {
                return urlParts.slice(pathStartIndex).join('/');
            }
            
            return null;
        } catch (error) {
            console.error("Error extracting file path:", error);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !recipeId) return;

        // Validation
        if (!title.trim()) {
            setError('กรุณาใส่ชื่อสูตรอาหาร');
            return;
        }

        if (!coverUrl) {
            setError('กรุณาอัปโหลดรูปหน้าปก');
            return;
        }

        const validIngredients = ingredients.filter(ing => ing.name.trim());
        if (validIngredients.length === 0) {
            setError('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');
            return;
        }

        const validSteps = steps.filter(step => step.trim());
        if (validSteps.length === 0) {
            setError('กรุณาเพิ่มขั้นตอนการทำอย่างน้อย 1 ขั้นตอน');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const recipeData = {
                title: title.trim(),
                slug: title.trim().toLowerCase().replace(/\s+/g, '-'),
                coverUrl,
                images: additionalImages,
                category,
                servings,
                ingredients: validIngredients,
                steps: validSteps,
                isPublished,
            };

            await updateRecipe(recipeId, user.uid, recipeData);
            
            // Redirect back to recipe detail page
            router.push(`/recipes/${recipeId}`);
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !recipeId) return;

        setDeleting(true);
        try {
            await deleteRecipe(recipeId, user.uid);
            // Redirect to profile page
            router.push(`/Profile/${user.uid}`);
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการลบสูตรอาหาร');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (error && !title) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
                    <button 
                        onClick={() => router.back()}
                        className="text-orange-500 hover:text-orange-600 underline"
                    >
                        กลับ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-peach">
            {/* Header */}
            <div className="bg-softwhite shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                กลับ
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800">แก้ไขสูตรอาหาร</h1>
                        </div>
                        
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            disabled={deleting}
                        >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            ลบสูตร
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">ข้อมูลพื้นฐาน</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ชื่อสูตรอาหาร *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="เช่น ข้าวผัดกุ้ง"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    หมวดหมู่
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    <option value="อาหารไทย">อาหารไทย</option>
                                    <option value="อาหารญี่ปุ่น">อาหารญี่ปุ่น</option>
                                    <option value="อาหารตะวันตก">อาหารตะวันตก</option>
                                    <option value="อาหารจีน">อาหารจีน</option>
                                    <option value="อาหารเกาหลี">อาหารเกาหลี</option>
                                    <option value="ขนมหวาน">ขนมหวาน</option>
                                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                                    <option value="อื่นๆ">อื่นๆ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    สำหรับ (คน)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={servings}
                                    onChange={(e) => setServings(parseInt(e.target.value))}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    สถานะ
                                </label>
                                <select
                                    value={isPublished ? 'published' : 'draft'}
                                    onChange={(e) => setIsPublished(e.target.value === 'published')}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    <option value="published">เผยแพร่แล้ว</option>
                                    <option value="draft">แบบร่าง</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">รูปหน้าปก *</h2>
                        
                        {coverUrl && (
                            <div className="mb-4">
                                <img
                                    src={coverUrl}
                                    alt="รูปหน้าปก"
                                    className="w-full max-w-md h-48 object-cover rounded-lg"
                                />
                            </div>
                        )}
                        
                        <GithubImageUploader
                            folder="recipes"
                            onUploadSuccess={handleCoverUpload}
                            onUploadError={(error) => setError(`การอัปโหลดล้มเหลว: ${error}`)}
                            maxSizeMB={10}
                        />
                    </div>

                    {/* Ingredients */}
                    <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">วัตถุดิบ *</h2>
                        
                        <div className="space-y-3">
                            {ingredients.map((ingredient, index) => (
                                <div key={index} className="flex gap-3 items-center">
                                    <input
                                        type="text"
                                        placeholder="ชื่อวัตถุดิบ"
                                        value={ingredient.name}
                                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                    <input
                                        type="number"
                                        placeholder="จำนวน"
                                        min="0"
                                        step="0.1"
                                        value={ingredient.qty}
                                        onChange={(e) => handleIngredientChange(index, 'qty', parseFloat(e.target.value) || 0)}
                                        className="w-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                    <select
                                        value={ingredient.unit}
                                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                        className="w-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="กรัม">กรัม</option>
                                        <option value="กิโลกรรม">กิโลกรรม</option>
                                        <option value="มิลลิลิตร">มล.</option>
                                        <option value="ลิตร">ลิตร</option>
                                        <option value="ช้อนชา">ช้อนชา</option>
                                        <option value="ช้อนโต๊ะ">ช้อนโต๊ะ</option>
                                        <option value="ถ้วย">ถ้วย</option>
                                        <option value="ลูก">ลูก</option>
                                        <option value="หัว">หัว</option>
                                        <option value="ฟอง">ฟอง</option>
                                        <option value="แผ่น">แผ่น</option>
                                        <option value="อันื">อัน</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeIngredient(index)}
                                        disabled={ingredients.length <= 1}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button
                            type="button"
                            onClick={addIngredient}
                            className="mt-4 px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                            + เพิ่มวัตถุดิบ
                        </button>
                    </div>

                    {/* Steps */}
                    <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">วิธีทำ *</h2>
                        
                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium mt-2">
                                        {index + 1}
                                    </div>
                                    <textarea
                                        placeholder={`ขั้นตอนที่ ${index + 1}`}
                                        value={step}
                                        onChange={(e) => handleStepChange(index, e.target.value)}
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                        rows={3}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeStep(index)}
                                        disabled={steps.length <= 1}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button
                            type="button"
                            onClick={addStep}
                            className="mt-4 px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                            + เพิ่มขั้นตอน
                        </button>
                    </div>

                    {/* Additional Images */}
                    <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">รูปภาพเพิ่มเติม</h2>
                        
                        {additionalImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {additionalImages.map((imageUrl, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={imageUrl}
                                            alt={`รูปเพิ่มเติม ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAdditionalImage(index, imageUrl)}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <GithubImageUploader
                            folder="recipes"
                            onUploadSuccess={handleAdditionalImageUpload}
                            onUploadError={(error) => setError(`การอัปโหลดล้มเหลว: ${error}`)}
                            maxSizeMB={10}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={saving}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary disabled:bg-primary disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">ยืนยันการลบสูตรอาหาร</h3>
                        <p className="text-gray-600 mb-6">
                            คุณแน่ใจหรือไม่ว่าต้องการลบสูตร "{title}" การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={deleting}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                disabled={deleting}
                            >
                                {deleting ? 'กำลังลบ...' : 'ลบสูตร'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}