import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username }) => {
  return (
    <div className="flex flex-col items-center group cursor-pointer">
      <div className="relative">
        <Avatar 
            name={username} 
            size="45" 
            round="12px" 
            className="transition-transform group-hover:scale-110 shadow-lg border-2 border-transparent group-hover:border-cyan-400"
        />
         {/* Online Indicator Badge (Visual only for now since we render list of connected) */}
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full z-10"></div>
      </div>
      <span className="mt-1 text-xs text-gray-400 font-medium group-hover:text-cyan-400 transition-colors max-w-[60px] truncate text-center">
        {username}
      </span>
    </div>
  );
}

export default Client;