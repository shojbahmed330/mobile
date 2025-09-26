// @ts-nocheck
import {
    getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, addDoc, deleteDoc, onSnapshot,
    query, where, orderBy, limit, runTransaction, writeBatch, documentId,
    serverTimestamp, increment, arrayUnion, arrayRemove, deleteField, Timestamp,
    type DocumentSnapshot, type QuerySnapshot
} from 'firebase/firestore';
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    type User as FirebaseUser
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';

import { db, auth, storage } from './firebaseConfig';
import { User, Post, Comment, Message, ReplyInfo, Story, Group, Campaign, LiveAudioRoom, LiveVideoRoom, Report, Notification, Lead, Author, AdminUser, FriendshipStatus, ChatSettings, Conversation, Call, LiveAudioRoomMessage, LiveVideoRoomMessage, VideoParticipantState } from '../types';
import { DEFAULT_AVATARS, DEFAULT_COVER_PHOTOS, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, SPONSOR_CPM_BDT } from '../constants';


// --- Helper Functions ---
const removeUndefined = (obj: any) => {
  if (!obj) return {};
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
};

const docToUser = (doc: DocumentSnapshot): User => {
    const data = doc.data();
    const user = {
        id: doc.id,
        ...data,
    } as User;
    
    // Convert Firestore Timestamps to ISO strings
    if (user.createdAt && user.createdAt instanceof Timestamp) {
        user.createdAt = user.createdAt.toDate().toISOString();
    }
    if (user.commentingSuspendedUntil && user.commentingSuspendedUntil instanceof Timestamp) {
        user.commentingSuspendedUntil = user.commentingSuspendedUntil.toDate().toISOString();
    }
     if (user.lastActiveTimestamp && user.lastActiveTimestamp instanceof Timestamp) {
        user.lastActiveTimestamp = user.lastActiveTimestamp.toDate().toISOString();
    }
    
    return user;
}

const docToPost = (doc: DocumentSnapshot): Post => {
    const data = doc.data() || {};
    return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        reactions: data.reactions || {},
        comments: (data.comments || []).map((c: any) => ({
            ...c,
            createdAt: c.createdAt instanceof Timestamp ? c.createdAt.toDate().toISOString() : new Date().toISOString(),
        })),
        commentCount: data.commentCount || 0,
    } as Post;
}

// --- New Cloudinary Upload Helper ---
const uploadMediaToCloudinary = async (file: File | Blob, fileName: string): Promise<{ url: string, type: 'image' | 'video' | 'raw' }> => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    let resourceType = 'auto';
    if (file.type.startsWith('video')) resourceType = 'video';
    else if (file.type.startsWith('image')) resourceType = 'image';
    else if (file.type.startsWith('audio')) resourceType = 'video'; // Cloudinary treats audio as video for transformations/delivery
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary upload error:', errorData);
        throw new Error('Failed to upload media to Cloudinary');
    }

    const data = await response.json();
    return { url: data.secure_url, type: data.resource_type };
};

// --- Ad Targeting Helper ---
const matchesTargeting = (campaign: Campaign, user: User): boolean => {
    if (!campaign.targeting) return true; // No targeting set, matches everyone
    const { location, gender, ageRange, interests } = campaign.targeting;

    // Location check
    if (location && user.currentCity && location.toLowerCase().trim() !== user.currentCity.toLowerCase().trim()) {
        return false;
    }

    // Gender check
    if (gender && gender !== 'All' && user.gender && gender !== user.gender) {
        return false;
    }

    // Age range check
    if (ageRange && user.age) {
        const [min, max] = ageRange.split('-').map(part => parseInt(part, 10));
        if (user.age < min || user.age > max) {
            return false;
        }
    }

    // Interests check (simple bio check)
    if (interests && interests.length > 0 && user.bio) {
        const userBioLower = user.bio.toLowerCase();
        const hasMatchingInterest = interests.some(interest => userBioLower.includes(interest.toLowerCase()));
        if (!hasMatchingInterest) {
            return false;
        }
    }

    return true;
};

// --- Service Definition ---
export const firebaseService = {
    // --- Authentication ---
    onAuthStateChanged: (callback: (userAuth: { id: string } | null) => void) => {
        return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                callback({ id: firebaseUser.uid });
            } else {
                callback(null);
            }
        });
    },

    listenToCurrentUser(userId: string, callback: (user: User | null) => void) {
        const userRef = doc(db, 'users', userId);
        return onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                callback(docToUser(doc));
            } else {
                callback(null);
            }
        });
    },

    async signUpWithEmail(email: string, pass: string, fullName: string, username: string): Promise<boolean> {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const usernameRef = doc(db, 'usernames', username.toLowerCase());

                const newUserProfile: Omit<User, 'id' | 'createdAt'> = {
                    name: fullName,
                    name_lowercase: fullName.toLowerCase(),
                    username: username.toLowerCase(),
                    email: email.toLowerCase(),
                    avatarUrl: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
                    bio: `Welcome to VoiceBook, I'm ${fullName.split(' ')[0]}!`,
                    coverPhotoUrl: DEFAULT_COVER_PHOTOS[Math.floor(Math.random() * DEFAULT_COVER_PHOTOS.length)],
                    privacySettings: { postVisibility: 'public', friendRequestPrivacy: 'everyone', friendListVisibility: 'friends' },
                    notificationSettings: { likes: true, comments: true, friendRequests: true },
                    blockedUserIds: [],
                    voiceCoins: 100,
                    friendIds: [],
                    onlineStatus: 'offline',
                    // @ts-ignore
                    createdAt: serverTimestamp(),
                    // @ts-ignore
                    lastActiveTimestamp: serverTimestamp(),
                };
                
                await setDoc(userRef, removeUndefined(newUserProfile));
                await setDoc(usernameRef, { userId: user.uid });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Sign up error:", error);
            return false;
        }
    },

    async signInWithEmail(identifier: string, pass: string): Promise<void> {
        const lowerIdentifier = identifier.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let emailToSignIn: string;

        if (emailRegex.test(lowerIdentifier)) {
            emailToSignIn = lowerIdentifier;
        } else {
            try {
                const usernameDocRef = doc(db, 'usernames', lowerIdentifier);
                const usernameDoc = await getDoc(usernameDocRef);
                if (!usernameDoc.exists()) throw new Error("Invalid details.");
                const userId = usernameDoc.data()!.userId;
                const userProfile = await this.getUserProfileById(userId);
                if (!userProfile) throw new Error("User profile not found.");
                emailToSignIn = userProfile.email;
            } catch (error: any) {
                throw new Error("Invalid details. Please check your username/email and password.");
            }
        }

        try {
            await signInWithEmailAndPassword(auth, emailToSignIn, pass);
        } catch (authError) {
            throw new Error("Invalid details. Please check your username/email and password.");
        }
    },
    
    async signOutUser(userId: string | null): Promise<void> {
        if (userId) {
            try {
                await this.updateUserOnlineStatus(userId, 'offline');
            } catch(e: any) {
                console.error("Could not set user offline before signing out, but proceeding with sign out.", e);
            }
        }
        await signOut(auth);
    },

    async updateUserOnlineStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
        if (!userId) {
            console.warn("updateUserOnlineStatus called with no userId. Aborting.");
            return;
        }
        const userRef = doc(db, 'users', userId);
        try {
            const updateData: { onlineStatus: string; lastActiveTimestamp?: any } = { onlineStatus: status };
            if (status === 'offline') {
                updateData.lastActiveTimestamp = serverTimestamp();
            }
            await updateDoc(userRef, updateData);
        } catch (error: any) {
            // This can happen if the user logs out and rules prevent writes. It's okay to ignore.
            console.log(`Could not update online status for user ${userId}:`, error.message);
        }
    },

    // --- Notifications ---
    listenToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));
        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as Notification;
            });
            callback(notifications);
        });
    },

    async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
        if (notificationIds.length === 0) return;
        const batch = writeBatch(db);
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        notificationIds.forEach(id => {
            batch.update(doc(notificationsRef, id), { read: true });
        });
        await batch.commit();
    },

    async isUsernameTaken(username: string): Promise<boolean> {
        const usernameDocRef = doc(db, 'usernames', username.toLowerCase());
        const usernameDoc = await getDoc(usernameDocRef);
        return usernameDoc.exists();
    },
    
    async getUserProfileById(uid: string): Promise<User | null> {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return docToUser(userDoc);
        }
        return null;
    },

     async getUsersByIds(userIds: string[]): Promise<User[]> {
        if (userIds.length === 0) return [];
        const usersRef = collection(db, 'users');
        const userPromises: Promise<QuerySnapshot>[] = [];
        for (let i = 0; i < userIds.length; i += 10) {
            const chunk = userIds.slice(i, i + 10);
            const q = query(usersRef, where(documentId(), 'in', chunk));
            userPromises.push(getDocs(q));
        }
        const userSnapshots = await Promise.all(userPromises);
        const users: User[] = [];
        userSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => users.push(docToUser(doc)));
        });
        return users;
    },

    // --- Friends (New Secure Flow) ---
    async getFriendRequests(userId: string): Promise<User[]> {
        const friendRequestsRef = collection(db, 'friendRequests');
        const q = query(friendRequestsRef,
            where('to.id', '==', userId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'));
        
        const snapshot = await getDocs(q);
        const requesters = snapshot.docs.map(doc => doc.data().from as User);
        return requesters;
    },

    async addFriend(currentUserId: string, targetUserId: string): Promise<{ success: boolean; reason?: string }> {
        if (!currentUserId) {
            console.error("addFriend failed: No currentUserId provided.");
            return { success: false, reason: 'not_signed_in' };
        }
        
        const sender = await this.getUserProfileById(currentUserId);
        const receiver = await this.getUserProfileById(targetUserId);

        if (!sender || !receiver) return { success: false, reason: 'user_not_found' };
        
        try {
            const requestId = `${currentUserId}_${targetUserId}`;
            const requestDocRef = doc(db, 'friendRequests', requestId);

            await setDoc(requestDocRef, {
                from: { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl, username: sender.username },
                to: { id: receiver.id, name: receiver.name, avatarUrl: receiver.avatarUrl, username: receiver.username },
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            
            return { success: true };
        } catch (error) {
            console.error("FirebaseError on addFriend:", error);
            return { success: false, reason: 'permission_denied' };
        }
    },

    async acceptFriendRequest(currentUserId: string, requestingUserId: string): Promise<void> {
        const currentUserRef = doc(db, 'users', currentUserId);
        const requestingUserRef = doc(db, 'users', requestingUserId);
        const requestDocRef = doc(db, 'friendRequests', `${requestingUserId}_${currentUserId}`);
        
        const notificationRef = doc(collection(db, 'users', requestingUserId, 'notifications')); 

        await runTransaction(db, async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            if (!requestDoc.exists() || requestDoc.data()?.status !== 'pending') {
                throw new Error("Friend request not found or already handled.");
            }
            
            const currentUserDoc = await transaction.get(currentUserRef);
            if (!currentUserDoc.exists()) {
                throw new Error("Current user profile not found.");
            }
            const currentUserData = currentUserDoc.data();

            // 1. Add each user to the other's friend list.
            transaction.update(currentUserRef, { friendIds: arrayUnion(requestingUserId) });
            transaction.update(requestingUserRef, { friendIds: arrayUnion(currentUserId) });

            // 2. Create a notification for the original sender.
            transaction.set(notificationRef, {
                type: 'friend_request_approved',
                user: { 
                    id: currentUserId, 
                    name: currentUserData.name, 
                    avatarUrl: currentUserData.avatarUrl, 
                    username: currentUserData.username 
                },
                createdAt: serverTimestamp(),
                read: false,
            });

            // 3. Delete the friend request document now that it's fulfilled.
            transaction.delete(requestDocRef);
        });
    },

    async declineFriendRequest(currentUserId: string, requestingUserId: string): Promise<void> {
        const requestDocRef = doc(db, 'friendRequests', `${requestingUserId}_${currentUserId}`);
        await deleteDoc(requestDocRef);
    },

    async unfriendUser(currentUserId: string, targetUserId: string): Promise<boolean> {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);
        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(currentUserRef, { friendIds: arrayRemove(targetUserId) });
                transaction.update(targetUserRef, { friendIds: arrayRemove(currentUserId) });
            });
            return true;
        } catch (error) {
            console.error("Error unfriending user:", error);
            return false;
        }
    },

    async cancelFriendRequest(currentUserId: string, targetUserId: string): Promise<boolean> {
        const requestDocRef = doc(db, 'friendRequests', `${currentUserId}_${targetUserId}`);
        try {
            await deleteDoc(requestDocRef);
            return true;
        } catch (error) {
            console.error("Error cancelling friend request:", error);
            return false;
        }
    },
    
    async checkFriendshipStatus(currentUserId: string, profileUserId: string): Promise<FriendshipStatus> {
        const user = await this.getUserProfileById(currentUserId);
        if (user?.friendIds?.includes(profileUserId)) {
            return FriendshipStatus.FRIENDS;
        }
        
        try {
            const sentRequestRef = doc(db, 'friendRequests', `${currentUserId}_${profileUserId}`);
            const receivedRequestRef = doc(db, 'friendRequests', `${profileUserId}_${currentUserId}`);
    
            const [sentSnap, receivedSnap] = await Promise.all([getDoc(sentRequestRef), getDoc(receivedRequestRef)]);
    
            if (sentSnap.exists()) {
                const status = sentSnap.data()?.status;
                if (status === 'accepted') return FriendshipStatus.FRIENDS;
                return FriendshipStatus.REQUEST_SENT;
            }
    
            if (receivedSnap.exists()) {
                const status = receivedSnap.data()?.status;
                if (status === 'accepted') return FriendshipStatus.FRIENDS;
                return FriendshipStatus.PENDING_APPROVAL;
            }
    
        } catch (error) {
            console.error("Error checking friendship status, likely permissions. Falling back.", error);
            return FriendshipStatus.NOT_FRIENDS;
        }
    
        return FriendshipStatus.NOT_FRIENDS;
    },

    listenToFriendRequests(userId: string, callback: (requestingUsers: User[]) => void) {
        const friendRequestsRef = collection(db, 'friendRequests');
        const q = query(friendRequestsRef,
            where('to.id', '==', userId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'));
        
        return onSnapshot(q, snapshot => {
            const requesters = snapshot.docs.map(doc => doc.data().from as User);
            callback(requesters);
        });
    },

    async getFriends(userId: string): Promise<User[]> {
        const user = await this.getUserProfileById(userId);
        if (!user || !user.friendIds || user.friendIds.length === 0) {
            return [];
        }
        return this.getUsersByIds(user.friendIds);
    },

    async getCommonFriends(userId1: string, userId2: string): Promise<User[]> {
        if (userId1 === userId2) return [];
  
        const [user1Doc, user2Doc] = await Promise.all([
            this.getUserProfileById(userId1),
            this.getUserProfileById(userId2)
        ]);
  
        if (!user1Doc || !user2Doc || !user1Doc.friendIds || !user2Doc.friendIds) {
            return [];
        }
  
        const commonFriendIds = user1Doc.friendIds.filter(id => user2Doc.friendIds.includes(id));
  
        if (commonFriendIds.length === 0) {
            return [];
        }
  
        return this.getUsersByIds(commonFriendIds);
    },

    // --- Posts ---
    listenToFeedPosts(currentUserId: string, friendIds: string[], blockedUserIds: string[], callback: (posts: Post[]) => void) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
        return onSnapshot(q, async (snapshot) => {
            const feedPosts = snapshot.docs.map(docToPost);
    
            const filtered = feedPosts.filter(p => {
                if (!p.author || !p.author.id) return false;
                if (blockedUserIds.includes(p.author.id)) return false;
                if (p.author.id === currentUserId) return true;
                if (p.author.privacySettings?.postVisibility === 'public') return true;
                if (friendIds.includes(p.author.id) && p.author.privacySettings?.postVisibility === 'friends') return true;
    
                return false;
            });
            callback(filtered);
        });
    },

    listenToExplorePosts(currentUserId: string, callback: (posts: Post[]) => void) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef,
            where('author.privacySettings.postVisibility', '==', 'public'),
            orderBy('createdAt', 'desc'),
            limit(50));
        return onSnapshot(q, (snapshot) => {
            const explorePosts = snapshot.docs
                .map(docToPost)
                .filter(post => post.author.id !== currentUserId && !post.isSponsored);
            callback(explorePosts);
        });
    },

    async getExplorePosts(currentUserId: string): Promise<Post[]> {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef,
            where('author.privacySettings.postVisibility', '==', 'public'),
            orderBy('createdAt', 'desc'),
            limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(docToPost)
            .filter(post => post.author.id !== currentUserId && !post.isSponsored);
    },

    listenToReelsPosts(callback: (posts: Post[]) => void) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef,
            where('videoUrl', '!=', null),
            orderBy('videoUrl'),
            orderBy('createdAt', 'desc'),
            limit(50));
        return onSnapshot(q, (snapshot) => {
            const reelsPosts = snapshot.docs.map(docToPost);
            callback(reelsPosts);
        });
    },

    listenToPost(postId: string, callback: (post: Post | null) => void): () => void {
        const postRef = doc(db, 'posts', postId);
        return onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                callback(docToPost(doc));
            } else {
                callback(null);
            }
        }, (error) => {
            console.error(`Error listening to post ${postId}:`, error);
            callback(null);
        });
    },

    async createPost(
        postData: any,
        media: {
            mediaFile?: File | null;
            audioBlobUrl?: string | null;
            generatedImageBase64?: string | null;
        }
    ) {
        const { author: user, ...restOfPostData } = postData;
        
        const authorInfo: Author = {
            id: user.id,
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
            privacySettings: user.privacySettings,
        };

        const postToSave: any = {
            ...restOfPostData,
            author: authorInfo,
            createdAt: serverTimestamp(),
            reactions: {},
            commentCount: 0,
            comments: [],
        };

        const userId = user.id;

        if (media.mediaFile) {
            const { url, type } = await uploadMediaToCloudinary(media.mediaFile, `post_${userId}_${Date.now()}`);
            if (type === 'video') {
                postToSave.videoUrl = url;
            } else {
                postToSave.imageUrl = url;
            }
        }
        
        if (media.generatedImageBase64) {
            const blob = await fetch(media.generatedImageBase64).then(res => res.blob());
            const { url } = await uploadMediaToCloudinary(blob, `post_ai_${userId}_${Date.now()}.jpeg`);
            postToSave.imageUrl = url;
        }

        if (media.audioBlobUrl) {
            const audioBlob = await fetch(media.audioBlobUrl).then(r => r.blob());
            const { url } = await uploadMediaToCloudinary(audioBlob, `post_audio_${userId}_${Date.now()}.webm`);
            postToSave.audioUrl = url;
        }

        await addDoc(collection(db, 'posts'), removeUndefined(postToSave));
    },

    async deletePost(postId: string, userId: string): Promise<boolean> {
        const postRef = doc(db, 'posts', postId);
        try {
            const postDoc = await getDoc(postRef);
            if (!postDoc.exists()) {
                throw new Error("Post not found");
            }

            const postData = postDoc.data() as Post;
            if (postData.author.id !== userId) {
                console.error("Permission denied: User is not the author of the post.");
                return false;
            }

            await deleteDoc(postRef);
            return true;

        } catch (error) {
            console.error("Error deleting post:", error);
            return false;
        }
    },
    
    async reactToPost(postId: string, userId: string, newReaction: string): Promise<boolean> {
        const postRef = doc(db, 'posts', postId);
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";
    
                const postData = postDoc.data() as Post;
                const reactions = { ...(postData.reactions || {}) };
                
                const userPreviousReaction = reactions[userId];
    
                if (userPreviousReaction === newReaction) {
                    delete reactions[userId];
                } else {
                    reactions[userId] = newReaction;
                }
                
                transaction.update(postRef, { reactions });
            });
            return true;
        } catch (e) {
            console.error("Reaction transaction failed:", e);
            return false;
        }
    },

    async reactToComment(postId: string, commentId: string, userId: string, newReaction: string): Promise<boolean> {
        const postRef = doc(db, 'posts', postId);
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";
    
                const postData = postDoc.data() as Post;
                const comments = postData.comments || [];
                const commentIndex = comments.findIndex(c => c.id === commentId);
    
                if (commentIndex === -1) throw "Comment not found!";
    
                const comment = comments[commentIndex];
                const reactions = { ...(comment.reactions || {}) };
                const userPreviousReaction = reactions[userId];
    
                if (userPreviousReaction === newReaction) {
                    delete reactions[userId];
                } else {
                    reactions[userId] = newReaction;
                }
                
                comments[commentIndex].reactions = reactions;
    
                transaction.update(postRef, { comments });
            });
            return true;
        } catch (e) {
            console.error("React to comment transaction failed:", e);
            return false;
        }
    },
    
    async createComment(user: User, postId: string, data: { text?: string; imageFile?: File; audioBlob?: Blob; duration?: number; parentId?: string | null }): Promise<Comment | null> {
        if (user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
            console.warn(`User ${user.id} is suspended from commenting.`);
            return null;
        }
    
        const postRef = doc(db, 'posts', postId);
    
        const newComment: any = {
            id: doc(collection(db, 'posts')).id, // Generate a unique ID client-side
            postId,
            author: {
                id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl,
            },
            createdAt: Timestamp.now(),
            reactions: {},
            parentId: data.parentId || null,
        };
    
        if (data.audioBlob && data.duration) {
            newComment.type = 'audio';
            newComment.duration = data.duration;
            const { url } = await uploadMediaToCloudinary(data.audioBlob, `comment_audio_${newComment.id}.webm`);
            newComment.audioUrl = url;
        } else if (data.imageFile) {
            newComment.type = 'image';
            const { url } = await uploadMediaToCloudinary(data.imageFile, `comment_image_${newComment.id}.jpeg`);
            newComment.imageUrl = url;
        } else if (data.text) {
            newComment.type = 'text';
            newComment.text = data.text;
        } else {
            throw new Error("Comment must have content.");
        }
        
        await updateDoc(postRef, {
            comments: arrayUnion(removeUndefined(newComment)),
            commentCount: increment(1),
        });
        
        return {
            ...removeUndefined(newComment),
            createdAt: new Date().toISOString()
        } as Comment;
    },

    async editComment(postId: string, commentId: string, newText: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";
    
                const postData = postDoc.data() as Post;
                const comments = [...postData.comments] || [];
                const commentIndex = comments.findIndex(c => c.id === commentId);
    
                if (commentIndex === -1) throw "Comment not found!";
    
                comments[commentIndex].text = newText;
                comments[commentIndex].updatedAt = new Date().toISOString();
    
                transaction.update(postRef, { comments });
            });
        } catch (e) {
            console.error("Edit comment transaction failed:", e);
        }
    },

    async deleteComment(postId: string, commentId: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";
    
                const postData = postDoc.data() as Post;
                const comments = [...postData.comments] || [];
                const commentIndex = comments.findIndex(c => c.id === commentId);

                if (commentIndex === -1) return;

                comments[commentIndex].isDeleted = true;
                comments[commentIndex].text = undefined;
                comments[commentIndex].audioUrl = undefined;
                comments[commentIndex].imageUrl = undefined;
                comments[commentIndex].reactions = {};

                transaction.update(postRef, { comments });
            });
        } catch (e) {
            console.error("Delete comment transaction failed:", e);
        }
    },

    async voteOnPoll(userId: string, postId: string, optionIndex: number): Promise<Post | null> {
        const postRef = doc(db, 'posts', postId);
        try {
            let updatedPostData: Post | null = null;
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }
    
                const postData = postDoc.data() as Post;
                if (!postData.poll) {
                    throw "This post does not have a poll.";
                }
    
                const hasVoted = postData.poll.options.some(opt => opt.votedBy.includes(userId));
                if (hasVoted) {
                    updatedPostData = docToPost(postDoc);
                    return;
                }
    
                if (optionIndex < 0 || optionIndex >= postData.poll.options.length) {
                    throw "Invalid poll option index.";
                }
    
                const updatedOptions = postData.poll.options.map((option, index) => {
                    if (index === optionIndex) {
                        return {
                            ...option,
                            votes: option.votes + 1,
                            votedBy: [...option.votedBy, userId],
                        };
                    }
                    return option;
                });
    
                const updatedPoll = { ...postData.poll, options: updatedOptions };
                transaction.update(postRef, { poll: updatedPoll });
                
                updatedPostData = { ...docToPost(postDoc), poll: updatedPoll };
            });
            return updatedPostData;
        } catch (e) {
            console.error("Vote on poll transaction failed:", e);
            return null;
        }
    },

    async markBestAnswer(userId: string, postId: string, commentId: string): Promise<Post | null> {
        const postRef = doc(db, 'posts', postId);
        try {
            const postDoc = await getDoc(postRef);
            if (!postDoc.exists()) {
                throw "Post does not exist!";
            }
            const postData = postDoc.data() as Post;
    
            if (postData.author.id !== userId) {
                console.error("Permission denied. User is not the author.");
                return null;
            }
            
            const commentExists = postData.comments.some(c => c.id === commentId);
            if (!commentExists) {
                 throw "Comment does not exist on this post.";
            }
    
            await updateDoc(postRef, { bestAnswerId: commentId });
            
            const updatedPostDoc = await getDoc(postRef);
            return docToPost(updatedPostDoc);
        } catch (e) {
            console.error("Marking best answer failed:", e);
            return null;
        }
    },

    // --- Messages ---
    getChatId: (user1Id: string, user2Id: string): string => {
        return [user1Id, user2Id].sort().join('_');
    },

    async ensureChatDocumentExists(user1: User, user2: User): Promise<string> {
        const chatId = firebaseService.getChatId(user1.id, user2.id);
        const chatRef = doc(db, 'chats', chatId);
    
        let enrichedUser1 = { ...user1 };
        let enrichedUser2 = { ...user2 };
    
        try {
            if (!enrichedUser1.username) {
                console.warn(`Incomplete current user object (ID: ${enrichedUser1.id}). Fetching full profile.`);
                const fullProfile = await this.getUserProfileById(enrichedUser1.id);
                if (fullProfile) enrichedUser1 = fullProfile;
            }
            if (!enrichedUser2.username) {
                console.warn(`Incomplete peer user object (ID: ${enrichedUser2.id}). Fetching full profile.`);
                const fullProfile = await this.getUserProfileById(enrichedUser2.id);
                if (fullProfile) enrichedUser2 = fullProfile;
            }
            
            if (!enrichedUser1.username || !enrichedUser2.username) {
                throw new Error(`Could not resolve a username for one of the chat participants (${enrichedUser1.id}, ${enrichedUser2.id}). This may be a data consistency issue.`);
            }
            
            await setDoc(chatRef, {
                participants: [enrichedUser1.id, enrichedUser2.id],
                participantInfo: {
                    [enrichedUser1.id]: { name: enrichedUser1.name, username: enrichedUser1.username, avatarUrl: enrichedUser1.avatarUrl },
                    [enrichedUser2.id]: { name: enrichedUser2.name, username: enrichedUser2.username, avatarUrl: enrichedUser2.avatarUrl }
                },
                lastUpdated: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error ensuring chat document exists:", error);
            throw error;
        }
        return chatId;
    },

    listenToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        return onSnapshot(q, snapshot => {
            const messages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                } as Message;
            });
            callback(messages);
        });
    },

    listenToConversations(userId: string, callback: (convos: Conversation[]) => void): () => void {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', userId), orderBy('lastUpdated', 'desc'));

        return onSnapshot(q, async (snapshot) => {
            const conversations: Conversation[] = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const peerId = data.participants.find((pId: string) => pId !== userId);
                if (!peerId) continue;

                const peerInfo = data.participantInfo[peerId];
                if (!peerInfo) continue;

                const peerUser: User = {
                    id: peerId,
                    name: peerInfo.name,
                    avatarUrl: peerInfo.avatarUrl,
                    username: peerInfo.username,
                } as User;
                
                const lastMessageData = data.lastMessage;
                if (!lastMessageData) continue;
                
                conversations.push({
                    peer: peerUser,
                    lastMessage: {
                        ...lastMessageData,
                        createdAt: lastMessageData.createdAt instanceof Timestamp ? lastMessageData.createdAt.toDate().toISOString() : lastMessageData.createdAt,
                    },
                    unreadCount: data.unreadCount?.[userId] || 0,
                });
            }
            callback(conversations);
        });
    },

    async sendMessage(chatId: string, sender: User, recipient: User, messageContent: any): Promise<void> {
        const chatRef = doc(db, 'chats', chatId);
        const messagesRef = collection(chatRef, 'messages');
        
        const newMessage: Omit<Message, 'id' | 'createdAt'> = {
            senderId: sender.id,
            recipientId: recipient.id,
            type: messageContent.type,
            read: false,
        };

        if (messageContent.text) newMessage.text = messageContent.text;
        if (messageContent.duration) newMessage.duration = messageContent.duration;
        if (messageContent.replyTo) newMessage.replyTo = messageContent.replyTo;
        if (messageContent.mediaUrl) newMessage.mediaUrl = messageContent.mediaUrl; // Added for animated emojis

        if (messageContent.mediaFile) {
            const { url } = await uploadMediaToCloudinary(messageContent.mediaFile, `chat_${chatId}_${Date.now()}`);
            newMessage.mediaUrl = url;
            if(messageContent.type === 'video') {
                newMessage.type = 'video';
            } else {
                newMessage.type = 'image';
            }
        } else if (messageContent.audioBlob) {
            const { url } = await uploadMediaToCloudinary(messageContent.audioBlob, `chat_audio_${chatId}_${Date.now()}.webm`);
            newMessage.audioUrl = url;
            newMessage.type = 'audio';
        }

        const messageWithTimestamp = {
            ...newMessage,
            createdAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(messagesRef, removeUndefined(messageWithTimestamp));

        const lastMessageForDoc = removeUndefined({
            ...newMessage,
            id: docRef.id,
            createdAt: new Date().toISOString()
        });

        await setDoc(chatRef, {
            participants: [sender.id, recipient.id],
            participantInfo: {
                [sender.id]: { name: sender.name, username: sender.username, avatarUrl: sender.avatarUrl },
                [recipient.id]: { name: recipient.name, username: recipient.username, avatarUrl: recipient.avatarUrl }
            },
            lastMessage: lastMessageForDoc,
            lastUpdated: serverTimestamp(),
            [`unreadCount.${recipient.id}`]: increment(1)
        }, { merge: true });
    },

    async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            unreadCount: {
                [userId]: 0
            }
        }, { merge: true });
    },

    async unsendMessage(chatId: string, messageId: string, userId: string): Promise<void> {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
        const messageDoc = await getDoc(messageRef);
        if (messageDoc.exists() && messageDoc.data()?.senderId === userId) {
            await updateDoc(messageRef, {
                isDeleted: true,
                text: deleteField(),
                mediaUrl: deleteField(),
                audioUrl: deleteField(),
                reactions: {}
            });
            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            if(chatDoc.exists() && chatDoc.data().lastMessage.id === messageId) {
                await updateDoc(chatRef, {
                    'lastMessage.isDeleted': true,
                    'lastMessage.text': deleteField(),
                    'lastMessage.mediaUrl': deleteField(),
                    'lastMessage.audioUrl': deleteField(),
                });
            }
        }
    },

    async reactToMessage(chatId: string, messageId: string, userId: string, emoji: string): Promise<void> {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) throw "Message not found";

            const reactions = messageDoc.data()?.reactions || {};
            const previousReaction = Object.keys(reactions).find(key => reactions[key].includes(userId));

            if (previousReaction) {
                reactions[previousReaction] = reactions[previousReaction].filter((id: string) => id !== userId);
            }

            if (previousReaction !== emoji) {
                if (!reactions[emoji]) {
                    reactions[emoji] = [];
                }
                reactions[emoji].push(userId);
            }
            
            for (const key in reactions) {
                if (reactions[key].length === 0) {
                    delete reactions[key];
                }
            }
            
            transaction.update(messageRef, { reactions });
        });
    },

    async deleteChatHistory(chatId: string): Promise<void> {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, limit(500));
        const snapshot = await getDocs(q); 
        if (snapshot.size === 0) {
            await deleteDoc(doc(db, 'chats', chatId));
            return;
        }
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return this.deleteChatHistory(chatId);
    },

    async getChatSettings(chatId: string): Promise<ChatSettings | null> {
        const docRef = doc(db, 'chatSettings', chatId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as ChatSettings : null;
    },

    listenToChatSettings(chatId: string, callback: (settings: ChatSettings | null) => void): () => void {
        const settingsRef = doc(db, 'chatSettings', chatId);
        return onSnapshot(settingsRef, doc => {
            const settings = doc.exists() ? (doc.data() as ChatSettings) : { theme: 'default' };
            callback(settings);
        });
    },

    async updateChatSettings(chatId: string, settings: Partial<ChatSettings>): Promise<void> {
        const settingsRef = doc(db, 'chatSettings', chatId);
        await setDoc(settingsRef, removeUndefined(settings), { merge: true });
    },
    // --- Profile & Security ---
    async getUserProfile(username: string): Promise<User | null> {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username.toLowerCase()), limit(1));
        const userQuery = await getDocs(q);
        if (!userQuery.empty) {
            return docToUser(userQuery.docs[0]);
        }
        return null;
    },

    listenToUserProfile(username: string, callback: (user: User | null) => void) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username.toLowerCase()), limit(1));
        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                callback(docToUser(snapshot.docs[0]));
            } else {
                callback(null);
            }
        },
        (error) => {
            console.error("Error listening to user profile by username:", error);
            callback(null);
        });
    },

    async getPostsByUser(userId: string): Promise<Post[]> {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('author.id', '==', userId), orderBy('createdAt', 'desc'));
        const postQuery = await getDocs(q);
        return postQuery.docs.map(docToPost);
    },
    
    async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
        const userRef = doc(db, 'users', userId);
        const updatesToSave = { ...updates };
    
        if (updates.name) {
            updatesToSave.name_lowercase = updates.name.toLowerCase();
        }
    
        try {
            await updateDoc(userRef, removeUndefined(updatesToSave));
        } catch (error) {
            console.error("Error updating user profile in Firebase:", error);
            throw error;
        }
    },

    async updateProfilePicture(userId: string, base64Url: string, caption?: string, captionStyle?: Post['captionStyle']): Promise<{ updatedUser: User; newPost: Post } | null> {
        const userRef = doc(db, 'users', userId);
        try {
            const blob = await fetch(base64Url).then(res => res.blob());
            const { url: newAvatarUrl } = await uploadMediaToCloudinary(blob, `avatar_${userId}_${Date.now()}.jpeg`);

            await updateDoc(userRef, { avatarUrl: newAvatarUrl });

            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return null;
            const user = docToUser(userDoc);

            const authorInfo: Author = {
                id: user.id,
                name: user.name,
                username: user.username,
                avatarUrl: newAvatarUrl,
                privacySettings: user.privacySettings,
            };

            const newPostData = {
                author: authorInfo,
                caption: caption || `${user.name.split(' ')[0]} updated their profile picture.`,
                captionStyle: captionStyle,
                createdAt: serverTimestamp(),
                postType: 'profile_picture_change',
                newPhotoUrl: newAvatarUrl,
                reactions: {},
                commentCount: 0,
                comments: [],
                duration: 0,
            };

            const postRef = await addDoc(collection(db, 'posts'), removeUndefined(newPostData));
            const newPostDoc = await getDoc(postRef);
            const newPost = docToPost(newPostDoc);

            const updatedUser = { ...user, avatarUrl: newAvatarUrl };
            return { updatedUser, newPost };

        } catch (error) {
            console.error("Error updating profile picture:", error);
            return null;
        }
    },

    async updateCoverPhoto(userId: string, base64Url: string, caption?: string, captionStyle?: Post['captionStyle']): Promise<{ updatedUser: User; newPost: Post } | null> {
        const userRef = doc(db, 'users', userId);
        try {
            const blob = await fetch(base64Url).then(res => res.blob());
            const { url: newCoverUrl } = await uploadMediaToCloudinary(blob, `cover_${userId}_${Date.now()}.jpeg`);

            await updateDoc(userRef, { coverPhotoUrl: newCoverUrl });

            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return null;
            const user = docToUser(userDoc);

            const authorInfo: Author = {
                id: user.id,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatarUrl,
                privacySettings: user.privacySettings,
            };

            const newPostData = {
                author: authorInfo,
                caption: caption || `${user.name.split(' ')[0]} updated their cover photo.`,
                captionStyle: captionStyle,
                createdAt: serverTimestamp(),
                postType: 'cover_photo_change',
                newPhotoUrl: newCoverUrl,
                reactions: {},
                commentCount: 0,
                comments: [],
                duration: 0,
            };

            const postRef = await addDoc(collection(db, 'posts'), removeUndefined(newPostData));
            const newPostDoc = await getDoc(postRef);
            const newPost = docToPost(newPostDoc);

            const updatedUser = { ...user, coverPhotoUrl: newCoverUrl };
            return { updatedUser, newPost };

        } catch (error) {
            console.error("Error updating cover photo:", error);
            return null;
        }
    },
    
     async searchUsers(query: string): Promise<User[]> {
        const lowerQuery = query.toLowerCase();
        const usersRef = collection(db, 'users');
        const nameQuery = query(usersRef, where('name_lowercase', '>=', lowerQuery), where('name_lowercase', '<=', lowerQuery + '\uf8ff'));
        const usernameQuery = query(usersRef, where('username', '>=', lowerQuery), where('username', '<=', lowerQuery + '\uf8ff'));
        
        const [nameSnapshot, usernameSnapshot] = await Promise.all([getDocs(nameQuery), getDocs(usernameQuery)]);
        
        const results = new Map<string, User>();
        nameSnapshot.docs.forEach(d => results.set(d.id, docToUser(d)));
        usernameSnapshot.docs.forEach(d => results.set(d.id, docToUser(d)));
        
        return Array.from(results.values());
    },

    async blockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);
        try {
            const batch = writeBatch(db);
            batch.update(currentUserRef, { blockedUserIds: arrayUnion(targetUserId) });
            batch.update(targetUserRef, { blockedUserIds: arrayUnion(currentUserId) });
            await batch.commit();
            return true;
        } catch (error) {
            console.error("Failed to block user:", error);
            return false;
        }
    },

    async unblockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);
        try {
            const batch = writeBatch(db);
            batch.update(currentUserRef, { blockedUserIds: arrayRemove(targetUserId) });
            batch.update(targetUserRef, { blockedUserIds: arrayRemove(currentUserId) });
            await batch.commit();
            return true;
        } catch (error) {
            console.error("Failed to unblock user:", error);
            return false;
        }
    },

    async deactivateAccount(userId: string): Promise<boolean> {
        const userRef = doc(db, 'users', userId);
        try {
            await updateDoc(userRef, { isDeactivated: true });
            return true;
        } catch (error) {
            console.error("Failed to deactivate account:", error);
            return false;
        }
    },

    // --- Voice Coins ---
    async updateVoiceCoins(userId: string, amount: number): Promise<boolean> {
        const userRef = doc(db, 'users', userId);
        try {
            await updateDoc(userRef, {
                voiceCoins: increment(amount)
            });
            return true;
        } catch (e) {
            console.error("Failed to update voice coins:", e);
            return false;
        }
    },
    
    // --- 1-on-1 Calls ---
    async createCall(caller: User, callee: User, chatId: string, type: 'audio' | 'video'): Promise<string> {
        const callRef = doc(collection(db, 'calls'));
        const callData: Omit<Call, 'id'> = {
            caller: { id: caller.id, name: caller.name, username: caller.username, avatarUrl: caller.avatarUrl },
            callee: { id: callee.id, name: callee.name, username: callee.username, avatarUrl: callee.avatarUrl },
            chatId,
            type,
            status: 'ringing',
            createdAt: new Date().toISOString(),
        };
        await setDoc(callRef, callData);
        return callRef.id;
    },

    listenForIncomingCalls(userId: string, callback: (call: Call | null) => void): () => void {
        const callsRef = collection(db, 'calls');
        const q = query(callsRef,
            where('callee.id', '==', userId),
            where('status', '==', 'ringing'),
            limit(1));

        return onSnapshot(q, snapshot => {
            if (snapshot.empty) {
                callback(null);
                return;
            }
            const doc = snapshot.docs[0];
            const data = doc.data();
            const call: Call = {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            } as Call;
            callback(call);
        });
    },

    listenToCall(callId: string, callback: (call: Call | null) => void): () => void {
        const callRef = doc(db, 'calls', callId);
        return onSnapshot(callRef, doc => {
            if (doc.exists()) {
                const data = doc.data();
                 const call: Call = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                    endedAt: data.endedAt instanceof Timestamp ? data.endedAt.toDate().toISOString() : data.endedAt,
                } as Call;
                callback(call);
            } else {
                callback(null);
            }
        });
    },

    async updateCallStatus(callId: string, status: Call['status']): Promise<void> {
        const callRef = doc(db, 'calls', callId);
        const updateData: { status: Call['status'], endedAt?: any } = { status };

        const callDocBeforeUpdate = await getDoc(callRef);
        const callDataBeforeUpdate = callDocBeforeUpdate.data() as Call;

        if (['ended', 'rejected', 'missed', 'declined'].includes(status)) {
            updateData.endedAt = serverTimestamp();
        }
        await updateDoc(callRef, updateData);

        if (['ended', 'rejected', 'missed', 'declined'].includes(status) && callDataBeforeUpdate) {
            let durationInSeconds = 0;
            if (callDataBeforeUpdate.status === 'active' && status === 'ended') {
                const start = new Date(callDataBeforeUpdate.createdAt);
                const end = new Date();
                durationInSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
            }

            const historyMessage = {
                senderId: callDataBeforeUpdate.caller.id,
                recipientId: callDataBeforeUpdate.callee.id,
                type: 'call_history',
                read: false,
                createdAt: serverTimestamp(),
                callType: callDataBeforeUpdate.type,
                callStatus: status,
                callDuration: durationInSeconds > 0 ? durationInSeconds : undefined,
            };

            const chatId = callDataBeforeUpdate.chatId;
            const chatRef = doc(db, 'chats', chatId);
            const messagesRef = collection(chatRef, 'messages');
            
            const messageDocRef = await addDoc(messagesRef, historyMessage);
            const lastMessageForDoc = removeUndefined({ ...historyMessage, id: messageDocRef.id, createdAt: new Date().toISOString() });
            
            await updateDoc(chatRef, {
                lastMessage: lastMessageForDoc,
                lastUpdated: serverTimestamp()
            });

            setTimeout(() => {
                deleteDoc(callRef).catch(e => console.error("Failed to clean up call document:", e));
            }, 5000);
        }
    },

    // --- Rooms ---
listenToLiveAudioRooms(callback: (rooms: LiveAudioRoom[]) => void) {
    const q = query(collection(db, 'liveAudioRooms'), where('status', '==', 'live'));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as LiveAudioRoom;
        });
        callback(rooms);
    });
},
listenToLiveAudioRoomMessages(roomId: string, callback: (messages: LiveAudioRoomMessage[]) => void) {
    const q = query(collection(db, 'liveAudioRooms', roomId, 'messages'), orderBy('createdAt', 'asc'), limit(50));
    return onSnapshot(q, snapshot => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as LiveAudioRoomMessage;
        });
        callback(messages);
    });
},
async reactToLiveAudioRoomMessage(roomId: string, messageId: string, userId: string, emoji: string): Promise<void> {
    const messageRef = doc(db, 'liveAudioRooms', roomId, 'messages', messageId);
    try {
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) throw "Message does not exist!";

            const messageData = messageDoc.data();
            const reactions = { ...(messageData.reactions || {}) };

            let previousReaction: string | null = null;
            for (const key in reactions) {
                if (reactions[key].includes(userId)) {
                    previousReaction = key;
                    break;
                }
            }

            if (previousReaction === emoji) {
                reactions[previousReaction] = reactions[previousReaction].filter((id: string) => id !== userId);
                if (reactions[previousReaction].length === 0) delete reactions[previousReaction];
            } else {
                if (previousReaction) {
                    reactions[previousReaction] = reactions[previousReaction].filter((id: string) => id !== userId);
                     if (reactions[previousReaction].length === 0) delete reactions[previousReaction];
                }
                if (!reactions[emoji]) reactions[emoji] = [];
                reactions[emoji].push(userId);
            }

            transaction.update(messageRef, { reactions });
        });
    } catch (e) {
        console.error("React to live room message transaction failed:", e);
    }
},
async sendLiveAudioRoomMessage(roomId: string, sender: User, text: string, isHost: boolean, isSpeaker: boolean): Promise<void> {
    const messageData = {
        sender: { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl },
        text, isHost, isSpeaker, createdAt: serverTimestamp(), reactions: {},
    };
    await addDoc(collection(db, 'liveAudioRooms', roomId, 'messages'), messageData);
},
listenToLiveVideoRooms(callback: (rooms: LiveVideoRoom[]) => void) {
    const q = query(collection(db, 'liveVideoRooms'), where('status', '==', 'live'));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as LiveVideoRoom;
        });
        callback(rooms);
    });
},
listenToLiveVideoRoomMessages(roomId: string, callback: (messages: LiveVideoRoomMessage[]) => void) {
    const q = query(collection(db, 'liveVideoRooms', roomId, 'messages'), orderBy('createdAt', 'asc'), limit(50));
    return onSnapshot(q, snapshot => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as LiveVideoRoomMessage;
        });
        callback(messages);
    });
},
async sendLiveVideoRoomMessage(roomId: string, sender: User, text: string): Promise<void> {
    const messageData = {
        sender: { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl },
        text, createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'liveVideoRooms', roomId, 'messages'), messageData);
},
listenToRoom(roomId: string, type: 'audio' | 'video', callback: (room: LiveAudioRoom | LiveVideoRoom | null) => void) {
    const collectionName = type === 'audio' ? 'liveAudioRooms' : 'liveVideoRooms';
    return onSnapshot(doc(db, collectionName, roomId), (d) => {
        if (d.exists()) {
            const data = d.data();
            const roomData = {
                id: d.id, ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            };
            callback(roomData as LiveAudioRoom | LiveVideoRoom);
        } else {
            callback(null);
        }
    });
},
async createLiveAudioRoom(host: User, topic: string): Promise<LiveAudioRoom> {
    const newRoomData = {
        host: { id: host.id, name: host.name, username: host.username, avatarUrl: host.avatarUrl },
        topic,
        speakers: [{ id: host.id, name: host.name, username: host.username, avatarUrl: host.avatarUrl }],
        listeners: [], raisedHands: [], createdAt: serverTimestamp(), status: 'live',
    };
    const docRef = await addDoc(collection(db, 'liveAudioRooms'), newRoomData);
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    return {
        id: docSnap.id, ...data,
        createdAt: data.createdAt.toDate().toISOString(),
    } as LiveAudioRoom;
},
async createLiveVideoRoom(host: User, topic: string): Promise<LiveVideoRoom> {
    const hostAsParticipant: VideoParticipantState = {
        id: host.id,
        name: host.name,
        username: host.username,
        avatarUrl: host.avatarUrl,
        isMuted: false,
        isCameraOff: false,
    };
    const newRoomData = {
        host: { id: host.id, name: host.name, username: host.username, avatarUrl: host.avatarUrl },
        topic, participants: [hostAsParticipant], createdAt: serverTimestamp(), status: 'live',
    };
    const docRef = await addDoc(collection(db, 'liveVideoRooms'), newRoomData);
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    return {
        id: docSnap.id, ...data,
        createdAt: data.createdAt.toDate().toISOString(),
    } as LiveVideoRoom;
},
async joinLiveAudioRoom(userId: string, roomId: string): Promise<void> {
    const user = await this.getUserProfileById(userId);
    if (!user) return;
    const roomRef = doc(db, 'liveAudioRooms', roomId);
    await updateDoc(roomRef, {
        listeners: arrayUnion({ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }),
    });
},
async joinLiveVideoRoom(userId: string, roomId: string): Promise<void> {
    const user = await this.getUserProfileById(userId);
    if (!user) return;
    const roomRef = doc(db, 'liveVideoRooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw "Room does not exist!";
        
        const roomData = roomDoc.data() as LiveVideoRoom;
        const participants = roomData.participants || [];
        const isAlreadyParticipant = participants.some(p => p.id === userId);

        if (!isAlreadyParticipant) {
            const participantData: VideoParticipantState = {
                id: user.id, name: user.name, username: user.username,
                avatarUrl: user.avatarUrl, isMuted: false, isCameraOff: false,
            };
            const updatedParticipants = [...participants, participantData];
            transaction.update(roomRef, { participants: updatedParticipants });
        }
    });
},
async leaveLiveAudioRoom(userId: string, roomId: string): Promise<void> {
    const user = await this.getUserProfileById(userId);
    if (!user) return;
    const roomRef = doc(db, 'liveAudioRooms', roomId);
    await updateDoc(roomRef, {
        listeners: arrayRemove({ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }),
        speakers: arrayRemove({ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }),
        raisedHands: arrayRemove(userId)
    });
},
async leaveLiveVideoRoom(userId: string, roomId: string): Promise<void> {
    const roomRef = doc(db, 'liveVideoRooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if(roomDoc.exists()) {
            const participants = roomDoc.data().participants || [];
            const updatedParticipants = participants.filter((p: VideoParticipantState) => p.id !== userId);
            transaction.update(roomRef, { participants: updatedParticipants });
        }
    });
},
async endLiveAudioRoom(userId: string, roomId: string): Promise<void> {
    const roomRef = doc(db, 'liveAudioRooms', roomId);
    const roomDoc = await getDoc(roomRef);
    if (roomDoc.exists() && roomDoc.data().host.id === userId) {
        await updateDoc(roomRef, { status: 'ended' });
    }
},
async endLiveVideoRoom(userId: string, roomId: string): Promise<void> {
    const roomRef = doc(db, 'liveVideoRooms', roomId);
    const roomDoc = await getDoc(roomRef);
    if (roomDoc.exists() && roomDoc.data().host.id === userId) {
        await updateDoc(roomRef, { status: 'ended' });
    }
},
async getAudioRoomDetails(roomId: string): Promise<LiveAudioRoom | null> {
    const docSnap = await getDoc(doc(db, 'liveAudioRooms', roomId));
    if (docSnap.exists()) {
        const data = docSnap.data();
        return { id: docSnap.id, ...data, createdAt: data.createdAt.toDate().toISOString() } as LiveAudioRoom;
    }
    return null;
},
async getRoomDetails(roomId: string, type: 'audio' | 'video'): Promise<LiveAudioRoom | LiveVideoRoom | null> {
    const collectionName = type === 'audio' ? 'liveAudioRooms' : 'liveVideoRooms';
    const docSnap = await getDoc(doc(db, collectionName, roomId));
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id, ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        } as LiveAudioRoom | LiveVideoRoom;
    }
    return null;
},
async raiseHandInAudioRoom(userId: string, roomId: string): Promise<void> {
    await updateDoc(doc(db, 'liveAudioRooms', roomId), { raisedHands: arrayUnion(userId) });
},
async inviteToSpeakInAudioRoom(hostId: string, userId: string, roomId: string): Promise<void> {
    const roomRef = doc(db, 'liveAudioRooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (roomDoc.exists() && roomDoc.data().host.id === hostId) {
            const listener = roomDoc.data().listeners.find((l: User) => l.id === userId);
            if (listener) {
                transaction.update(roomRef, {
                    listeners: arrayRemove(listener),
                    speakers: arrayUnion(listener),
                    raisedHands: arrayRemove(userId),
                });
            }
        }
    });
},
async moveToAudienceInAudioRoom(hostId: string, userId: string, roomId: string): Promise<void> {
    const roomRef = doc(db, 'liveAudioRooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (roomDoc.exists() && roomDoc.data().host.id === hostId) {
            const speaker = roomDoc.data().speakers.find((s: User) => s.id === userId);
            if (speaker && speaker.id !== hostId) {
                transaction.update(roomRef, {
                    speakers: arrayRemove(speaker),
                    listeners: arrayUnion(speaker),
                });
            }
        }
    });
},

    async updateParticipantStateInVideoRoom(roomId: string, userId: string, updates: Partial<VideoParticipantState>): Promise<void> {
        const roomRef = doc(db, 'liveVideoRooms', roomId);
        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw "Room not found";

                const roomData = roomDoc.data() as LiveVideoRoom;
                const participants = roomData.participants || [];
                const participantIndex = participants.findIndex(p => p.id === userId);

                if (participantIndex > -1) {
                    const existingParticipant = participants[participantIndex];
                    const updatedParticipant: VideoParticipantState = {
                        ...existingParticipant,
                        ...updates,
                    };
                    participants[participantIndex] = updatedParticipant;
                    transaction.update(roomRef, { participants });
                }
            });
        } catch (error) {
            console.error("Failed to update participant state:", error);
        }
    },

    // --- Campaigns, Stories, Groups, Admin, etc. ---
    async getCampaignsForSponsor(sponsorId: string): Promise<Campaign[]> {
        const q = query(collection(db, 'campaigns'), where('sponsorId', '==', sponsorId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Campaign));
    },
    async submitCampaignForApproval(campaignData: Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'>, transactionId: string): Promise<void> {
        const campaignToSave: Omit<Campaign, 'id'> = {
            ...campaignData, views: 0, clicks: 0, status: 'pending', transactionId,
        };
        await addDoc(collection(db, 'campaigns'), removeUndefined(campaignToSave));
    },
    async getRandomActiveCampaign(): Promise<Campaign | null> {
        const q = query(collection(db, 'campaigns'), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        
        const campaigns = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Campaign));
        return campaigns[Math.floor(Math.random() * campaigns.length)];
    },
    async trackAdView(campaignId: string): Promise<void> {
        const campaignRef = doc(db, 'campaigns', campaignId);
        try {
            await updateDoc(campaignRef, { views: increment(1) });
        } catch (error) { console.warn(`Could not track view for campaign ${campaignId}:`, error); }
    },
    async trackAdClick(campaignId: string): Promise<void> {
        const campaignRef = doc(db, 'campaigns', campaignId);
        try {
            await updateDoc(campaignRef, { clicks: increment(1) });
        } catch (error) { console.warn(`Could not track click for campaign ${campaignId}:`, error); }
    },
    async submitLead(leadData: Omit<Lead, 'id'>): Promise<void> {
        await addDoc(collection(db, 'leads'), { ...leadData, createdAt: serverTimestamp() });
    },
    async getLeadsForCampaign(campaignId: string): Promise<Lead[]> {
        const q = query(collection(db, 'leads'), where('campaignId', '==', campaignId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
        } as Lead));
    },
    async getStories(currentUserId: string): Promise<{ author: User; stories: Story[]; allViewed: boolean; }[]> {
        const currentUser = await this.getUserProfileById(currentUserId);
        if (!currentUser) return [];
    
        const friendIds = currentUser.friendIds || [];
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
        const storiesRef = collection(db, 'stories');
        const q = query(storiesRef, where('createdAt', '>', Timestamp.fromDate(twentyFourHoursAgo)), orderBy('createdAt', 'desc'));
    
        try {
            const snapshot = await getDocs(q);
            if (snapshot.empty) return [];
    
            const allRecentStories: Story[] = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(),
                createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
            } as Story));
    
            const visibleStories = allRecentStories.filter(story => {
                if (!story.author) return false;
                if (story.author.id === currentUserId) return true;
                if (story.privacy === 'public') return true;
                if (story.privacy === 'friends' && friendIds.includes(story.author.id)) return true;
                return false;
            });
    
            const storiesByAuthorMap = new Map<string, { author: User; stories: Story[]; allViewed: boolean; }>();
    
            for (const story of visibleStories) {
                const authorId = story.author.id;
                if (!storiesByAuthorMap.has(authorId)) {
                    storiesByAuthorMap.set(authorId, {
                        author: story.author, stories: [], allViewed: true
                    });
                }
                const group = storiesByAuthorMap.get(authorId)!;
                group.stories.push(story);
                if (!(story.viewedBy || []).includes(currentUserId)) {
                    group.allViewed = false;
                }
            }
            
            const result = Array.from(storiesByAuthorMap.values());
            
            result.sort((a, b) => {
                if (a.author.id === currentUserId) return -1;
                if (b.author.id === currentUserId) return 1;
                return 0;
            });
    
            return result;
    
        } catch (error) {
            console.error("Error fetching stories:", error);
            return [];
        }
    },
    async markStoryAsViewed(storyId: string, userId: string): Promise<void> {
        await updateDoc(doc(db, 'stories', storyId), { viewedBy: arrayUnion(userId) });
    },
    async createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'duration' | 'contentUrl' | 'viewedBy'>, mediaFile: File | null): Promise<Story> {
        const storyToSave: any = {
            ...storyData,
            author: { id: storyData.author.id, name: storyData.author.name, avatarUrl: storyData.author.avatarUrl, username: storyData.author.username },
            createdAt: serverTimestamp(), viewedBy: [],
        };
        let duration = 5;
        if (mediaFile) {
            const { url, type } = await uploadMediaToCloudinary(mediaFile, `story_${storyData.author.id}_${Date.now()}`);
            storyToSave.contentUrl = url;
            if (type === 'video') { duration = 15; }
        }
        storyToSave.duration = duration;
        const docRef = await addDoc(collection(db, 'stories'), removeUndefined(storyToSave));
        return { id: docRef.id, ...removeUndefined(storyData), createdAt: new Date().toISOString(), duration, contentUrl: storyToSave.contentUrl, viewedBy: [] };
    },
    async getGroupById(groupId: string): Promise<Group | null> {
        const docSnap = await getDoc(doc(db, 'groups', groupId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Group;
        }
        return null;
    },
    async getSuggestedGroups(userId: string): Promise<Group[]> { return []; },
    async createGroup(creator: any, name: any, description: any, coverPhotoUrl: any, privacy: any, requiresApproval: any, category: any): Promise<Group> {
        const newGroupData = { creator, name, description, coverPhotoUrl, privacy, requiresApproval, category, members: [creator], memberCount: 1, admins: [creator], moderators: [], createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, 'groups'), newGroupData);
        // @ts-ignore
        return { id: docRef.id, ...newGroupData, createdAt: new Date().toISOString() };
    },
    async joinGroup(userId: any, groupId: any, answers: any): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        const user = await this.getUserProfileById(userId);
        if (!user) return false;
        const memberObject = { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl };
        await updateDoc(groupRef, { members: arrayUnion(memberObject), memberCount: increment(1) });
        return true;
    },
    async leaveGroup(userId: any, groupId: any): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";
                const groupData = groupDoc.data() as Group;
                const updatedMembers = groupData.members.filter(m => m.id !== userId);
                const updatedAdmins = groupData.admins.filter(a => a.id !== userId);
                const updatedModerators = groupData.moderators.filter(m => m.id !== userId);

                transaction.update(groupRef, {
                    members: updatedMembers, admins: updatedAdmins, moderators: updatedModerators,
                    memberCount: increment(-1)
                });
            });
            return true;
        } catch (error) {
            console.error("Failed to leave group:", error);
            return false;
        }
    },
    async getPostsForGroup(groupId: any): Promise<Post[]> {
        const q = query(collection(db, 'posts'), where('groupId', '==', groupId), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToPost);
    },
    async updateGroupSettings(groupId: any, settings: any): Promise<boolean> {
        await updateDoc(doc(db, 'groups', groupId), removeUndefined(settings));
        return true;
    },
    async pinPost(groupId: any, postId: any): Promise<boolean> {
        await updateDoc(doc(db, 'groups', groupId), { pinnedPostId: postId });
        return true;
    },
    async unpinPost(groupId: any): Promise<boolean> {
        await updateDoc(doc(db, 'groups', groupId), { pinnedPostId: null });
        return true;
    },
    async inviteFriendToGroup(groupId: any, friendId: any): Promise<boolean> {
        await updateDoc(doc(db, 'groups', groupId), { invitedUserIds: arrayUnion(friendId) });
        return true;
    },
    async getGroupChat(groupId: any): Promise<GroupChat | null> {
        const docSnap = await getDoc(doc(db, 'groupChats', groupId));
        return docSnap.exists() ? { groupId, ...docSnap.data() } as GroupChat : null;
    },
    async sendGroupChatMessage(groupId: any, sender: any, text: any): Promise<any> {
        const message = { sender, text, createdAt: new Date().toISOString() };
        await updateDoc(doc(db, 'groupChats', groupId), { messages: arrayUnion(message) });
        return message;
    },
    async getGroupEvents(groupId: any): Promise<any[]> { return []; },
    async createGroupEvent(creator: any, groupId: any, title: any, description: any, date: any): Promise<any> { return null; },
    async rsvpToEvent(userId: any, eventId: any): Promise<boolean> { return true; },
    async adminLogin(email: any, password: any): Promise<AdminUser | null> {
        const adminRef = doc(db, 'admins', email);
        const docSnap = await getDoc(adminRef);
        if (docSnap.exists() && docSnap.data().password === password) { // NOTE: Insecure password check for demo only
            return { id: docSnap.id, email: docSnap.id };
        }
        return null;
    },
    async adminRegister(email: any, password: any): Promise<AdminUser | null> {
        const adminRef = doc(db, 'admins', email);
        const docSnap = await getDoc(adminRef);
        if (docSnap.exists()) return null;
        await setDoc(adminRef, { password });
        return { id: email, email };
    },
    async getAdminDashboardStats(): Promise<any> { return { totalUsers: 0, newUsersToday: 0, postsLast24h: 0, pendingCampaigns: 0, activeUsersNow: 0, pendingReports: 0, pendingPayments: 0 }; },
    async getAllUsersForAdmin(): Promise<User[]> {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs.map(docToUser);
    },
    async updateUserRole(userId: any, newRole: any): Promise<boolean> {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
        return true;
    },
    async getPendingCampaigns(): Promise<Campaign[]> {
        const q = query(collection(db, 'campaigns'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
    },
    async approveCampaign(campaignId: any): Promise<void> { await updateDoc(doc(db, 'campaigns', campaignId), { status: 'active' }); },
    async rejectCampaign(campaignId: any, reason: any): Promise<void> { await updateDoc(doc(db, 'campaigns', campaignId), { status: 'rejected' }); },
    async getAllPostsForAdmin(): Promise<Post[]> {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const postQuery = await getDocs(q);
        return postQuery.docs.map(docToPost);
    },
    async deletePostAsAdmin(postId: any): Promise<boolean> {
        await deleteDoc(doc(db, 'posts', postId));
        return true;
    },
    async deleteCommentAsAdmin(commentId: any, postId: any): Promise<boolean> { return true; },
    async getPostById(postId: any): Promise<Post | null> {
        const docSnap = await getDoc(doc(db, 'posts', postId));
        return docSnap.exists() ? docToPost(docSnap) : null;
    },
    async getPendingReports(): Promise<Report[]> { return []; },
    async resolveReport(reportId: any, resolution: any): Promise<void> { await updateDoc(doc(db, 'reports', reportId), { status: 'resolved', resolution }); },
    async banUser(userId: any): Promise<boolean> {
        await updateDoc(doc(db, 'users', userId), { isBanned: true });
        return true;
    },
    async unbanUser(userId: any): Promise<boolean> {
        await updateDoc(doc(db, 'users', userId), { isBanned: false });
        return true;
    },
    async warnUser(userId: any, message: any): Promise<boolean> { return true; },
    async suspendUserCommenting(userId: any, days: any): Promise<boolean> { return true; },
    async liftUserCommentingSuspension(userId: any): Promise<boolean> { return true; },
    async suspendUserPosting(userId: any, days: any): Promise<boolean> { return true; },
    async liftUserPostingSuspension(userId: any): Promise<boolean> { return true; },
    async getUserDetailsForAdmin(userId: any): Promise<any> { return null; },
    async sendSiteWideAnnouncement(message: any): Promise<boolean> { return true; },
    async getAllCampaignsForAdmin(): Promise<Campaign[]> { return []; },
    async verifyCampaignPayment(campaignId: any, adminId: any): Promise<boolean> { return true; },
    async adminUpdateUserProfilePicture(userId: string, base64: string): Promise<User | null> {
        const userRef = doc(db, 'users', userId);
        try {
            const blob = await fetch(base64).then(res => res.blob());
            const { url: newAvatarUrl } = await uploadMediaToCloudinary(blob, `avatar_${userId}_admin_${Date.now()}.jpeg`);
            await updateDoc(userRef, { avatarUrl: newAvatarUrl });
            const userDoc = await getDoc(userRef);
            return userDoc.exists() ? docToUser(userDoc) : null;
        } catch (error) {
            console.error("Error updating profile picture by admin:", error);
            return null;
        }
    },
    async reactivateUserAsAdmin(userId: any): Promise<boolean> {
        await updateDoc(doc(db, 'users', userId), { isDeactivated: false });
        return true;
    },
    async promoteGroupMember(groupId: string, userToPromote: User, newRole: 'Admin' | 'Moderator'): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";
                const groupData = groupDoc.data() as Group;

                const userObject = {
                    id: userToPromote.id, name: userToPromote.name, username: userToPromote.username, avatarUrl: userToPromote.avatarUrl,
                };
                
                const updatedAdmins = groupData.admins.filter(a => a.id !== userToPromote.id);
                const updatedModerators = groupData.moderators.filter(m => m.id !== userToPromote.id);

                if (newRole === 'Admin') updatedAdmins.push(userObject);
                else updatedModerators.push(userObject);

                transaction.update(groupRef, { admins: updatedAdmins, moderators: updatedModerators });
            });
            return true;
        } catch (error) {
            console.error(`Failed to promote ${userToPromote.name} to ${newRole}:`, error);
            return false;
        }
    },
    async demoteGroupMember(groupId: string, userToDemote: User, oldRole: 'Admin' | 'Moderator'): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";
                const groupData = groupDoc.data() as Group;

                if (oldRole === 'Admin') {
                    const updatedAdmins = groupData.admins.filter(a => a.id !== userToDemote.id);
                    transaction.update(groupRef, { admins: updatedAdmins });
                } else {
                    const updatedModerators = groupData.moderators.filter(m => m.id !== userToDemote.id);
                    transaction.update(groupRef, { moderators: updatedModerators });
                }
            });
            return true;
        } catch (error) {
            console.error(`Failed to demote ${userToDemote.name} from ${oldRole}:`, error);
            return false;
        }
    },
    async removeGroupMember(groupId: string, userToRemove: User): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";
                const groupData = groupDoc.data() as Group;
                
                const isAlreadyMember = groupData.members.some(m => m.id === userToRemove.id);
                const memberCountChange = isAlreadyMember ? increment(-1) : increment(0);

                const updatedMembers = groupData.members.filter(m => m.id !== userToRemove.id);
                const updatedAdmins = groupData.admins.filter(a => a.id !== userToRemove.id);
                const updatedModerators = groupData.moderators.filter(m => m.id !== userToRemove.id);

                transaction.update(groupRef, {
                    members: updatedMembers, admins: updatedAdmins, moderators: updatedModerators,
                    memberCount: memberCountChange
                });
            });
            return true;
        } catch (error) {
            console.error(`Failed to remove ${userToRemove.name} from group:`, error);
            return false;
        }
    },
    async approveJoinRequest(groupId: string, userId: string): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";
                
                const groupData = groupDoc.data() as Group;
                const joinRequests = groupData.joinRequests || [];
                const requestIndex = joinRequests.findIndex(r => r.user.id === userId);
                
                if (requestIndex === -1) return; // Request already handled
                
                const userToApprove = joinRequests[requestIndex].user;
                const updatedRequests = joinRequests.filter(r => r.user.id !== userId);
                
                const memberObject = {
                    id: userToApprove.id, name: userToApprove.name, username: userToApprove.username, avatarUrl: userToApprove.avatarUrl,
                };

                transaction.update(groupRef, {
                    joinRequests: updatedRequests, members: arrayUnion(memberObject), memberCount: increment(1)
                });
            });
            return true;
        } catch (error) {
            console.error(`Failed to approve join request for user ${userId}:`, error);
            return false;
        }
    },
    async rejectJoinRequest(groupId: string, userId: string): Promise<boolean> {
        const groupRef = doc(db, 'groups', groupId);
        try {
            await runTransaction(db, async (transaction) => {
                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) throw "Group not found";

                const groupData = groupDoc.data() as Group;
                const updatedRequests = (groupData.joinRequests || []).filter(r => r.user.id !== userId);

                transaction.update(groupRef, { joinRequests: updatedRequests });
            });
            return true;
        } catch (error) {
            console.error(`Failed to reject join request for user ${userId}:`, error);
            return false;
        }
    },
    async approvePost(postId: string): Promise<boolean> {
        const postRef = doc(db, 'posts', postId);
        try {
            await updateDoc(postRef, { status: 'approved' });
            const postDoc = await getDoc(postRef);
            if (postDoc.exists() && postDoc.data().groupId) {
                const groupId = postDoc.data().groupId;
                const groupRef = doc(db, 'groups', groupId);
                const groupDoc = await getDoc(groupRef);
                if (groupDoc.exists()) {
                    const groupData = groupDoc.data() as Group;
                    const updatedPendingPosts = (groupData.pendingPosts || []).filter(p => p.id !== postId);
                    await updateDoc(groupRef, { pendingPosts: updatedPendingPosts });
                }
            }
            return true;
        } catch (error) {
            console.error(`Failed to approve post ${postId}:`, error);
            return false;
        }
    },
    async rejectPost(postId: string): Promise<boolean> {
        const postRef = doc(db, 'posts', postId);
        try {
            const postDoc = await getDoc(postRef);
            if (postDoc.exists() && postDoc.data().groupId) {
                const groupId = postDoc.data().groupId;
                const groupRef = doc(db, 'groups', groupId);
                const groupDoc = await getDoc(groupRef);
                if (groupDoc.exists()) {
                    const groupData = groupDoc.data() as Group;
                    const updatedPendingPosts = (groupData.pendingPosts || []).filter(p => p.id !== postId);
                    await updateDoc(groupRef, { pendingPosts: updatedPendingPosts });
                }
            }
            await deleteDoc(postRef);
            return true;
        } catch (error) {
            console.error(`Failed to reject/delete post ${postId}:`, error);
            return false;
        }
    },

    // --- Ads & Monetization ---
    async getInjectableAd(user: User): Promise<Post | null> {
        try {
            const q = query(collection(db, 'campaigns'), where('status', '==', 'active'), where('adType', '==', 'feed'));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            
            const allCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
            const targetedCampaigns = allCampaigns.filter(c => matchesTargeting(c, user));

            if (targetedCampaigns.length === 0) return null;

            const adCampaign = targetedCampaigns[Math.floor(Math.random() * targetedCampaigns.length)];
            const sponsor = await this.getUserProfileById(adCampaign.sponsorId);
            if (!sponsor) return null;

            return {
                id: `ad_${adCampaign.id}`,
                author: { id: sponsor.id, name: sponsor.name, username: sponsor.username, avatarUrl: sponsor.avatarUrl },
                caption: adCampaign.caption,
                createdAt: new Date().toISOString(),
                commentCount: 0,
                comments: [],
                reactions: {},
                imageUrl: adCampaign.imageUrl,
                videoUrl: adCampaign.videoUrl,
                audioUrl: adCampaign.audioUrl,
                isSponsored: true,
                sponsorName: adCampaign.sponsorName,
                campaignId: adCampaign.id,
                websiteUrl: adCampaign.websiteUrl,
                allowDirectMessage: adCampaign.allowDirectMessage,
                allowLeadForm: adCampaign.allowLeadForm,
                sponsorId: adCampaign.sponsorId,
                duration: 0,
            } as Post;
        } catch (error) {
            console.error("Error getting injectable ad:", error);
            return null;
        }
    },

    async getInjectableStoryAd(user: User): Promise<Story | null> {
        try {
            const q = query(collection(db, 'campaigns'), where('status', '==', 'active'), where('adType', '==', 'story'));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const allCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
            const targetedCampaigns = allCampaigns.filter(c => matchesTargeting(c, user));

            if (targetedCampaigns.length === 0) return null;

            const adCampaign = targetedCampaigns[Math.floor(Math.random() * targetedCampaigns.length)];
            const sponsor = await this.getUserProfileById(adCampaign.sponsorId);
            if (!sponsor) return null;

            return {
                id: `ad_${adCampaign.id}`,
                author: { id: sponsor.id, name: sponsor.name, username: sponsor.username, avatarUrl: sponsor.avatarUrl },
                createdAt: new Date().toISOString(),
                type: adCampaign.videoUrl ? 'video' : 'image',
                contentUrl: adCampaign.videoUrl || adCampaign.imageUrl,
                duration: 15, // Story ads are typically short
                viewedBy: [],
                privacy: 'public',
                isSponsored: true,
                sponsorName: adCampaign.sponsorName,
                sponsorAvatar: sponsor.avatarUrl,
                campaignId: adCampaign.id,
                ctaLink: adCampaign.websiteUrl,
            } as Story;
        } catch (error) {
            console.error("Error getting injectable story ad:", error);
            return null;
        }
    },
    async getAgoraToken(channelName: string, uid: string | number): Promise<string | null> {
        // This function now calls the local proxy server to avoid CORS issues.
        const TOKEN_SERVER_URL = '/api/proxy'; 

        try {
            const response = await fetch(`${TOKEN_SERVER_URL}?channelName=${channelName}&uid=${uid}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch Agora token from proxy:', errorText);
                throw new Error(`Token proxy server responded with ${response.status}`);
            }
            const data = await response.json();
            if (!data.rtcToken) {
                throw new Error('rtcToken key not found in server response');
            }
            return data.rtcToken;
        } catch (error) {
            console.error("Could not fetch Agora token. Please ensure your token server is deployed and the URL is correct.", error);
            return null; // Return null on failure, which will prevent joining the call.
        }
    },
};