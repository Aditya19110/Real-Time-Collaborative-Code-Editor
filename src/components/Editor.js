import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/python/python";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import debounce from 'lodash.debounce'; // Make sure lodash.debounce is installed or just lodash
import ACTIONS from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange, code }) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const emitCodeChangeRef = useRef(null);
  const isRemoteChangeRef = useRef(false);
  const lastEmittedCodeRef = useRef("");

  useEffect(() => {
    if (!editorRef.current && containerRef.current) {
      // Initialize CodeMirror
      editorRef.current = Codemirror.fromTextArea(document.getElementById('realtimeEditor'), {
        mode: 'python', // Force python mode
        theme: 'dracula', // Keep dracula or find a better dark theme
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        matchBrackets: true,
        placeholder: `# Welcome to the Collaborative Editor!
# Start typing...`,
      });

      // Resize function to fit parent
      const resizeEditor = () => {
        if (editorRef.current && containerRef.current) {
          const height = containerRef.current.clientHeight;
          editorRef.current.setSize("100%", height);
        }
      };

      // Initial resize
      resizeEditor();

      // Listen for window resize
      window.addEventListener('resize', resizeEditor);

      // Debounce emission
      emitCodeChangeRef.current = debounce((code) => {
        // Only emit if we have a valid socket
        if (socketRef.current) {
          lastEmittedCodeRef.current = code;
          socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
        }
      }, 150);

      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const content = instance.getValue();

        // Notify parent
        onCodeChange(content);

        if (origin !== 'setValue' && !isRemoteChangeRef.current) {
          emitCodeChangeRef.current(content);
        }
        isRemoteChangeRef.current = false;
      });

      // Set initial code if any
      if (code) {
        editorRef.current.setValue(code);
      }
    }

    return () => {
      window.removeEventListener('resize', () => { }); // cleanup listener
      if (emitCodeChangeRef.current) emitCodeChangeRef.current.cancel();
      // We don't nullify editorRef here to prevent re-init issues if strict mode
      // But in prod usually fine.
    };
  }, []); // Run once

  // Handle incoming remote changes
  useEffect(() => {
    if (socketRef.current) {
      const handleRemoteChange = ({ code: remoteCode }) => {
        if (remoteCode === null || remoteCode === undefined) return;

        const currentCode = editorRef.current.getValue();

        // If different and not what we just sent
        if (remoteCode !== currentCode && remoteCode !== lastEmittedCodeRef.current) {
          isRemoteChangeRef.current = true;

          // Save cursor
          const cursor = editorRef.current.getCursor();

          editorRef.current.setValue(remoteCode);

          // Restore cursor roughly
          try {
            const lastLine = editorRef.current.lineCount() - 1;
            const newLastLineLength = editorRef.current.getLine(lastLine).length;

            // Basic bounds check
            if (cursor.line > lastLine) {
              editorRef.current.setCursor(lastLine, newLastLineLength);
            } else {
              editorRef.current.setCursor(cursor);
            }
          } catch (e) { }
        }
      };

      socketRef.current.on(ACTIONS.CODE_CHANGE, handleRemoteChange);

      return () => {
        socketRef.current.off(ACTIONS.CODE_CHANGE, handleRemoteChange);
      };
    }
  }, [socketRef.current]);

  // Handle prop code updates (e.g. file upload from parent)
  useEffect(() => {
    if (editorRef.current) {
      const currentVal = editorRef.current.getValue();
      if (code !== undefined && code !== currentVal) {
        // Verify it's not a loop
        if (code !== lastEmittedCodeRef.current) {
          isRemoteChangeRef.current = true;
          editorRef.current.setValue(code);
        }
      }
    }
  }, [code]);

  return (
    <div className="h-full w-full bg-[#282a36] overflow-hidden" ref={containerRef}>
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
};

export default Editor;