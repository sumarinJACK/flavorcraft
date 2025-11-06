

export interface Ingredient {
    name: string;
    qty: number;
    unit: string;
}

export interface Recipe {
    recipeid: string;
    authorId: string;
    title: string;
    slug: string;
    coverUrl: string;
    images: string[];
    category: string;
    servings: number;
    ingredients: Ingredient[];
    steps: string[];
    isPublished: boolean;
    likeCount: number;
    commentCount: number;
    saveCount: number;
    ratingAvg: number;
    createdAt: Date;
    updatedAt: Date;
}

interface Comment {
    commentId: string;
    recipeId: string;
    authorId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    likeCount: number;
}
export type Comments = Comment[];

export type Recipes = Recipe[];