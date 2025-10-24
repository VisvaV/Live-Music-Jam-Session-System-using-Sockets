import os
import uuid
import time
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory, after_this_request
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['SECRET_KEY'] = os.urandom(24).hex()
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'mp3', 'wav', 'ogg'}

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory data store for rooms and sessions
rooms = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Custom route to serve audio files with proper headers
@app.route('/static/uploads/<path:filename>')
def serve_audio(filename):
    @after_this_request
    def add_header(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    
    print(f"Serving audio file: {filename}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create-room', methods=['POST'])
def create_room():
    username = request.form.get('username')
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    room_id = str(uuid.uuid4())[:8]  # Generate a shorter room ID for ease of use
    rooms[room_id] = {
        'host': username,
        'members': [username],
        'playlist': [],
        'current_track': None,
        'is_playing': False,
        'current_position': 0,
        'last_update_time': 0
    }
    
    session['username'] = username
    session['room_id'] = room_id
    
    return jsonify({
        'room_id': room_id,
        'username': username
    })

@app.route('/join-room', methods=['POST'])
def join_room_route():
    username = request.form.get('username')
    room_id = request.form.get('room_id')
    
    if not username or not room_id:
        return jsonify({'error': 'Username and room ID are required'}), 400
    
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    session['username'] = username
    session['room_id'] = room_id
    
    # Add user to room if not already in
    if username not in rooms[room_id]['members']:
        rooms[room_id]['members'].append(username)
    
    return jsonify({
        'room_id': room_id,
        'username': username,
        'is_host': username == rooms[room_id]['host'],
        'playlist': rooms[room_id]['playlist'],
        'current_track': rooms[room_id]['current_track'],
        'is_playing': rooms[room_id]['is_playing'],
        'current_position': rooms[room_id]['current_position']
    })

@app.route('/room/<room_id>')
def room(room_id):
    if 'username' not in session or 'room_id' not in session:
        return redirect(url_for('index'))
    
    if room_id not in rooms:
        return redirect(url_for('index'))
    
    return render_template('room.html', 
                           room_id=room_id, 
                           username=session['username'],
                           is_host=session['username'] == rooms[room_id]['host'])

@app.route('/api/network-test', methods=['POST'])
def network_test():
    """Endpoint for network quality testing"""
    try:
        data = request.get_json()
        if data and 'test' in data:
            # Return server timestamp for latency calculation
            return jsonify({
                'server_time': time.time(),
                'timestamp': data.get('timestamp', time.time())
            })
        else:
            # For bandwidth testing, just return the data size
            content_length = request.content_length
            return jsonify({
                'received_bytes': content_length,
                'server_time': time.time()
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    room_id = request.form.get('room_id')
    
    if not room_id or room_id not in rooms:
        return jsonify({'error': 'Invalid room ID'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Replace spaces with underscores in the filename
        filename = filename.replace(' ', '_')
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Add to room's playlist
        track_info = {
            'id': str(uuid.uuid4()),
            'name': filename,
            'path': '/static/uploads/' + filename,
            'added_by': session.get('username', 'Unknown')
        }
        
        # Log the file path for debugging
        print(f"File saved at: {file_path}")
        print(f"Track path set to: {track_info['path']}")
        print(f"Original filename: {file.filename}")
        print(f"Secured filename: {filename}")
        
        rooms[room_id]['playlist'].append(track_info)
        
        # Notify all clients in the room about the new track
        socketio.emit('track_added', track_info, room=room_id)
        
        return jsonify({'success': True, 'track': track_info})
    
    return jsonify({'error': 'File type not allowed'}), 400

# Socket.IO event handlers
@socketio.on('ntp_sync_request')
def handle_ntp_sync_request(data):
    """Handle NTP synchronization request"""
    t1 = data.get('t1')
    client_time = data.get('client_time')
    
    # Server receive time
    t2 = time.time()
    server_receive_time = time.time()
    
    # Server send time (slight delay to simulate processing)
    time.sleep(0.001)  # 1ms processing time
    t3 = time.time()
    server_send_time = time.time()
    
    emit('ntp_sync_response', {
        't2': t2,
        't3': t3,
        'server_receive_time': server_receive_time,
        'server_send_time': server_send_time
    })

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join')
def on_join(data):
    username = data.get('username')
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    join_room(room_id)
    emit('user_joined', {'username': username}, room=room_id)

@socketio.on('leave')
def on_leave(data):
    username = data.get('username')
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    leave_room(room_id)
    
    # Remove user from room members
    if username in rooms[room_id]['members']:
        rooms[room_id]['members'].remove(username)
    
    # If room is empty, delete it
    if not rooms[room_id]['members']:
        del rooms[room_id]
    else:
        emit('user_left', {'username': username}, room=room_id)

@socketio.on('play')
def on_play(data):
    room_id = data.get('room_id')
    track_id = data.get('track_id')
    position = data.get('position', 0)
    
    if not room_id or room_id not in rooms:
        return
    
    # Find the track in the playlist
    track = None
    for t in rooms[room_id]['playlist']:
        if t['id'] == track_id:
            track = t
            break
    
    if track:
        rooms[room_id]['current_track'] = track
        rooms[room_id]['is_playing'] = True
        rooms[room_id]['current_position'] = position
        rooms[room_id]['last_update_time'] = time.time()
        
        emit('playback_update', {
            'action': 'play',
            'track': track,
            'position': position,
            'server_time': time.time()
        }, room=room_id)

@socketio.on('pause')
def on_pause(data):
    room_id = data.get('room_id')
    position = data.get('position', 0)
    
    if not room_id or room_id not in rooms:
        return
    
    rooms[room_id]['is_playing'] = False
    rooms[room_id]['current_position'] = position
    
    emit('playback_update', {
        'action': 'pause',
        'position': position,
        'server_time': time.time()
    }, room=room_id)

@socketio.on('seek')
def on_seek(data):
    room_id = data.get('room_id')
    position = data.get('position', 0)
    
    if not room_id or room_id not in rooms:
        return
    
    rooms[room_id]['current_position'] = position
    rooms[room_id]['last_update_time'] = time.time()
    
    emit('playback_update', {
        'action': 'seek',
        'position': position,
        'server_time': time.time()
    }, room=room_id)

@socketio.on('skip')
def on_skip(data):
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    playlist = rooms[room_id]['playlist']
    current_track = rooms[room_id]['current_track']
    
    if not playlist or not current_track:
        return
    
    # Find the index of the current track
    current_index = -1
    for i, track in enumerate(playlist):
        if track['id'] == current_track['id']:
            current_index = i
            break
    
    # If found and not the last track, play the next one
    if current_index != -1 and current_index < len(playlist) - 1:
        next_track = playlist[current_index + 1]
        rooms[room_id]['current_track'] = next_track
        rooms[room_id]['current_position'] = 0
        rooms[room_id]['last_update_time'] = time.time()
        
        emit('playback_update', {
            'action': 'play',
            'track': next_track,
            'position': 0,
            'server_time': time.time()
        }, room=room_id)

@socketio.on('vote_track')
def on_vote_track(data):
    """Handle track voting"""
    room_id = data.get('room_id')
    track_id = data.get('track_id')
    vote_type = data.get('vote_type')
    username = data.get('username')
    
    if not room_id or room_id not in rooms:
        return
    
    if not track_id or not vote_type or not username:
        return
    
    # Initialize voting data for room if not exists
    if 'votes' not in rooms[room_id]:
        rooms[room_id]['votes'] = {}
    
    if track_id not in rooms[room_id]['votes']:
        rooms[room_id]['votes'][track_id] = {
            'upvotes': 0,
            'downvotes': 0,
            'user_votes': {}
        }
    
    track_votes = rooms[room_id]['votes'][track_id]
    
    # Check if user already voted
    existing_vote = track_votes['user_votes'].get(username)
    
    if existing_vote == vote_type:
        # Remove vote (toggle)
        if vote_type == 'upvote':
            track_votes['upvotes'] -= 1
        else:
            track_votes['downvotes'] -= 1
        del track_votes['user_votes'][username]
        action = 'remove'
    else:
        # Remove previous vote if exists
        if existing_vote:
            if existing_vote == 'upvote':
                track_votes['upvotes'] -= 1
            else:
                track_votes['downvotes'] -= 1
        
        # Add new vote
        if vote_type == 'upvote':
            track_votes['upvotes'] += 1
        else:
            track_votes['downvotes'] += 1
        
        track_votes['user_votes'][username] = vote_type
        action = 'add'
    
    # Emit vote update to all clients in room
    emit('track_voted', {
        'track_id': track_id,
        'vote_type': vote_type,
        'username': username,
        'action': action,
        'upvotes': track_votes['upvotes'],
        'downvotes': track_votes['downvotes']
    }, room=room_id)

@socketio.on('chat_message')
def on_chat_message(data):
    """Handle chat messages"""
    room_id = data.get('room_id')
    message = data.get('message')
    username = data.get('username')
    timestamp = data.get('timestamp')
    
    if not room_id or room_id not in rooms:
        return
    
    if not message or not username:
        return
    
    # Emit message to all clients in room
    emit('chat_message', {
        'message': message,
        'username': username,
        'timestamp': timestamp,
        'reactions': {}
    }, room=room_id)

@socketio.on('user_typing')
def on_user_typing(data):
    """Handle typing indicator"""
    room_id = data.get('room_id')
    username = data.get('username')
    
    if room_id and room_id in rooms:
        emit('user_typing', {
            'username': username
        }, room=room_id)

@socketio.on('user_stopped_typing')
def on_user_stopped_typing(data):
    """Handle stopped typing indicator"""
    room_id = data.get('room_id')
    username = data.get('username')
    
    if room_id and room_id in rooms:
        emit('user_stopped_typing', {
            'username': username
        }, room=room_id)

@socketio.on('chat_reaction')
def on_chat_reaction(data):
    """Handle chat reactions"""
    room_id = data.get('room_id')
    message_id = data.get('message_id')
    emoji = data.get('emoji')
    username = data.get('username')
    
    if not room_id or room_id not in rooms:
        return
    
    # Initialize chat reactions for room if not exists
    if 'chat_reactions' not in rooms[room_id]:
        rooms[room_id]['chat_reactions'] = {}
    
    if message_id not in rooms[room_id]['chat_reactions']:
        rooms[room_id]['chat_reactions'][message_id] = {}
    
    if emoji not in rooms[room_id]['chat_reactions'][message_id]:
        rooms[room_id]['chat_reactions'][message_id][emoji] = []
    
    # Toggle reaction
    reactions = rooms[room_id]['chat_reactions'][message_id][emoji]
    if username in reactions:
        reactions.remove(username)
        action = 'remove'
    else:
        reactions.append(username)
        action = 'add'
    
    # Remove empty reactions
    if not reactions:
        del rooms[room_id]['chat_reactions'][message_id][emoji]
    
    # Emit reaction update
    emit('chat_reaction', {
        'message_id': message_id,
        'emoji': emoji,
        'username': username,
        'action': action
    }, room=room_id)

@socketio.on('remove_track')
def on_remove_track(data):
    room_id = data.get('room_id')
    track_id = data.get('track_id')
    username = data.get('username')
    
    if not room_id or room_id not in rooms:
        return
    
    # Only host or the user who added the track can remove it
    room_data = rooms[room_id]
    is_host = username == room_data['host']
    
    # Find the track
    track_to_remove = None
    track_index = -1
    for i, track in enumerate(room_data['playlist']):
        if track['id'] == track_id:
            track_to_remove = track
            track_index = i
            break
    
    if not track_to_remove:
        return
    
    # Check if user has permission to remove
    if not is_host and track_to_remove['added_by'] != username:
        return
    
    # Remove the track
    room_data['playlist'].pop(track_index)
    
    # If it was the current track, stop playback or play next
    if room_data['current_track'] and room_data['current_track']['id'] == track_id:
        if len(room_data['playlist']) > track_index:
            # Play next track
            next_track = room_data['playlist'][track_index]
            room_data['current_track'] = next_track
            room_data['current_position'] = 0
            room_data['last_update_time'] = time.time()
            
            emit('playback_update', {
                'action': 'play',
                'track': next_track,
                'position': 0,
                'server_time': time.time()
            }, room=room_id)
        else:
            # Stop playback
            room_data['current_track'] = None
            room_data['is_playing'] = False
            room_data['current_position'] = 0
            
            emit('playback_update', {
                'action': 'stop',
                'server_time': time.time()
            }, room=room_id)
    
    # Notify all clients about the removal
    emit('track_removed', {'track_id': track_id}, room=room_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)