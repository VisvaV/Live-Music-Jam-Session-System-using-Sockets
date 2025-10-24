/**
 * Adaptive Bitrate Streaming System
 * Automatically adjusts audio quality based on network conditions
 */

class AdaptiveStreaming {
    constructor() {
        this.qualityLevels = {
            low: {
                bitrate: 128,
                sampleRate: 22050,
                channels: 1,
                description: 'Low Quality (128 kbps)'
            },
            medium: {
                bitrate: 192,
                sampleRate: 44100,
                channels: 2,
                description: 'Medium Quality (192 kbps)'
            },
            high: {
                bitrate: 320,
                sampleRate: 44100,
                channels: 2,
                description: 'High Quality (320 kbps)'
            }
        };
        
        this.currentQuality = 'medium';
        this.previousQuality = 'medium';
        this.qualityHistory = [];
        this.adaptationEnabled = true;
        this.qualityChangeCooldown = 10000; // 10 seconds
        this.lastQualityChange = 0;
        
        this.initializeAdaptation();
    }
    
    initializeAdaptation() {
        // Monitor network conditions and adapt quality
        setInterval(() => {
            if (this.adaptationEnabled) {
                this.adaptQuality();
            }
        }, 5000);
        
        // Listen for network quality changes
        if (window.networkMonitor) {
            this.monitorNetworkQuality();
        }
    }
    
    monitorNetworkQuality() {
        // Get network stats from the network monitor
        const networkStats = window.networkMonitor.getNetworkStats();
        
        // Determine optimal quality based on network conditions
        let recommendedQuality = this.recommendQuality(networkStats);
        
        // Apply quality change if needed
        if (recommendedQuality !== this.currentQuality) {
            this.changeQuality(recommendedQuality);
        }
    }
    
    recommendQuality(networkStats) {
        const { latency, bandwidth, quality } = networkStats;
        
        // Quality recommendation logic
        if (quality === 'excellent' && bandwidth > 1000) {
            return 'high';
        } else if (quality === 'good' && bandwidth > 500) {
            return 'medium';
        } else if (quality === 'fair' && bandwidth > 200) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    changeQuality(newQuality) {
        const now = Date.now();
        
        // Prevent too frequent quality changes
        if (now - this.lastQualityChange < this.qualityChangeCooldown) {
            return;
        }
        
        if (newQuality !== this.currentQuality) {
            this.previousQuality = this.currentQuality;
            this.currentQuality = newQuality;
            this.lastQualityChange = now;
            
            // Log quality change
            console.log(`Quality changed from ${this.previousQuality} to ${this.currentQuality}`);
            
            // Update UI
            this.updateQualityUI();
            
            // Notify other components
            this.notifyQualityChange();
            
            // Store in history
            this.qualityHistory.push({
                quality: newQuality,
                timestamp: now,
                reason: 'network_adaptation'
            });
            
            // Keep only recent history
            if (this.qualityHistory.length > 20) {
                this.qualityHistory.shift();
            }
        }
    }
    
    updateQualityUI() {
        const qualityElement = document.getElementById('streamingQuality');
        const qualityIndicator = document.getElementById('qualityIndicator');
        
        if (qualityElement) {
            qualityElement.textContent = this.qualityLevels[this.currentQuality].description;
            qualityElement.className = `streaming-quality ${this.currentQuality}`;
        }
        
        if (qualityIndicator) {
            qualityIndicator.className = `quality-indicator ${this.currentQuality}`;
        }
        
        // Show quality change notification
        this.showQualityChangeNotification();
    }
    
    showQualityChangeNotification() {
        const notification = document.createElement('div');
        notification.className = `quality-notification ${this.currentQuality}`;
        notification.innerHTML = `
            <div class="quality-notification-content">
                <i class="fas fa-signal"></i>
                <span>Streaming quality: ${this.qualityLevels[this.currentQuality].description}</span>
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
    
    notifyQualityChange() {
        // Emit quality change event
        if (window.socket) {
            socket.emit('quality_change', {
                quality: this.currentQuality,
                previous_quality: this.previousQuality,
                timestamp: Date.now()
            });
        }
        
        // Trigger custom event
        const event = new CustomEvent('qualityChanged', {
            detail: {
                quality: this.currentQuality,
                previousQuality: this.previousQuality
            }
        });
        window.dispatchEvent(event);
    }
    
    getCurrentQuality() {
        return this.currentQuality;
    }
    
    getQualityLevels() {
        return this.qualityLevels;
    }
    
    setQuality(quality) {
        if (this.qualityLevels[quality]) {
            this.changeQuality(quality);
        }
    }
    
    enableAdaptation() {
        this.adaptationEnabled = true;
        console.log('Adaptive streaming enabled');
    }
    
    disableAdaptation() {
        this.adaptationEnabled = false;
        console.log('Adaptive streaming disabled');
    }
    
    getQualityStats() {
        return {
            currentQuality: this.currentQuality,
            previousQuality: this.previousQuality,
            adaptationEnabled: this.adaptationEnabled,
            qualityHistory: this.qualityHistory,
            qualityLevels: this.qualityLevels
        };
    }
    
    // Manual quality selection
    selectQuality(quality) {
        if (this.qualityLevels[quality]) {
            this.disableAdaptation();
            this.changeQuality(quality);
            
            // Re-enable adaptation after 30 seconds
            setTimeout(() => {
                this.enableAdaptation();
            }, 30000);
        }
    }
    
    // Get quality recommendations based on device capabilities
    getDeviceRecommendations() {
        const recommendations = [];
        
        // Check for mobile device
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            recommendations.push('Mobile device detected. Consider using medium or low quality for better performance.');
        }
        
        // Check for slow connection
        if (navigator.connection) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                recommendations.push('Slow connection detected. Using low quality for better streaming.');
                this.changeQuality('low');
            }
        }
        
        return recommendations;
    }
}

// Initialize adaptive streaming when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adaptiveStreaming = new AdaptiveStreaming();
    
    // Apply device-specific recommendations
    const recommendations = window.adaptiveStreaming.getDeviceRecommendations();
    recommendations.forEach(rec => {
        console.log(rec);
    });
});
