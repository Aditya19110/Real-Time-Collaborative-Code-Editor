import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import ThemeToggle from '../components/ThemeToggle';
import { initSocket } from '../socket';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import axios from "axios";

const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://code-editor-backend-2h8c.onrender.com' 
    : 'http://localhost:5002');

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false); // Prevent multiple initializations

  useEffect(() => {
    if (!location.state?.username) {
      toast.error("Username is required to join the room");
      reactNavigator("/");
      return;
    }

    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const username = location.state.username;

    const init = async () => {
      try {
        setConnectionStatus("Connecting...");
        console.log("🔄 Initializing socket connection to:", SERVER_URL);
        socketRef.current = initSocket(SERVER_URL);

        const socket = socketRef.current;

        socket.on("connect", () => {
          setIsConnected(true);
          setConnectionStatus("Connected");
          toast.success("Connected to server");
          console.log("✅ Connected to server with ID:", socket.id);
          
          // Join the room after connection
          console.log("🏠 Joining room:", roomId, "with username:", username);
          socket.emit(ACTIONS.JOIN, { roomId, username });
        });

        socket.on("disconnect", (reason) => {
          setIsConnected(false);
          setConnectionStatus(`Disconnected: ${reason}`);
          console.log("❌ Disconnected:", reason);
          toast.error(`Disconnected: ${reason}`);
        });

        socket.on("reconnect", () => {
          setIsConnected(true);
          setConnectionStatus("Reconnected");
          toast.success("Reconnected to server");
          console.log("🔄 Reconnected, rejoining room");
          socket.emit(ACTIONS.JOIN, { roomId, username });
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
          setConnectionStatus(`Reconnecting... (${attemptNumber})`);
          console.log("🔄 Reconnection attempt:", attemptNumber);
        });

        socket.on("connect_error", handleErrors);
        socket.on("connect_failed", handleErrors);

        function handleErrors(e) {
          console.error("🚨 Socket connection error:", e.message || e);
          setIsConnected(false);
          
          // Handle specific error types
          if (e.message && e.message.includes('parse')) {
            setConnectionStatus(`Parse Error: Check server configuration`);
            toast.error("Server configuration error detected");
          } else {
            setConnectionStatus(`Connection Failed: ${e.message || 'Unknown error'}`);
            toast.error("Connection failed, retrying...");
          }
        }

        socket.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
          if (joinedUser !== username) {
            toast.success(`${joinedUser} joined the room`);
          }
          setClients(clients);
          if (codeRef.current) {
            socket.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current,
              socketId,
            });
          }
        });

        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (code !== codeRef.current) {
            codeRef.current = code;
            setCode(code);
          }
        });

        socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: disconnectedUser }) => {
          if (disconnectedUser) {
            toast.success(`${disconnectedUser} left the room`);
          }
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });

        socket.on(ACTIONS.ERROR, ({ message }) => {
          toast.error(message);
          reactNavigator("/");
        });

        socket.on("pong", () => {
          console.log("✅ Pong received from server");
        });

        socket.emit(ACTIONS.JOIN, { roomId, username });

        pingIntervalRef.current = setInterval(() => {
          if (socket.connected) {
            socket.emit("ping");
          }
        }, 25000);

      } catch (error) {
        console.error("Socket initialization failed:", error);
        setIsConnected(false);
        setConnectionStatus("Initialization Failed");
        toast.error("Failed to initialize connection");
      }
    };

    init();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      isInitializedRef.current = false; // Reset initialization flag
      // Store ref values at cleanup time
      const pingInterval = pingIntervalRef.current;
      const reconnectTimeout = reconnectTimeoutRef.current;
      
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.ERROR);
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("reconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off("pong");
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only depend on roomId - username is constant after initial render

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy Room ID:", err);
      toast.error("Failed to copy Room ID");
    }
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    reactNavigator("/");
    toast.success("Left the room");
  }, [reactNavigator]);

  const runCode = useCallback(async () => {
    if (!codeRef.current.trim()) {
      toast.error("No code to execute");
      return;
    }

    setIsRunning(true);
    try {
      const { data } = await axios.post(`${SERVER_URL}/execute`, {
        code: codeRef.current,
      });
      setOutput(data.output || "Code executed successfully with no output");
      toast.success("Code executed successfully");
    } catch (err) {
      console.error("Code execution failed:", err);
      const errorMessage = err?.response?.data?.error || err.message || "Code execution failed";
      setOutput(`Error: ${errorMessage}`);
      toast.error("Code execution failed");
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setCode(fileContent);
        codeRef.current = fileContent;
        socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: fileContent,
        });
      };
      reader.readAsText(file);
    }
  }, [roomId]);

  const saveCodeToFile = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "code.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [code]);

  const debouncedCodeChange = useCallback((newCode) => {
    setCode(newCode);
    codeRef.current = newCode;
    
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: newCode,
      });
    }
  }, [roomId]);

  const clearOutput = useCallback(() => {
    setOutput("");
  }, []);

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImg" src="/code-together.png" alt="Logo" />
          </div>
          <div className="themeAndStatus">
            <ThemeToggle />
            <div className="connectionStatus">
              <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <div className="connectionDetails">
                {connectionStatus}
              </div>
            </div>
          </div>
          <h3>Connected Users ({clients.length})</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <div className="actionButtons">
          <button className="btn copyBtn" onClick={copyRoomId} title="Copy Room ID">
            📋 Copy Room ID
          </button>
          <button 
            className="btn runBtn" 
            onClick={runCode} 
            disabled={isRunning || !isConnected}
            title={isRunning ? "Running..." : "Run Python Code"}
          >
            {isRunning ? "⏳ Running..." : "▶️ Run Code"}
          </button>
          <div className="fileUploadWrapper">
            <input 
              type="file" 
              onChange={handleFileUpload} 
              className="fileUploadInput"
              id="fileUpload"
              accept=".py,.txt,.js,.html,.css"
            />
            <label htmlFor="fileUpload" className="fileUploadBtn" title="Upload File">
              📁 Upload File
            </label>
          </div>
          <button className="btn saveBtn" onClick={saveCodeToFile} title="Save Code">
            💾 Save Code
          </button>
          <button className="btn leaveBtn" onClick={leaveRoom} title="Leave Room">
            🚪 Leave Room
          </button>
        </div>
      </div>

      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          code={code}
          onCodeChange={debouncedCodeChange}
        />
      </div>

      <div className="outputWrap">
        <div className="outputHeader">
          <span>💻 Output</span>
          <button className="clearOutputBtn" onClick={clearOutput} title="Clear Output">
            🗑️ Clear
          </button>
        </div>
        <pre className="output">{output}</pre>
      </div>
    </div>
  );
};

export default EditorPage;