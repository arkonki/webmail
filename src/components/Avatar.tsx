import React from 'react';

interface AvatarProps {
  name: string;
  className?: string;
}

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'
];

const getInitials = (name: string): string => {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getColorForName = (name: string): string => {
  if (!name) return COLORS[0];
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[charCodeSum % COLORS.length];
};

const Avatar: React.FC<AvatarProps> = ({ name, className = 'w-10 h-10' }) => {
  const initials = getInitials(name);
  const color = getColorForName(name);

  return (
    <div className={`flex items-center justify-center rounded-full text-white font-bold text-sm flex-shrink-0 ${color} ${className}`}>
      {initials}
    </div>
  );
};

export default Avatar;
