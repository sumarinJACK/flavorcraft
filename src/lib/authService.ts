import { signInWithEmailAndPassword } from "firebase/auth";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { Auth } from "./firebase";
import { db } from "./firebase";
import type { User as AppUser } from "../database/user";

// Ensure a user document exists in Firestore with the correct schema
const ensureUserDocument = async (fbUser: import("firebase/auth").User, extra?: Partial<AppUser>) => {
    const uid = fbUser.uid;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    // Build base document
    const cleanedExtra = Object.fromEntries(
        Object.entries(extra ?? {}).filter(([, v]) => v !== undefined)
    ) as Partial<AppUser>;

    const base: Omit<AppUser, "createdAt" | "updatedAt"> & {
        createdAt: Date;
        updatedAt: Date;
    } = {
        userid: uid,
        username: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "user",
        email: fbUser.email ?? "",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...cleanedExtra,
    };

    if (!snap.exists()) {
        // On create, set createdAt/updatedAt using serverTimestamp for consistency
        const imageUrl = (cleanedExtra as any).imageUrl ?? fbUser.photoURL;
        await setDoc(
            userRef,
            {
                ...base,
                ...(imageUrl ? { imageUrl } : {}),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            } as any
        );
    } else {
        // On login, only update updatedAt and any provided extras
        const updatePayload = {
            updatedAt: serverTimestamp(),
            ...cleanedExtra,
        } as Record<string, any>;
        await updateDoc(userRef, updatePayload);
    }
};

export const login = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(Auth, email, password);
        await ensureUserDocument(userCredential.user);
        return userCredential.user;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error(String(error));
        }
    }
};

export const createUser = async (email: string, password: string, displayName: string, imageUrl?: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(Auth, email, password);
        const user = userCredential.user;

        // อัปเดตชื่อผู้ใช้และรูปโปรไฟล์
        const profileUpdate: { displayName: string; photoURL?: string } = { displayName };
        if (imageUrl) {
            profileUpdate.photoURL = imageUrl;
        }
        await updateProfile(user, profileUpdate);

        // Ensure user doc with provided displayName and imageUrl
        const userDocData: { username: string; imageUrl?: string } = { username: displayName };
        if (imageUrl) {
            userDocData.imageUrl = imageUrl;
        }
        await ensureUserDocument(user, userDocData);

        return user;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error(String(error));
        }
    }
};

export const logout = async () => {
    try {
        await signOut(Auth);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error(String(error));
        }
    }
};

// Update user's profile both in Firebase Auth and Firestore
export const updateUserProfile = async (updates: { username?: string; imageUrl?: string }) => {
    const user = Auth.currentUser;
    if (!user) {
        throw new Error("Not authenticated");
    }

    // Update Firebase Auth profile when relevant
    const authUpdate: { displayName?: string; photoURL?: string } = {};
    if (typeof updates.username !== "undefined") authUpdate.displayName = updates.username || undefined;
    if (typeof updates.imageUrl !== "undefined") authUpdate.photoURL = updates.imageUrl || undefined;
    if (Object.keys(authUpdate).length > 0) {
        await updateProfile(user, authUpdate);
    }

    // Update Firestore user document
    const userRef = doc(db, "users", user.uid);
    const firestoreUpdates: Partial<AppUser> & { updatedAt: any } = {
        updatedAt: serverTimestamp() as unknown as Date,
    };
    if (typeof updates.username !== "undefined") firestoreUpdates.username = updates.username as any;
    if (typeof updates.imageUrl !== "undefined") firestoreUpdates.imageUrl = updates.imageUrl as any;
    await updateDoc(userRef, firestoreUpdates as any);
};

// Fetch user data from Firestore
export const fetchUser = async (userId: string): Promise<AppUser | null> => {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                userid: userData.userid,
                username: userData.username,
                email: userData.email,
                role: userData.role,
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                imageUrl: userData.imageUrl || undefined,
            } as AppUser;
        }
        
        return null;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }
};

// Fetch user's recipes from Firestore
export const fetchUserRecipes = async (userId: string) => {
    try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const recipesQuery = query(
            collection(db, "recipes"),
            where("authorId", "==", userId)
        );
        const querySnapshot = await getDocs(recipesQuery);
        const recipes = querySnapshot.docs.map(doc => ({
            recipeid: doc.id,
            ...doc.data()
        }));
        
        // Fetch author information for each recipe
        const recipesWithAuthors = await Promise.all(
            recipes.map(async (recipe: any) => {
                try {
                    const authorDoc = await getDoc(doc(db, "users", recipe.authorId));
                    const authorData = authorDoc.exists() ? authorDoc.data() : null;
                    
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: authorData ? {
                            name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                            avatar: authorData.imageUrl
                        } : {
                            name: "ผู้ใช้ไม่ระบุชื่อ"
                        }
                    };
                } catch (err) {
                    console.error("Error fetching author for recipe:", recipe.recipeid, err);
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: { name: "ผู้ใช้ไม่ระบุชื่อ" }
                    };
                }
            })
        );
        
        return recipesWithAuthors;
    } catch (error) {
        console.error("Error fetching user recipes:", error);
        return [];
    }
};

// Fetch all recipes from Firestore (for landing page)
export const fetchAllRecipes = async () => {
    try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const recipesQuery = query(
            collection(db, "recipes"),
            where("isPublished", "==", true)
        );
        const querySnapshot = await getDocs(recipesQuery);
        const recipes = querySnapshot.docs.map(doc => ({
            recipeid: doc.id,
            ...doc.data()
        }));
        
        // Sort by createdAt in JavaScript (newest first)
        return recipes.sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
            const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
    } catch (error) {
        console.error("Error fetching all recipes:", error);
        return [];
    }
};

// Fetch popular recipes (sorted by likeCount)
export const fetchPopularRecipes = async (limitCount: number = 8) => {
    try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const recipesQuery = query(
            collection(db, "recipes"),
            where("isPublished", "==", true)
        );
        const querySnapshot = await getDocs(recipesQuery);
        const recipes = querySnapshot.docs.map(doc => ({
            recipeid: doc.id,
            ...doc.data()
        }));
        
        // Fetch author information for each recipe
        const recipesWithAuthors = await Promise.all(
            recipes.map(async (recipe: any) => {
                try {
                    const authorDoc = await getDoc(doc(db, "users", recipe.authorId));
                    const authorData = authorDoc.exists() ? authorDoc.data() : null;
                    
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: authorData ? {
                            name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                            avatar: authorData.imageUrl
                        } : {
                            name: "ผู้ใช้ไม่ระบุชื่อ"
                        }
                    };
                } catch (err) {
                    console.error("Error fetching author for recipe:", recipe.recipeid, err);
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: { name: "ผู้ใช้ไม่ระบุชื่อ" }
                    };
                }
            })
        );
        
        // Sort by likeCount in JavaScript and limit
        return recipesWithAuthors
            .sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0))
            .slice(0, limitCount);
    } catch (error) {
        console.error("Error fetching popular recipes:", error);
        return [];
    }
};

// Fetch newest recipes
export const fetchNewestRecipes = async (limitCount: number = 8) => {
    try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const recipesQuery = query(
            collection(db, "recipes"),
            where("isPublished", "==", true)
        );
        const querySnapshot = await getDocs(recipesQuery);
        const recipes = querySnapshot.docs.map(doc => ({
            recipeid: doc.id,
            ...doc.data()
        }));
        
        // Fetch author information for each recipe
        const recipesWithAuthors = await Promise.all(
            recipes.map(async (recipe: any) => {
                try {
                    const authorDoc = await getDoc(doc(db, "users", recipe.authorId));
                    const authorData = authorDoc.exists() ? authorDoc.data() : null;
                    
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: authorData ? {
                            name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                            avatar: authorData.imageUrl
                        } : {
                            name: "ผู้ใช้ไม่ระบุชื่อ"
                        }
                    };
                } catch (err) {
                    console.error("Error fetching author for recipe:", recipe.recipeid, err);
                    return {
                        ...recipe,
                        likedBy: recipe.likedBy || [],
                        author: { name: "ผู้ใช้ไม่ระบุชื่อ" }
                    };
                }
            })
        );
        
        // Sort by createdAt in JavaScript and limit
        return recipesWithAuthors
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
                const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            })
            .slice(0, limitCount);
    } catch (error) {
        console.error("Error fetching newest recipes:", error);
        return [];
    }
};

// Like/Unlike recipe
export const toggleRecipeLike = async (recipeId: string, userId: string): Promise<boolean> => {
    try {
        const { doc: docRef, getDoc, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
        const recipeRef = docRef(db, "recipes", recipeId);
        const recipeDoc = await getDoc(recipeRef);
        
        if (!recipeDoc.exists()) {
            throw new Error("ไม่พบสูตรอาหาร");
        }
        
        const recipeData = recipeDoc.data();
        const likedBy = recipeData.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        if (isLiked) {
            // Unlike - remove user from likedBy array and decrease count
            await updateDoc(recipeRef, {
                likedBy: arrayRemove(userId),
                likeCount: Math.max(0, (recipeData.likeCount || 0) - 1),
                updatedAt: serverTimestamp()
            });
            return false; // now unliked
        } else {
            // Like - add user to likedBy array and increase count
            await updateDoc(recipeRef, {
                likedBy: arrayUnion(userId),
                likeCount: (recipeData.likeCount || 0) + 1,
                updatedAt: serverTimestamp()
            });
            return true; // now liked
        }
    } catch (error) {
        console.error("Error toggling recipe like:", error);
        throw new Error("ไม่สามารถอัปเดตไลค์ได้");
    }
};

// Fetch single recipe by ID
export const fetchRecipeById = async (recipeId: string) => {
    try {
        const recipeRef = doc(db, "recipes", recipeId);
        const recipeDoc = await getDoc(recipeRef);
        
        if (!recipeDoc.exists()) {
            return null;
        }
        
        const recipeData = recipeDoc.data();
        
        // Fetch author information
        const authorDoc = await getDoc(doc(db, "users", recipeData.authorId));
        const authorData = authorDoc.exists() ? authorDoc.data() : null;
        
        return {
            recipeid: recipeDoc.id,
            ...recipeData,
            likedBy: recipeData.likedBy || [],
            author: authorData ? {
                name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                avatar: authorData.imageUrl,
                userid: authorData.userid
            } : {
                name: "ผู้ใช้ไม่ระบุชื่อ",
                userid: recipeData.authorId
            }
        };
    } catch (error) {
        console.error("Error fetching recipe:", error);
        throw new Error("ไม่สามารถดึงข้อมูลสูตรอาหารได้");
    }
};

// Fetch comments for a recipe
export const fetchRecipeComments = async (recipeId: string) => {
    try {
        const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
        const commentsQuery = query(
            collection(db, "comments"),
            where("recipeId", "==", recipeId)
        );
        const querySnapshot = await getDocs(commentsQuery);
        const comments = querySnapshot.docs.map(doc => ({
            commentId: doc.id,
            ...doc.data()
        }));
        
        // Fetch author information for each comment
        const commentsWithAuthors = await Promise.all(
            comments.map(async (comment: any) => {
                try {
                    const authorDoc = await getDoc(doc(db, "users", comment.authorId));
                    const authorData = authorDoc.exists() ? authorDoc.data() : null;
                    
                    return {
                        ...comment,
                        author: authorData ? {
                            name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                            avatar: authorData.imageUrl,
                            userid: authorData.userid
                        } : {
                            name: "ผู้ใช้ไม่ระบุชื่อ",
                            userid: comment.authorId
                        }
                    };
                } catch (err) {
                    console.error("Error fetching author for comment:", comment.commentId, err);
                    return {
                        ...comment,
                        author: { 
                            name: "ผู้ใช้ไม่ระบุชื่อ",
                            userid: comment.authorId
                        }
                    };
                }
            })
        );
        
        // Sort by createdAt (newest first)
        return commentsWithAuthors.sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
            const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
};

// Add comment to a recipe
export const addComment = async (recipeId: string, content: string, authorId: string) => {
    try {
        const { collection, addDoc, doc: docRef, updateDoc, increment } = await import("firebase/firestore");
        
        // Add comment to comments collection
        const commentData = {
            recipeId,
            authorId,
            content,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            likeCount: 0
        };
        
        const commentRef = await addDoc(collection(db, "comments"), commentData);
        
        // Update recipe's comment count
        const recipeRef = docRef(db, "recipes", recipeId);
        await updateDoc(recipeRef, {
            commentCount: increment(1),
            updatedAt: serverTimestamp()
        });
        
        return commentRef.id;
    } catch (error) {
        console.error("Error adding comment:", error);
        throw new Error("ไม่สามารถเพิ่มคอมเมนท์ได้");
    }
};

// Delete comment
export const deleteComment = async (commentId: string, recipeId: string, authorId: string) => {
    try {
        const { doc: docRef, getDoc, deleteDoc, updateDoc, increment } = await import("firebase/firestore");
        
        // Check if comment exists and user is the author
        const commentRef = docRef(db, "comments", commentId);
        const commentDoc = await getDoc(commentRef);
        
        if (!commentDoc.exists()) {
            throw new Error("ไม่พบคอมเมนท์");
        }
        
        const commentData = commentDoc.data();
        if (commentData.authorId !== authorId) {
            throw new Error("คุณไม่มีสิทธิ์ลบคอมเมนท์นี้");
        }
        
        // Delete comment
        await deleteDoc(commentRef);
        
        // Update recipe's comment count
        const recipeRef = docRef(db, "recipes", recipeId);
        await updateDoc(recipeRef, {
            commentCount: increment(-1),
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error deleting comment:", error);
        throw new Error("ไม่สามารถลบคอมเมนท์ได้");
    }
};

// Update recipe
export const updateRecipe = async (recipeId: string, authorId: string, recipeData: any) => {
    try {
        const { doc: docRef, getDoc, updateDoc } = await import("firebase/firestore");
        
        // Check if recipe exists and user is the author
        const recipeRef = docRef(db, "recipes", recipeId);
        const recipeDoc = await getDoc(recipeRef);
        
        if (!recipeDoc.exists()) {
            throw new Error("ไม่พบสูตรอาหาร");
        }
        
        const existingData = recipeDoc.data();
        if (existingData.authorId !== authorId) {
            throw new Error("คุณไม่มีสิทธิ์แก้ไขสูตรนี้");
        }
        
        // Update recipe
        await updateDoc(recipeRef, {
            ...recipeData,
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Error updating recipe:", error);
        throw new Error("ไม่สามารถอัปเดตสูตรอาหารได้");
    }
};

// Delete recipe and all related comments
export const deleteRecipe = async (recipeId: string, authorId: string) => {
    try {
        const { doc: docRef, getDoc, deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");
        
        // Check if recipe exists and user is the author
        const recipeRef = docRef(db, "recipes", recipeId);
        const recipeDoc = await getDoc(recipeRef);
        
        if (!recipeDoc.exists()) {
            throw new Error("ไม่พบสูตรอาหาร");
        }
        
        const recipeData = recipeDoc.data();
        if (recipeData.authorId !== authorId) {
            throw new Error("คุณไม่มีสิทธิ์ลบสูตรนี้");
        }
        
        // Collect all image URLs to delete
        const imagesToDelete: string[] = [];
        
        // Add cover image
        if (recipeData.coverUrl) {
            imagesToDelete.push(recipeData.coverUrl);
        }
        
        // Add additional images
        if (recipeData.imageUrls && Array.isArray(recipeData.imageUrls)) {
            imagesToDelete.push(...recipeData.imageUrls);
        }
        
        // Delete images from GitHub (don't wait for completion, run in background)
        if (imagesToDelete.length > 0) {
            // Run image deletion in background - don't block recipe deletion if this fails
            Promise.all(
                imagesToDelete.map(imageUrl => 
                    deleteGithubImage(imageUrl).catch(err => 
                        console.warn(`Failed to delete image ${imageUrl}:`, err)
                    )
                )
            ).catch(err => 
                console.warn("Some images failed to delete from GitHub:", err)
            );
        }
        
        // Delete all comments for this recipe
        const commentsQuery = query(
            collection(db, "comments"),
            where("recipeId", "==", recipeId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const deletePromises = commentsSnapshot.docs.map(commentDoc => 
            deleteDoc(commentDoc.ref)
        );
        
        // Delete all comments first
        await Promise.all(deletePromises);
        
        // Then delete the recipe
        await deleteDoc(recipeRef);
        
        return true;
    } catch (error) {
        console.error("Error deleting recipe:", error);
        throw new Error("ไม่สามารถลบสูตรอาหารได้");
    }
};

// Toggle favorite recipe for user
export const toggleFavoriteRecipe = async (recipeId: string, userId: string): Promise<boolean> => {
    try {
        const { doc: docRef, getDoc, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
        const userRef = docRef(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error("ไม่พบข้อมูลผู้ใช้");
        }
        
        const userData = userDoc.data();
        const favorites = userData.favorites || [];
        const isFavorited = favorites.includes(recipeId);
        
        if (isFavorited) {
            // Remove from favorites
            await updateDoc(userRef, {
                favorites: arrayRemove(recipeId),
                updatedAt: serverTimestamp()
            });
            return false; // now not favorited
        } else {
            // Add to favorites
            await updateDoc(userRef, {
                favorites: arrayUnion(recipeId),
                updatedAt: serverTimestamp()
            });
            return true; // now favorited
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
        throw new Error("ไม่สามารถอัปเดตรายการโปรดได้");
    }
};

// Fetch user's favorite recipes
export const fetchUserFavoriteRecipes = async (userId: string) => {
    try {
        const { doc: docRef, getDoc } = await import("firebase/firestore");
        
        // Get user's favorite recipe IDs
        const userRef = docRef(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            return [];
        }
        
        const userData = userDoc.data();
        const favoriteIds = userData.favorites || [];
        
        if (favoriteIds.length === 0) {
            return [];
        }
        
        // Fetch each favorite recipe
        const favoriteRecipes = await Promise.all(
            favoriteIds.map(async (recipeId: string) => {
                try {
                    const recipeRef = docRef(db, "recipes", recipeId);
                    const recipeDoc = await getDoc(recipeRef);
                    
                    if (!recipeDoc.exists()) {
                        return null; // Recipe might be deleted
                    }
                    
                    const recipeData = recipeDoc.data();
                    
                    // Fetch author information
                    const authorDoc = await getDoc(docRef(db, "users", recipeData.authorId));
                    const authorData = authorDoc.exists() ? authorDoc.data() : null;
                    
                    return {
                        recipeid: recipeDoc.id,
                        ...recipeData,
                        likedBy: recipeData.likedBy || [],
                        author: authorData ? {
                            name: authorData.username || authorData.email || "ผู้ใช้ไม่ระบุชื่อ",
                            avatar: authorData.imageUrl
                        } : {
                            name: "ผู้ใช้ไม่ระบุชื่อ"
                        }
                    };
                } catch (err) {
                    console.error("Error fetching favorite recipe:", recipeId, err);
                    return null;
                }
            })
        );
        
        // Filter out null values (deleted recipes)
        const validFavorites = favoriteRecipes.filter(recipe => recipe !== null);
        
        // Sort by dateAdded (most recent first) - we'll use the order in favorites array
        return validFavorites;
    } catch (error) {
        console.error("Error fetching favorite recipes:", error);
        return [];
    }
};

// Check if recipe is favorited by user
export const isRecipeFavorited = async (recipeId: string, userId: string): Promise<boolean> => {
    try {
        const { doc: docRef, getDoc } = await import("firebase/firestore");
        const userRef = docRef(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            return false;
        }
        
        const userData = userDoc.data();
        const favorites = userData.favorites || [];
        
        return favorites.includes(recipeId);
    } catch (error) {
        console.error("Error checking favorite status:", error);
        return false;
    }
};

// Helper function to extract file path from GitHub URL
const extractFilePathFromUrl = (url: string): string | null => {
    try {
        // Extract path from raw.githubusercontent.com URL
        // Format: https://raw.githubusercontent.com/owner/repo/branch/path
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

// Delete image from GitHub repository
export const deleteGithubImage = async (imageUrl: string): Promise<boolean> => {
    try {
        const filePath = extractFilePathFromUrl(imageUrl);
        
        if (!filePath) {
            console.warn("Could not extract file path from URL:", imageUrl);
            return false; // Not a GitHub URL, skip deletion
        }

        const response = await fetch("/api/delete-github-image", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filePath: filePath,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Failed to delete image from GitHub:", result.error);
            return false;
        }

        return result.success;
    } catch (error) {
        console.error("Error deleting GitHub image:", error);
        return false;
    }
};