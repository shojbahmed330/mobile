import React, { useState, useEffect } from 'react';

interface WaveformProps {
  isPlaying: boolean;
  isRecording?: boolean;
  barCount?: number;
}

const Waveform: React.FC<WaveformProps> = ({ isPlaying, isRecording = false, barCount = 30 }) => {
  const [barHeights, setBarHeights] = useState<number[]>([]);

  useEffect(() => {
    setBarHeights(Array.from({ length: barCount }, () => Math.random() * 80 + 20));
  }, [barCount]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying || isRecording) {
      interval = setInterval(() => {
        setBarHeights(heights => heights.map(() => Math.random() * 80 + 20));
      }, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isRecording]);

  const baseColor = isRecording ? 'bg-red-500' : 'bg-rose-500';
  const mutedColor = isRecording ? 'bg-red-500/30' : 'bg-rose-500/30';

  return (
    <div className="flex items-center justify-center h-full w-full gap-1">
      {barHeights.map((height, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-full transition-all duration-200 ease-in-out ${isPlaying || isRecording ? baseColor : mutedColor}`}
          style={{ height: `${isPlaying || isRecording ? height : 20}%` }}
        />
      ))}
    </div>
  );
};

export default Waveform;