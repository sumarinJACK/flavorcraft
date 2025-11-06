"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Auth } from "../../lib/firebase";
import { toggleRecipeLike, toggleFavoriteRecipe, isRecipeFavorited } from "../../lib/authService";
import { handleClientScriptLoad } from "next/script";

interface Recipe {
  recipeid: string;
  title: string;
  coverUrl: string;
  category: string;
  servings: number;
  likeCount: number;
  likedBy?: string[];
  author?: {
    name?: string;
    avatar?: string;
  };
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likeCount || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(Auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check if current user has liked this recipe
        if (recipe.likedBy) {
          setIsLiked(recipe.likedBy.includes(user.uid));
        }
        
        // Check if current user has favorited this recipe
        try {
          const favorited = await isRecipeFavorited(recipe.recipeid, user.uid);
          setIsFavorited(favorited);
        } catch (error) {
          console.error("Error checking favorite status:", error);
        }
      } else {
        setIsFavorited(false);
        setIsLiked(false);
      }
    });

    return () => unsubscribe();
  }, [recipe.likedBy, recipe.recipeid]);

    const handleLike = async (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent card click navigation
      
      if (!currentUser) {
        // Redirect to login if not authenticated
        window.location.href = "/login";
        return;
      }

      if (isUpdating) return; // Prevent multiple clicks
      
      setIsUpdating(true);
      try {
        const newLikedState = await toggleRecipeLike(recipe.recipeid, currentUser.uid);
        setIsLiked(newLikedState);
        setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error updating like:", error);
      } finally {
        setIsUpdating(false);
      }
    };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // ป้องกันไม่ให้คลิกการ์ดนำไปหน้าอื่น

    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

  if (isUpdatingFavorite) return;

  setIsUpdatingFavorite(true);
  try {
    const newFavoritedState = await toggleFavoriteRecipe(recipe.recipeid, currentUser.uid);
    setIsFavorited(newFavoritedState);

    if (newFavoritedState) {
      router.push(`/Profile/${currentUser.uid}?tab=favorites`);
    }

  } catch (error) {
    console.error("Error updating favorite:", error);
  } finally {
    setIsUpdatingFavorite(false);
  }
};

  return (
    <div className="bg-softwhite rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Recipe Image */}
      <div className="relative h-48 bg-gray-200">
        <Image
          src={recipe.coverUrl}
          alt={recipe.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Favorite Overlay */}
        <div className="absolute top-2 right-2">
          <button
            onClick={handleFavorite}
            disabled={isUpdatingFavorite}
            className={`p-2 rounded-full transition-all duration-200 backdrop-blur-sm ${
              isFavorited 
                ? "bg-yellow-400/80 text-white hover:bg-yellow-500/80" 
                : "bg-white/80 text-gray-600 hover:bg-white/90 hover:text-yellow-500"
            } ${isUpdatingFavorite ? "opacity-50 cursor-not-allowed" : "cursor-pointer shadow-sm"}`}
            title={isFavorited ? "ลบออกจากรายการโปรด" : "เพิ่มลงรายการโปรด"}
          >
            {/* Share Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12l4-4m0 0l4 4m-4-4v12M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Recipe Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{recipe.category}</span>
          <button 
            onClick={handleLike}
            disabled={isUpdating}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
              isLiked 
                ? "text-red-500 hover:text-red-600" 
                : "text-gray-500 hover:text-red-500"
            } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <svg 
              className="w-4 h-4" 
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
            <span className="text-sm">{likeCount}</span>
          </button>
        </div>

        <Link href={`/recipes/${recipe.recipeid}`}>
          <h3 className="font-semibold text-gray-900 mb-2 h-12 overflow-hidden text-ellipsis hover:text-blue-600 cursor-pointer">
            {recipe.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{recipe.servings} ท่าน</span>
          </div>
          
          {/* Author name */}
          {recipe.author?.name && (
            <span className="text-xs text-gray-500 truncate max-w-20">
              โดย {recipe.author.name}
            </span>
          )}
        </div>

        {/* Author */}
        {recipe.author && (
          <div className="flex items-center space-x-2 pt-3 border-t">
            <div className="w-6 h-6 bg-peach rounded-full flex items-center justify-center">
              {recipe.author?.avatar ? (
                <Image
                  src={recipe.author.avatar}
                  alt={recipe.author?.name || "ผู้ใช้"}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <span className="text-xs text-gray-600">
                  {recipe.author?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-600">{recipe.author?.name || "ผู้ใช้ไม่ระบุชื่อ"}</span>
          </div>
        )}
      </div>
    </div>
  );
}