'use client';
import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotCanvasRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [model, setModel] = useState(null);
  const [personCount, setPersonCount] = useState(0);
  const [detecting, setDetecting] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [pulseDetection, setPulseDetection] = useState(false);
  const detectingRef = useRef(true);
  const lastPlayedRef = useRef(0);
  const lastSnapshotRef = useRef(0);

  const saveSnapshot = () => {
    const video = videoRef.current;
    const canvas = snapshotCanvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `person-detected-${timestamp}.png`;
    link.click();
  };

  const playRing = () => {
    const now = Date.now();
    if (now - lastPlayedRef.current < 5000) return;
    lastPlayedRef.current = now;

    const ring = new Audio('/ring.mp3');
    ring.play().catch((err) => console.error('Audio play failed:', err));
  };

  useEffect(() => {
    const loadCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('Camera started. Loading model...');
      } catch (error) {
        setStatus('Error accessing camera');
        console.error(error);
      }
    };
    loadCamera();
  }, []);

  useEffect(() => {
    cocoSsd.load().then((loadedModel) => {
      setModel(loadedModel);
      setStatus('Model loaded. Ready to detect!');
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (model && videoRef.current) {
      const interval = setInterval(() => {
        if (detectingRef.current) detectFrame();
      }, 200);
      return () => clearInterval(interval);
    }
  }, [model]);

  const detectFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;

    const predictions = await model.detect(videoRef.current);
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    let count = 0;

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      const label = prediction.class;
      const confidence = (prediction.score * 100).toFixed(1);

      if (label === 'person') {
        count++;
        // Animated detection box
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        // Glowing effect
        ctx.shadowColor = '#ff6b9d';
        ctx.shadowBlur = 10;
        ctx.strokeRect(x, y, width, height);
        ctx.shadowBlur = 0;
        
        // Label with background
        ctx.fillStyle = 'rgba(255, 107, 157, 0.9)';
        ctx.fillRect(x, y > 30 ? y - 25 : y + height + 5, 120, 20);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`${label} ${confidence}%`, x + 5, y > 30 ? y - 10 : y + height + 18);
      }
    });

    setPersonCount(count);

    if (count > 0 && detectingRef.current) {
      const now = Date.now();
      setPulseDetection(true);
      setTimeout(() => setPulseDetection(false), 500);
      playRing();

      if (now - lastSnapshotRef.current > 10000) {
        lastSnapshotRef.current = now;
        saveSnapshot();
      }
    }
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const toggleDetecting = () => {
    const newVal = !detecting;
    detectingRef.current = newVal;
    setDetecting(newVal);
    setStatus(newVal ? 'Actively detecting...' : 'Detection paused');
    setPersonCount(0);

    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900' 
        : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100'
    }`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse ${
          isDark ? 'bg-pink-500' : 'bg-pink-300'
        }`}></div>
        <div className={`absolute top-1/2 -right-10 w-96 h-96 rounded-full blur-3xl opacity-10 animate-pulse animation-delay-1000 ${
          isDark ? 'bg-purple-500' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute -bottom-10 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-15 animate-pulse animation-delay-2000 ${
          isDark ? 'bg-indigo-500' : 'bg-indigo-300'
        }`}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 min-h-screen">
        {/* Header */}
        <div className="w-full max-w-4xl flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl backdrop-blur-sm border ${
              isDark 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/60 border-white/40'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">👁</span>
              </div>
            </div>
            <div>
              <h1 className={`text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent`}>
                AI Vision Detector
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Advanced person detection system
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`p-3 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-105 ${
              isDark 
                ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
          >
            <span className="text-2xl">{isDark ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-4xl grid md:grid-cols-3 gap-8">
          {/* Video Feed */}
          <div className="md:col-span-2">
            <div className={`relative rounded-3xl overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 ${
              detecting 
                ? 'border-pink-500 shadow-2xl shadow-pink-500/25' 
                : 'border-gray-400 shadow-lg'
            } ${pulseDetection ? 'animate-pulse border-pink-400' : ''}`}>
              
              {/* Video Container */}
              <div className="relative aspect-video bg-black rounded-3xl overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {/* Detection Overlay */}
                {!detecting && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-2xl">⏸️</span>
                      </div>
                      <p className="text-white text-xl font-semibold">Detection Paused</p>
                      <p className="text-gray-300 text-sm mt-2">Click start to resume monitoring</p>
                    </div>
                  </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-white text-xl font-semibold">Loading AI Model...</p>
                      <p className="text-gray-300 text-sm mt-2">Preparing detection system</p>
                    </div>
                  </div>
                )}

                {/* Corner decorations */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-pink-500 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-pink-500 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-pink-500 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-pink-500 rounded-br-lg"></div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`p-6 rounded-3xl backdrop-blur-sm border transition-all duration-300 ${
              isDark 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/60 border-white/40'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  detecting ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  System Status
                </h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {status}
              </p>
            </div>

            {/* Detection Count */}
            <div className={`p-6 rounded-3xl backdrop-blur-sm border transition-all duration-300 ${
              personCount > 0 
                ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/50' 
                : isDark 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/60 border-white/40'
            }`}>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 transition-all duration-300 ${
                  personCount > 0 
                    ? 'text-pink-500 scale-110' 
                    : isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {personCount}
                </div>
                <p className={`text-sm font-medium ${
                  personCount > 0 
                    ? 'text-pink-600' 
                    : isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {personCount === 1 ? 'Person Detected' : 'People Detected'}
                </p>
                <div className="mt-3 text-2xl">
                  {personCount > 0 ? '👥' : '🔍'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <button
                onClick={toggleDetecting}
                className={`w-full p-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  detecting
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">{detecting ? '⏸️' : '▶️'}</span>
                  {detecting ? 'Stop Detection' : 'Start Detection'}
                </div>
              </button>

              <button
                onClick={saveSnapshot}
                disabled={personCount === 0}
                className={`w-full p-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  personCount > 0
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">📸</span>
                  Capture Snapshot
                </div>
              </button>
            </div>

            {/* Stats */}
            <div className={`p-4 rounded-2xl backdrop-blur-sm border ${
              isDark 
                ? 'bg-white/5 border-white/10' 
                : 'bg-white/40 border-white/30'
            }`}>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {detecting ? 'ACTIVE' : 'PAUSED'}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Detection
                  </div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    LIVE
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Feed Status
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={snapshotCanvasRef} className="hidden" />
      
      <style jsx>{`
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}