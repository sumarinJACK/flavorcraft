export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  createdAt: string;
}

export type RecipeCategory = 
  | 'อาหารจานหลัก'
  | 'ของหวาน'
  | 'เครื่องดื่ม'
  | 'อาหารว่าง'
  | 'สลัด'
  | 'ซุป'
  | 'อาหารเช้า'
  | 'อาหารเจ'
  | 'อาหารทะเล'
  | 'อาหารย่าง'
  | 'อาหารทอด'
  | 'อาหารต้ม'
  | 'อาหารผัด'
  | 'ขนมไทย'
  | 'ขนมปัง'
  | 'พาสต้า'
  | 'พิซซ่า'
  | 'อาหารญี่ปุ่น'
  | 'อาหารเกาหลี'
  | 'อาหารจีน'
  | 'อาหารอิตาเลียน'
  | 'อาหารฝรั่งเศส'
  | 'อาหารอินเดีย'
  | 'อาหารเม็กซิกัน'
  | 'อื่นๆ';

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory | string; // Allow custom categories
  imageUrl: string;
  ingredients: string[];
  instructions: string[];
  substitutions?: string;
  authorId: string;
  author: User;
  likes: number;
  shares: number;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  recipeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInteraction {
  userId: string;
  likedRecipes: string[];
  sharedRecipes: string[];
}

export type SortOption = 'latest' | 'mostLiked' | 'mostShared' | 'mostCommented';

export interface CustomCategory {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}