import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCommunityStore = create(
  persist(
    (set) => ({
      posts: [],

      addPost: ({ authorHdi, authorName, content }) =>
        set(s => ({
          posts: [
            {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
              authorHdi,
              authorName,
              content: content.trim(),
              createdAt: new Date().toISOString(),
              likes: [],
            },
            ...s.posts,
          ].slice(0, 500), // cap at 500 posts
        })),

      toggleLike: (postId, hdi) =>
        set(s => ({
          posts: s.posts.map(p =>
            p.id !== postId ? p : {
              ...p,
              likes: p.likes.includes(hdi)
                ? p.likes.filter(h => h !== hdi)
                : [...p.likes, hdi],
            }
          ),
        })),

      deletePost: (postId, hdi) =>
        set(s => ({
          posts: s.posts.filter(p => !(p.id === postId && p.authorHdi === hdi)),
        })),
    }),
    {
      name: 'earthsphere-community',
      partialize: s => ({ posts: s.posts }),
    }
  )
)
