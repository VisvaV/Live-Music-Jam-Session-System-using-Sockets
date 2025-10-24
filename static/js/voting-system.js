/**
 * Track Voting System
 * Implements upvoting/downvoting for tracks with real-time updates
 */

class VotingSystem {
    constructor() {
        this.votes = new Map(); // trackId -> { upvotes: number, downvotes: number, userVotes: Map }
        this.userVotes = new Map(); // userId -> Map(trackId -> vote)
        this.voteHistory = [];
        this.maxVoteHistory = 100;
        
        this.initializeVoting();
    }
    
    initializeVoting() {
        // Listen for voting events from server
        if (window.socket) {
            socket.on('track_voted', (data) => {
                this.handleVoteUpdate(data);
            });
            
            socket.on('vote_sync', (data) => {
                this.syncVotes(data);
            });
        }
        
        // Update UI periodically
        setInterval(() => {
            this.updateVoteUI();
        }, 1000);
    }
    
    vote(trackId, voteType, username) {
        if (!trackId || !voteType || !username) return;
        
        // Check if user already voted on this track
        const existingVote = this.getUserVote(username, trackId);
        
        // If same vote, remove it (toggle)
        if (existingVote === voteType) {
            this.removeVote(trackId, username);
            return;
        }
        
        // Remove previous vote if exists
        if (existingVote) {
            this.removeVote(trackId, username);
        }
        
        // Add new vote
        this.addVote(trackId, voteType, username);
        
        // Emit to server
        if (window.socket) {
            socket.emit('vote_track', {
                track_id: trackId,
                vote_type: voteType,
                username: username,
                room_id: window.roomId
            });
        }
        
        // Show vote notification
        this.showVoteNotification(trackId, voteType, username);
    }
    
    addVote(trackId, voteType, username) {
        if (!this.votes.has(trackId)) {
            this.votes.set(trackId, {
                upvotes: 0,
                downvotes: 0,
                userVotes: new Map()
            });
        }
        
        const trackVotes = this.votes.get(trackId);
        
        if (voteType === 'upvote') {
            trackVotes.upvotes++;
        } else if (voteType === 'downvote') {
            trackVotes.downvotes++;
        }
        
        trackVotes.userVotes.set(username, voteType);
        
        // Update user's vote record
        if (!this.userVotes.has(username)) {
            this.userVotes.set(username, new Map());
        }
        this.userVotes.get(username).set(trackId, voteType);
        
        // Add to history
        this.addToVoteHistory(trackId, voteType, username, 'add');
    }
    
    removeVote(trackId, username) {
        const trackVotes = this.votes.get(trackId);
        if (!trackVotes) return;
        
        const userVote = trackVotes.userVotes.get(username);
        if (!userVote) return;
        
        if (userVote === 'upvote') {
            trackVotes.upvotes--;
        } else if (userVote === 'downvote') {
            trackVotes.downvotes--;
        }
        
        trackVotes.userVotes.delete(username);
        this.userVotes.get(username)?.delete(trackId);
        
        // Add to history
        this.addToVoteHistory(trackId, userVote, username, 'remove');
    }
    
    getUserVote(username, trackId) {
        return this.userVotes.get(username)?.get(trackId) || null;
    }
    
    getTrackVotes(trackId) {
        return this.votes.get(trackId) || { upvotes: 0, downvotes: 0, userVotes: new Map() };
    }
    
    getVoteScore(trackId) {
        const votes = this.getTrackVotes(trackId);
        return votes.upvotes - votes.downvotes;
    }
    
    addToVoteHistory(trackId, voteType, username, action) {
        this.voteHistory.push({
            trackId,
            voteType,
            username,
            action,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.voteHistory.length > this.maxVoteHistory) {
            this.voteHistory.shift();
        }
    }
    
    handleVoteUpdate(data) {
        const { track_id, vote_type, username, action } = data;
        
        if (action === 'add') {
            this.addVote(track_id, vote_type, username);
        } else if (action === 'remove') {
            this.removeVote(track_id, username);
        }
        
        this.updateVoteUI();
    }
    
    syncVotes(voteData) {
        this.votes.clear();
        this.userVotes.clear();
        
        // Restore votes from server data
        Object.entries(voteData).forEach(([trackId, votes]) => {
            this.votes.set(trackId, {
                upvotes: votes.upvotes || 0,
                downvotes: votes.downvotes || 0,
                userVotes: new Map(Object.entries(votes.userVotes || {}))
            });
        });
        
        this.updateVoteUI();
    }
    
    updateVoteUI() {
        // Update vote buttons for all tracks
        document.querySelectorAll('.track-item').forEach(trackElement => {
            const trackId = trackElement.dataset.trackId;
            if (!trackId) return;
            
            const votes = this.getTrackVotes(trackId);
            const score = this.getVoteScore(trackId);
            const currentUser = window.username;
            const userVote = this.getUserVote(currentUser, trackId);
            
            // Update vote buttons
            const upvoteBtn = trackElement.querySelector('.upvote-btn');
            const downvoteBtn = trackElement.querySelector('.downvote-btn');
            const scoreElement = trackElement.querySelector('.vote-score');
            
            if (upvoteBtn) {
                upvoteBtn.classList.toggle('active', userVote === 'upvote');
                upvoteBtn.querySelector('.count').textContent = votes.upvotes;
            }
            
            if (downvoteBtn) {
                downvoteBtn.classList.toggle('active', userVote === 'downvote');
                downvoteBtn.querySelector('.count').textContent = votes.downvotes;
            }
            
            if (scoreElement) {
                scoreElement.textContent = score;
                scoreElement.className = `vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'}`;
            }
        });
    }
    
    showVoteNotification(trackId, voteType, username) {
        const trackElement = document.querySelector(`[data-track-id="${trackId}"]`);
        if (!trackElement) return;
        
        const trackName = trackElement.querySelector('.track-name')?.textContent || 'Track';
        const emoji = voteType === 'upvote' ? '👍' : '👎';
        
        const notification = document.createElement('div');
        notification.className = `vote-notification ${voteType}`;
        notification.innerHTML = `
            <div class="vote-notification-content">
                <span class="vote-emoji">${emoji}</span>
                <span class="vote-text">${username} ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} "${trackName}"</span>
            </div>
        `;
        
        // Add to notification container
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }
    
    getTopTracks(limit = 5) {
        const tracks = Array.from(this.votes.entries()).map(([trackId, votes]) => ({
            trackId,
            score: votes.upvotes - votes.downvotes,
            upvotes: votes.upvotes,
            downvotes: votes.downvotes
        }));
        
        return tracks
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    
    getVoteStats() {
        const totalVotes = Array.from(this.votes.values()).reduce((sum, votes) => 
            sum + votes.upvotes + votes.downvotes, 0);
        
        const mostVotedTrack = Array.from(this.votes.entries())
            .reduce((max, [trackId, votes]) => {
                const score = votes.upvotes - votes.downvotes;
                return score > max.score ? { trackId, score } : max;
            }, { trackId: null, score: -Infinity });
        
        return {
            totalVotes,
            mostVotedTrack: mostVotedTrack.trackId,
            averageScore: totalVotes > 0 ? 
                Array.from(this.votes.values()).reduce((sum, votes) => 
                    sum + (votes.upvotes - votes.downvotes), 0) / this.votes.size : 0
        };
    }
    
    // Export voting data
    exportVotes() {
        const voteData = {};
        this.votes.forEach((votes, trackId) => {
            voteData[trackId] = {
                upvotes: votes.upvotes,
                downvotes: votes.downvotes,
                userVotes: Object.fromEntries(votes.userVotes)
            };
        });
        return voteData;
    }
}

// Initialize voting system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.votingSystem = new VotingSystem();
});
