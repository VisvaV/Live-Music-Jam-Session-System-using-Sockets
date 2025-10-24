# Live Music Jam Session

A comprehensive real-time music jam session web application with advanced Computer Networks features. This project demonstrates networking concepts including network monitoring, adaptive streaming, NTP synchronization, and secure audio transmission. Users can create and join music sessions, vote on tracks, chat in real-time, and experience synchronized audio playback with professional-grade networking features.

## 🎵 Core Features

- **Room Creation & Joining**: Create a new jam session or join an existing one with a room ID
- **Real-time Synchronization**: All users hear the same music at the same time with NTP precision
- **Playlist Management**: Upload and manage a shared playlist with voting system
- **Host Controls**: Room creator has special privileges for playback control
- **Audio Visualization**: Real-time visual representation of the currently playing track
- **Responsive Design**: Works on desktop and mobile devices
- **Low-Latency Streaming**: Optimized for minimal delay in audio playback

## 🔧 Advanced Computer Networks Features

### Network Quality Monitoring
- **Real-time Bandwidth Measurement**: Continuous monitoring of network throughput
- **Latency Detection**: WebSocket ping/pong and HTTP request latency measurement
- **Jitter Analysis**: Packet arrival time variation analysis
- **Connection Quality Assessment**: Automatic classification (Excellent/Good/Fair/Poor)
- **Network Warnings**: Alerts for poor connection conditions

### Adaptive Bitrate Streaming
- **Quality Levels**: Low (128 kbps), Medium (192 kbps), High (320 kbps)
- **Automatic Adaptation**: Quality adjustment based on network conditions
- **Manual Override**: User-controlled quality selection
- **Device Optimization**: Mobile-specific quality recommendations
- **Performance Analytics**: Quality change history and statistics

### NTP Synchronization
- **Precise Time Sync**: NTP-like timestamp exchange for accurate synchronization
- **Jitter Buffer Management**: Dynamic buffer sizing based on network conditions
- **Time Offset Compensation**: Client-server time difference calculation
- **Synchronization Accuracy**: Real-time sync status monitoring
- **Round-trip Time Analysis**: Network delay measurement and compensation

### Audio Security
- **AES-256 Encryption**: Advanced encryption for audio streams
- **Web Crypto API**: Browser-native encryption implementation
- **Key Management**: Secure key generation and distribution
- **Encryption Toggle**: User-controlled security settings
- **Secure Streaming**: End-to-end encrypted audio transmission

## 💬 User Interaction Features

### Track Voting System
- **Upvote/Downvote**: Real-time voting on tracks with instant updates
- **Vote Persistence**: Server-side vote storage across sessions
- **Vote Analytics**: Track popularity and user engagement metrics
- **Vote Notifications**: Real-time notifications for voting activity
- **Score Calculation**: Dynamic vote score display with color coding

### Real-time Chat System
- **Live Messaging**: Instant communication between participants
- **Typing Indicators**: Real-time typing status display
- **Emoji Reactions**: Message reactions with emoji support
- **Message Formatting**: Link detection and mention highlighting
- **Chat History**: Session-based message persistence
- **Unread Notifications**: Badge counter for missed messages

### Enhanced User Experience
- **Professional UI**: Modern, responsive interface design
- **Real-time Updates**: Live synchronization of all user interactions
- **Mobile Optimization**: Touch-friendly controls and responsive layout
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance Monitoring**: Real-time system performance indicators

## 🚀 Technology Stack

### Backend
- **Python 3.8+** with **Flask** for server logic
- **Flask-SocketIO** for real-time WebSocket communication
- **Werkzeug** for file handling and security
- **Flask-CORS** for cross-origin resource sharing

### Frontend
- **HTML5**, **CSS3**, **JavaScript (ES6+)**
- **Tailwind CSS** for responsive styling
- **Socket.IO Client** for WebSocket communication
- **Font Awesome** for icons and UI elements
- **Web Crypto API** for client-side encryption

### Advanced Networking
- **WebSockets** (Flask-SocketIO) for real-time communication
- **NTP-like Synchronization** for precise timing
- **Adaptive Streaming** with quality adjustment
- **Network Quality Monitoring** with real-time metrics
- **AES-256 Encryption** for secure audio transmission

## 📦 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/VisvaV/Live-Music-Jam-Session-System-using-Sockets.git
cd Live-Music-Jam-Session-System-using-Sockets
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the application:**
```bash
python app.py
```

4. **Access the application:**
- Open your browser and navigate to `http://localhost:5000`
- Create a room or join an existing one
- Start your music jam session!

## 🎯 Usage

### Creating a Room
1. Enter your name in the "Create Room" section
2. Click "Create Room" to generate a unique room ID
3. Share the room ID with friends to invite them

### Joining a Room
1. Enter your name and the room ID
2. Click "Join Room" to enter the session
3. Start enjoying synchronized music!

### Advanced Features
- **Monitor Network Quality**: View real-time bandwidth, latency, and jitter
- **Adjust Streaming Quality**: Manual or automatic quality selection
- **Vote on Tracks**: Upvote or downvote tracks in the playlist
- **Chat with Participants**: Real-time messaging with emoji reactions
- **Secure Streaming**: Toggle audio encryption for enhanced security

## 🔬 Computer Networks Concepts Demonstrated

This project showcases advanced networking concepts:

- **Network Performance Monitoring**: Real-time bandwidth, latency, and jitter measurement
- **Quality of Service (QoS)**: Adaptive streaming based on network conditions
- **Synchronization Protocols**: NTP implementation for precise timing
- **Security Protocols**: AES-256 encryption for secure audio streaming
- **Real-time Communication**: WebSocket-based instant messaging
- **Error Detection & Correction**: Network quality assessment and adaptation
- **Performance Optimization**: Dynamic buffer management and quality adjustment

## 📊 Project Statistics

- **Total Files**: 15+ source files
- **Lines of Code**: 2000+ lines
- **Features**: 20+ implemented features
- **Networking Concepts**: 8+ advanced concepts demonstrated
- **User Interactions**: 10+ real-time interaction types

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [Flask](https://flask.palletsprojects.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Font Awesome](https://fontawesome.com/) - Icon library
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Browser encryption
