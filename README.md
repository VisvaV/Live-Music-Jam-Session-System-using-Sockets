# Live Music Jam Session

A real-time music jam session web application that allows users to create and join music sessions within a local network, similar to Spotify Jam. The app enables a host to create a room with a unique ID, allows friends to join using the room ID, lets the host control access, and permits authorized users to manage a shared playlist (play, pause, skip songs).

## Features

- **Room Creation & Joining**: Create a new jam session or join an existing one with a room ID
- **Real-time Synchronization**: All users hear the same music at the same time
- **Playlist Management**: Upload and manage a shared playlist
- **Host Controls**: Room creator has special privileges for playback control
- **Audio Visualization**: Visual representation of the currently playing track
- **Responsive Design**: Works on desktop and mobile devices
- **Low-Latency Streaming**: Optimized for minimal delay in audio playback

## Technology Stack

### Backend
- **Python** with **Flask** for server logic
- **Flask-SocketIO** for real-time communication
- **Werkzeug** for file handling and security

### Frontend
- **HTML5**, **CSS3**, **JavaScript**
- **Tailwind CSS** for styling
- **Socket.IO** client for WebSocket communication
- **Font Awesome** for icons

### Networking
- **WebSockets** (via Flask-SocketIO) for session management and control signals
- **HTML5 Audio API** for synchronized playback

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [Socket.IO](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Font Awesome](https://fontawesome.com/)
