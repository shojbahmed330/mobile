
import React from 'react';
import { Post } from '../types';
import { PostCard } from './PostCard';

interface PostCarouselProps {
  title: string;
  posts: Post[];
  postCardProps: Omit<React.ComponentProps<typeof PostCard>, 'post'>;
}

const PostCarousel: React.FC<PostCarouselProps> = ({ title, posts, postCardProps }) => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-slate-100 mb-4">{title}</h2>
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-8 px-8 no-scrollbar">
        {posts.filter(Boolean).map((post) => (
          <div key={post.id} className="w-80 flex-shrink-0">
            <PostCard post={post} {...postCardProps} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PostCarousel;
