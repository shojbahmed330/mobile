
import React from 'react';

interface TaggedContentProps {
  text: string;
  onTagClick: (username: string) => void;
}

const TaggedContent: React.FC<TaggedContentProps> = ({ text, onTagClick }) => {
  // Regex to match @ followed by alphanumeric characters and underscores
  const parts = text.split(/(@[\w_]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1); // Get the username without '@'
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(username); // Pass the username
              }}
              className="font-semibold text-sky-400 hover:underline"
            >
              {part}
            </button>
          );
        }
        return part;
      })}
    </>
  );
};

export default TaggedContent;