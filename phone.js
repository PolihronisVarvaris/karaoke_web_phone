// Phone Microphone Script
class PhoneMicrophone {
    constructor() {
        this.socket = io();
        this.roomId = this.getRoomIdFromURL();
        this.localStream = null;
        this.isConnected = false;
        this.isMicActive = true;
        this.connectionStartTime = Date.now();
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.joinRoom();
        this.initializeMicrophone();
        this.createVisualizer();
        this.startConnectionTimer();
    }

    initializeElements() {
        // Connection elements
        this.roomNameElement = document.getElementById('roomName');
        this.phoneStatusIndicator = document.getElementById('phoneStatusIndicator');
        this.phoneStatusText = document.getElementById('phoneStatusText');
        
        // Microphone elements
        this.micIcon = document.getElementById('micIcon');
        this.levelFill = document.getElementById('levelFill');
        this.micLevelText = document.getElementById('micLevelText');
        this.toggleMicButton = document.getElementById('toggleMic');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        
        // Visualizer
        this.phoneVisualizer = document.getElementById('phoneVisualizer');
        
        // Stats
        this.connectionQuality = document.getElementById('connectionQuality');
        this.connectionTime = document.getElementById('connectionTime');
        
        // Set room name
        this.roomNameElement.textContent = `Room: ${this.roomId}`;
    }

    setupEventListeners() {
        this.toggleMicButton.addEventListener('click', () => this.toggleMicrophone());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Phone connected to server');
            this.updateStatus('Connecting to room...', 'connecting');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('Disconnected from server', 'disconnected');
        });

        this.socket.on('user-joined', (userId) => {
            console.log('User joined room:', userId);
        });
    }

    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room') || 'default-room';
    }

    joinRoom() {
        if (this.roomId) {
            this.socket.emit('join-room', this.roomId);
            this.updateStatus('Connected to room', 'connected');
            this.isConnected = true;
        }
    }

    updateStatus(text, status) {
        this.phoneStatusText.textContent = text;
        this.phoneStatusIndicator.className = 'status-indicator';
        
        if (status === 'connected') {
            this.phoneStatusIndicator.classList.add('connected');
        } else if (status === 'connecting') {
            this.phoneStatusIndicator.classList.add('connecting');
        }
    }

    async initializeMicrophone() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            console.log('Microphone access granted');
            this.updateStatus('Microphone active - Start singing!', 'connected');
            this.setupAudioAnalysis();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateStatus('Microphone access denied', 'disconnected');
            this.toggleMicButton.disabled = true;
        }
    }

    setupAudioAnalysis() {
        if (!this.localStream) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(this.localStream);
        const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
        
        javascriptNode.onaudioprocess = () => {
            if (!this.isMicActive) return;
            
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            
            let values = 0;
            for (let i = 0; i < array.length; i++) {
                values += array[i];
            }
            
            const average = values / array.length;
            this.updateMicLevel(average);
        };
        
        this.animatePhoneVisualizer(analyser);
    }

    updateMicLevel(level) {
        const percentage = Math.min(100, (level / 255) * 100);
        this.levelFill.style.width = `${percentage}%`;
        this.micLevelText.textContent = `${Math.round(percentage)}%`;
        
        // Update mic icon color based on level
        const intensity = percentage / 100;
        const red = Math.floor(255 * intensity);
        const green = Math.floor(255 * (1 - intensity));
        this.micIcon.style.color = `rgb(${red}, ${green}, 100)`;
    }

    createVisualizer() {
        this.phoneVisualizer.innerHTML = '';
        const barCount = 20;
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = '10px';
            this.phoneVisualizer.appendChild(bar);
        }
        
        this.phoneVisualizerBars = this.phoneVisualizer.querySelectorAll('.bar');
    }

    animatePhoneVisualizer(analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const animate = () => {
            if (!analyser) return;
            
            analyser.getByteFrequencyData(dataArray);
            
            this.phoneVisualizerBars.forEach((bar, i) => {
                const barIndex = Math.floor(i * bufferLength / this.phoneVisualizerBars.length);
                const height = (dataArray[barIndex] / 255) * 100;
                bar.style.height = `${Math.max(10, height)}px`;
                
                // Add color variation based on frequency
                const hue = (i / this.phoneVisualizerBars.length) * 120 + 180;
                bar.style.background = `linear-gradient(to top, hsl(${hue}, 70%, 60%), hsl(${hue + 30}, 100%, 70%))`;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    toggleMicrophone() {
        this.isMicActive = !this.isMicActive;
        
        if (this.isMicActive) {
            this.micIcon.classList.remove('muted');
            this.toggleMicButton.classList.add('active');
            this.toggleMicButton.innerHTML = '<i class="fas fa-microphone"></i><span>Microphone On</span>';
            this.updateStatus('Microphone active - Sing!', 'connected');
        } else {
            this.micIcon.classList.add('muted');
            this.toggleMicButton.classList.remove('active');
            this.toggleMicButton.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Microphone Off</span>';
            this.updateStatus('Microphone muted', 'disconnected');
            this.levelFill.style.width = '0%';
            this.micLevelText.textContent = '0%';
        }
    }

    disconnect() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        this.socket.disconnect();
        window.location.href = window.location.origin;
    }

    startConnectionTimer() {
        setInterval(() => {
            const seconds = Math.floor((Date.now() - this.connectionStartTime) / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            this.connectionTime.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// Initialize phone app
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
        document.body.innerHTML = `
            <div class="container" style="text-align: center; padding: 50px 20px;">
                <div class="logo">
                    <i class="fas fa-mobile-alt"></i>
                    <h1>Mobile Required</h1>
                </div>
                <p style="font-size: 1.2rem; margin: 20px 0;">
                    This page is designed for mobile devices only.
                </p>
                <p style="opacity: 0.8;">
                    Please open this URL on your smartphone to use it as a microphone.
                </p>
            </div>
        `;
        return;
    }
    
    new PhoneMicrophone();
});