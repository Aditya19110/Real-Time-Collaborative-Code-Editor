import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    setUsername('');
    toast.success('Created The Room!');
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error('Please enter both Room ID and Username');
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      joinRoom();
    }
  };

  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
        <img
          className="homePageLogo"
          src="/code-together.png"
          alt="code-together"
        />
        <h4 className="mainLabel">Paste your room id</h4>
        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="Enter Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyUp={handleInputEnter}
          />
          <input
            type="text"
            className="inputBox"
            placeholder="Enter Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
          />
          <button onClick={joinRoom} className="btn joinBtn enhancedBtn">
            🚀 Join Now
          </button>
          <span className="createInfo">
            Create your own &nbsp;
            <button onClick={createNewRoom} className="createNewBtn enhancedBtn smallBtn">
              ➕ Room Id
            </button>
          </span>
        </div>
      </div>
      <footer>
        <h4>&copy; CodeTogether</h4>
      </footer>
    </div>
  );
};

export default Home;