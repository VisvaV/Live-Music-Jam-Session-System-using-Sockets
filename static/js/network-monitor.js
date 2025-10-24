/**
 * Network Quality Monitoring System
 * Implements real-time bandwidth, latency, and packet loss monitoring
 */

class NetworkQualityMonitor {
    constructor() {
        this.bandwidth = 0;
        this.latency = 0;
        this.packetLoss = 0;
        this.jitter = 0;
        this.connectionQuality = 'unknown';
        this.measurements = [];
        this.maxMeasurements = 10;
        
        // Network quality thresholds
        this.thresholds = {
            excellent: { latency: 50, bandwidth: 1000, packetLoss: 0.1 },
            good: { latency: 100, bandwidth: 500, packetLoss: 0.5 },
            fair: { latency: 200, bandwidth: 200, packetLoss: 1.0 },
            poor: { latency: 500, bandwidth: 100, packetLoss: 2.0 }
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Measure network quality every 5 seconds
        setInterval(() => {
            this.measureLatency();
            this.measureBandwidth();
            this.calculateJitter();
            this.updateConnectionQuality();
            this.updateUI();
        }, 5000);
        
        // Initial measurement
        this.measureLatency();
        this.measureBandwidth();
    }
    
    measureLatency() {
        const startTime = performance.now();
        
        // Create a small test packet
        const testData = new Array(1000).fill(0).map(() => Math.random());
        const testString = JSON.stringify(testData);
        
        // Simulate network request to measure latency
        fetch('/api/network-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ test: 'latency', timestamp: startTime })
        })
        .then(response => response.json())
        .then(data => {
            const endTime = performance.now();
            const roundTripTime = endTime - startTime;
            
            // Calculate latency (half of round trip time)
            const latency = roundTripTime / 2;
            
            this.latency = Math.round(latency);
            this.addMeasurement('latency', this.latency);
        })
        .catch(error => {
            console.error('Latency measurement failed:', error);
            // Fallback to WebSocket ping
            this.measureWebSocketLatency();
        });
    }
    
    measureWebSocketLatency() {
        if (window.socket) {
            const startTime = performance.now();
            
            socket.emit('ping', { timestamp: startTime });
            
            socket.once('pong', (data) => {
                const endTime = performance.now();
                const roundTripTime = endTime - startTime;
                this.latency = Math.round(roundTripTime / 2);
                this.addMeasurement('latency', this.latency);
            });
        }
    }
    
    measureBandwidth() {
        const startTime = performance.now();
        const testSize = 100000; // 100KB test data
        
        // Create test data
        const testData = new Array(testSize).fill(0).map(() => Math.random());
        const testString = JSON.stringify(testData);
        
        fetch('/api/network-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: testString
        })
        .then(response => {
            const endTime = performance.now();
            const duration = (endTime - startTime) / 1000; // Convert to seconds
            const dataSize = testString.length;
            
            // Calculate bandwidth in kbps
            const bandwidth = (dataSize * 8) / (duration * 1000);
            this.bandwidth = Math.round(bandwidth);
            this.addMeasurement('bandwidth', this.bandwidth);
        })
        .catch(error => {
            console.error('Bandwidth measurement failed:', error);
            // Fallback estimation
            this.estimateBandwidth();
        });
    }
    
    estimateBandwidth() {
        // Estimate bandwidth based on audio loading performance
        if (window.audioPlayer && audioPlayer.src) {
            const startTime = performance.now();
            
            audioPlayer.addEventListener('canplaythrough', () => {
                const endTime = performance.now();
                const duration = (endTime - startTime) / 1000;
                
                // Estimate based on audio file size and loading time
                const estimatedSize = 1000000; // 1MB estimate
                const bandwidth = (estimatedSize * 8) / (duration * 1000);
                this.bandwidth = Math.round(bandwidth);
                this.addMeasurement('bandwidth', this.bandwidth);
            }, { once: true });
        }
    }
    
    calculateJitter() {
        if (this.measurements.length < 2) return;
        
        const latencies = this.measurements
            .filter(m => m.type === 'latency')
            .map(m => m.value);
        
        if (latencies.length < 2) return;
        
        // Calculate jitter as standard deviation of latency measurements
        const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const variance = latencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / latencies.length;
        this.jitter = Math.round(Math.sqrt(variance));
    }
    
    addMeasurement(type, value) {
        this.measurements.push({
            type: type,
            value: value,
            timestamp: Date.now()
        });
        
        // Keep only recent measurements
        if (this.measurements.length > this.maxMeasurements) {
            this.measurements.shift();
        }
    }
    
    updateConnectionQuality() {
        const { latency, bandwidth, packetLoss } = this;
        
        if (latency <= this.thresholds.excellent.latency && 
            bandwidth >= this.thresholds.excellent.bandwidth && 
            packetLoss <= this.thresholds.excellent.packetLoss) {
            this.connectionQuality = 'excellent';
        } else if (latency <= this.thresholds.good.latency && 
                   bandwidth >= this.thresholds.good.bandwidth && 
                   packetLoss <= this.thresholds.good.packetLoss) {
            this.connectionQuality = 'good';
        } else if (latency <= this.thresholds.fair.latency && 
                   bandwidth >= this.thresholds.fair.bandwidth && 
                   packetLoss <= this.thresholds.fair.packetLoss) {
            this.connectionQuality = 'fair';
        } else {
            this.connectionQuality = 'poor';
        }
    }
    
    updateUI() {
        // Update network quality display
        const qualityElement = document.getElementById('networkQuality');
        const latencyElement = document.getElementById('networkLatency');
        const bandwidthElement = document.getElementById('networkBandwidth');
        const jitterElement = document.getElementById('networkJitter');
        
        if (qualityElement) {
            qualityElement.textContent = this.connectionQuality.toUpperCase();
            qualityElement.className = `network-quality ${this.connectionQuality}`;
        }
        
        if (latencyElement) {
            latencyElement.textContent = `${this.latency}ms`;
        }
        
        if (bandwidthElement) {
            bandwidthElement.textContent = `${this.bandwidth} kbps`;
        }
        
        if (jitterElement) {
            jitterElement.textContent = `${this.jitter}ms`;
        }
        
        // Update quality indicator color
        const indicator = document.getElementById('networkIndicator');
        if (indicator) {
            indicator.className = `network-indicator ${this.connectionQuality}`;
        }
        
        // Show warnings for poor connection
        if (this.connectionQuality === 'poor') {
            this.showNetworkWarning();
        }
    }
    
    showNetworkWarning() {
        const warningElement = document.getElementById('networkWarning');
        if (warningElement) {
            warningElement.style.display = 'block';
            warningElement.innerHTML = `
                <div class="network-warning-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Poor network connection detected. Audio quality may be affected.</span>
                </div>
            `;
        }
    }
    
    getQualityRecommendations() {
        const recommendations = [];
        
        if (this.latency > 200) {
            recommendations.push('High latency detected. Consider switching to a closer server.');
        }
        
        if (this.bandwidth < 200) {
            recommendations.push('Low bandwidth detected. Audio quality will be reduced.');
        }
        
        if (this.jitter > 50) {
            recommendations.push('High jitter detected. Audio may be choppy.');
        }
        
        return recommendations;
    }
    
    // Export network statistics
    getNetworkStats() {
        return {
            latency: this.latency,
            bandwidth: this.bandwidth,
            packetLoss: this.packetLoss,
            jitter: this.jitter,
            quality: this.connectionQuality,
            timestamp: Date.now()
        };
    }
}

// Initialize network monitor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.networkMonitor = new NetworkQualityMonitor();
});
