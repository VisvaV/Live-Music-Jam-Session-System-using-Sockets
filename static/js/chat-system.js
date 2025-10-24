/**
 * Real-time Chat System
 * Implements live chat for all participants with emoji reactions
 */

class ChatSystem {
    constructor() {
        this.messages = [];
        this.maxMessages = 100;
        this.isChatOpen = false;
        this.typingUsers = new Set();
        this.typingTimeout = null;
        
        this.initializeChat();
    }
    
    initializeChat() {
        // Listen for chat events from server
        if (window.socket) {
            socket.on('chat_message', (data) => {
                this.handleMessage(data);
            });
            
            socket.on('user_typing', (data) => {
                this.handleTyping(data);
            });
            
            socket.on('user_stopped_typing', (data) => {
                this.handleStoppedTyping(data);
            });
            
            socket.on('chat_reaction', (data) => {
                this.handleReaction(data);
            });
        }
        
        this.setupChatUI();
    }
    
    setupChatUI() {
        // Create chat toggle button
        this.createChatToggle();
        
        // Create chat container
        this.createChatContainer();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    createChatToggle() {
        const chatToggle = document.createElement('button');
        chatToggle.id = 'chatToggle';
        chatToggle.className = 'chat-toggle bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm transition';
        chatToggle.innerHTML = `
            <i class="fas fa-comments mr-1"></i>
            Chat <span id="unreadCount" class="hidden bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">0</span>
        `;
        
        // Add to participants section
        const participantsSection = document.querySelector('#participantsContainer').parentElement;
        participantsSection.appendChild(chatToggle);
    }
    
    createChatContainer() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatContainer';
        chatContainer.className = 'chat-container hidden fixed bottom-4 right-4 w-80 h-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 flex flex-col z-50';
        chatContainer.innerHTML = `
            <div class="chat-header bg-gray-700 p-3 rounded-t-lg flex justify-between items-center">
                <h3 class="text-lg font-medium">Chat</h3>
                <button id="closeChat" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="chatMessages" class="chat-messages flex-1 overflow-y-auto p-3 space-y-2">
                <!-- Messages will be added here -->
            </div>
            <div class="chat-input p-3 border-t border-gray-700">
                <div id="typingIndicator" class="typing-indicator text-sm text-gray-400 mb-2 hidden">
                    <!-- Typing users will be shown here -->
                </div>
                <div class="flex space-x-2">
                    <input type="text" id="chatInput" placeholder="Type a message..." 
                           class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <button id="sendMessage" class="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-sm">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="emoji-picker mt-2 flex space-x-1">
                    <button class="emoji-btn" data-emoji="😀">😀</button>
                    <button class="emoji-btn" data-emoji="😂">😂</button>
                    <button class="emoji-btn" data-emoji="❤️">❤️</button>
                    <button class="emoji-btn" data-emoji="🔥">🔥</button>
                    <button class="emoji-btn" data-emoji="👍">👍</button>
                    <button class="emoji-btn" data-emoji="👎">👎</button>
                    <button class="emoji-btn" data-emoji="🎵">🎵</button>
                    <button class="emoji-btn" data-emoji="🎉">🎉</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatContainer);
    }
    
    setupEventListeners() {
        const chatToggle = document.getElementById('chatToggle');
        const closeChat = document.getElementById('closeChat');
        const chatInput = document.getElementById('chatInput');
        const sendMessage = document.getElementById('sendMessage');
        const emojiBtns = document.querySelectorAll('.emoji-btn');
        
        // Toggle chat
        chatToggle.addEventListener('click', () => {
            this.toggleChat();
        });
        
        closeChat.addEventListener('click', () => {
            this.closeChat();
        });
        
        // Send message
        sendMessage.addEventListener('click', () => {
            this.sendMessage();
        });
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else {
                this.handleTyping();
            }
        });
        
        // Emoji buttons
        emojiBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                chatInput.value += emoji;
                chatInput.focus();
            });
        });
    }
    
    toggleChat() {
        const chatContainer = document.getElementById('chatContainer');
        const chatToggle = document.getElementById('chatToggle');
        
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        const chatContainer = document.getElementById('chatContainer');
        const chatToggle = document.getElementById('chatToggle');
        
        chatContainer.classList.remove('hidden');
        chatToggle.classList.add('active');
        this.isChatOpen = true;
        
        // Clear unread count
        this.clearUnreadCount();
        
        // Focus input
        document.getElementById('chatInput').focus();
    }
    
    closeChat() {
        const chatContainer = document.getElementById('chatContainer');
        const chatToggle = document.getElementById('chatToggle');
        
        chatContainer.classList.add('hidden');
        chatToggle.classList.remove('active');
        this.isChatOpen = false;
    }
    
    sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Send to server
        if (window.socket) {
            socket.emit('chat_message', {
                message: message,
                username: window.username,
                room_id: window.roomId,
                timestamp: Date.now()
            });
        }
        
        // Clear input
        chatInput.value = '';
        
        // Stop typing indicator
        this.stopTyping();
    }
    
    handleMessage(data) {
        const { message, username, timestamp, reactions = {} } = data;
        
        // Add to messages array
        this.messages.push({
            id: Date.now() + Math.random(),
            message,
            username,
            timestamp,
            reactions
        });
        
        // Keep only recent messages
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        
        // Update UI
        this.updateChatUI();
        
        // Show notification if chat is closed
        if (!this.isChatOpen) {
            this.showUnreadNotification(username, message);
        }
    }
    
    updateChatUI() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        this.messages.forEach(msg => {
            const messageElement = this.createMessageElement(msg);
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    createMessageElement(msg) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message bg-gray-700 p-2 rounded-lg';
        messageElement.dataset.messageId = msg.id;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="font-medium text-indigo-400">${msg.username}</span>
                <span class="text-xs text-gray-400">${time}</span>
            </div>
            <div class="message-text text-white mb-2">${this.formatMessage(msg.message)}</div>
            <div class="message-reactions flex space-x-1">
                ${Object.entries(msg.reactions).map(([emoji, users]) => 
                    `<button class="reaction-btn" data-emoji="${emoji}" data-message-id="${msg.id}">
                        <span class="emoji">${emoji}</span>
                        <span class="count">${users.length}</span>
                    </button>`
                ).join('')}
                <button class="add-reaction-btn" data-message-id="${msg.id}">
                    <i class="fas fa-plus text-gray-400"></i>
                </button>
            </div>
        `;
        
        // Add reaction event listeners
        messageElement.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addReaction(msg.id, btn.dataset.emoji);
            });
        });
        
        messageElement.querySelector('.add-reaction-btn').addEventListener('click', () => {
            this.showReactionPicker(msg.id);
        });
        
        return messageElement;
    }
    
    formatMessage(message) {
        // Simple formatting for links and mentions
        return message
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-indigo-400 hover:underline">$1</a>')
            .replace(/@(\w+)/g, '<span class="text-indigo-300 font-medium">@$1</span>');
    }
    
    handleTyping() {
        if (window.socket) {
            socket.emit('user_typing', {
                username: window.username,
                room_id: window.roomId
            });
        }
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set timeout to stop typing
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }
    
    stopTyping() {
        if (window.socket) {
            socket.emit('user_stopped_typing', {
                username: window.username,
                room_id: window.roomId
            });
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }
    
    handleTyping(data) {
        if (data.username !== window.username) {
            this.typingUsers.add(data.username);
            this.updateTypingIndicator();
        }
    }
    
    handleStoppedTyping(data) {
        if (data.username !== window.username) {
            this.typingUsers.delete(data.username);
            this.updateTypingIndicator();
        }
    }
    
    updateTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        
        if (this.typingUsers.size > 0) {
            const users = Array.from(this.typingUsers);
            const text = users.length === 1 ? 
                `${users[0]} is typing...` : 
                `${users.slice(0, -1).join(', ')} and ${users[users.length - 1]} are typing...`;
            
            typingIndicator.textContent = text;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    }
    
    addReaction(messageId, emoji) {
        if (window.socket) {
            socket.emit('chat_reaction', {
                message_id: messageId,
                emoji: emoji,
                username: window.username,
                room_id: window.roomId
            });
        }
    }
    
    handleReaction(data) {
        const { message_id, emoji, username, action } = data;
        
        const message = this.messages.find(m => m.id == message_id);
        if (!message) return;
        
        if (!message.reactions) {
            message.reactions = {};
        }
        
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
        }
        
        if (action === 'add') {
            if (!message.reactions[emoji].includes(username)) {
                message.reactions[emoji].push(username);
            }
        } else if (action === 'remove') {
            message.reactions[emoji] = message.reactions[emoji].filter(u => u !== username);
            if (message.reactions[emoji].length === 0) {
                delete message.reactions[emoji];
            }
        }
        
        this.updateChatUI();
    }
    
    showReactionPicker(messageId) {
        // Simple emoji picker
        const emojis = ['😀', '😂', '❤️', '🔥', '👍', '👎', '🎵', '🎉', '😢', '😡'];
        
        const picker = document.createElement('div');
        picker.className = 'emoji-picker-popup absolute bg-gray-700 p-2 rounded-lg shadow-lg z-10';
        picker.innerHTML = emojis.map(emoji => 
            `<button class="emoji-picker-btn" data-emoji="${emoji}">${emoji}</button>`
        ).join('');
        
        // Add event listeners
        picker.querySelectorAll('.emoji-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addReaction(messageId, btn.dataset.emoji);
                picker.remove();
            });
        });
        
        // Position and show
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        messageElement.appendChild(picker);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (picker.parentNode) {
                picker.remove();
            }
        }, 5000);
    }
    
    showUnreadNotification(username, message) {
        const unreadCount = document.getElementById('unreadCount');
        const currentCount = parseInt(unreadCount.textContent) || 0;
        unreadCount.textContent = currentCount + 1;
        unreadCount.classList.remove('hidden');
    }
    
    clearUnreadCount() {
        const unreadCount = document.getElementById('unreadCount');
        unreadCount.textContent = '0';
        unreadCount.classList.add('hidden');
    }
    
    getChatStats() {
        return {
            totalMessages: this.messages.length,
            activeUsers: new Set(this.messages.map(m => m.username)).size,
            recentActivity: this.messages.slice(-10)
        };
    }
}

// Initialize chat system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chatSystem = new ChatSystem();
});
