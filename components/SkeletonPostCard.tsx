import React from 'react';

const SkeletonPostCard: React.FC = () => {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg mx-auto overflow-hidden relative">
      <div className="animate-pulse flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-700"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-3 bg-slate-700 rounded w-1/4"></div>
          </div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
        <div className="h-24 bg-slate-700 rounded-lg"></div>
        <div className="flex items-center gap-6">
          <div className="h-8 w-16 bg-slate-700 rounded-full"></div>
          <div className="h-8 w-16 bg-slate-700 rounded-full"></div>
          <div className="h-8 w-24 bg-slate-700 rounded-full ml-auto"></div>
        </div>
      </div>
      {/* Shimmer effect */}
      <div className="absolute top-0 left-0 w-full h-full">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-slate-700/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
      </div>
    </div>
  );
};

export default SkeletonPostCard;
