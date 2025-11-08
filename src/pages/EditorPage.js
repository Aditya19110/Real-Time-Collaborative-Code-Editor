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
  const isInitializedRef = useRef(false);
  const socketConnectionRef = useRef(null);
  useEffect(() => {
    if (!location.state?.username) {
      toast.error("Username is required to join the room");
      reactNavigator("/");
      return;
    }
    if (isInitializedRef.current || socketConnectionRef.current) {
      return;
    }
    isInitializedRef.current = true;
    socketConnectionRef.current = "initializing";
    const username = location.state.username;
    const init = async () => {
      try {
        if (socketRef.current && socketRef.current.connected) {
          return;
        }
        setConnectionStatus("Connecting...");
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current.removeAllListeners();
        }
        socketRef.current = initSocket(SERVER_URL);
        const socket = socketRef.current;
        socketConnectionRef.current = "connected";
        socket.once("connect", () => {
          setIsConnected(true);
          setConnectionStatus("Connected");
          toast.success("Connected to server");
          socket.emit(ACTIONS.JOIN, { roomId, username });
        });
        socket.on("disconnect", (reason) => {
          setIsConnected(false);
          setConnectionStatus(`Disconnected: ${reason}`);
          toast.error(`Disconnected: ${reason}`);
          socketConnectionRef.current = "disconnected";
        });
        socket.on("reconnect", () => {
          setIsConnected(true);
          setConnectionStatus("Reconnected");
          toast.success("Reconnected to server");
          socket.emit(ACTIONS.JOIN, { roomId, username });
          socketConnectionRef.current = "connected";
        });
        socket.on("reconnect_attempt", (attemptNumber) => {
          setConnectionStatus(`Reconnecting... (${attemptNumber})`);
        });
        socket.on("connect_error", handleErrors);
        socket.on("connect_failed", handleErrors);
        function handleErrors(e) {
          setIsConnected(false);
          socketConnectionRef.current = "error";
          if (e.message && e.message.includes('parse')) {
            setConnectionStatus(`Parse Error: Check server configuration`);
            toast.error("Server configuration error detected");
          } else {
            setConnectionStatus(`Connection Failed: ${e.message || 'Unknown error'}`);
            toast.error("Connection failed, retrying...");
          }
        }
        socket.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
          setClients(clients);
          if (socketId !== socket.id) {
            toast.success(`${joinedUser} joined the room`);
            if (codeRef.current && codeRef.current.trim()) {
              socket.emit(ACTIONS.SYNC_CODE, {
                code: codeRef.current,
                socketId: socketId,
              });
            }
          } else {
          }
        });
        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (code !== null && code !== undefined && code !== codeRef.current) {
            codeRef.current = code;
            setCode(code);
          }
        });
        socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: disconnectedUser }) => {
          if (disconnectedUser) {
            toast.success(`${disconnectedUser} left the room`);
          }
          setClients((prev) => {
            const updated = prev.filter((client) => client.socketId !== socketId);
            return updated;
          });
        });
        socket.on(ACTIONS.ERROR, ({ message }) => {
          toast.error(message);
          reactNavigator("/");
        });
        socket.on("pong", () => {
        });
        if (!pingIntervalRef.current) {
          pingIntervalRef.current = setInterval(() => {
            if (socket.connected) {
              socket.emit("ping");
            }
          }, 25000);
        }
      } catch (error) {
        setIsConnected(false);
        setConnectionStatus("Initialization Failed");
        toast.error("Failed to initialize connection");
        socketConnectionRef.current = "error";
        isInitializedRef.current = false;
      }
    };
    init();
    return () => {
      isInitializedRef.current = false;
      socketConnectionRef.current = null;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, location.state?.username, reactNavigator]);
  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch (err) {
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
    codeRef.current = newCode;
    setCode(newCode);
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }
  }, []);
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
                {isConnected ? ' Connected' : ' Disconnected'}
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
             Copy Room ID
          </button>
          <button
            className="btn runBtn"
            onClick={runCode}
            disabled={isRunning || !isConnected}
            title={isRunning ? "Running..." : "Run Python Code"}
          >
            {isRunning ? "⏳ Running..." : " Run Code"}
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
               Upload File
            </label>
          </div>
          <button className="btn saveBtn" onClick={saveCodeToFile} title="Save Code">
             Save Code
          </button>
          <button className="btn leaveBtn" onClick={leaveRoom} title="Leave Room">
             Leave Room
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
          <span> Output</span>
          <button className="clearOutputBtn" onClick={clearOutput} title="Clear Output">
             Clear
          </button>
        </div>
        <pre className="output">{output}</pre>
      </div>
    </div>
  );
};
export default EditorPage;