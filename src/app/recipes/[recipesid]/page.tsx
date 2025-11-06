'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Auth } from '@/lib/firebase';
import { 
    fetchRecipeById, 
    fetchRecipeComments, 
    addComment, 
    deleteComment, 
    toggleRecipeLike 
} from '@/lib/authService';
import { useSafeDateFormatter } from '@/hooks/useClientSide';
import Image from 'next/image';
import Link from 'next/link';

interface Recipe {
    recipeid: string;
    authorId: string;
    title: string;
    slug: string;
    coverUrl: string;
    images: string[];
    category: string;
    servings: number;
    ingredients: Array<{
        name: string;
        qty: number;
        unit: string;
    }>;
    steps: string[];
    isPublished: boolean;
    likeCount: number;
    commentCount: number;
    saveCount: number;
    ratingAvg: number;
    createdAt: any;
    updatedAt: any;
    likedBy: string[];
    author: {
        name: string;
        avatar?: string;
        userid: string;
    };
}

interface Comment {
    commentId: string;
    recipeId: string;
    authorId: string;
    content: string;
    createdAt: any;
    updatedAt: any;
    likeCount: number;
    author: {
        name: string;
        avatar?: string;
        userid: string;
    };
}

export default function RecipeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [user] = useAuthState(Auth);
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { formatDateTime } = useSafeDateFormatter();


    const recipeId = params!.recipesid as string;

    useEffect(() => {
        const loadRecipeData = async () => {
            if (!recipeId) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                // Load recipe
                const recipeData = await fetchRecipeById(recipeId);
                if (!recipeData) {
                    setError('ไม่พบสูตรอาหารที่คุณต้องการ');
                    return;
                }
                
                setRecipe(recipeData as Recipe);
                setIsLiked(user ? recipeData.likedBy.includes(user.uid) : false);
                
                // Load comments
                const commentsData = await fetchRecipeComments(recipeId);
                setComments(commentsData);
                
            } catch (err) {
                console.error('Error loading recipe:', err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setIsLoading(false);
            }
        };

        loadRecipeData();
    }, [recipeId, user]);

    const handleLike = async () => {
        if (!user || !recipe) {
            router.push('/login');
            return;
        }

        try {
            const newLikedState = await toggleRecipeLike(recipe.recipeid, user.uid);
            setIsLiked(newLikedState);
            
            // Update recipe state
            setRecipe(prev => prev ? {
                ...prev,
                likeCount: newLikedState ? prev.likeCount + 1 : prev.likeCount - 1,
                likedBy: newLikedState 
                    ? [...prev.likedBy, user.uid]
                    : prev.likedBy.filter(id => id !== user.uid)
            } : null);
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            router.push('/login');
            return;
        }

        if (!newComment.trim() || !recipe) return;

        setIsSubmittingComment(true);
        
        try {
            await addComment(recipe.recipeid, newComment.trim(), user.uid);
            setNewComment('');
            
            // Reload comments
            const updatedComments = await fetchRecipeComments(recipe.recipeid);
            setComments(updatedComments);
            
            // Update recipe comment count
            setRecipe(prev => prev ? {
                ...prev,
                commentCount: prev.commentCount + 1
            } : null);
            
        } catch (err) {
            console.error('Error adding comment:', err);
            setError('ไม่สามารถเพิ่มคอมเมนท์ได้');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
  if (!user || !recipe) return;

  // 🧭 เพิ่มส่วนนี้ขึ้นมาก่อนลบจริง
  const confirmed = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?");
  if (!confirmed) return; // ถ้ากดยกเลิก ก็หยุดไม่ต้องลบ

  try {
    await deleteComment(commentId, recipe.recipeid, user.uid);

    // ลบออกจาก state
    setComments(prev => prev.filter(comment => comment.commentId !== commentId));

    // อัปเดตจำนวนคอมเมนต์
    setRecipe(prev =>
      prev
        ? {
            ...prev,
            commentCount: Math.max(0, prev.commentCount - 1),
          }
        : null
    );
  } catch (err) {
    console.error("Error deleting comment:", err);
    setError("ไม่สามารถลบคอมเมนต์ได้");
  }
};

    // Remove this function - we'll use formatDateTime from hook instead



    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        {error || 'ไม่พบสูตรอาหาร'}
                    </h2>
                    <Link 
                        href="/"
                        className="text-orange-500 hover:text-orange-600 underline"
                    >
                        กลับสู่หน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-softwhite ">
            {/* Header */}
            <div className="bg-peach shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 py-4">
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
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-800">{recipe.title}</h1>
                            <p className="text-gray-600">หมวดหมู่: {recipe.category}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Cover Image */}
                        <div className="relative h-96 rounded-lg overflow-hidden">
                            <Image
                                src={recipe.coverUrl}
                                alt={recipe.title}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Recipe Info */}
                        <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {recipe.author.avatar ? (
                                            <Image
                                                src={recipe.author.avatar}
                                                alt={recipe.author.name}
                                                width={40}
                                                height={40}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-peach rounded-full flex items-center justify-center">
                                                <span className="text-gray-600 font-medium">
                                                    {recipe.author.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <Link 
                                                href={`/Profile/${recipe.author.userid}`}
                                                className="font-medium text-gray-800 hover:text-orange-500"
                                            >
                                                {recipe.author.name}
                                            </Link>
                                            <p className="text-sm text-gray-600">
                                                {formatDateTime(recipe.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Edit/Delete buttons for recipe owner */}
                                    {user && user.uid === recipe.authorId && (
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/recipes/${recipe.recipeid}/edit`}
                                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                แก้ไข
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleLike}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                            isLiked 
                                                ? 'bg-red-50 text-red-600 border border-red-200' 
                                                : 'bg-peach text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        {recipe.likeCount}
                                    </button>
                                    
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        {recipe.commentCount} ความคิดเห็น
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-peach rounded-lg">
                                <div>
                                    <span className="font-medium text-gray-800">สำหรับ:</span>
                                    <span className="ml-2 text-gray-600">{recipe.servings} คน</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-800">หมวดหมู่:</span>
                                    <span className="ml-2 text-gray-600">{recipe.category}</span>
                                </div>
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">วัตถุดิบ</h3>
                            <div className="space-y-3">
                                {recipe.ingredients.map((ingredient, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                        <span className="text-gray-800">{ingredient.name}</span>
                                        <span className="text-gray-600 font-medium">
                                            {ingredient.qty} {ingredient.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">วิธีทำ</h3>
                            <div className="space-y-4">
                                {recipe.steps.map((step, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional Images */}
                        {recipe.images && recipe.images.length > 0 && (
                            <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">รูปภาพเพิ่มเติม</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {recipe.images.map((image, index) => (
                                        <div key={index} className="relative h-32 rounded-lg overflow-hidden">
                                            <Image
                                                src={image}
                                                alt={`${recipe.title} - รูปที่ ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Comments */}
                    <div className="space-y-6">
                        <div className="bg-softwhite rounded-lg p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                                ความคิดเห็น ({comments.length})
                            </h3>

                            {/* Add Comment Form */}
                            {user ? (
                                <form onSubmit={handleAddComment} className="mb-6">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="แสดงความคิดเห็นของคุณ..."
                                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        rows={3}
                                        disabled={isSubmittingComment}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || isSubmittingComment}
                                        className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmittingComment ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
                                    </button>
                                </form>
                            ) : (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                                    <p className="text-gray-600 mb-3">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                                    <Link
                                        href="/login"
                                        className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
                                    >
                                        เข้าสู่ระบบ
                                    </Link>
                                </div>
                            )}

                            {/* Comments List */}
                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">ยังไม่มีความคิดเห็น</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.commentId} className="border-b border-gray-100 pb-4 last:border-b-0">
                                            <div className="flex items-start gap-3">
                                                {comment.author.avatar ? (
                                                    <Image
                                                        src={comment.author.avatar}
                                                        alt={comment.author.name}
                                                        width={32}
                                                        height={32}
                                                        className="rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-peach rounded-full flex items-center justify-center">
                                                        <span className="text-gray-600 text-sm font-medium">
                                                            {comment.author.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <Link
                                                            href={`/Profile/${comment.author.userid}`}
                                                            className="font-medium text-gray-800 hover:text-orange-500 text-sm"
                                                        >
                                                            {comment.author.name}
                                                        </Link>
                                                        {user && user.uid === comment.authorId && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.commentId)}
                                                                className="text-red-500 hover:text-red-700 text-sm"
                                                            >
                                                                ลบ
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                                                    <p className="text-gray-500 text-xs mt-2">
                                                        {formatDateTime(comment.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
