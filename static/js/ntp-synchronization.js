/**
 * NTP Integration and Jitter Buffer System
 * Provides advanced synchronization using Network Time Protocol concepts
 */

class NTPSynchronization {
    constructor() {
        this.serverTimeOffset = 0;
        this.roundTripTime = 0;
        this.jitterBuffer = [];
        this.maxJitterBufferSize = 100;
        this.jitterThreshold = 50; // ms
        this.syncInterval = 30000; // 30 seconds
        this.lastSyncTime = 0;
        this.syncAccuracy = 0;
        
        // NTP-like timestamp structure
        this.ntpEpoch = new Date('1900-01-01T00:00:00Z').getTime();
        
        this.initializeSynchronization();
    }
    
    initializeSynchronization() {
        // Perform initial time synchronization
        this.synchronizeTime();
        
        // Set up periodic synchronization
        setInterval(() => {
            this.synchronizeTime();
        }, this.syncInterval);
        
        // Monitor jitter and adjust buffer
        setInterval(() => {
            this.adjustJitterBuffer();
        }, 1000);
    }
    
    async synchronizeTime() {
        try {
            const syncResults = [];
            const numSyncs = 3; // Perform multiple syncs for accuracy
            
            for (let i = 0; i < numSyncs; i++) {
                const result = await this.performNTPSync();
                if (result) {
                    syncResults.push(result);
                }
                // Small delay between syncs
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (syncResults.length > 0) {
                this.calculateTimeOffset(syncResults);
                this.updateSyncAccuracy(syncResults);
                this.lastSyncTime = Date.now();
                
                console.log(`Time synchronized. Offset: ${this.serverTimeOffset}ms, Accuracy: ${this.syncAccuracy}ms`);
            }
        } catch (error) {
            console.error('Time synchronization failed:', error);
        }
    }
    
    async performNTPSync() {
        return new Promise((resolve) => {
            const t1 = this.getNTPTimestamp(); // Client send time
            const clientSendTime = Date.now();
            
            // Send sync request to server
            if (window.socket) {
                socket.emit('ntp_sync_request', { t1: t1, client_time: clientSendTime });
                
                socket.once('ntp_sync_response', (data) => {
                    const t4 = this.getNTPTimestamp(); // Client receive time
                    const clientReceiveTime = Date.now();
                    
                    const result = {
                        t1: t1,
                        t2: data.t2, // Server receive time
                        t3: data.t3, // Server send time
                        t4: t4,
                        client_send: clientSendTime,
                        client_receive: clientReceiveTime,
                        server_receive: data.server_receive_time,
                        server_send: data.server_send_time
                    };
                    
                    resolve(result);
                });
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    resolve(null);
                }, 5000);
            } else {
                resolve(null);
            }
        });
    }
    
    calculateTimeOffset(syncResults) {
        let totalOffset = 0;
        let validResults = 0;
        
        syncResults.forEach(result => {
            if (result) {
                // Calculate offset using NTP algorithm
                const offset = ((result.t2 - result.t1) + (result.t3 - result.t4)) / 2;
                const delay = (result.t4 - result.t1) - (result.t3 - result.t2);
                
                // Only use results with reasonable delay
                if (delay > 0 && delay < 1000) { // Less than 1 second delay
                    totalOffset += offset;
                    validResults++;
                }
            }
        });
        
        if (validResults > 0) {
            this.serverTimeOffset = totalOffset / validResults;
            this.roundTripTime = syncResults.reduce((sum, result) => {
                return sum + ((result.t4 - result.t1) - (result.t3 - result.t2));
            }, 0) / validResults;
        }
    }
    
    updateSyncAccuracy(syncResults) {
        if (syncResults.length < 2) return;
        
        const offsets = syncResults.map(result => {
            return ((result.t2 - result.t1) + (result.t3 - result.t4)) / 2;
        });
        
        const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
        const variance = offsets.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / offsets.length;
        this.syncAccuracy = Math.sqrt(variance);
    }
    
    getNTPTimestamp() {
        const now = Date.now();
        const ntpTime = (now - this.ntpEpoch) / 1000;
        return ntpTime;
    }
    
    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }
    
    getTimeOffset() {
        return this.serverTimeOffset;
    }
    
    getSyncAccuracy() {
        return this.syncAccuracy;
    }
    
    // Jitter Buffer Management
    addToJitterBuffer(timestamp, data) {
        const entry = {
            timestamp: timestamp,
            data: data,
            receivedTime: Date.now()
        };
        
        this.jitterBuffer.push(entry);
        
        // Keep buffer size manageable
        if (this.jitterBuffer.length > this.maxJitterBufferSize) {
            this.jitterBuffer.shift();
        }
        
        // Sort buffer by timestamp
        this.jitterBuffer.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    adjustJitterBuffer() {
        if (this.jitterBuffer.length < 2) return;
        
        // Calculate jitter (variation in packet arrival times)
        const arrivalTimes = this.jitterBuffer.map(entry => entry.receivedTime);
        const jitter = this.calculateJitter(arrivalTimes);
        
        // Adjust buffer size based on jitter
        if (jitter > this.jitterThreshold) {
            // Increase buffer size to handle high jitter
            this.maxJitterBufferSize = Math.min(200, this.maxJitterBufferSize + 10);
        } else {
            // Decrease buffer size for low jitter
            this.maxJitterBufferSize = Math.max(50, this.maxJitterBufferSize - 5);
        }
        
        // Update UI
        this.updateJitterUI(jitter);
    }
    
    calculateJitter(arrivalTimes) {
        if (arrivalTimes.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < arrivalTimes.length; i++) {
            intervals.push(arrivalTimes[i] - arrivalTimes[i - 1]);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / intervals.length;
        
        return Math.sqrt(variance);
    }
    
    updateJitterUI(jitter) {
        const jitterElement = document.getElementById('jitterValue');
        const bufferElement = document.getElementById('bufferSize');
        
        if (jitterElement) {
            jitterElement.textContent = `${Math.round(jitter)}ms`;
        }
        
        if (bufferElement) {
            bufferElement.textContent = this.maxJitterBufferSize;
        }
        
        // Update jitter indicator
        const indicator = document.getElementById('jitterIndicator');
        if (indicator) {
            if (jitter > this.jitterThreshold) {
                indicator.className = 'jitter-indicator high';
            } else if (jitter > this.jitterThreshold / 2) {
                indicator.className = 'jitter-indicator medium';
            } else {
                indicator.className = 'jitter-indicator low';
            }
        }
    }
    
    // Synchronize audio playback with server time
    synchronizeAudioPlayback(audioElement, serverPlayTime, serverPosition) {
        const clientTime = this.getServerTime();
        const timeDifference = serverPlayTime - clientTime;
        
        // Adjust audio position based on time difference
        const adjustedPosition = serverPosition + (timeDifference / 1000);
        
        if (adjustedPosition >= 0 && adjustedPosition < audioElement.duration) {
            audioElement.currentTime = adjustedPosition;
        }
        
        return adjustedPosition;
    }
    
    // Get synchronized timestamp for events
    getSynchronizedTimestamp() {
        return this.getServerTime();
    }
    
    // Check if synchronization is accurate enough
    isSynchronized() {
        return Math.abs(this.serverTimeOffset) < 100 && this.syncAccuracy < 50;
    }
    
    // Get synchronization status
    getSyncStatus() {
        return {
            offset: this.serverTimeOffset,
            accuracy: this.syncAccuracy,
            roundTripTime: this.roundTripTime,
            lastSync: this.lastSyncTime,
            isSynchronized: this.isSynchronized(),
            jitterBufferSize: this.maxJitterBufferSize
        };
    }
    
    // Force resynchronization
    forceResync() {
        console.log('Forcing time resynchronization...');
        this.synchronizeTime();
    }
}

// Initialize NTP synchronization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.ntpSync = new NTPSynchronization();
    
    // Add synchronization status to UI
    setInterval(() => {
        const status = window.ntpSync.getSyncStatus();
        const statusElement = document.getElementById('syncStatus');
        
        if (statusElement) {
            if (status.isSynchronized) {
                statusElement.textContent = 'Synchronized';
                statusElement.className = 'sync-status synchronized';
            } else {
                statusElement.textContent = 'Syncing...';
                statusElement.className = 'sync-status syncing';
            }
        }
    }, 1000);
});
