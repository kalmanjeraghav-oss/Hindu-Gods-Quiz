import React from 'react';

interface AdPlaceholderProps {
  className?: string;
  text?: string;
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ className = '', text = 'Google Ad Space' }) => {
  return (
    <div className={`bg-stone-100 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-orange-200 transition-colors ${className}`}>
      <span className="absolute top-0 right-0 bg-stone-200 text-stone-500 text-[10px] font-bold px-1.5 py-0.5 rounded-bl">Ad</span>
      <span className="text-stone-400 font-serif text-sm italic group-hover:text-orange-400 transition-colors">{text}</span>
      <div className="absolute inset-0 bg-stone-50 opacity-50 pointer-events-none diagonal-stripes"></div>
    </div>
  );
};

export default AdPlaceholder;