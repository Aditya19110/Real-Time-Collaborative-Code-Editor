import React, { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import debounce from "lodash.debounce";

const SERVER_URL = "https://real-time-collaborative-code-editor-hpju.onrender.com";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [username, setUsername] = useState(location.state?.username || '');
  const [code, setCode] = useState("");
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    if (!username) {
      toast.error("Username is required to join the room");
      reactNavigator("/");
      return;
    }

    const init = async () => {
      try {
        socketRef.current = await initSocket(SERVER_URL);

        const socket = socketRef.current;

        socket.on("connect_error", handleErrors);
        socket.on("connect_failed", handleErrors);

        function handleErrors(e) {
          console.error("Socket error:", e);
          toast.error("Socket connection failed, try again later");
          reactNavigator("/");
        }

        socket.emit(ACTIONS.JOIN, { roomId, username });

        socket.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
          if (joinedUser !== username) {
            toast.success(`${joinedUser} joined the room`);
          }
          setClients(clients);
          socket.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        });

        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          codeRef.current = code;
          setCode(code);
        });

        socket.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });

        // 🔁 Heartbeat mechanism
        socket.on("pong", () => {
          console.log("✅ Pong received from server");
        });

        pingIntervalRef.current = setInterval(() => {
          socket.emit("ping");
        }, 10000);

      } catch (error) {
        console.error("Socket initialization failed:", error);
        toast.error("Socket connection failed, try again later");
        reactNavigator("/");
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off("pong");
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [roomId, username, reactNavigator]);

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
    if (!codeRef.current) {
      toast.error("No code to execute");
      return;
    }

    try {
      const { data } = await axios.post(`${SERVER_URL}/execute`, {
        code: codeRef.current,
      });
      setOutput(data.output);
      toast.success("Code executed successfully");
    } catch (err) {
      console.error("Code execution failed:", err);
      setOutput(err?.response?.data?.error || "Code execution failed");
      toast.error("Code execution failed");
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

  const debouncedCodeChange = useCallback(
    debounce((newCode) => {
      setCode(newCode);
      codeRef.current = newCode;
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: newCode,
      });
    }, 300),
    [roomId]
  );

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImg" src="/code-together.png" alt="Logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>Copy Room Id</button>
        <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
        <button className="btn runBtn" onClick={runCode}>Run Code</button>
        <input type="file" onChange={handleFileUpload} />
        <button className="btn saveBtn" onClick={saveCodeToFile}>Save Code</button>
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
        <h3>Output:</h3>
        <pre className="output">{output || "No output yet"}</pre>
      </div>
    </div>
  );
};

export default EditorPage;