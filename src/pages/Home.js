import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  // Function to create a new room with a random Room ID
  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    setUsername(''); // Clear the username field when creating a new room
    toast.success('Created The Room!');
  };

  // Function to join an existing room
  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error('Please enter both Room ID and Username');
      return;
    }
    // Redirect to the editor page with the room ID and username
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };

  // Handle pressing "Enter" key to join the room
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
          <button onClick={joinRoom} className="btn joinBtn">
            Join Now
          </button>
          <span className="createInfo">
            Create your own &nbsp;
            <button onClick={createNewRoom} className="createNewBtn">
              Room Id
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