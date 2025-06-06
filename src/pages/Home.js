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
    <h1 style={{ textAlign: "center", margin: "0" }}>
      <span style={{ fontFamily: "cursive", fontSize: "24px", color: "#00897B" }}>Code</span><br />
      <span style={{ fontWeight: "bold", fontSize: "32px", color: "#EF6C00" }}>TOGETHER</span>
    </h1>

    <p className="mainLabel">Paste your room id</p>

    <div className="inputGroup">
      <input type="text" className="inputBox" placeholder="Enter Room Id" />
      <input type="text" className="inputBox" placeholder="Enter Name" />
      <button className="btn joinBtn">Join Now</button>
    </div>

    <div className="createInfo">
      <p>Create your own</p>
      <button className="enhancedBtn smallBtn" onClick={createNewRoom}>+ Room Id</button>
    </div>
  </div>

  <footer>
    © CodeTogether
  </footer>
</div>
  );
};

export default Home;