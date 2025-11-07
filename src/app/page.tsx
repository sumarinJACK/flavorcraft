"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { Auth } from "../lib/firebase";
import Navbar from "./components/Navbar";
import RecipeCard from "./components/RecipeCard";
import { fetchPopularRecipes, fetchNewestRecipes } from "../lib/authService";

// Fallback mock data (ใช้เมื่อไม่มีข้อมูลจาก Firestore)
const fallbackRecipes = [
  {
    recipeid: "1",
    title: "ข้าวผัดกุ้ง",
    coverUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300",
    category: "อาหารไทย",
    servings: 2,
    likeCount: 24,
    author: {
      name: "Chef Anna",
    }
  },
  {
    recipeid: "2", 
    title: "แกงเขียวหวานไก่",
    coverUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300",
    category: "อาหารไทย",
    servings: 4,
    likeCount: 18,
    author: {
      name: "Nong Ploy",
    }
  },
  {
    recipeid: "3",
    title: "ส้มตำไทย",
    coverUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300",
    category: "อาหารไทย", 
    servings: 1,
    likeCount: 32,
    author: {
      name: "P' Malee",
    }
  },
  {
    recipeid: "4",
    title: "พาสต้าคาโบนาร่า",
    coverUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300",
    category: "อาหารตะวันตก",
    servings: 2,
    likeCount: 15,
    author: {
      name: "Chef Marco",
    }
  },
  {
    recipeid: "5",
    title: "ราเมนหมูชาชู",
    coverUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300",
    category: "อาหารญี่ปุ่น",
    servings: 1,
    likeCount: 28,
    author: {
      name: "Chef Tanaka",
    }
  },
  {
    recipeid: "6",
    title: "แซลมอนเทริยากิ",
    coverUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300",
    category: "อาหารญี่ปุ่น",
    servings: 2,
    likeCount: 21,
    author: {
      name: "Chef Sato",
    }
  }
];

export default function Home() {
  const router = useRouter();
  const [user] = useAuthState(Auth);
  const [popularRecipes, setPopularRecipes] = useState<any[]>([]);
  const [newestRecipes, setNewestRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  type CategoryName = "อาหารไทย" | "อาหารญี่ปุ่น" | "อาหารตะวันตก" | "ขนมหวาน";

  const [categoryCounts, setCategoryCounts] = useState<Record<CategoryName, number>>({
  "อาหารไทย": 0,
  "อาหารญี่ปุ่น": 0,
  "อาหารตะวันตก": 0,
  "ขนมหวาน": 0
  });
  useEffect(() => {
  if (!loading) {
    // รวมสูตรจากทั้ง 2 แหล่ง และกรองไม่ให้ซ้ำ
    const allRecipesMap = new Map<string, any>();
    [...popularRecipes, ...newestRecipes].forEach((r) => {
      allRecipesMap.set(r.recipeid, r); // ถ้ามี recipeid ซ้ำ จะถูกแทนที่อันเก่า
    });

    const uniqueRecipes = Array.from(allRecipesMap.values());

    // นับจำนวนแต่ละหมวด
    const counts = {
      "อาหารไทย": uniqueRecipes.filter(r => r.category === "อาหารไทย").length,
      "อาหารญี่ปุ่น": uniqueRecipes.filter(r => r.category === "อาหารญี่ปุ่น").length,
      "อาหารตะวันตก": uniqueRecipes.filter(r => r.category === "อาหารตะวันตก").length,
      "ขนมหวาน": uniqueRecipes.filter(r => r.category === "ขนมหวาน").length,
    };

    setCategoryCounts(counts);
  }
}, [loading, popularRecipes, newestRecipes]);

  const handleCreateRecipeClick = () => {
    if (user) {
      router.push("/recipes/new");
    } else {
      router.push("/login");
    }
  };

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const [popular, newest] = await Promise.all([
          fetchPopularRecipes(8),
          fetchNewestRecipes(8)
        ]);
        
        setPopularRecipes(popular.length > 0 ? popular : fallbackRecipes);
        setNewestRecipes(newest.length > 0 ? newest : fallbackRecipes);
      } catch (error) {
        console.error("Error loading recipes:", error);
        setPopularRecipes(fallbackRecipes);
        setNewestRecipes(fallbackRecipes);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, []);
  return (
    <div className="min-h-screen bg-peach">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-softwhite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              ค้นพบสูตรอาหารอร่อยๆ
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              แชร์และค้นหาสูตรอาหารจากเชฟและคนรักการทำอาหารจากทั่วโลก
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleCreateRecipeClick}
                className="px-8 py-3 border border-gray-300 text-black rounded-lg hover:bg-primary font-medium transition-colors"
              >
                {user ? "เริ่มต้นแบ่งปันสูตรอาหาร" : "เข้าสู่ระบบเพื่อแบ่งปันสูตร"}
              </button>
              <button className="px-8 py-3 border border-gray-300 text-black rounded-lg hover:bg-primary font-medium">
                ดูสูตรทั้งหมด
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}

      {/* Newest Recipes Section */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">สูตรใหม่ล่าสุด</h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              ดูทั้งหมด →
            </button>
          </div>

          {/* Newest Recipe Grid */}
          {newestRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {newestRecipes.map((recipe: any) => (
                <RecipeCard key={recipe.recipeid} recipe={recipe} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍🍳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีสูตรอาหาร</h3>
              <p className="text-gray-600 mb-6">เป็นคนแรกที่แชร์สูตรอาหารอร่อยๆ กันเลย!</p>
              <button
                onClick={handleCreateRecipeClick}
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary transition-colors"
              >
                {user ? "เพิ่มสูตรแรก" : "เข้าสู่ระบบเพื่อเพิ่มสูตร"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Popular Recipes Section */}
      {!loading && (
        <div className="bg-softwhite py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">สูตรยอดนิยม</h2>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                ดูทั้งหมด →
              </button>
            </div>

            {/* Popular Recipe Grid */}
            {popularRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {popularRecipes.map((recipe: any) => (
                  <RecipeCard key={recipe.recipeid} recipe={recipe} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีสูตรยอดนิยม</h3>
                <p className="text-gray-600">กดไลค์สูตรโปรดของคุณเพื่อให้เป็นยอดนิยม!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Section */}
      {!loading && (
        <div className="bg-peach py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            หมวดหมู่อาหาร
            </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { name: "อาหารไทย", emoji: "🇹🇭" },
          { name: "อาหารญี่ปุ่น", emoji: "🇯🇵" },
          { name: "อาหารตะวันตก", emoji: "🍝" },
          { name: "ขนมหวาน", emoji: "🧁" }
        ].map((category) => (
          <div
            key={category.name}
            className="bg-peach rounded-lg p-6 text-center hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="text-4xl mb-2">{category.emoji}</div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-600">
              {categoryCounts[category.name as CategoryName] || 0} สูตร
            </p>
          </div>
          ))}
        </div>
      </div>
    </div>
    )}
    </div>
  );
}
