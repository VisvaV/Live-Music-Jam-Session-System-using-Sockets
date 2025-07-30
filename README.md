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

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository or download the source code

2. Navigate to the project directory

3. Create a virtual environment (recommended)
   ```
   python -m venv venv
   ```

4. Activate the virtual environment
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

5. Install the required dependencies
   ```
   pip install -r requirements.txt
   ```

6. Run the application
   ```
   python app.py
   ```

7. Access the application in your web browser
   ```
   http://localhost:5000
   ```

### Accessing from Other Devices on the Network

To allow other devices on your local network to connect to your jam session:

1. Find your computer's local IP address
   - On Windows: Run `ipconfig` in Command Prompt and look for the IPv4 Address
   - On macOS/Linux: Run `ifconfig` in Terminal and look for the inet address

2. Other users can access the application by entering your IP address and port in their browser
   ```
   http://YOUR_IP_ADDRESS:5000
   ```

## Usage Guide

### Creating a Room
1. Enter your name on the home page
2. Click "Create Room"
3. Share the generated Room ID with friends

### Joining a Room
1. Enter your name on the home page
2. Click "Join Room"
3. Enter the Room ID shared with you
4. Click "Join"

### Adding Music
1. In the room, click "Add Track"
2. Select an audio file (MP3, WAV, or OGG format)
3. Click "Upload"

### Controlling Playback (Host Only)
- Click on a track in the playlist to play it
- Use the play/pause button to control playback
- Use the previous/next buttons to navigate between tracks
- Click on the progress bar to seek to a specific position

## Future Enhancements

- User authentication system
- Persistent rooms and playlists
- Chat functionality
- Custom room settings (private/public, max users, etc.)
- Audio effects and equalizer
- Deployment to AWS Free Tier

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [Socket.IO](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Font Awesome](https://fontawesome.com/)