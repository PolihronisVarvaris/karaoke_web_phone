// PC Controller Script
class KaraokeController {
    constructor() {
        this.socket = io();
        this.roomId = this.generateRoomId();
        this.audioContext = null;
        this.audioStream = null;
        this.audioAnalyser = null;
        this.isConnected = false;
        this.volume = 1.0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.generateQRCode();
        this.createVisualizer();
    }

    initializeElements() {
        // Room elements
        this.roomIdElement = document.getElementById('roomId');
        this.copyRoomIdButton = document.getElementById('copyRoomId');
        this.newRoomIdButton = document.getElementById('newRoomId');
        this.qrcodeElement = document.getElementById('qrcode');
        this.phoneUrlElement = document.getElementById('phoneUrl');
        
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.startKaraokeButton = document.getElementById('startKaraoke');
        
        // Audio elements
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.visualizer = document.getElementById('visualizer');
        
        // Lyrics elements
        this.youtubeUrlInput = document.getElementById('youtubeUrl');
        this.fetchLyricsButton = document.getElementById('fetchLyrics');
        this.currentLineElement = document.getElementById('currentLine');
        this.lyricsDisplay = document.getElementById('lyricsDisplay');
        this.prevLineButton = document.getElementById('prevLine');
        this.togglePlaybackButton = document.getElementById('togglePlayback');
        this.nextLineButton = document.getElementById('nextLine');
        
        // Set initial room ID
        this.roomIdElement.value = this.roomId;
    }

    setupEventListeners() {
        // Room management
        this.copyRoomIdButton.addEventListener('click', () => this.copyRoomId());
        this.newRoomIdButton.addEventListener('click', () => this.generateNewRoom());
        
        // Audio controls
        this.volumeSlider.addEventListener('input', (e) => this.adjustVolume(e.target.value));
        this.startKaraokeButton.addEventListener('click', () => this.startKaraoke());
        
        // Lyrics controls
        this.fetchLyricsButton.addEventListener('click', () => this.fetchLyrics());
        this.prevLineButton.addEventListener('click', () => this.previousLine());
        this.togglePlaybackButton.addEventListener('click', () => this.togglePlayback());
        this.nextLineButton.addEventListener('click', () => this.nextLine());
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.joinRoom();
        });

        this.socket.on('user-connected', (userId) => {
            console.log('User connected:', userId);
            this.handlePhoneConnected();
        });

        this.socket.on('user-disconnected', (userId) => {
            console.log('User disconnected:', userId);
            this.handlePhoneDisconnected();
        });

        this.socket.on('offer', async (data) => {
            await this.handleOffer(data);
        });

        this.socket.on('ice-candidate', (data) => {
            this.handleIceCandidate(data);
        });
    }

    generateRoomId() {
        return 'room-' + Math.random().toString(36).substr(2, 9);
    }

    generateNewRoom() {
        this.roomId = this.generateRoomId();
        this.roomIdElement.value = this.roomId;
        this.generateQRCode();
        this.joinRoom();
        this.updateStatus('Waiting for phone connection...', 'disconnected');
    }

    copyRoomId() {
        this.roomIdElement.select();
        document.execCommand('copy');
        
        const originalText = this.copyRoomIdButton.innerHTML;
        this.copyRoomIdButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
            this.copyRoomIdButton.innerHTML = originalText;
        }, 2000);
    }

    generateQRCode() {
        const phoneUrl = `${window.location.origin}/phone.html?room=${this.roomId}`;
        this.phoneUrlElement.textContent = phoneUrl;
        
        QRCode.toCanvas(this.qrcodeElement, phoneUrl, { width: 180 }, (error) => {
            if (error) console.error('QR Code generation error:', error);
        });
    }

    joinRoom() {
        this.socket.emit('join-room', this.roomId);
    }

    handlePhoneConnected() {
        this.isConnected = true;
        this.updateStatus('Phone connected! Audio streaming active', 'connected');
        this.startKaraokeButton.disabled = false;
        this.initializeAudioContext();
    }

    handlePhoneDisconnected() {
        this.isConnected = false;
        this.updateStatus('Phone disconnected', 'disconnected');
        this.startKaraokeButton.disabled = true;
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
    }

    updateStatus(text, status) {
        this.statusText.textContent = text;
        this.statusIndicator.className = 'status-indicator';
        
        if (status === 'connected') {
            this.statusIndicator.classList.add('connected');
        } else if (status === 'connecting') {
            this.statusIndicator.classList.add('connecting');
        }
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 256;
            
            // For demonstration, we'll create a simulated audio stream
            // In a real app, this would be the WebRTC audio stream
            this.simulateAudioStream();
            
        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    }

    simulateAudioStream() {
        // Create oscillator for demonstration
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioAnalyser);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        
        // Simulate audio data for visualizer
        this.animateVisualizer();
    }

    createVisualizer() {
        this.visualizer.innerHTML = '';
        const barCount = 30;
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = '10px';
            this.visualizer.appendChild(bar);
        }
        
        this.visualizerBars = this.visualizer.querySelectorAll('.bar');
    }

    animateVisualizer() {
        if (!this.audioAnalyser) return;
        
        const bufferLength = this.audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const animate = () => {
            if (!this.audioAnalyser) return;
            
            this.audioAnalyser.getByteFrequencyData(dataArray);
            
            this.visualizerBars.forEach((bar, i) => {
                const barIndex = Math.floor(i * bufferLength / this.visualizerBars.length);
                const height = (dataArray[barIndex] / 255) * 100;
                bar.style.height = `${Math.max(10, height)}px`;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    adjustVolume(value) {
        this.volume = value / 100;
        this.volumeValue.textContent = `${value}%`;
        
        // In real app, adjust WebRTC audio volume
        if (this.audioStream) {
            const audioTracks = this.audioStream.getAudioTracks();
            // Volume adjustment would be applied to audio nodes
        }
    }

    startKaraoke() {
        if (!this.isConnected) {
            alert('Please connect a phone first!');
            return;
        }
        
        this.startKaraokeButton.innerHTML = '<i class="fas fa-pause"></i> Karaoke Active';
        this.startKaraokeButton.style.background = 'var(--accent)';
        
        // Start lyrics simulation
        this.startLyricsSimulation();
    }

    async fetchLyrics() {
        const url = this.youtubeUrlInput.value.trim();
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }
        
        this.fetchLyricsButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        this.fetchLyricsButton.disabled = true;
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Load sample lyrics
            this.loadSampleLyrics();
            
            this.fetchLyricsButton.innerHTML = '<i class="fas fa-search"></i> Load Lyrics';
            this.fetchLyricsButton.disabled = false;
            
            // Enable playback controls
            this.prevLineButton.disabled = false;
            this.togglePlaybackButton.disabled = false;
            this.nextLineButton.disabled = false;
            
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            alert('Error loading lyrics. Please try again.');
            this.fetchLyricsButton.innerHTML = '<i class="fas fa-search"></i> Load Lyrics';
            this.fetchLyricsButton.disabled = false;
        }
    }

    loadSampleLyrics() {
        const sampleLyrics = [
            { type: 'section', text: '[Verse 1]' },
            { type: 'line', text: 'This is the first line of our song' },
            { type: 'line', text: 'Where everything feels perfectly wrong' },
            { type: 'line', text: 'The music flows, the rhythm is strong' },
            { type: 'line', text: 'This is where we all belong' },
            { type: 'section', text: '[Chorus]' },
            { type: 'line', text: 'Sing it loud, sing it clear' },
            { type: 'line', text: 'Let the whole wide world hear' },
            { type: 'line', text: 'With our phones as microphones' },
            { type: 'line', text: 'We never have to sing alone' },
            { type: 'section', text: '[Verse 2]' },
            { type: 'line', text: 'Another verse begins right here' },
            { type: 'line', text: 'With lyrics that are perfectly clear' },
            { type: 'line', text: 'The beat goes on, the melody near' },
            { type: 'line', text: 'Filling everyone with cheer' },
            { type: 'section', text: '[Chorus]' },
            { type: 'line', text: 'Sing it loud, sing it clear' },
            { type: 'line', text: 'Let the whole wide world hear' },
            { type: 'line', text: 'With our phones as microphones' },
            { type: 'line', text: 'We never have to sing alone' },
            { type: 'section', text: '[Bridge]' },
            { type: 'line', text: 'This is the bridge, a different part' },
            { type: 'line', text: 'That touches every listening heart' },
            { type: 'line', text: 'Where the music takes a brand new start' },
            { type: 'line', text: 'Showing us a work of art' },
            { type: 'section', text: '[Outro]' },
            { type: 'line', text: 'Fading out with the final sound' },
            { type: 'line', text: 'Where happy memories are found' },
            { type: 'line', text: 'Thanks for singing all around' },
            { type: 'line', text: 'Making this a joyful ground!' }
        ];
        
        this.displayLyrics(sampleLyrics);
        this.currentLyrics = sampleLyrics;
        this.currentLineIndex = 0;
    }

    displayLyrics(lyrics) {
        this.lyricsDisplay.innerHTML = '';
        
        lyrics.forEach((item, index) => {
            let element;
            
            if (item.type === 'section') {
                element = document.createElement('div');
                element.className = 'section-header';
                element.textContent = item.text;
            } else {
                element = document.createElement('div');
                element.className = 'lyric-line';
                element.textContent = item.text;
                element.dataset.index = index;
            }
            
            this.lyricsDisplay.appendChild(element);
        });
        
        this.lyricLines = this.lyricsDisplay.querySelectorAll('.lyric-line');
    }

    startLyricsSimulation() {
        if (!this.currentLyrics) return;
        
        this.isPlaying = true;
        this.currentLineIndex = 0;
        this.togglePlaybackButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
        
        this.lyricsInterval = setInterval(() => {
            if (this.isPlaying) {
                this.nextLine();
            }
        }, 3000);
    }

    nextLine() {
        if (!this.currentLyrics || !this.lyricLines) return;
        
        // Clear previous active line
        this.lyricLines.forEach(line => line.classList.remove('active', 'past'));
        
        // Find next lyric line
        let linesPassed = 0;
        for (let i = this.currentLineIndex + 1; i < this.currentLyrics.length; i++) {
            if (this.currentLyrics[i].type === 'line') {
                this.currentLineIndex = i;
                const currentLine = this.lyricLines[linesPassed];
                
                if (currentLine) {
                    currentLine.classList.add('active');
                    this.currentLineElement.textContent = currentLine.textContent;
                    
                    // Scroll to active line
                    currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                break;
            }
            if (this.currentLyrics[i].type === 'line') {
                linesPassed++;
            }
        }
        
        // Mark previous lines
        for (let i = 0; i < linesPassed; i++) {
            if (this.lyricLines[i]) {
                this.lyricLines[i].classList.add('past');
            }
        }
    }

    previousLine() {
        if (!this.currentLyrics || !this.lyricLines) return;
        
        // Implementation for going to previous line
        // Similar to nextLine but in reverse
        console.log('Previous line functionality');
    }

    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.togglePlaybackButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
            if (!this.lyricsInterval) {
                this.startLyricsSimulation();
            }
        } else {
            this.togglePlaybackButton.innerHTML = '<i class="fas fa-play"></i> Play';
            if (this.lyricsInterval) {
                clearInterval(this.lyricsInterval);
                this.lyricsInterval = null;
            }
        }
    }

    // WebRTC methods (simplified for demo)
    async handleOffer(offer) {
        // In real implementation, this would create answer and establish connection
        console.log('Received offer:', offer);
    }

    handleIceCandidate(candidate) {
        // In real implementation, this would handle ICE candidates
        console.log('Received ICE candidate:', candidate);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KaraokeController();
});