document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const createTabBtn = document.getElementById('createTabBtn');
    const joinTabBtn = document.getElementById('joinTabBtn');
    const createRoomForm = document.getElementById('createRoomForm');
    const joinRoomForm = document.getElementById('joinRoomForm');
    const createForm = document.getElementById('createForm');
    const joinForm = document.getElementById('joinForm');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Tab switching functionality
    createTabBtn.addEventListener('click', function() {
        createTabBtn.classList.remove('bg-gray-700');
        createTabBtn.classList.add('bg-indigo-600');
        joinTabBtn.classList.remove('bg-indigo-600');
        joinTabBtn.classList.add('bg-gray-700');
        
        createRoomForm.classList.remove('hidden');
        joinRoomForm.classList.add('hidden');
    });

    joinTabBtn.addEventListener('click', function() {
        joinTabBtn.classList.remove('bg-gray-700');
        joinTabBtn.classList.add('bg-indigo-600');
        createTabBtn.classList.remove('bg-indigo-600');
        createTabBtn.classList.add('bg-gray-700');
        
        joinRoomForm.classList.remove('hidden');
        createRoomForm.classList.add('hidden');
    });

    // Create Room Form Submission
    createForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('createUsername').value.trim();
        
        if (!username) {
            showToast('Please enter your name', 'error');
            return;
        }
        
        showLoading();
        
        // Send request to create room
        fetch('/create-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}`
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            
            // Redirect to the room page
            window.location.href = `/room/${data.room_id}`;
        })
        .catch(error => {
            hideLoading();
            showToast('An error occurred. Please try again.', 'error');
            console.error('Error:', error);
        });
    });

    // Join Room Form Submission
    joinForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('joinUsername').value.trim();
        const roomId = document.getElementById('roomId').value.trim();
        
        if (!username) {
            showToast('Please enter your name', 'error');
            return;
        }
        
        if (!roomId) {
            showToast('Please enter a room ID', 'error');
            return;
        }
        
        showLoading();
        
        // Send request to join room
        fetch('/join-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}&room_id=${encodeURIComponent(roomId)}`
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            
            // Redirect to the room page
            window.location.href = `/room/${data.room_id}`;
        })
        .catch(error => {
            hideLoading();
            showToast('An error occurred. Please try again.', 'error');
            console.error('Error:', error);
        });
    });

    // Helper functions
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${type === 'error' ? 'bg-red-600' : 'bg-indigo-600'} text-white`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
});