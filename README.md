# echo-code - Real-Time Collaborative Code Editor 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4-black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-cyan)

**Short GitHub Description:**  
A real-time collaborative code editor built with React, Socket.io, and Python. Features live code syncing, instant execution, and a modern Tailwind CSS interface.

---

## Overview

**Echo-Code** is a powerful, real-time collaborative code editor that allows developers to write and execute code together instantly. Built with a modern tech stack, it features a stunning glassmorphism UI, robust code synchronization, and server-side Python execution.

## Features

- **Real-time Collaboration**: Code synchronizes globally across all users in milliseconds.
- **Live Code Execution**: Run Python code directly in the browser and see output instantly.
- **Modern UI/UX**: Designed with **Tailwind CSS**, featuring dark mode, glassmorphism, and responsive layouts.
- **User Presence**: See who is online with real-time avatar indicators.
- **File Management**: Upload Python/text files and save your work locally.
- **Responsive Design**: Fully mobile-optimized coding environment.
- **Robust Security**: Rate limiting and secure execution environment.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, CodeMirror, Socket.io Client
- **Backend**: Node.js, Express, Socket.io, Child Process (for Python execution)
- **Styling**: Tailwind CSS, PostCSS
- **Tools**: React Hot Toast (Notifications), React Avatar

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Python 3](https://www.python.org/) (for code execution)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Aditya19110/Real-Time-Collaborative-Code-Editor.git
    cd Real-Time-Collaborative-Code-Editor
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Development Server**
    ```bash
    npm run dev
    ```
    This command will run both the client (http://localhost:3000) and the server (http://localhost:5002) concurrently.

    > **Note:** Just `npm start` runs only the React frontend. Ensure the backend is running for socket connections!

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Made with ❤️ by Aditya Kulkarni**
