import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/python/python";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import "./EditorTheme.css";
import debounce from 'lodash.debounce';
import ACTIONS from "../Actions";
const Editor = ({ socketRef, roomId, onCodeChange, code }) => {
  const editorRef = useRef(null);
  const emitCodeChangeRef = useRef(null);
  const isRemoteChangeRef = useRef(false);
  const lastEmittedCodeRef = useRef("");
  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = Codemirror.fromTextArea(document.getElementById('realtimeEditor'), {
        mode: 'python',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        theme: 'modern',
        placeholder: `# Welcome to CodeTogether!
# Start typing your Python code here...
# Your changes will be synced in real-time with other users!
# Example: Try this simple Python program
def greet(name):
    return f"Hello, {name}! Welcome to collaborative coding!"
# Run this code to see the output
name = input("Enter your name: ")
print(greet(name))
# Feel free to modify this code or write your own!`,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        lineWrapping: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Tab": function(cm) {
            if (cm.getSelection()) {
              cm.indentSelection("add");
            } else {
              cm.replaceSelection("    ", "end");
            }
          }
        }
      });
      emitCodeChangeRef.current = debounce((code) => {
        if (socketRef.current && socketRef.current.connected) {
          lastEmittedCodeRef.current = code;
          socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
        }
      }, 150);
      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        if (origin !== 'setValue' && !isRemoteChangeRef.current) {
          emitCodeChangeRef.current(code);
        }
        isRemoteChangeRef.current = false;
      });
    }
    return () => {
      if (emitCodeChangeRef.current) {
        emitCodeChangeRef.current.cancel();
        emitCodeChangeRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };
  }, [socketRef, roomId, onCodeChange]);
  useEffect(() => {
    if (socketRef.current && editorRef.current) {
      const socket = socketRef.current;
      const handleIncomingCodeChange = ({ code }) => {
        if (code === null || code === undefined) {
          return;
        }
        const currentCode = editorRef.current.getValue();
        if (code !== currentCode && code !== lastEmittedCodeRef.current) {
          isRemoteChangeRef.current = true;
          const cursor = editorRef.current.getCursor();
          const scrollInfo = editorRef.current.getScrollInfo();
          editorRef.current.setValue(code);
          try {
            const lineCount = editorRef.current.lineCount();
            const lastLine = editorRef.current.getLine(lineCount - 1);
            if (cursor.line < lineCount &&
                (cursor.line < lineCount - 1 || cursor.ch <= lastLine.length)) {
              editorRef.current.setCursor(cursor);
            }
          } catch (err) {
          }
          editorRef.current.scrollTo(scrollInfo.left, scrollInfo.top);
        }
      };
      socket.on(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);
      return () => {
        socket.off(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);
      };
    }
  }, [socketRef]);
  useEffect(() => {
    if (editorRef.current && code !== undefined && code !== editorRef.current.getValue()) {
      isRemoteChangeRef.current = true;
      editorRef.current.setValue(code);
    }
  }, [code]);
  return <textarea id="realtimeEditor" />;
};
export default Editor;