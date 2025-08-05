import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success('New Room Created! Enter your username to join.');
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
      await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value.trim());
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s_-]*$/.test(value) || value === '') {
      setUsername(value);
    }
  };

  return (
    <div className="homePageWrapper">
      <div className="themeToggleFixed">
        <ThemeToggle />
      </div>
      <div className="formWrapper">
        <div className="header">
          <div className="headerContent">
            <img
              className="homePageLogo"
              src="/code-together.png"
              alt="code-together"
            />
            <h4 className="mainLabel">Join a Collaborative Code Session</h4>
          </div>
        </div>
        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={handleRoomIdChange}
            onKeyUp={handleInputEnter}
            maxLength={50}
          />
          <input
            type="text"
            className="inputBox"
            placeholder="Enter your username"
            value={username}
            onChange={handleUsernameChange}
            onKeyUp={handleInputEnter}
            maxLength={20}
          />
          <button 
            onClick={joinRoom} 
            className="btn joinBtn"
            disabled={isJoining || !roomId.trim() || !username.trim()}
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
          <span className="createInfo">
            Don't have a room? &nbsp;
            <button onClick={createNewRoom} className="createNewBtn roomBtn">
              ➕ Create New Room
            </button>
          </span>
        </div>
      </div>
      <footer className="footer">
        <h4>CodeTogether - Real-time Collaborative Coding</h4>
        <p>Build amazing things together, anywhere, anytime.</p>
      </footer>
    </div>
  );
};

export default Home;