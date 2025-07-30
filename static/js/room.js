document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const playlistContainer = document.getElementById('playlistContainer');
    const participantsContainer = document.getElementById('participantsContainer');
    const currentTrackName = document.getElementById('currentTrackName');
    const currentTrackAddedBy = document.getElementById('currentTrackAddedBy');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    const progressBar = document.getElementById('progressBar');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const cancelUpload = document.getElementById('cancelUpload');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    const uploadForm = document.getElementById('uploadForm');
    const submitUpload = document.getElementById('submitUpload');
    const copyRoomId = document.getElementById('copyRoomId');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const trackVisualizer = document.getElementById('trackVisualizer');
    const toastContainer = document.getElementById('toastContainer');

    // State variables
    let socket;
    let playlist = [];
    let currentTrack = null;
    let isPlaying = false;
    let participants = [];
    let serverTimeOffset = 0;
    let progressInterval;
    let visualizerContext;
    let visualizerAnalyser;
    let visualizerBars = [];
    let draggedTrack = null;

    // Initialize the application
    function init() {
        // Connect to Socket.IO server
        connectSocket();
        
        // Set up audio player event listeners
        setupAudioPlayer();
        
        // Set up UI event listeners
        setupEventListeners();
        
        // Initialize audio visualizer
        setupVisualizer();
        
        // Add current user to participants
        addParticipant(username, isHost);
    }

    // Connect to Socket.IO server
    function connectSocket() {
        socket = io();
        
        // Socket event listeners
        socket.on('connect', () => {
            console.log('Connected to server');
            
            // Join the room
            socket.emit('join', { username, room_id: roomId });
            
            // Calculate server time offset
            const clientTime = Date.now();
            socket.emit('get_server_time', { client_time: clientTime });
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            showToast('Disconnected from server. Trying to reconnect...', 'error');
        });
        
        socket.on('server_time', (data) => {
            const clientTime = Date.now();
            const roundTripTime = clientTime - data.client_time;
            const serverTime = data.server_time + (roundTripTime / 2);
            serverTimeOffset = serverTime - clientTime;
        });
        
        socket.on('user_joined', (data) => {
            showToast(`${data.username} joined the room`, 'info');
            addParticipant(data.username, false);
        });
        
        socket.on('user_left', (data) => {
            showToast(`${data.username} left the room`, 'info');
            removeParticipant(data.username);
        });
        
        socket.on('track_added', (track) => {
            playlist.push(track);
            updatePlaylistUI();
            showToast(`${track.added_by} added "${track.name}"`, 'info');
            
            // If this is the first track, enable play button
            if (playlist.length === 1 && !currentTrack) {
                playPauseBtn.disabled = false;
            }
        });
        
        socket.on('track_removed', (data) => {
            const index = playlist.findIndex(track => track.id === data.track_id);
            if (index !== -1) {
                const removedTrack = playlist[index];
                playlist.splice(index, 1);
                updatePlaylistUI();
                showToast(`"${removedTrack.name}" was removed from the playlist`, 'info');
            }
        });
        
        socket.on('playback_update', (data) => {
            handlePlaybackUpdate(data);
        });
    }

    // Set up audio player event listeners
    function setupAudioPlayer() {
        // Set crossOrigin to allow playing from different origins
        audioPlayer.crossOrigin = "anonymous";
        
        // Preload metadata for faster loading
        audioPlayer.preload = "auto";
        
        // Add cache busting parameter to prevent caching issues
        audioPlayer.addEventListener('loadstart', () => {
            console.log('Audio load started');
            if (audioPlayer.src && !audioPlayer.src.includes('cache_bust=')) {
                const separator = audioPlayer.src.includes('?') ? '&' : '?';
                audioPlayer.src = `${audioPlayer.src}${separator}cache_bust=${Date.now()}`;
                console.log('Added cache busting to audio src:', audioPlayer.src);
            }
        });
        
        audioPlayer.addEventListener('loadedmetadata', () => {
            totalTime.textContent = formatTime(audioPlayer.duration);
            console.log('Audio metadata loaded, duration:', audioPlayer.duration);
        });
        
        audioPlayer.addEventListener('timeupdate', () => {
            currentTime.textContent = formatTime(audioPlayer.currentTime);
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${progress}%`;
        });
        
        audioPlayer.addEventListener('play', () => {
            console.log('Audio play event fired');
            isPlaying = true;
            updatePlayPauseButton();
        });
        
        audioPlayer.addEventListener('pause', () => {
            console.log('Audio pause event fired');
            isPlaying = false;
            updatePlayPauseButton();
        });
        
        audioPlayer.addEventListener('error', (e) => {
            console.error('Audio player error:', e);
            const errorMessage = getAudioErrorMessage(audioPlayer.error);
            showToast('Error playing audio: ' + errorMessage, 'error');
            
            // Try to recover by reloading with cache busting
            if (audioPlayer.src) {
                const currentSrc = audioPlayer.src.split('?')[0]; // Remove any existing query params
                audioPlayer.src = `${currentSrc}?cache_bust=${Date.now()}`;
                console.log('Attempting to recover with new src:', audioPlayer.src);
                audioPlayer.load();
            }
        });
        
        audioPlayer.addEventListener('ended', () => {
            console.log('Audio ended event fired');
            // If we're the host, emit skip event to move to next track
            if (isHost) {
                socket.emit('skip', { room_id: roomId });
            }
        });
        
        // Add stalled and waiting event handlers
        audioPlayer.addEventListener('stalled', () => {
            console.log('Audio playback has stalled');
            showToast('Audio playback stalled. Trying to recover...', 'warning');
        });
        
        audioPlayer.addEventListener('waiting', () => {
            console.log('Audio playback is waiting for more data');
        });
        
        // Set up audio context for visualizer
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            const source = audioContext.createMediaElementSource(audioPlayer);
            visualizerAnalyser = audioContext.createAnalyser();
            visualizerAnalyser.fftSize = 256;
            source.connect(visualizerAnalyser);
            visualizerAnalyser.connect(audioContext.destination);
        } catch (error) {
            console.error('Error setting up audio context:', error);
            showToast('Error setting up audio visualizer', 'error');
        }
    }
    
    // Helper function to get detailed audio error messages
    function getAudioErrorMessage(error) {
        if (!error) return 'Unknown error';
        
        switch(error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                return 'Playback aborted by the user';
            case MediaError.MEDIA_ERR_NETWORK:
                return 'Network error while loading media';
            case MediaError.MEDIA_ERR_DECODE:
                return 'Media decoding error - file may be corrupted';
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                return 'Media format not supported by the browser';
            default:
                return `Unknown error (code: ${error.code})`;
        }
    }

    // Set up UI event listeners
    function setupEventListeners() {
        // Play/Pause button
        playPauseBtn.addEventListener('click', () => {
            if (!currentTrack) {
                // If no track is currently selected, play the first one
                if (playlist.length > 0) {
                    if (isHost) {
                        socket.emit('play', {
                            room_id: roomId,
                            track_id: playlist[0].id,
                            position: 0
                        });
                    } else {
                        showToast('Only the host can control playback', 'error');
                    }
                }
                return;
            }
            
            if (isHost) {
                if (isPlaying) {
                    socket.emit('pause', {
                        room_id: roomId,
                        position: audioPlayer.currentTime
                    });
                } else {
                    socket.emit('play', {
                        room_id: roomId,
                        track_id: currentTrack.id,
                        position: audioPlayer.currentTime
                    });
                }
            } else {
                showToast('Only the host can control playback', 'error');
            }
        });
        
        // Previous button
        prevBtn.addEventListener('click', () => {
            if (!isHost) {
                showToast('Only the host can control playback', 'error');
                return;
            }
            
            if (!currentTrack || playlist.length <= 1) return;
            
            const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
            if (currentIndex > 0) {
                const prevTrack = playlist[currentIndex - 1];
                socket.emit('play', {
                    room_id: roomId,
                    track_id: prevTrack.id,
                    position: 0
                });
            }
        });
        
        // Next button
        nextBtn.addEventListener('click', () => {
            if (!isHost) {
                showToast('Only the host can control playback', 'error');
                return;
            }
            
            socket.emit('skip', { room_id: roomId });
        });
        
        // Progress bar click for seeking
        const progressBarContainer = document.getElementById('progressBarContainer');
        progressBarContainer.addEventListener('click', (e) => {
            if (!isHost) {
                showToast('Only the host can control playback', 'error');
                return;
            }
            
            if (!currentTrack || !audioPlayer.duration || isNaN(audioPlayer.duration)) {
                console.warn('Cannot seek: duration not available or invalid');
                return;
            }
            
            const rect = progressBarContainer.getBoundingClientRect();
            const clickPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const seekTime = Math.max(0, Math.min(audioPlayer.duration, audioPlayer.duration * clickPosition));
            
            console.log('Seeking to:', seekTime, 'seconds, duration:', audioPlayer.duration);
            
            socket.emit('seek', {
                room_id: roomId,
                position: seekTime
            });
        });
        
        // Upload button
        uploadBtn.addEventListener('click', () => {
            uploadModal.classList.remove('hidden');
        });
        
        // Close upload modal
        closeUploadModal.addEventListener('click', () => {
            uploadModal.classList.add('hidden');
            resetFileInput();
        });
        
        cancelUpload.addEventListener('click', () => {
            uploadModal.classList.add('hidden');
            resetFileInput();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = file.name;
                filePreview.classList.remove('hidden');
                submitUpload.disabled = false;
            }
        });
        
        // Remove file button
        removeFile.addEventListener('click', () => {
            resetFileInput();
        });
        
        // Upload form submission
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const file = fileInput.files[0];
            if (!file) return;
            
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showToast('File size exceeds 10MB limit', 'error');
                return;
            }
            
            // Check file type
            const fileType = file.type.toLowerCase();
            if (!fileType.includes('audio/mp3') && !fileType.includes('audio/mpeg') && 
                !fileType.includes('audio/wav') && !fileType.includes('audio/ogg')) {
                showToast('Only MP3, WAV, and OGG files are allowed', 'error');
                return;
            }
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('room_id', roomId);
            
            // Show loading state
            submitUpload.disabled = true;
            submitUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            
            // Upload the file
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast(data.error, 'error');
                    return;
                }
                
                // Close modal and reset
                uploadModal.classList.add('hidden');
                resetFileInput();
                
                // No need to update playlist here as it will be updated via socket event
            })
            .catch(error => {
                showToast('An error occurred during upload', 'error');
                console.error('Upload error:', error);
            })
            .finally(() => {
                submitUpload.disabled = false;
                submitUpload.innerHTML = 'Upload';
            });
        });
        
        // Copy room ID button
        copyRoomId.addEventListener('click', () => {
            const roomIdText = document.getElementById('roomIdDisplay').textContent;
            navigator.clipboard.writeText(roomIdText)
                .then(() => {
                    showToast('Room ID copied to clipboard', 'info');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                });
        });
        
        // Leave room button
        leaveRoomBtn.addEventListener('click', () => {
            if (socket) {
                socket.emit('leave', { username, room_id: roomId });
            }
            window.location.href = '/';
        });
        
        // Drag and drop for file upload
        const dropZone = document.querySelector('.border-dashed');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            
            if (file) {
                fileInput.files = dt.files;
                fileName.textContent = file.name;
                filePreview.classList.remove('hidden');
                submitUpload.disabled = false;
            }
        }, false);
    }

    // Handle playback updates from server
    function handlePlaybackUpdate(data) {
        const { action, track, position, server_time } = data;
        
        switch (action) {
            case 'play':
                if (track) {
                    // Update current track
                    currentTrack = track;
                    console.log('Setting audio source to:', track.path);
                    
                    // Make sure the path is correct and accessible
                    const fullPath = track.path.startsWith('/') ? track.path : '/' + track.path;
                    console.log('Full audio path:', fullPath);
                    
                    // Add cache busting to prevent caching issues
                    const cacheBustPath = `${fullPath}${fullPath.includes('?') ? '&' : '?'}cache_bust=${Date.now()}`;
                    console.log('Setting audio source with cache busting:', cacheBustPath);
                    
                    // Reset the audio player
                    audioPlayer.pause();
                    audioPlayer.currentTime = 0;
                    
                    try {
                        // Set new source and load
                        audioPlayer.src = cacheBustPath;
                        
                        // Create a timeout to detect if loading takes too long
                        const loadTimeout = setTimeout(() => {
                            console.warn('Audio loading timeout - attempting recovery');
                            // Try a different approach - create a new Audio element
                            const tempAudio = new Audio(cacheBustPath);
                            tempAudio.addEventListener('canplaythrough', () => {
                                console.log('Temp audio can play, transferring to main player');
                                audioPlayer.src = tempAudio.src;
                                audioPlayer.load();
                            }, { once: true });
                            tempAudio.load();
                        }, 5000); // 5 second timeout
                        
                        // Add event listener for canplaythrough to ensure audio is ready
                        const canPlayHandler = () => {
                            console.log('Audio can play through, ready for playback');
                            clearTimeout(loadTimeout); // Clear the timeout
                            
                            // Set the position accounting for network delay
                            const adjustedPosition = position + ((Date.now() + serverTimeOffset) - server_time) / 1000;
                            audioPlayer.currentTime = Math.max(0, Math.min(adjustedPosition, audioPlayer.duration || 0));
                            console.log('Setting audio position to:', adjustedPosition, 'Duration:', audioPlayer.duration);
                            
                            // Play the audio
                            console.log('Attempting to play audio...');
                            const playPromise = audioPlayer.play();
                            
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => {
                                        console.log('Audio playback started successfully');
                                        isPlaying = true;
                                        updatePlayPauseButton();
                                        startVisualization();
                                    })
                                    .catch(error => {
                                        console.error('Playback error:', error);
                                        showToast('Error playing track: ' + error.message, 'error');
                                        
                                        // Try to autoplay with user interaction
                                        showToast('Click the play button to start playback', 'info');
                                    });
                            } else {
                                console.log('Play promise is undefined, browser might not support promises on media elements');
                                isPlaying = true;
                                updatePlayPauseButton();
                                startVisualization();
                            }
                            
                            // Remove this event listener after it's been used
                            audioPlayer.removeEventListener('canplaythrough', canPlayHandler);
                        };
                        
                        // Add the event listener
                        audioPlayer.addEventListener('canplaythrough', canPlayHandler);
                        
                        // Handle loading errors
                        audioPlayer.addEventListener('error', function onError(e) {
                            console.error('Error loading audio:', audioPlayer.error);
                            clearTimeout(loadTimeout); // Clear the timeout
                            const errorMessage = getAudioErrorMessage(audioPlayer.error);
                            showToast(`Error loading audio file: ${errorMessage}`, 'error');
                            
                            // Try a different approach - use XMLHttpRequest to check file
                            const xhr = new XMLHttpRequest();
                            xhr.open('GET', fullPath, true);
                            xhr.onload = function() {
                                if (xhr.status === 200) {
                                    console.log('File exists but audio element failed to load it. Trying again...');
                                    // Try again with a new cache bust
                                    const newCacheBust = `${fullPath}?cache_bust=${Date.now()}`;
                                    audioPlayer.src = newCacheBust;
                                    audioPlayer.load();
                                } else {
                                    console.error('File does not exist:', xhr.status);
                                    showToast(`File not found (${xhr.status})`, 'error');
                                }
                            };
                            xhr.onerror = function() {
                                console.error('XHR error checking file');
                                showToast('Network error checking file', 'error');
                            };
                            xhr.send();
                            
                            audioPlayer.removeEventListener('error', onError);
                        }, { once: true });
                        
                        // Start loading the audio
                        audioPlayer.load();
                    } catch (error) {
                        console.error('Exception setting audio source:', error);
                        showToast(`Error setting audio source: ${error.message}`, 'error');
                    }
                    
                    currentTrackName.textContent = track.name;
                    currentTrackAddedBy.textContent = `Added by ${track.added_by}`;
                    
                    // Update playlist UI to highlight current track
                    updatePlaylistUI();
                    
                    // Enable control buttons
                    playPauseBtn.disabled = false;
                    updateNavigationButtons();
                }
                
                // Skip direct playback if we're loading a new track
                // For new tracks, the playback will happen after the fetch check completes
                if (!track) {
                    // Set the position accounting for network delay
                    const adjustedPosition = position + ((Date.now() + serverTimeOffset) - server_time) / 1000;
                    audioPlayer.currentTime = Math.max(0, Math.min(adjustedPosition, audioPlayer.duration || 0));
                    console.log('Setting audio position to:', adjustedPosition);
                    
                    // Play the audio
                    console.log('Attempting to play audio...');
                    const playPromise = audioPlayer.play();
                    
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('Audio playback started successfully');
                                isPlaying = true;
                                updatePlayPauseButton();
                                startVisualization();
                            })
                            .catch(error => {
                                console.error('Playback error:', error);
                                showToast('Error playing track: ' + error.message, 'error');
                                
                                // Try to autoplay with user interaction
                                showToast('Click the play button to start playback', 'info');
                            });
                    } else {
                        console.log('Play promise is undefined, browser might not support promises on media elements');
                        isPlaying = true;
                        updatePlayPauseButton();
                        startVisualization();
                    }
                }
                break;
                
            case 'pause':
                audioPlayer.pause();
                isPlaying = false;
                updatePlayPauseButton();
                stopVisualization();
                break;
                
            case 'seek':
                if (isNaN(position) || position < 0 || (audioPlayer.duration && position > audioPlayer.duration)) {
                    console.error('Invalid seek position:', position);
                    return;
                }
                try {
                    audioPlayer.currentTime = position;
                    console.log('Seek successful to position:', position);
                    // If we were playing before seeking, ensure we're still playing
                    if (isPlaying && audioPlayer.paused) {
                        audioPlayer.play().catch(err => {
                            console.error('Error resuming playback after seek:', err);
                        });
                    }
                } catch (err) {
                    console.error('Error during seek operation:', err);
                }
                break;
                
            case 'stop':
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                isPlaying = false;
                currentTrack = null;
                currentTrackName.textContent = 'No track playing';
                currentTrackAddedBy.textContent = '-';
                updatePlayPauseButton();
                updatePlaylistUI();
                stopVisualization();
                break;
        }
    }

    // Update the play/pause button icon
    function updatePlayPauseButton() {
        if (isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    // Update the previous and next buttons based on playlist position
    function updateNavigationButtons() {
        if (!currentTrack || playlist.length <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }
        
        const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
        
        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= playlist.length - 1;
    }

    // Update the playlist UI
    function updatePlaylistUI() {
        // Clear the playlist container
        playlistContainer.innerHTML = '';
        
        if (playlist.length === 0) {
            // Show empty playlist message
            playlistContainer.innerHTML = `
                <div class="text-gray-400 text-center py-8">
                    <i class="fas fa-music text-4xl mb-2 opacity-30"></i>
                    <p>No tracks added yet</p>
                    <p class="text-sm">Upload a track to get started</p>
                </div>
            `;
            return;
        }
        
        // Add each track to the playlist
        playlist.forEach((track, index) => {
            const isActive = currentTrack && currentTrack.id === track.id;
            
            const trackElement = document.createElement('div');
            trackElement.className = `track-item p-3 rounded-lg ${isActive ? 'active' : 'bg-gray-700'} hover:bg-gray-600 transition cursor-pointer`;
            trackElement.dataset.trackId = track.id;
            trackElement.dataset.index = index;
            
            trackElement.innerHTML = `
                <div class="flex items-center">
                    <div class="mr-3 text-lg ${isActive ? 'text-indigo-400' : 'text-gray-400'}">
                        ${isActive ? '<i class="fas fa-volume-up"></i>' : `<span>${index + 1}</span>`}
                    </div>
                    <div class="flex-grow">
                        <div class="font-medium ${isActive ? 'text-indigo-300' : 'text-white'} truncate">${track.name}</div>
                        <div class="text-sm text-gray-400">Added by ${track.added_by}</div>
                    </div>
                    ${isHost || track.added_by === username ? `
                        <button class="remove-track-btn text-gray-400 hover:text-red-500 transition">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;
            
            // Add click event to play the track
            trackElement.addEventListener('click', (e) => {
                // Ignore if clicking the remove button
                if (e.target.closest('.remove-track-btn')) return;
                
                if (isHost) {
                    socket.emit('play', {
                        room_id: roomId,
                        track_id: track.id,
                        position: 0
                    });
                } else {
                    showToast('Only the host can control playback', 'error');
                }
            });
            
            // Add click event to remove button if present
            const removeBtn = trackElement.querySelector('.remove-track-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    socket.emit('remove_track', {
                        room_id: roomId,
                        track_id: track.id,
                        username: username
                    });
                });
            }
            
            playlistContainer.appendChild(trackElement);
        });
        
        // Update navigation buttons
        updateNavigationButtons();
    }

    // Add a participant to the UI
    function addParticipant(name, isRoomHost) {
        // Check if participant already exists
        if (participants.includes(name)) return;
        
        participants.push(name);
        
        const participantElement = document.createElement('div');
        participantElement.className = `participant-badge px-3 py-1 rounded-full ${isRoomHost ? 'bg-purple-600 host-badge' : 'bg-gray-700'} text-white text-sm`;
        participantElement.dataset.username = name;
        participantElement.innerHTML = `
            <i class="fas ${isRoomHost ? 'fa-crown' : 'fa-user'} mr-1"></i>
            <span>${name}</span>
        `;
        
        participantsContainer.appendChild(participantElement);
    }

    // Remove a participant from the UI
    function removeParticipant(name) {
        const index = participants.indexOf(name);
        if (index !== -1) {
            participants.splice(index, 1);
        }
        
        const participantElement = participantsContainer.querySelector(`[data-username="${name}"]`);
        if (participantElement) {
            participantElement.remove();
        }
    }

    // Reset the file input
    function resetFileInput() {
        fileInput.value = '';
        filePreview.classList.add('hidden');
        fileName.textContent = '';
        submitUpload.disabled = true;
    }

    // Format time in seconds to MM:SS format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Show a toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast px-4 py-2 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-600' : 'bg-indigo-600'} text-white`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Set up audio visualizer
    function setupVisualizer() {
        // Create canvas for visualizer
        const canvas = document.createElement('canvas');
        canvas.width = trackVisualizer.clientWidth;
        canvas.height = trackVisualizer.clientHeight;
        trackVisualizer.innerHTML = '';
        trackVisualizer.appendChild(canvas);
        
        visualizerContext = canvas.getContext('2d');
        
        // Create visualizer bars
        const barCount = 64;
        const barWidth = canvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar absolute bottom-0';
            bar.style.width = `${barWidth - 2}px`;
            bar.style.height = '0px';
            bar.style.left = `${i * barWidth}px`;
            visualizerBars.push(bar);
            trackVisualizer.appendChild(bar);
        }
    }

    // Start audio visualization
    function startVisualization() {
        if (!visualizerAnalyser) return;
        
        const bufferLength = visualizerAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function animate() {
            if (!isPlaying) return;
            
            requestAnimationFrame(animate);
            visualizerAnalyser.getByteFrequencyData(dataArray);
            
            // Update visualizer bars
            const barCount = visualizerBars.length;
            const step = Math.floor(bufferLength / barCount);
            
            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step];
                const height = (value / 255) * trackVisualizer.clientHeight * 0.8;
                visualizerBars[i].style.height = `${height}px`;
            }
        }
        
        animate();
    }

    // Stop audio visualization
    function stopVisualization() {
        visualizerBars.forEach(bar => {
            bar.style.height = '0px';
        });
    }

    // Update progress bar and time display
    function updateProgressBar() {
        if (!audioPlayer.duration || isNaN(audioPlayer.duration) || isNaN(audioPlayer.currentTime)) return;
        
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        const progress = Math.max(0, Math.min(100, (currentTime / duration) * 100));
        
        // Update progress bar width
        progressBar.style.width = `${progress}%`;
        
        // Update time displays
        document.getElementById('currentTime').textContent = formatTime(currentTime);
        document.getElementById('totalTime').textContent = formatTime(duration);
        
        // Debug log if position is near the end
        if (currentTime > duration - 1) {
            console.log('Near end of track:', currentTime, '/', duration);
        }
    }
    
    // Add timeupdate event listener to audio player
    audioPlayer.addEventListener('timeupdate', updateProgressBar);
    
    // Add loadedmetadata event listener to update duration
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log('Audio metadata loaded, duration:', audioPlayer.duration);
        document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
    });
    
    // Add ended event listener to handle track completion
    audioPlayer.addEventListener('ended', () => {
        console.log('Track ended');
        if (isHost) {
            // Automatically play the next track if available
            socket.emit('skip', { room_id: roomId });
        } else {
            isPlaying = false;
            updatePlayPauseButton();
            stopVisualization();
        }
    });
    
    // Initialize the application
    init();
});