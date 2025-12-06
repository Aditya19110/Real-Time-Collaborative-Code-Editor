import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success('New Room Created! Enter your username to join.', {
        style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
        },
    });
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      toast.error('Please enter a Room ID');
      return;
    }
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    if (username.length < 2) {
      toast.error('Username must be at least 2 characters long');
      return;
    }
    if (username.length > 20) {
      toast.error('Username must be less than 20 characters');
      return;
    }

    setIsJoining(true);
    try {
      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate(`/editor/${roomId}`, {
        state: { username: username.trim() },
      });
    } catch (error) {
      toast.error('Failed to join room');
      setIsJoining(false);
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      joinRoom();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-hidden relative">
      {/* Background Animated Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 p-8 transform transition-all hover:scale-[1.01]">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <img src="/code-together.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              CodeTogether
            </h1>
            <p className="text-gray-400 text-sm mt-2 text-center">
              Real-time collaborative code editor for developers.
            </p>
          </div>

          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider group-focus-within:text-cyan-400 transition-colors">
                Room ID
              </label>
              <input
                type="text"
                className="w-full bg-gray-900/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="Paste Room ID or Create New"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.trim())}
                onKeyUp={handleInputEnter}
                maxLength={50}
              />
            </div>

            <div className="group">
              <label className="block text-xs font-semibold text-gray-400 mb-1 ml-1 uppercase tracking-wider group-focus-within:text-cyan-400 transition-colors">
                Username
              </label>
              <input
                type="text"
                className="w-full bg-gray-900/50 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="Enter your display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyUp={handleInputEnter}
                maxLength={20}
              />
            </div>

            <button
              onClick={joinRoom}
              disabled={isJoining || !roomId.trim() || !username.trim()}
              className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all duration-200 transform
                ${isJoining 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:-translate-y-0.5 hover:shadow-cyan-500/25'
                }`}
            >
              {isJoining ? (
                  <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining...
                  </span>
              ) : 'Join Room'}
            </button>

            <div className="text-center mt-4">
              <span className="text-gray-400 text-sm">Don't have a room? &nbsp;</span>
              <button
                onClick={createNewRoom}
                className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors"
              >
                Create New Room
              </button>
            </div>
          </div>
        </div>
        
        <footer className="mt-8 text-center text-gray-500 text-xs">
          <p>© {new Date().getFullYear()} CodeTogether. Built for developers.</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;