export interface User {
    userid: string;
    username: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    role: 'admin' | 'user';
    imageUrl?: string;
    favorites?: string[]; // Array of recipe IDs that user has favorited
}

