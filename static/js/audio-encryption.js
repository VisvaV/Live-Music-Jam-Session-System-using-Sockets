/**
 * Basic Audio Encryption System
 * Implements AES-like encryption for audio streams
 */

class AudioEncryption {
    constructor() {
        this.encryptionKey = null;
        this.isEncryptionEnabled = false;
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        
        this.initializeEncryption();
    }
    
    async initializeEncryption() {
        try {
            // Generate encryption key
            this.encryptionKey = await this.generateKey();
            this.isEncryptionEnabled = true;
            
            console.log('Audio encryption initialized');
            this.updateEncryptionUI();
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            this.isEncryptionEnabled = false;
        }
    }
    
    async generateKey() {
        try {
            // Generate a random key for encryption
            const key = await crypto.subtle.generateKey(
                {
                    name: this.algorithm,
                    length: this.keyLength
                },
                true, // extractable
                ['encrypt', 'decrypt']
            );
            return key;
        } catch (error) {
            console.error('Key generation failed:', error);
            // Fallback to simple XOR encryption
            return this.generateSimpleKey();
        }
    }
    
    generateSimpleKey() {
        // Simple key generation for fallback
        const key = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            key[i] = Math.floor(Math.random() * 256);
        }
        return key;
    }
    
    async encryptAudioData(audioData) {
        if (!this.isEncryptionEnabled || !this.encryptionKey) {
            return audioData;
        }
        
        try {
            if (this.encryptionKey instanceof CryptoKey) {
                // Use Web Crypto API
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const encryptedData = await crypto.subtle.encrypt(
                    {
                        name: this.algorithm,
                        iv: iv
                    },
                    this.encryptionKey,
                    audioData
                );
                
                // Combine IV and encrypted data
                const result = new Uint8Array(iv.length + encryptedData.byteLength);
                result.set(iv, 0);
                result.set(new Uint8Array(encryptedData), iv.length);
                
                return result;
            } else {
                // Use simple XOR encryption
                return this.simpleXOREncrypt(audioData, this.encryptionKey);
            }
        } catch (error) {
            console.error('Encryption failed:', error);
            return audioData;
        }
    }
    
    async decryptAudioData(encryptedData) {
        if (!this.isEncryptionEnabled || !this.encryptionKey) {
            return encryptedData;
        }
        
        try {
            if (this.encryptionKey instanceof CryptoKey) {
                // Use Web Crypto API
                const iv = encryptedData.slice(0, 12);
                const ciphertext = encryptedData.slice(12);
                
                const decryptedData = await crypto.subtle.decrypt(
                    {
                        name: this.algorithm,
                        iv: iv
                    },
                    this.encryptionKey,
                    ciphertext
                );
                
                return new Uint8Array(decryptedData);
            } else {
                // Use simple XOR decryption
                return this.simpleXORDecrypt(encryptedData, this.encryptionKey);
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedData;
        }
    }
    
    simpleXOREncrypt(data, key) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ key[i % key.length];
        }
        return result;
    }
    
    simpleXORDecrypt(encryptedData, key) {
        // XOR is symmetric, so decryption is the same as encryption
        return this.simpleXOREncrypt(encryptedData, key);
    }
    
    async encryptAudioFile(audioFile) {
        try {
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioData = new Uint8Array(arrayBuffer);
            
            const encryptedData = await this.encryptAudioData(audioData);
            
            // Create a new blob with encrypted data
            const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
            
            return encryptedBlob;
        } catch (error) {
            console.error('File encryption failed:', error);
            return audioFile;
        }
    }
    
    async decryptAudioFile(encryptedBlob) {
        try {
            const arrayBuffer = await encryptedBlob.arrayBuffer();
            const encryptedData = new Uint8Array(arrayBuffer);
            
            const decryptedData = await this.decryptAudioData(encryptedData);
            
            // Create a new blob with decrypted data
            const decryptedBlob = new Blob([decryptedData], { type: 'audio/mpeg' });
            
            return decryptedBlob;
        } catch (error) {
            console.error('File decryption failed:', error);
            return encryptedBlob;
        }
    }
    
    // Encrypt audio URL for secure streaming
    async encryptAudioURL(audioURL) {
        if (!this.isEncryptionEnabled) {
            return audioURL;
        }
        
        try {
            // Fetch the audio file
            const response = await fetch(audioURL);
            const audioBlob = await response.blob();
            
            // Encrypt the audio data
            const encryptedBlob = await this.encryptAudioFile(audioBlob);
            
            // Create object URL for encrypted data
            const encryptedURL = URL.createObjectURL(encryptedBlob);
            
            return encryptedURL;
        } catch (error) {
            console.error('URL encryption failed:', error);
            return audioURL;
        }
    }
    
    // Decrypt audio URL for playback
    async decryptAudioURL(encryptedURL) {
        if (!this.isEncryptionEnabled) {
            return encryptedURL;
        }
        
        try {
            // Fetch the encrypted audio file
            const response = await fetch(encryptedURL);
            const encryptedBlob = await response.blob();
            
            // Decrypt the audio data
            const decryptedBlob = await this.decryptAudioFile(encryptedBlob);
            
            // Create object URL for decrypted data
            const decryptedURL = URL.createObjectURL(decryptedBlob);
            
            return decryptedURL;
        } catch (error) {
            console.error('URL decryption failed:', error);
            return encryptedURL;
        }
    }
    
    updateEncryptionUI() {
        const encryptionStatus = document.getElementById('encryptionStatus');
        const encryptionIndicator = document.getElementById('encryptionIndicator');
        
        if (encryptionStatus) {
            if (this.isEncryptionEnabled) {
                encryptionStatus.textContent = 'Enabled';
                encryptionStatus.className = 'encryption-status enabled';
            } else {
                encryptionStatus.textContent = 'Disabled';
                encryptionStatus.className = 'encryption-status disabled';
            }
        }
        
        if (encryptionIndicator) {
            if (this.isEncryptionEnabled) {
                encryptionIndicator.className = 'encryption-indicator enabled';
            } else {
                encryptionIndicator.className = 'encryption-indicator disabled';
            }
        }
    }
    
    toggleEncryption() {
        this.isEncryptionEnabled = !this.isEncryptionEnabled;
        this.updateEncryptionUI();
        
        console.log(`Audio encryption ${this.isEncryptionEnabled ? 'enabled' : 'disabled'}`);
        
        // Show notification
        this.showEncryptionNotification();
    }
    
    showEncryptionNotification() {
        const notification = document.createElement('div');
        notification.className = `encryption-notification ${this.isEncryptionEnabled ? 'enabled' : 'disabled'}`;
        notification.innerHTML = `
            <div class="encryption-notification-content">
                <i class="fas ${this.isEncryptionEnabled ? 'fa-lock' : 'fa-unlock'}"></i>
                <span>Audio encryption ${this.isEncryptionEnabled ? 'enabled' : 'disabled'}</span>
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
    
    getEncryptionStatus() {
        return {
            enabled: this.isEncryptionEnabled,
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            hasKey: !!this.encryptionKey
        };
    }
    
    // Export key for sharing (in a real implementation, this would be more secure)
    async exportKey() {
        if (this.encryptionKey instanceof CryptoKey) {
            try {
                const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
                return Array.from(new Uint8Array(exportedKey));
            } catch (error) {
                console.error('Key export failed:', error);
                return null;
            }
        } else {
            return Array.from(this.encryptionKey);
        }
    }
    
    // Import key from shared data
    async importKey(keyData) {
        try {
            if (keyData.length === 32) {
                // Try Web Crypto API first
                const keyBuffer = new Uint8Array(keyData);
                this.encryptionKey = await crypto.subtle.importKey(
                    'raw',
                    keyBuffer,
                    { name: this.algorithm },
                    true,
                    ['encrypt', 'decrypt']
                );
            } else {
                // Fallback to simple key
                this.encryptionKey = new Uint8Array(keyData);
            }
            
            this.isEncryptionEnabled = true;
            this.updateEncryptionUI();
            
            console.log('Encryption key imported successfully');
        } catch (error) {
            console.error('Key import failed:', error);
        }
    }
}

// Initialize audio encryption when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.audioEncryption = new AudioEncryption();
});
