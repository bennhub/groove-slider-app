//==============================================
// IMPORTS
//==============================================
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  CornerDownRight,
  ArrowBigRight,
  X,
  Save,
  Loader,
  ImagePlus,
  Images,
  Clock,
  Play,
  Pause,
  Edit,
  Share,
  Settings,
  Download,
  Music,
  Volume,
  Info,
  RotateCw,
  Globe,
  MessageSquare,
  Shuffle,
  ShoppingBag,
  CircleSlash,
  Lock,
  FileText,
  GitCommit,
  Award,
  Expand,
  Minimize,
  Mic,
  Trash2,
  Check,
  XCircle,
  MoveVertical,
} from "lucide-react";

//firebase
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
//import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
// Export Modal
import ExportModal from "./ExportModal";
// import Save Sessions
import SaveSessionModal from "./SaveSessionModal";
import SessionsList from "./SessionsList";
import {
  saveSession,
  loadSession,
  saveBpmValue,
  getBpmValue,
} from "./indexedDBService";
import "./sessionStyles.css";
// WavformVisualizer
import WaveformVisualizer from "./WaveformVisualizer";
// Beat detect
import { analyze } from "web-audio-beat-detector";
// Track Imports
import MyMusicLibrary from "./MyMusicLibrary";
import AudiusTrackSearch from "./AudiusTrackSearch";
import { APP_CONFIG } from "./AppConfig";


//==============================================
// DEVICE DETECTION
//==============================================
const useDeviceType = () => {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const checkDevice = () => {
      // Check if device is likely a tablet (width >= 768px or tablet in user agent)
      const tabletWidth = window.innerWidth >= 768;
      const tabletUserAgent = /iPad|Android(?!.*Mobile)|Tablet/i.test(
        navigator.userAgent
      );
      setIsTablet(tabletWidth || tabletUserAgent);
    };
    // Check initially
    checkDevice();
    // Check on resize
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);
  return isTablet;
};
//==============================================
// UTILITIES / SERVICES
//==============================================
// Create the FFmpeg instance without hardcoded paths initially
const ffmpeg = new FFmpeg({ log: true });

// Load FFmpeg with CDN URLs
const loadFFmpeg = async () => {
  try {
    console.log("Starting FFmpeg load...");
    
    // Use CDN URLs for loading the core and WASM files
    await ffmpeg.load({
      corePath: "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.js",
      wasmPath: "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm"
    });
    
    console.log("FFmpeg loaded successfully");
    return ffmpeg;
  } catch (error) {
    console.error("FFmpeg load error:", error);
    // More detailed error logging
    if (error instanceof Error) {
      console.error({
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause,
      });
    }
    // Optionally, show a user-friendly error
    alert("Failed to load FFmpeg. Please check your internet connection.");
    throw error;
  }
};
//==============================================
// LANDING PAGE COMPONENT
//==============================================
const GrooveGalleryLanding = ({
  onCreateSlideshow,
  onLoadSession,
  onClose,
}) => {
  const [showSessions, setShowSessions] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div className="landing-wrapper">
      <div className="landing-container">
        {/* Header with app title and info button only */}
        <div className="landing-header">
          <button
            className="info-button"
            onClick={() => setShowInfoModal(true)}
          >
            <span
              style={{
                width: 50,
                height: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "left",
              }}
            >
              <Settings />
            </span>
          </button>
          <h1 className="app-title">Groove Slider v1.0.2</h1>
          {/* Always visible close button */}
          <button className="close-landing-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        {/* Main background with 70's style patterns */}
        <div className="retro-background">
          <div className="wave-pattern top"></div>
          <div className="wave-pattern bottom"></div>
          {/* Project management section */}
          <div className="project-management">
            {/* Create new slideshow button */}
            <button className="create-button" onClick={onCreateSlideshow}>
              Create Slideshow
            </button>
            {/* Sessions toggle button */}
            <button
              className="sessions-toggle-button"
              onClick={() => setShowSessions(!showSessions)}
            >
              {showSessions ? "Hide Saved Projects" : "Show Saved Projects"}
            </button>
            {/* Sessions list */}
            {showSessions && (
              <div className="landing-sessions-container">
                <SessionsList visible={true} onLoadSession={onLoadSession} />
              </div>
            )}
          </div>
        </div>
        {/* Featured Style Section */}
        <div className="featured-section">
          <button className="use-style-button">
            <Music size={18} />
            <span>Follow Us </span>
          </button>
        </div>

        {showInfoModal && (
          <InfoModal
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
          />
        )}
      </div>
    </div>
  );
};

//==============================================
// TAP TEMPO COMPONENT
//==============================================
const TapTempo = ({ onBPMChange, isAnalyzing }) => {
  const [taps, setTaps] = useState([]);
  const [currentBPM, setCurrentBPM] = useState(0);
  const handleTap = () => {
    const now = Date.now();
    setTaps(newTaps);
    if (newTaps.length > 1) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const averageInterval =
        intervals.reduce((a, b) => a + b) / intervals.length;
      const bpm = Math.round(60000 / averageInterval);
      if (bpm >= 60 && bpm <= 180) {
        setCurrentBPM(bpm);
        onBPMChange(bpm);
      }
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (taps.length > 0 && Date.now() - taps[taps.length - 1] > 2000) {
        setTaps([]);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [taps]);
  return (
    <div className="tap-tempo">
      <button onClick={handleTap} className="tap-button">
        Tap Tempo
        <span className="bpm-text">
          {currentBPM > 0 ? `${currentBPM} BPM` : ""}
        </span>
      </button>
      {isAnalyzing && (
        <div className="bpm-analyzer">
          <div className="spinner"></div>
          <span>Analyzing beat...</span>
        </div>
      )}
    </div>
  );
};
//==============================================
// MUSIC PANEL COMPONENT
//==============================================
const MusicPanel = ({
  onUpload,
  onBPMChange,
  currentBPM,
  onStartPointChange,
  audioRef,
  musicUrl,
  musicStartPoint,
  onClose // New prop
}) => {
  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [isAudiusModalOpen, setIsAudiusModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const controlsRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const timeUpdateRef = useRef(null);
  const [title, setTitle] = useState("");
  const [isMyMusicModalOpen, setIsMyMusicModalOpen] = useState(false);

  // Reference to store the intended playback position
  const intendedTimeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize audio context on component mount
  useEffect(() => {
    // Create audio context only once
    if (!audioContext) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(context);
    }

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  /**
   * BPM detection handler - fixed to work with updated audio handling
   */
  const detectBPM = async (audioUrl) => {
    try {
      console.log("Starting BPM detection process for:", audioUrl);

      // Check if this is a streaming URL (Audius proxy)
      const isStreamingUrl = audioUrl.includes(
        "lingering-surf-27dd.benhayze.workers.dev"
      );

      if (isStreamingUrl) {
        // For streaming tracks, return the pre-defined BPM
        console.log("Streaming track detected, using pre-defined BPM");
        return bpm; // Use the existing bpm state
      }

      // First check if we have a cached BPM value
      const cachedBpm = await getBpmValue(audioUrl);
      if (cachedBpm !== null) {
        console.log(`Using cached BPM: ${cachedBpm}`);
        return cachedBpm;
      }

      console.log("No cached BPM found, analyzing audio...");
      setIsAnalyzing(true);

      // Create a separate audio context just for BPM detection
      const bpmAudioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Fetch the audio data
      let arrayBuffer;
      try {
        const response = await fetch(audioUrl);
        arrayBuffer = await response.arrayBuffer();
      } catch (fetchError) {
        console.error("Failed to fetch audio for BPM detection:", fetchError);
        return 120; // Default fallback BPM
      }

      console.log("Audio data fetched, decoding...");

      // Decode the audio data
      let audioBuffer;
      try {
        audioBuffer = await bpmAudioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        console.error("Failed to decode audio for BPM detection:", decodeError);
        return 120; // Default fallback BPM
      }

      console.log("Audio decoded, analyzing tempo...");

      // Use the web-audio-beat-detector library to analyze the tempo
      const detectedTempo = await analyze(audioBuffer);

      console.log(`Raw detected tempo: ${detectedTempo}`);

      // Adjust for double-time if needed
      // If the detected tempo is above 140, it's likely double-time
      let adjustedTempo = detectedTempo;
      if (detectedTempo > 140) {
        adjustedTempo = detectedTempo / 2;
      }

      const finalTempo = Math.round(adjustedTempo);
      console.log(`Final detected BPM: ${finalTempo}`);

      // Save the detected BPM to the cache
      await saveBpmValue(audioUrl, finalTempo);
      console.log(`BPM value ${finalTempo} cached for future use`);

      return finalTempo;
    } catch (error) {
      console.error("BPM detection failed:", error);
      return 120; // Default fallback BPM
    } finally {
      setIsAnalyzing(false);
    }
  };
  /**
   * Enhanced time update handler with forced synchronization
   */
  const handleTimeUpdate = () => {
    if (!controlsRef.current) return;

    // Get the precise time from audio element
    const precise = controlsRef.current.currentTime;

    // Update state with precise time
    setCurrentTime(precise);

    // Check if there's a drift from the intended time when playback starts
    if (isPlaying && intendedTimeRef.current !== null) {
      const drift = Math.abs(precise - intendedTimeRef.current);
    
      // Only correct significant drift (increased threshold to reduce corrections)
      if (drift > 0.1 && precise < intendedTimeRef.current + 0.5) {
        console.log(`Detected drift of ${drift.toFixed(6)}s - correcting smoothly`);
        
        // Instead of abruptly changing currentTime during playback, 
        // we'll mark it for correction when playback is paused/resumed
        if (audioRef.current) {
          // Store the drift information but don't correct immediately during playback
          audioRef.current.dataset.pendingCorrection = intendedTimeRef.current;
        }
      } else if (precise > intendedTimeRef.current + 0.5) {
        intendedTimeRef.current = null;
      }
    }
  };

  // Setup enhanced event listeners
useEffect(() => {
  if (controlsRef.current && audioRef.current) {
    // Set up regular timeupdate listener
    controlsRef.current.addEventListener("timeupdate", handleTimeUpdate);

    // Keep main audio in sync but less frequently to avoid buffer issues
    let lastSyncTime = 0;
    const syncAudioRefs = () => {
      // Only sync when necessary and not during playback
      const currentTime = controlsRef.current.currentTime;
      const timeSinceLastSync = Date.now() - lastSyncTime;
      
      // Limit sync frequency to reduce audio interruptions
      // Only sync if it's been at least 500ms since last sync or if the difference is large
      if (timeSinceLastSync > 500 || Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
        // Only sync when paused to avoid playback interruptions
        if (audioRef.current.paused && controlsRef.current.paused) {
          audioRef.current.currentTime = currentTime;
          lastSyncTime = Date.now();
        }
      }
    };

    // Listen for events where sync makes sense
    controlsRef.current.addEventListener("seeked", syncAudioRefs);
    controlsRef.current.addEventListener("pause", syncAudioRefs);
    // Remove timeupdate sync which is too frequent
    // controlsRef.current.addEventListener("timeupdate", syncAudioRefs);

    // Listen for seeking events (high precision for fine adjustments)
    controlsRef.current.addEventListener("seeking", () => {
      // Cancel any previous timeupdate forcing
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }

      // Force timeupdate events during seeking for more responsive UI
      timeUpdateRef.current = setInterval(() => {
        // Manually trigger the time update handling
        handleTimeUpdate();
      }, 10); // Update every 10ms during seeking
    });

    controlsRef.current.addEventListener("seeked", () => {
      // Clean up the forced timeupdate interval
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    });

    controlsRef.current.addEventListener("loadedmetadata", () => {
      setDuration(controlsRef.current.duration);
    });

    return () => {
      // Clean up all event listeners
      if (controlsRef.current) {
        controlsRef.current.removeEventListener(
          "timeupdate",
          handleTimeUpdate
        );
        controlsRef.current.removeEventListener("seeked", syncAudioRefs);
        controlsRef.current.removeEventListener("pause", syncAudioRefs);
        controlsRef.current.removeEventListener("seeking", () => {});
        controlsRef.current.removeEventListener("seeked", () => {});
      }

      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }
}, [audioRef, controlsRef, isPlaying]);

// Updated handlePlayPause function with smoother transitions
const handlePlayPause = () => {
  // If currently playing, stop everything
  if (isPlaying) {
    console.log("Stopping playback");

    // Explicitly clear the interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop audio if it exists - implement a small fade out to avoid clicks
    if (audioRef.current) {
      try {
        // If the Web Audio API is available, use a short fade out
        if (window.AudioContext || window.webkitAudioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaElementSource(audioRef.current);
          const gainNode = audioContext.createGain();
          
          // Connect the audio through the gain node
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Create a quick fade out (30ms is usually enough to avoid clicks)
          const now = audioContext.currentTime;
          gainNode.gain.setValueAtTime(1, now);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.03);
          
          // Pause after the fade out
          setTimeout(() => {
            audioRef.current.pause();
            // Disconnect to avoid issues with future play calls
            source.disconnect();
            gainNode.disconnect();
          }, 35); // Slightly longer than the fade
        } else {
          // Fallback if Web Audio API is not available
          audioRef.current.pause();
        }
      } catch (e) {
        console.error("Error pausing audio:", e);
        // Fallback to normal pause
        audioRef.current.pause();
      }
    }

    // Update state last
    setIsPlaying(false);
    return;
  }

  // Starting playback - reset to first slide if at the end
  if (currentIndex === stories.length - 1) {
    setCurrentIndex(0);
  }


  // Start audio only if we have music
  if (musicUrl) {
    try {
      // IMPORTANT CHANGE: Reuse existing audio element instead of creating new one
      if (!audioRef.current || audioRef.current.src !== musicUrl) {
        // Only create a new Audio element if needed
        const audio = new Audio();
        audio.preload = "auto"; // Important for buffering
        audio.src = musicUrl;
        audio.currentTime = musicStartPoint;
        
        // Store the audio reference immediately
        audioRef.current = audio;
        
        // Show loading/buffering indicator
        setIsAnalyzing(true); // or whatever loading state indicator you use
        
        // Ensure proper buffering before starting playback
        ensureAudioBuffering(audio)
          .then(() => {
            console.log("Audio sufficiently buffered, starting playback");
            setIsAnalyzing(false); // Hide loading indicator
            
            // Now start playback with properly buffered audio
            startPlaybackWithAudio(audio);
          })
          .catch((err) => {
            console.warn("Audio buffer warning:", err);
            setIsAnalyzing(false); // Hide loading indicator
            
            // Try to play despite buffering issues, with a small delay
            setTimeout(() => {
              startPlaybackWithAudio(audio);
            }, 100);
          });
      } else {
        // Reuse existing audio element, but still ensure buffering from new position
        audioRef.current.currentTime = musicStartPoint;
        
        // Short buffering check for position change
        setIsAnalyzing(true);
        
        ensureAudioBuffering(audioRef.current)
          .then(() => {
            setIsAnalyzing(false);
            startPlaybackWithAudio(audioRef.current);
          })
          .catch(() => {
            setIsAnalyzing(false);
            // Still try to play even if buffering isn't ideal
            startPlaybackWithAudio(audioRef.current);
          });
      }
    } catch (e) {
      console.error("Error setting up audio:", e);
      setIsAnalyzing(false);
      // Continue without audio
      startPlaybackWithoutAudio();
    }
  } else {
    console.log("No music URL, running slideshow without audio");
    startPlaybackWithoutAudio();
  }
  
  // Helper function to start playback with audio
  function startPlaybackWithAudio(audio) {
    // Set up interval for slideshow
    const intervalTime = duration * 1000;
    console.log(`Setting up interval with duration: ${intervalTime}ms`);

    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start a new interval
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (!isLoopingEnabled && prev >= stories.length - 1) {
          // At the end and not looping
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
          return prev;
        }
        return (prev + 1) % stories.length;
      });
    }, intervalTime);
    
    // Try to play the audio with a small delay to allow buffering
    setTimeout(() => {
      audio.play().catch((err) => {
        console.error("Audio playback failed:", err);
        console.log("Continuing with slideshow without audio");
      });
      setIsPlaying(true);
    }, 50);
  }
  
  // Helper function to start playback without audio
  function startPlaybackWithoutAudio() {
    // Set up interval for slideshow
    const intervalTime = duration * 1000;
    console.log(`Setting up interval with duration: ${intervalTime}ms`);

    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start a new interval
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (!isLoopingEnabled && prev >= stories.length - 1) {
          // At the end and not looping
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          return prev;
        }
        return (prev + 1) % stories.length;
      });
    }, intervalTime);
    
    setIsPlaying(true);
  }
};
  /**
   * Format time with millisecond precision
   */
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(3, "0")}`;
  };

  /**
   * Handle precise time adjustment
   */
  const adjustTimeByAmount = (amount) => {
    if (!controlsRef.current) return;

    // Calculate new time with constraints
    const newTime = Math.max(0, Math.min(duration, currentTime + amount));

    // Set the time precisely
    controlsRef.current.currentTime = newTime;

    // Update our reference point for intended time
    intendedTimeRef.current = newTime;

    // Update the app state
    onStartPointChange(newTime);

    // Force immediate UI update
    setCurrentTime(newTime);
  };

  /**
   * Handle direct time input through a modal dialog
   */
  const handleDirectTimeInput = (e) => {
    e.preventDefault();
    const inputTime = prompt("Enter time (mm:ss.ms):", formatTime(currentTime));
    if (inputTime) {
      try {
        // Parse the time format mm:ss.ms
        const [minutesPart, secondsPart] = inputTime.split(":");
        const [secondsWhole, millisecondsPart] = secondsPart.split(".");

        const minutes = parseInt(minutesPart, 10) || 0;
        const seconds = parseInt(secondsWhole, 10) || 0;
        const milliseconds = parseInt(millisecondsPart, 10) || 0;

        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;

        if (totalSeconds >= 0 && totalSeconds <= duration) {
          if (controlsRef.current) {
            // Set the time precisely
            controlsRef.current.currentTime = totalSeconds;

            // Update our reference point
            intendedTimeRef.current = totalSeconds;

            // Update the app state
            onStartPointChange(totalSeconds);

            // Force immediate UI update
            setCurrentTime(totalSeconds);
          }
        } else {
          alert(
            `Please enter a time between 0:00.000 and ${formatTime(duration)}`
          );
        }
      } catch (error) {
        alert("Invalid time format. Please use mm:ss.ms");
      }
    }
  };

  return (
    <div className="music-panel">
    {/* Add close button as the first element */}
    {onClose && (
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10000 
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>
      </div>
    )}
      <div className="music-controls">
        {/* BPM control section with integrated upload button */}
        <div className="bpm-control">
          {isAnalyzing && (
            <div className="bpm-analyzer">
              <Loader className="spinner" size={18} />
              <span>Analyzing beat...</span>
            </div>
          )}

          <div className="manual-bpm">
            <label>
              <span>AUTO-BPM</span>
              <span>DETECTION:</span>
            </label>
            <input
              type="number"
              min="60"
              max="180"
              value={currentBPM}
              onChange={(e) => onBPMChange(parseInt(e.target.value))}
              className="bpm-input"
            />
          </div>

          {/* Music upload button now inside the bpm-control div */}
          <label className="upload-button">
            <Music className="icon" />
            <span>Upload Music</span>
            <input
              type="file"
              accept=".mp3,.aac,.m4a,.wav,.aiff"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setFileName(file.name);

                  // Start BPM detection
                  setIsAnalyzing(true);
                  try {
                    const detectedBPM = await detectBPM(url);
                    console.log(`Final detected BPM: ${detectedBPM}`);
                    onBPMChange(detectedBPM);
                  } catch (err) {
                    console.error("BPM detection failed:", err);
                    // Fall back to default BPM
                    onBPMChange(120);
                  } finally {
                    setIsAnalyzing(false);
                  }

                  // Set the music URL
                  onUpload(url);

                  // Reset start point to beginning
                  onStartPointChange(0);

                  // Reset audio state
                  if (controlsRef.current) {
                    controlsRef.current.src = url;
                    controlsRef.current.currentTime = 0;
                  }
                }
              }}
              className="hidden-input"
            />
          </label>
          {/* Recording button */}
          {/* <label className="record-button">
            <Mic className="icon" />
            <span>Record</span>
            <input
              type="file"
              accept="audio/*"
              capture="microphone"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  // Additional checks for file type and size
                  if (
                    file.type.startsWith("audio/") &&
                    file.size > 0 &&
                    file.size < 50 * 1024 * 1024
                  ) {
                    // Max 50MB
                    const url = URL.createObjectURL(file);
                    setFileName(file.name);

                    // BPM detection and other logic remains the same
                    setIsAnalyzing(true);
                    try {
                      const detectedBPM = await detectBPM(url);
                      console.log(`Final detected BPM: ${detectedBPM}`);
                      onBPMChange(detectedBPM);
                    } catch (err) {
                      console.error("BPM detection failed:", err);
                      onBPMChange(120);
                    } finally {
                      setIsAnalyzing(false);
                    }

                    onUpload(url);
                    onStartPointChange(0);

                    if (controlsRef.current) {
                      controlsRef.current.src = url;
                      controlsRef.current.currentTime = 0;
                    }
                  } else {
                    // Handle invalid file
                    alert("Please select a valid audio file (max 50MB)");
                  }
                }
              }}
              className="hidden-input"
            />
          </label>*/}
          
         {/* First, add the APP_CONFIG import to the top of your file */}

{/* Music Source Buttons */}
{/* Your Music Library Button */}
{APP_CONFIG.enableLocalMusicLibrary && (
  <button
    onClick={() => setIsMyMusicModalOpen(true)}
    style={{
      background: "#6c0d9c",
      color: "white",
      border: "solid 2px #fbf8cd",
      padding: "10px",
      borderRadius: "5px",
      display: "flex",
      alignItems: "center",
      textAlign: "left",
      gap: "10px",
      marginTop: "40px",
    }}
  >
    <Music size={24} />
    Add Music
  </button>
)}

{/* Audius Tracks Button - only shown if enabled in config */}
{APP_CONFIG.enableAudiusStreaming && (
  <button
    onClick={() => setIsAudiusModalOpen(true)}
    style={{
      background: "#6c0d9c",
      color: "white",
      border: "solid 2px #fbf8cd",
      padding: "10px",
      borderRadius: "5px",
      display: "flex",
      alignItems: "center",
      textAlign: "left",
      gap: "10px",
      marginTop: APP_CONFIG.enableLocalMusicLibrary ? "10px" : "40px",
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-12.5v9l6-4.5z" />
    </svg>
    Audius Streaming
  </button>
)}

{/* My Music Library Modal */}
{isMyMusicModalOpen && (
  <MyMusicLibrary
    onTrackSelect={(track) => {
      try {
        // Set the music URL
        onUpload(track.streamUrl);

        // Use the BPM from the track
        onBPMChange(track.bpm || 120);

        // Reset start point to beginning
        onStartPointChange(0);

        // Reset audio state
        if (controlsRef.current) {
          controlsRef.current.src = track.streamUrl;
          controlsRef.current.currentTime = 0;
        }

        // Close the modal
        setIsMyMusicModalOpen(false);
      } catch (error) {
        console.error("Error selecting track:", error);
        alert("Unable to load this track. Please try another one.");
      }
    }}
    onClose={() => setIsMyMusicModalOpen(false)}
  />
)}

{/* Audius Tracks Modal - Simplified */}
{isAudiusModalOpen && APP_CONFIG.enableAudiusStreaming && (
  <AudiusTrackSearch
    onTrackSelect={(track) => {
      try {
        // The track object should have a streamUrl property
        if (!track.streamUrl) {
          throw new Error("Track doesn't have a streamUrl");
        }

        // Set the music URL
        onUpload(track.streamUrl);

        // Use the BPM from the track if available, otherwise default to 120
        const trackBPM = track.bpm || 120;
        console.log(`Using track BPM: ${trackBPM}`);
        onBPMChange(trackBPM);

        // Reset start point to beginning
        onStartPointChange(0);

        // Reset audio state
        if (controlsRef.current) {
          controlsRef.current.src = track.streamUrl;
          controlsRef.current.currentTime = 0;
        }

        // Close the modal
        setIsAudiusModalOpen(false);
      } catch (error) {
        console.error("Error selecting Audius track:", error);
        alert("Unable to play this track. Please try another one.");
      }
    }}
    onClose={() => setIsAudiusModalOpen(false)}
  />
)}
</div>

<div className="music-player">
  <audio
    ref={controlsRef}
    src={musicUrl}
    onTimeUpdate={handleTimeUpdate}
    preload="auto" // Ensure audio is fully loaded
  />

  {musicUrl && (
    <div className="music-info">
      <span>
        {fileName && fileName.length > 35
          ? `${fileName.slice(0, 35)}...`
          : musicUrl &&
            musicUrl.includes(
              "https://lingering-surf-27dd.benhayze.workers.dev/"
            )
          ? `${title || "Audius Track"}`
          : fileName || "Track Title"}
      </span>
    </div>
  )}

  <button className="audio-control-button" onClick={handlePlayPause}>
    {isPlaying ? <Pause size={32} /> : <Play size={32} />}
  </button>

  {/* Waveform visualizer with millisecond precision */}
  {musicUrl && (
    <WaveformVisualizer
      audioUrl={musicUrl}
      audioRef={audioRef}
      onStartPointChange={(time) => {
        // Round to 3 decimal places for consistent millisecond precision
        const preciseTime = Math.round(time * 1000) / 1000;

        // Update intended time reference
        intendedTimeRef.current = preciseTime;

        // Update component and app state
        onStartPointChange(preciseTime);
        if (controlsRef.current) {
          controlsRef.current.currentTime = preciseTime;
        }
      }}
      musicStartPoint={musicStartPoint}
    />
  )}
</div>
      </div>
    </div>
  );
};

//==============================================
// PROGRESS BAR COMPONENT
//==============================================
const ProgressBar = ({ currentIndex, totalSlides, onProgressClick }) => {
  console.log("Rendering ProgressBar", {
    currentIndex,
    totalSlides,
    bars: [...Array(totalSlides)].map((_, index) => ({
      index,
      isActive: index === currentIndex,
    })),
  });

  return (
    <div className="progress-container">
      {[...Array(totalSlides)].map((_, index) => (
        <div
          key={index}
          className={`progress-bar ${index === currentIndex ? "active" : ""}`}
          style={{
            backgroundColor:
              index === currentIndex ? "white" : "rgba(255,255,255,0.3)",
          }}
          onClick={() => onProgressClick(index)}
        />
      ))}
    </div>
  );
};
//==============================================
// NAVIGATION BUTTONS
//==============================================
const NavigationButtons = ({
  onPrevious,
  onNext,
  isFirstSlide,
  isLastSlide,
}) => {
  return (
    <>
      <button
        onClick={onPrevious}
        className="nav-button prev"
        disabled={isFirstSlide}
      >
        <ChevronLeft />
      </button>
      <button
        onClick={onNext}
        className="nav-button next"
        disabled={isLastSlide}
      >
        <ChevronRight />
      </button>
    </>
  );
};
//==============================================
// EMPTY STATE COMPONENT
//==============================================
const EmptyState = ({ onFileUpload }) => {
  return (
    <div className="empty-state">
      <label htmlFor="file-upload" className="file-upload-label">
        <PlusCircle size={48} />
        <span>Add Images</span>
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          multiple
          onChange={onFileUpload}
          className="hidden-input"
        />
      </label>
    </div>
  );
};
//==============================================
// MODAL COMPONENTS
//==============================================
//--------------------------------------------
// Progress Modal
//--------------------------------------------
const ProgressModal = ({ isOpen, progress, message, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content export-progress">
        <button
          className="close-button"
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          <X size={24} />
        </button>
        <div className="loading-container">
          <h3 className="progress-title">{message}</h3>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress || 0}%`,
                transition: "width 0.3s ease-in-out",
              }}
            />
          </div>
          <div className="progress-percentage">
            {Math.round(progress || 0)}%
          </div>
        </div>
      </div>
    </div>
  );
};
//--------------------------------------------
// Info Modal
//--------------------------------------------
const InfoModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [licenseText, setLicenseText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Firestore
  useEffect(() => {
    const fetchLicense = async () => {
      try {
        console.group("🔍 License Fetch Debugging");
        console.log("Firestore DB:", db);
        console.log("Modal Open:", isOpen);

        if (!db) {
          console.error("❌ Firestore DB not initialized");
          return;
        }

        const docRef = doc(db, "content", "license");
        console.log("📄 Document Reference:", docRef);

        try {
          const docSnap = await getDoc(docRef);
          console.log("📋 Document Exists:", docSnap.exists());

          if (docSnap.exists()) {
            const licenseData = docSnap.data();
            console.log("📝 License Data:", licenseData);

            if (licenseData && licenseData.text) {
              console.log("✅ License Text Found");
              setLicenseText(licenseData.text);
            } else {
              console.warn("❗ No text field in license document");
              setLicenseText("No license text found.");
            }
          } else {
            console.warn("❌ No such document in Firestore");
            setLicenseText("License document does not exist.");
          }
        } catch (snapshotError) {
          console.error("❌ Snapshot Error:", snapshotError);

          // Improved offline handling
          if (snapshotError.code === "unavailable") {
            console.log("🌐 Offline mode: Attempting to use cached data");
            const cachedDoc = await getDocFromCache(docRef);

            if (cachedDoc.exists()) {
              const cachedData = cachedDoc.data();
              setLicenseText(cachedData.text || "Cached license text");
            } else {
              setLicenseText("License unavailable offline");
            }
          } else {
            setLicenseText(`Error loading license: ${snapshotError.message}`);
          }
        }
      } catch (error) {
        console.error("❌ Detailed Firebase Error:", error);
        setLicenseText(`Error loading license: ${error.message}`);
      } finally {
        console.groupEnd();
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchLicense();
    }
  }, [isOpen]);

  // Function to handle clicking on a section
  const handleSectionClick = (section) => {
    setActiveSection(section);
  };

  // Function to go back to main menu
  const handleBack = () => {
    setActiveSection(null);
  };

  // Render section content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case "credits":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>Credits</h2>
            </header>
            <div className="section-body">
              <div className="credits-content">
                <div className="developer-profile">
                  <div className="developer-avatar">
                    <Award size={64} />
                  </div>
                  <h3>Ben Hayes</h3>
                  <p className="developer-title">Creator & Developer</p>
                </div>

                <div className="company-info">
                  <h4>Hayzer Apps</h4>
                  <p>
                    Groove Slider was designed, developed, and maintained by Ben
                    Hayes as the sole developer.
                  </p>
                </div>

                <div className="developer-note">
                  <p>
                    From concept to implementation, every aspect of this app was
                    crafted to provide an elegant way to create musical
                    slideshows of your favorite moments.
                  </p>
                  <p>
                    I hope you enjoy using Groove Slider as much as I enjoyed
                    creating it.
                  </p>
                </div>

                <div className="contact-section">
                  <h4>Connect</h4>
                  <p>
                    Have feedback or suggestions? I'd love to hear from you!
                  </p>
                  <p>Email: contact@hayzerapps.com</p>
                </div>
              </div>
            </div>
          </div>
        );
      case "feedback":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>Feedback</h2>
            </header>
            <div className="section-body">
              <div className="feedback-form">
                <p>We'd love to hear your thoughts on Groove Slider!</p>
                <textarea
                  placeholder="Share your feedback here..."
                  className="feedback-textarea"
                  rows={6}
                ></textarea>
                <button className="submit-button">Submit Feedback</button>
              </div>
            </div>
          </div>
        );
      // Add cases for other sections
      case "restore":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>Restore Purchase</h2>
            </header>
            <div className="section-body">
              <p>Tap the button below to restore your previous purchases.</p>
              <button className="restore-button">Restore Purchases</button>
            </div>
          </div>
        );
      case "unsubscribe":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>How to Unsubscribe</h2>
            </header>
            <div className="section-body">
              <div className="unsubscribe-info">
                <p>
                  For information on how to manage or cancel your subscription,
                  please visit Google's official support page:
                </p>
                <button
                  className="external-link-button"
                  onClick={() =>
                    window.open(
                      "https://support.google.com/googleplay/answer/7018481?hl=en&co=GENIE.Platform%3DAndroid",
                      "_blank"
                    )
                  }
                >
                  Google Play Subscription Help
                </button>
              </div>
            </div>
          </div>
        );
      case "privacy":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>Privacy Policy</h2>
            </header>
            <div className="section-body">
              <div className="privacy-content">
                <h3>Privacy Policy for Groove Slider</h3>
                <p>Last Updated: March 2, 2025</p>

                <h4>Introduction</h4>
                <p>
                  Welcome to Groove Slider. We respect your privacy and are
                  committed to protecting your personal data. This privacy
                  policy will inform you about how we handle your data when you
                  use our application and tell you about your privacy rights.
                </p>

                <h4>What Data We Collect</h4>
                <p>
                  Groove Slider requires access to the following on your device:
                </p>
                <ul>
                  <li>
                    Image files (photos, pictures) that you select to include in
                    your slideshows
                  </li>
                  <li>
                    Audio files (music, sounds) that you select to add to your
                    slideshows
                  </li>
                </ul>

                <h4>How We Use Your Data</h4>
                <p>We use your data for the following purposes:</p>
                <ul>
                  <li>To create slideshows with your selected images</li>
                  <li>To add your selected music to your slideshows</li>
                  <li>
                    To export these slideshows as MP4 video files to your device
                  </li>
                </ul>

                <h4>Data Processing</h4>
                <p>
                  All data processing happens locally on your device. Your
                  images and music:
                </p>
                <ul>
                  <li>Are not uploaded to our servers</li>
                  <li>Are not shared with third parties</li>
                  <li>
                    Are only accessed when you explicitly grant permission
                  </li>
                  <li>
                    Are only used for the purpose of creating and exporting your
                    slideshows
                  </li>
                </ul>

                <h4>Storage</h4>
                <p>The app stores:</p>
                <ul>
                  <li>
                    Temporary copies of your selected images and music while
                    processing
                  </li>
                  <li>Your slideshow settings and preferences</li>
                  <li>
                    Completed MP4 video files that are saved to your device
                    storage
                  </li>
                </ul>

                <h4>Third-Party Services</h4>
                <p>
                  Our app does not integrate with third-party analytics or
                  advertising services.
                </p>

                <h4>Your Rights</h4>
                <p>You have the right to:</p>
                <ul>
                  <li>
                    Delete your saved slideshows and preferences by uninstalling
                    the app
                  </li>
                  <li>
                    Control what files you share with the app through your
                    device permissions
                  </li>
                </ul>

                <h4>Children's Privacy</h4>
                <p>
                  Our service is not directed to anyone under the age of 13. We
                  do not knowingly collect personal information from children.
                </p>

                <h4>Changes to This Privacy Policy</h4>
                <p>
                  We may update our Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "Last Updated" date.
                </p>

                <h4>Contact Us</h4>
                <p>
                  If you have any questions about this Privacy Policy, please
                  contact us at: contact@grooveslider.app
                </p>
              </div>
            </div>
          </div>
        );
      case "license":
        return (
          <div className="section-content">
            <header className="section-header">
              <button className="back-button" onClick={handleBack}>
                <ChevronLeft size={24} />
              </button>
              <h2>License Agreement</h2>
            </header>
            <div className="section-body">
              <div className="license-content">
                {isLoading ? (
                  <p>Loading license...</p>
                ) : (
                  <>
                    <h3>End User License Agreement</h3>
                    <p>Last Updated: March 2, 2025</p>

                    <div className="license-text">
                      {licenseText || "No license text available."}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="info-modal">
        {activeSection ? (
          renderSectionContent()
        ) : (
          <>
            <header className="info-header">
              <h2>Settings</h2>
              <button className="close-button" onClick={onClose}>
                <X size={24} />
              </button>
            </header>

            <div className="info-content">
              {/* Pro banner */}
              <div className="pro-banner">
                <div className="pro-text">
                  <h3>
                    Groove Slider <span className="pro-badge">Pro</span>
                  </h3>
                  <p>Unlock All Features</p>
                </div>
                <div className="pro-image">
                  {/* You can replace this with an actual image or icon */}
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                    }}
                  ></div>
                </div>
              </div>

              {/* Info items */}
              <div className="info-item-group">
                <div
                  className="info-item"
                  onClick={() => handleSectionClick("credits")}
                >
                  <Globe className="info-icon" />
                  <div className="info-text">
                    <h4>Credits</h4>
                    <p>About</p>
                  </div>
                  <ChevronRight />
                </div>

                <div
                  className="info-item"
                  onClick={() => handleSectionClick("feedback")}
                >
                  <MessageSquare className="info-icon" />
                  <div className="info-text">
                    <h4>Feedback</h4>
                  </div>
                  <ChevronRight />
                </div>

                <div
                  className="info-item"
                  onClick={() => handleSectionClick("restore")}
                >
                  <ShoppingBag className="info-icon" />
                  <div className="info-text">
                    <h4>Restore Purchase</h4>
                  </div>
                  <ChevronRight />
                </div>
              </div>

              <div className="info-item-group">
                <div
                  className="info-item"
                  onClick={() => handleSectionClick("unsubscribe")}
                >
                  <CircleSlash className="info-icon" />
                  <div className="info-text">
                    <h4>How to unsubscribe</h4>
                  </div>
                  <ChevronRight />
                </div>

                <div
                  className="info-item"
                  onClick={() => handleSectionClick("privacy")}
                >
                  <Lock className="info-icon" />
                  <div className="info-text">
                    <h4>Privacy Policy</h4>
                  </div>
                  <ChevronRight />
                </div>

                <div
                  className="info-item"
                  onClick={() => handleSectionClick("license")}
                >
                  <FileText className="info-icon" />
                  <div className="info-text">
                    <h4>License</h4>
                  </div>
                  <ChevronRight />
                </div>

                <div className="info-item">
                  <GitCommit className="info-icon" />
                  <div className="info-text">
                    <h4>Version</h4>
                    <p>Version 0.9.0 (Beta)</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

//--------------------------------------------
// Caption Modal
//--------------------------------------------
const ShareNotification = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  return (
    <div className="share-notification">
      <div className="share-content">
        <h3>Export Complete! 🎉</h3>
        <p>Share your creation:</p>
        <div className="share-buttons">
          <button
            onClick={() => window.open("https://instagram.com", "_blank")}
            className="share-button instagram"
          >
            Share to Instagram
          </button>
          <button
            onClick={() => window.open("https://tiktok.com", "_blank")}
            className="share-button tiktok"
          >
            Share to TikTok
          </button>
        </div>
        <button onClick={onClose} className="close-notification">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

//--------------------------------------------
// Edit Panel Component
//--------------------------------------------
// Edit Panel Component
const EditPanel = ({
  stories,
  onClose,
  onReorder,
  onDelete,
  saveStateOnEditPanelToggle,
}) => {
  // Mode state
  const [mode, setMode] = useState("view"); // "view", "reorder", "delete"

  // For reorder mode
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [tempOrder, setTempOrder] = useState([]);

  // For delete mode
  const [selectedToDelete, setSelectedToDelete] = useState([]);

  // Initialize tempOrder with existing stories when entering reorder mode
  useEffect(() => {
    if (mode === "reorder") {
      setTempOrder([...stories]);
      setSelectedIndices([]);
    } else if (mode === "delete") {
      setSelectedToDelete([]);
    }
  }, [mode, stories]);

  // Handle entering reorder mode
  const handleEnterReorderMode = () => {
    setMode("reorder");
  };

  // Handle entering delete mode
  const handleEnterDeleteMode = () => {
    setMode("delete");
  };

  // Handle going back to view mode
  const handleBack = () => {
    setMode("view");
  };

  // Handle photo selection in reorder mode
  const handlePhotoSelectForReorder = (index) => {
    if (mode !== "reorder") return;

    // Check if already in selected indices
    const indexInSelection = selectedIndices.indexOf(index);

    if (indexInSelection !== -1) {
      // If already selected, remove it
      const newSelectedIndices = [...selectedIndices];
      newSelectedIndices.splice(indexInSelection, 1);
      setSelectedIndices(newSelectedIndices);
    } else {
      // If not selected, add it to the end
      setSelectedIndices([...selectedIndices, index]);
    }

    console.log("Updated selection:", {
      selectedIndices: [...selectedIndices, index].join(", "),
      index,
    });
  };

  // Handle photo selection in delete mode
  const handlePhotoSelectForDelete = (index) => {
    if (mode !== "delete") return;

    // Check if already selected for deletion
    const isSelected = selectedToDelete.includes(index);

    if (isSelected) {
      // If already selected, remove it
      setSelectedToDelete(selectedToDelete.filter((idx) => idx !== index));
    } else {
      // If not selected, add it
      setSelectedToDelete([...selectedToDelete, index]);
    }
  };

  // Apply reordering
  const handleApplyReorder = () => {
    if (selectedIndices.length === 0) {
      // Nothing to reorder
      setMode("view");
      return;
    }

    // Create a new ordered array based on the selected indices
    let newOrder = [];

    // First add all selected stories in the order they were selected
    for (let i = 0; i < selectedIndices.length; i++) {
      const storyIndex = selectedIndices[i];
      newOrder.push(stories[storyIndex]);
    }

    // Then add all unselected stories to the end
    for (let i = 0; i < stories.length; i++) {
      if (!selectedIndices.includes(i)) {
        newOrder.push(stories[i]);
      }
    }

    console.log("Reordering stories:", {
      originalOrder: stories.map((s) => s.url),
      newOrder: newOrder.map((s) => s.url),
      selectedIndices,
    });

    // Apply the reordering
    onReorder(newOrder);

    // Reset and go back to view mode
    setSelectedIndices([]);
    setMode("view");
  };

  // Apply deletion
  const handleApplyDelete = () => {
    if (selectedToDelete.length === 0) {
      // Nothing to delete
      setMode("view");
      return;
    }

    // Sort indices in descending order to avoid index shifts during deletion
    const sortedIndices = [...selectedToDelete].sort((a, b) => b - a);

    // Create a new stories array by deleting selected items
    let newStories = [...stories];
    for (const index of sortedIndices) {
      newStories.splice(index, 1);
    }

    // Apply the deletion
    onReorder(newStories);
    setMode("view");

    // Clear selection
    setSelectedToDelete([]);
  };

  // Cancel current operation
  const handleCancel = () => {
    if (mode === "reorder") {
      setSelectedIndices([]);
    } else if (mode === "delete") {
      setSelectedToDelete([]);
    }
    setMode("view");
  };

  return (
    <div className="edit-panel">
      {/* Add close button */}
      {onClose && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10000 }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(0,0,0,0.7)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}
      {/* Header with mode-specific content */}
      <div
        className="edit-panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 15px",
          backgroundColor: "#1a1a1a",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          marginTop: "40px",
        }}
      >
        {mode === "view" ? (
          <>
            <h3 style={{ margin: 0 }}>Edit Photos</h3>
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                className="mode-button"
                onClick={handleEnterReorderMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Shuffle size={18} />
                <span>Reorder</span>
                
              </button>
              <button
                className="mode-button"
                onClick={handleEnterDeleteMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
  
            </div>
          </>
        ) : mode === "reorder" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <X size={20} />
              </button>
              <h3 style={{ margin: 0 }}>Reorder Photos</h3>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCancel}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  cursor: "pointer",
                  padding: "5px 15px",
                  borderRadius: "5px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyReorder}
                style={{
                  backgroundColor: "#6c0d9c",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "5px 15px",
                  borderRadius: "5px",
                  opacity: selectedIndices.length > 0 ? 1 : 0.5,
                }}
                disabled={selectedIndices.length === 0}
              >
                Apply
              </button>
            </div>
          </>
        ) : mode === "delete" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <X size={20} />
              </button>
              <h3 style={{ margin: 0 }}>
                {selectedToDelete.length === 0
                  ? "Select Photos to Delete"
                  : `${selectedToDelete.length} Selected`}
              </h3>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCancel}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  cursor: "pointer",
                  padding: "5px 15px",
                  borderRadius: "5px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDelete}
                style={{
                  backgroundColor: "#e74c3c",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "5px 15px",
                  borderRadius: "5px",
                  opacity: selectedToDelete.length > 0 ? 1 : 0.5,
                }}
                disabled={selectedToDelete.length === 0}
              >
                Delete
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Instructions */}
      {mode === "reorder" && (
        <div
          style={{
            padding: "10px 15px",
            backgroundColor: "rgba(108, 13, 156, 0.2)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          Select photos in the order you want them to appear
        </div>
      )}

      {mode === "delete" && (
        <div
          style={{
            padding: "10px 15px",
            backgroundColor: "rgba(231, 76, 60, 0.2)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          Select photos you want to delete
        </div>
      )}

      {/* Thumbnails grid */}
      <div
        className="thumbnails-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: "10px",
          padding: "15px",
          overflowY: "auto",
          maxHeight: "70vh",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {stories.map((story, index) => {
          const isSelected = selectedIndices.includes(index);
          const selectionOrder = isSelected
            ? selectedIndices.indexOf(index) + 1
            : null;

          return (
            <div
              key={index}
              onClick={() => {
                if (mode === "reorder") {
                  handlePhotoSelectForReorder(index);
                } else if (mode === "delete") {
                  handlePhotoSelectForDelete(index);
                }
              }}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: "8px",
                overflow: "hidden",
                border: isSelected
                  ? "2px solid #6c0d9c"
                  : "2px solid transparent",
                transition: "transform 0.2s, box-shadow 0.2s, border 0.2s",
                aspectRatio: "1/1",
                width: "100%",
                height: "100%",
                padding: "2px",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                <img
                  src={story.thumbnailData || story.url}
                  alt={`Slide ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "6px",
                  }}
                />

                {/* Reorder mode indicator */}
                {mode === "reorder" && (
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      width: "25px",
                      height: "25px",
                      borderRadius: "50%",
                      backgroundColor: isSelected
                        ? "#6c0d9c"
                        : "rgba(255,255,255,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                      border: "1px solid white",
                    }}
                  >
                    {isSelected ? selectionOrder : ""}
                  </div>
                )}

                {/* Delete mode indicator */}
                {mode === "delete" && selectedToDelete.includes(index) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      width: "25px",
                      height: "25px",
                      borderRadius: "50%",
                      backgroundColor: "#e74c3c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      border: "1px solid white",
                    }}
                  >
                    <Check size={16} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
//==============================================
// BOTTOM MENU COMPONENT
//==============================================
const BottomMenu = ({
  onFileUpload,
  onSaveSession,
  onExportSession,
  onPlayPause,
  isPlaying,
  duration,
  onDurationChange,
  onEdit,
  onMusicUpload,
  onBPMChange,
  musicUrl,
  bpm,
  onStartPointChange,
  musicStartPoint,
  audioRef,
  isLoopingEnabled,
  setIsLoopingEnabled,
  showEditPanel,
  setShowEditPanel,
  stories,
  setStories,
  handleDelete,
  handleReorder,
  saveStateOnEditPanelToggle,
}) => {
  const [showDurationPanel, setShowDurationPanel] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const [selectedBar, setSelectedBar] = useState(1);
  useEffect(() => {
    const barOptions = [0.125, 0.25, 0.5, 1, 2, 4];
    const matchedBar = barOptions.find(
      (option) => Math.abs((duration * bpm) / (4 * 60) - option) < 0.01
    );
    if (matchedBar) {
      setSelectedBar(matchedBar);
    } else {
      // Default to 1 bar if no match found
      setSelectedBar(1);
    }
  }, [duration, bpm]);
  
  // Calculate duration based on BPM and selected bar length
  const calculateDuration = (bars, bpm) => {
    // Duration = (bars * beats per bar * seconds per beat)
    // 4 beats per bar (assuming 4/4 time)
    // seconds per beat = 60/bpm
    return (bars * 4 * 60) / bpm;
  };
  const handleBarChange = (bars) => {
    // Stop playback if currently playing
    if (isPlaying) {
      onPlayPause(); 
    }
    setSelectedBar(bars);
    const newDuration = calculateDuration(bars, bpm);
    onDurationChange(newDuration);
  };
  
  const barOptions = [
    { value: 0.125, label: "⅛ Bar" },
    { value: 0.25, label: "¼ Bar" },
    { value: 0.5, label: "½ Bar" },
    { value: 1, label: "1 Bar" },
    { value: 2, label: "2 Bars" },
    { value: 4, label: "4 Bars" },
  ];
  // Function to toggle duration panel
  const toggleDurationPanel = () => {
    setShowDurationPanel(!showDurationPanel);
    if (showMusicPanel) setShowMusicPanel(false);
    if (showEditPanel) setShowEditPanel(false);
  };
  // Function to toggle music panel
  const toggleMusicPanel = () => {
    setShowMusicPanel(!showMusicPanel);
    if (showDurationPanel) setShowDurationPanel(false);
    if (showEditPanel) setShowEditPanel(false);
  };
  // Function to toggle edit panel
  const toggleEditPanel = () => {
    const newState = !showEditPanel;
    setShowEditPanel(newState);
    if (showDurationPanel) setShowDurationPanel(false);
    if (showMusicPanel) setShowMusicPanel(false);

    // Save state when panel is toggled
    saveStateOnEditPanelToggle(newState);
  };
  return (
    <div className="bottom-menu w-full flex flex-col items-stretch">
      {showDurationPanel && (
        <div className="duration-panel">
    {/* Close button */}
    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10000 }}>
      <button 
        onClick={() => setShowDurationPanel(false)} 
        style={{ 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '50%', 
          width: '36px', 
          height: '36px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: 'pointer' 
        }}
      >
        <X size={24} />
      </button>
    </div>
          <div className="duration-controls">
            <h3>Bar-Based Slide Transitions</h3>
            <div className="bar-options">
              {[
                { value: 0.125, label: "⅛ Bar" },
                { value: 0.25, label: "¼ Bar" },
                { value: 0.5, label: "½ Bar" },
                { value: 1, label: "1 Bar" },
                { value: 2, label: "2 Bars" },
                { value: 4, label: "4 Bars" },
              ].map((option) => (
                <button
                key={option.value}
                className={`bar-option ${selectedBar === option.value ? "selected" : ""}`}
                onClick={() => {
                  // OPTION #1: Stop playback if currently playing
                  if (isPlaying) {
                    onPlayPause(); // This will stop music and slideshow
                  }
                  
                  // Now update the bar selection and duration
                  const newDuration = calculateDuration(option.value, bpm);
                  setSelectedBar(option.value);
                  onDurationChange(newDuration);
                }}
              >
                {option.label}
              </button>
              ))}
            </div>
            <div className="duration-info">
              <span>Slide Change Speed:</span>
              <span className="time-info">
                {duration.toFixed(2)}s /{bpm} BPM
              </span>
            </div>
            {/*
<div className="loop-toggle">
<label>
<input
type="checkbox"
checked={isLoopingEnabled}
onChange={() => setIsLoopingEnabled(!isLoopingEnabled)}
/>
Loop Slideshow
</label>
</div>
*/}
          </div>
        </div>
      )}
   {showMusicPanel && (
  <MusicPanel
    audioRef={audioRef}
    onUpload={onMusicUpload}
    onBPMChange={onBPMChange}
    currentBPM={bpm}
    onStartPointChange={onStartPointChange}
    musicStartPoint={musicStartPoint}
    musicUrl={musicUrl}
    onClose={() => setShowMusicPanel(false)} // Add this prop
  />
)}
      {showEditPanel && (
        <EditPanel
          stories={stories}
          onClose={() => {
            setShowEditPanel(false);
            saveStateOnEditPanelToggle(false); // Save when closed with X button
          }}
          onReorder={handleReorder}
          onDelete={handleDelete}
        />
      )}
      <div className="bottom-menu-buttons">
        <button
          className={`bottom-menu-button ${isLoopingEnabled ? "active" : ""}`}
          onClick={() => setIsLoopingEnabled(!isLoopingEnabled)}
          data-loop="true"
        >
          <RotateCw className="bottom-menu-icon" />
          <span className="bottom-menu-text">Loop</span>
        </button>
        <button
          className={`bottom-menu-button ${showDurationPanel ? "active" : ""}`}
          onClick={toggleDurationPanel}
        >
          <Clock className="bottom-menu-icon" />
          <span className="bottom-menu-text">Speed</span>
        </button>
        <button
          className={`bottom-menu-button ${showMusicPanel ? "active" : ""}`}
          onClick={toggleMusicPanel}
        >
          <Music className="bottom-menu-icon" />
          <span className="bottom-menu-text">Music</span>
        </button>
        <button
          className={`bottom-menu-button ${isPlaying ? "active" : ""}`}
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="bottom-menu-icon" />
          ) : (
            <Play className="bottom-menu-icon" />
          )}
          <span className="bottom-menu-text">
            {isPlaying ? "Pause" : "Play"}
          </span>
        </button>
        <div className="bottom-menu-right-group">
          <button
            className={`bottom-menu-button ${showEditPanel ? "active" : ""}`}
            onClick={toggleEditPanel}
          >
            <Edit className="bottom-menu-icon" />
            <span className="bottom-menu-text">Edit</span>
          </button>
          <label className="bottom-menu-button">
            <ImagePlus className="bottom-menu-icon" />
            <span className="bottom-menu-text">Add</span>
            <input
              type="file"
              id="file-upload-bottom"
              accept="image/*"
              multiple
              onChange={onFileUpload}
              className="hidden-input"
            />
          </label>
          <button className="bottom-menu-button" onClick={onSaveSession}>
            <Save className="bottom-menu-icon" />
            <span className="bottom-menu-text">Save</span>
          </button>
          <button className="bottom-menu-button" onClick={onExportSession}>
            <Download className="bottom-menu-icon" />
            <span className="bottom-menu-text">Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// IMAGE RESIZE BEFORE UPLOAD
// ==============================================

/**
 * Resize an image to specified dimensions while maintaining aspect ratio
 * @param {string|Blob} src - Image source (URL or File)
 * @param {Object} options - Resize options
 * @param {number} options.maxWidth - Target width (e.g., 1080)
 * @param {number} options.maxHeight - Target height (e.g., 1920)
 * @param {string} options.fit - Fit mode ('cover' or 'contain')
 * @param {string} options.format - Output format ('jpeg' or 'png')
 * @param {number} options.quality - JPEG quality (0-1)
 * @returns {Promise<{dataUrl: string, width: number, height: number}>}
 */
const resizeImage = (src, options = {}) => {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    fit = "cover",
    format = "jpeg",
    quality = 0.9,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    // Create object URL if src is a File/Blob
    const objectUrl = src instanceof Blob ? URL.createObjectURL(src) : null;

    img.onload = () => {
      // Calculate dimensions while maintaining aspect ratio
      let targetWidth, targetHeight;
      const imgRatio = img.width / img.height;
      const targetRatio = maxWidth / maxHeight;

      if (fit === "cover") {
        // Cover: fill the entire space, cropping if needed
        if (imgRatio > targetRatio) {
          // Image is wider than target ratio, match height
          targetHeight = maxHeight;
          targetWidth = targetHeight * imgRatio;
        } else {
          // Image is taller than target ratio, match width
          targetWidth = maxWidth;
          targetHeight = targetWidth / imgRatio;
        }
      } else {
        // Contain: ensure the entire image fits
        if (imgRatio > targetRatio) {
          // Image is wider than target ratio, match width
          targetWidth = maxWidth;
          targetHeight = targetWidth / imgRatio;
        } else {
          // Image is taller than target ratio, match height
          targetHeight = maxHeight;
          targetWidth = targetHeight * imgRatio;
        }
      }

      // Create canvas with target dimensions
      const canvas = document.createElement("canvas");
      canvas.width = fit === "cover" ? maxWidth : targetWidth;
      canvas.height = fit === "cover" ? maxHeight : targetHeight;

      // Get context and draw image
      const ctx = canvas.getContext("2d");

      // If using 'cover', we need to center the resized image
      let drawX = 0,
        drawY = 0;

      if (fit === "cover") {
        drawX = (maxWidth - targetWidth) / 2;
        drawY = (maxHeight - targetHeight) / 2;
      }

      // Draw image
      ctx.drawImage(img, drawX, drawY, targetWidth, targetHeight);

      // Convert to data URL
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);

      // Clean up object URL if created
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      resolve({
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      });
    };

    img.onerror = (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    // Set source
    img.src = objectUrl || src;
  });
};

/**
 * Create a small thumbnail version of an image
 * @param {string|Blob} src - Image source
 * @returns {Promise<string>} - Thumbnail data URL
 */
const createThumbnail = (src) => {
  return resizeImage(src, {
    maxWidth: 150,
    maxHeight: 150,
    fit: "cover",
    quality: 0.8,
  }).then((result) => result.dataUrl);
};

//==============================================
// STORY SLIDER COMPONENT - State & Handlers
//==============================================
const StorySlider = () => {
  const [showLanding, setShowLanding] = useState(true);
  // Core State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stories, setStories] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(2);
  // UI State
  const [modalOpen, setModalOpen] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  // Save Session State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  // image resize
  const [imageFitMode, setImageFitMode] = useState("contain");
  // Notifications State
  const [showShareNotification, setShowShareNotification] = useState(false);
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  // Music State
  const [musicUrl, setMusicUrl] = useState(null);
  const [bpm, setBpm] = useState(120);
  const [musicStartPoint, setMusicStartPoint] = useState(0);
  // Audius Track Search
  // Looping State
  const [isLoopingEnabled, setIsLoopingEnabled] = useState(false);
  // Image Preload
  const [preloadedImages, setPreloadedImages] = useState({});
  // Touch State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  // Refs
  const audioRef = useRef(new Audio());
  const intervalRef = useRef(null);

  // cancel export flag
  const isCancelledRef = useRef(false);

  // audius use states
  const [isAudiusModalOpen, setIsAudiusModalOpen] = useState(false);

  // cancel export
  const handleCancelExport = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel the export? The process will stop immediately."
      )
    ) {
      // Set the cancellation flag
      isCancelledRef.current = true;

      // Update UI state
      setIsExporting(false);
      setShowProgress(false);
      setShowShareNotification(false);

      // Show a message to the user
      alert("Export has been canceled.");
    }
  };

  // Stop playback when exproting
  const stopPlayback = () => {
    // Stop auto-rotation slideshow
    if (isPlaying) {
      stopAutoRotation();
      setIsPlaying(false);
    }

    // Stop music if playing
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // save edit panel
  const saveStateOnEditPanelToggle = async (isOpen) => {
    try {
      // Save the current state when the edit panel is toggled
      await handleSaveSessionToDb(`auto_save_edit_panel_${Date.now()}`, true);
      console.log(`Session saved on edit panel ${isOpen ? "open" : "close"}`);
    } catch (error) {
      console.error("Error saving state on edit panel toggle:", error);
    }
  };

  // handleStartSlideshow function
  const handleStartSlideshow = () => {
    if (stories.length > 0) {
      if (
        window.confirm("Start a new project? Any unsaved changes will be lost.")
      ) {
        // Clear all data and show main app
        clearAllData();
        setShowLanding(false);
      }
    } else {
      // No existing content, just show main app
      setShowLanding(false);
    }
  };
  // Helper function to clear all data
  const clearAllData = () => {
    setStories([]);
    setCurrentIndex(0);
    setMusicUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setBpm(120);
    setMusicStartPoint(0);
    setDuration(2);
    setIsLoopingEnabled(false);
  };
  // Image Preload
  const preloadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
  };

  useEffect(() => {
    // Make imageFitMode accessible globally for export
    window.currentImageFitMode = imageFitMode;
  }, [imageFitMode]);

  // Add this useEffect to preload adjacent images
  useEffect(() => {
    const preloadAdjacentImages = async () => {
      const indicesToPreload = [
        currentIndex - 1,
        currentIndex,
        currentIndex + 1,
      ].filter((index) => index >= 0 && index < stories.length);
      for (const index of indicesToPreload) {
        if (!preloadedImages[stories[index].url]) {
          try {
            await preloadImage(stories[index].url);
            setPreloadedImages((prev) => ({
              ...prev,
              [stories[index].url]: true,
            }));
          } catch (error) {
            console.error("Failed to preload image:", error);
          }
        }
      }
    };
    if (stories.length > 0) {
      preloadAdjacentImages();
    }
  }, [currentIndex, stories]);

  // Load FFmpeg on mount
  useEffect(() => {
    loadFFmpeg().catch(console.error);
  }, []);

  // Handle file uploads
  const handleFileUpload = async (event) => {
    console.log("File Upload Started", {
      musicUrlPresent: !!musicUrl,
      currentStoriesCount: stories.length,
      isCurrentlyPlaying: isPlaying,
    });

    // Pause playback if needed
    const wasPlaying = isPlaying;
    if (isPlaying) {
      console.log(
        "Pausing playback before adding images to prevent rendering issues"
      );
      stopAutoRotation();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }

    const files = Array.from(event.target.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      alert("Please select image files only.");
      return;
    }

    // Check if adding these files would exceed the 25 photo limit
    const currentPhotoCount = stories.length;
    const remainingSlots = 25 - currentPhotoCount;

    if (remainingSlots <= 0) {
      alert(
        "Maximum limit of 25 photos reached. Please remove some photos before adding more."
      );
      return;
    }

    // Create a variable to store the files we'll actually process
    let filesToProcess;
    if (files.length > remainingSlots) {
      alert(
        `Only ${remainingSlots} photos can be added. Maximum limit of 25 photos reached.`
      );
      filesToProcess = files.slice(0, remainingSlots);
    } else {
      filesToProcess = files;
    }

    // Show a progress modal if there are many images
    if (files.length > 3) {
      setShowProgress(true);
      setProgressMessage("Processing images...");
      setSaveProgress(0);
    }

    // Process files one by one with resizing
    const processedFiles = [];
    const tempFiles = [];
    const resolution = "1920x1080";
    const [width, height] = resolution.split("x").map(Number);
    const newStories = [];

    // Process files one by one with resizing
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setProgressMessage(`Processing image ${i + 1}/${filesToProcess.length}`);

      try {
        // Update progress
        if (filesToProcess.length > 3) {
          setSaveProgress((i / filesToProcess.length) * 100);
          setProgressMessage(
            `Processing image ${i + 1} of ${filesToProcess.length}...`
          );
        }

        // Create display version (for slideshow UI)
        const displayImage = await resizeImage(file, {
          maxWidth: 1080, // Adjust based on typical display size
          maxHeight: 1920,
          fit: "contain", // Preserve aspect ratio
          quality: 0.9, // Good quality but smaller file size
        });

        // Create export version (pre-scaled to 1080p for FFmpeg)
        const exportImage = await resizeImage(file, {
          maxWidth: 1080,
          maxHeight: 1920,
          fit: "contain", // Match your export settings
          quality: 0.9, // Higher quality for export
        });

        // Create thumbnail for edit panel
        const thumbnailImage = await createThumbnail(file);

        // Create a URL for the display version
        const displayBlob = await fetch(displayImage.dataUrl).then((r) =>
          r.blob()
        );
        const displayUrl = URL.createObjectURL(displayBlob);

        newStories.push({
          type: "image",
          url: displayUrl, // URL for display in slideshow
          originalName: file.name,
          exportData: exportImage.dataUrl, // Pre-scaled for export (1080p)
          thumbnailData: thumbnailImage, // Small thumbnail for edit panel
          dateAdded: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error processing image ${file.name}:`, error);
      }
    }

    // Update stories state
    setStories((prevStories) => {
      const updatedStories = [...prevStories, ...newStories];
      console.log("Stories Update", {
        prevStoriesCount: prevStories.length,
        newStoriesCount: newStories.length,
        totalStoriesCount: updatedStories.length,
      });
      return updatedStories;
    });

    // Hide progress if shown
    if (files.length > 3) {
      setShowProgress(false);
    }

    // Ensure we reset to the first image
    setCurrentIndex(0);

    // Clear the file input
    event.target.value = "";

    // Silent auto-save after adding images
    if (newStories.length > 0) {
      try {
        await handleSaveSessionToDb("auto_save_" + Date.now(), true);
        console.log(
          `Auto-save completed with ${newStories.length} total new images`
        );
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }

    // Resume playback if needed
    if (wasPlaying && musicUrl) {
      console.log("Resuming playback after adding images");
      setTimeout(() => {
        handlePlayPause();
      }, 500);
    }
  };

  // Helper to read file as base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  // Helper to convert base64 to blob
  const base64ToBlob = (base64Data) => {
    const parts = base64Data.split(";base64,");
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  };
  // Music handlers
  const handleMusicUpload = (url) => {
    setMusicUrl(url);
    setMusicStartPoint(0); // Reset start point to beginning
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0; // Ensure audio starts from beginning
    }
  };
  const handleBPMChange = (newBPM) => {
    setBpm(newBPM);
    const barOptions = [0.125, 0.25, 0.5, 1, 2, 4];
    const currentBarOption =
      barOptions.find(
        (option) => Math.abs((duration * newBPM) / (4 * 60) - option) < 0.01
      ) || 1;
    const newDuration = (currentBarOption * 4 * 60) / newBPM;
    setDuration(newDuration);
  };
  // Playback control
  const startAutoRotation = () => {
    // Clear any existing interval first to prevent multiple timers
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      console.log("Cleared existing interval before starting new one");
    }

    console.log("Starting auto rotation with duration:", duration * 1000, "ms");

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // If we're not looping and at the last slide
        if (!isLoopingEnabled && prevIndex >= stories.length - 1) {
          stopAutoRotation(); // Stop rotation
          if (audioRef.current) {
            audioRef.current.pause(); // Stop music
          }
          return prevIndex; // Keep at last slide
        }
        return (prevIndex + 1) % stories.length;
      });
    }, duration * 1000);
  };

  const stopAutoRotation = () => {
    console.log(
      "Stopping auto rotation, current interval ref:",
      intervalRef.current
    );

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("Interval cleared successfully");
    } else {
      console.warn(
        "No interval to clear - this might indicate a syncing issue"
      );
    }

    // Force isPlaying to false as a safety measure
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Pause logic
      stopAutoRotation();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Play logic
      // Always reset to first slide when starting playback if at end
      if (currentIndex >= stories.length - 1) {
        setCurrentIndex(0);
      }
  
      try {
        // Handle audio playback
        if (musicUrl) {
          if (audioRef.current) {
            // Set the source if needed
            if (audioRef.current.src !== musicUrl) {
              audioRef.current.src = musicUrl;
            }
  
            // Set the current time to the start point
            audioRef.current.currentTime = musicStartPoint;
  
            // Try to play the audio
            try {
              await audioRef.current.play();
            } catch (err) {
              console.error("Play error:", err);
              alert("Unable to play audio. The slideshow will continue without music.");
            }
          }
        }
        
        // Always start the slideshow rotation (even if audio fails)
        startAutoRotation();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback error:", err);
        alert("Unable to start slideshow. Please try again.");
      }
    }
  };

  //stroy states
  useEffect(() => {
    console.log("Stories State Changed", {
      storiesCount: stories.length,
      currentIndex,
      musicUrlPresent: !!musicUrl,
    });
  }, [stories, currentIndex, musicUrl]);

  // Add this to your component to track any runaway intervals or timers
  useEffect(() => {
    // Store the original setTimeout and setInterval functions
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;

    let timeoutCount = 0;
    let intervalCount = 0;

    // Override setTimeout to log and count
    window.setTimeout = function (...args) {
      timeoutCount++;
      console.log(`setTimeout #${timeoutCount} called with delay ${args[1]}ms`);
      return originalSetTimeout.apply(this, args);
    };

    // Override setInterval to log and count
    window.setInterval = function (...args) {
      intervalCount++;
      console.log(
        `setInterval #${intervalCount} called with delay ${args[1]}ms`
      );
      return originalSetInterval.apply(this, args);
    };

    // Cleanup function to restore original functions
    return () => {
      window.setTimeout = originalSetTimeout;
      window.setInterval = originalSetInterval;
      console.log(
        `Final counts: ${timeoutCount} timeouts, ${intervalCount} intervals`
      );
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAutoRotation();
  }, []);

  // Sync duration changes -  future feature
  /*useEffect(() => {
    if (isPlaying) {
      stopAutoRotation();
      startAutoRotation();
    }
  }, [duration]);*/

  // Clear Session
  const handleClearSession = () => {
    if (stories.length > 0) {
      if (
        window.confirm(
          "Do you want to save your current project before starting a new one?"
        )
      ) {
        setShowSaveModal(true);
      } else if (
        window.confirm(
          "Are you sure you want to clear all content and start fresh?"
        )
      ) {
        // Clear images
        setStories([]);
        // Reset index
        setCurrentIndex(0);
        // Clear music
        setMusicUrl(null);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        // Reset playback state
        setIsPlaying(false);
        // Reset other states
        setBpm(120);
        setMusicStartPoint(0);
        setDuration(2);
        setIsLoopingEnabled(false);
      }
    } else {
      // If there's no content, just go to projects page
      setShowLanding(true);
    }
  };
  //==============================================
  // STORY SLIDER COMPONENT - Render & Export Logic
  //==============================================
  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  // Touch handlers
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && currentIndex < stories.length - 1) handleNext();
    if (isRightSwipe && currentIndex > 0) handlePrevious();
    setTouchStart(null);
    setTouchEnd(null);
  };
  // Handle Reorder
  const handleReorder = (newStories) => {
    // Stop current playback if it's playing
    if (isPlaying) {
      stopAutoRotation();
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    // Update state synchronously
    setCurrentIndex(0); // Reset to first position
    setStories(newStories);
  };
  // Handle Delete
  const handleDelete = (index) => {
    const newStories = stories.filter((_, i) => i !== index);
    setStories(newStories);
    if (currentIndex >= index) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };
  const getCoverFilterString = (width, height, fitMode) => {
    // Always use contain mode regardless of the parameter
    return `scale=${width}:${height}:force_original_aspect_ratio=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
  };
  //handle Save and load sessions from indexDB
  const handleLoadSession = async (sessionId) => {
    try {
      // Stop any current playback
      if (isPlaying) {
        stopAutoRotation();
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
      // Load session data from IndexedDB
      const sessionData = await loadSession(sessionId);
      // Apply session data to state
      setStories(sessionData.stories);
      setBpm(sessionData.bpm);
      setDuration(sessionData.duration);
      setIsLoopingEnabled(sessionData.isLoopingEnabled);
      setCurrentIndex(sessionData.currentIndex);
      setImageFitMode(sessionData.imageFitMode || "cover");
      // Handle music
      if (sessionData.musicUrl) {
        setMusicUrl(sessionData.musicUrl);
        setMusicStartPoint(sessionData.musicStartPoint);
        // Set audio source
        if (audioRef.current) {
          audioRef.current.src = sessionData.musicUrl;
          audioRef.current.currentTime = sessionData.musicStartPoint;
        }
      }
      // Exit landing page if we're on it
      if (showLanding) {
        setShowLanding(false);
      }
      // Show success message
      alert("Session loaded successfully!");
    } catch (error) {
      console.error("Error loading session:", error);
      alert("Failed to load session: " + error.message);
    }
  };
  // Export functionality
  const handleSaveSession = async (exportSettings) => {
    const finalExportSettings = {
      ...exportSettings,
      imageFitMode: imageFitMode, // Add this to your export settings
    };
    // Destructure export settings with default values
    const {
      resolution = "1080x1920",
      isExportLoopEnabled = false,
      exportLoopDuration = 0,
    } = finalExportSettings;
    try {
      let fileHandle;
      let fileName = exportSettings.fileName || "untitled.mp4";
      // Existing file handle logic remains the same
      if (!("showSaveFilePicker" in window)) {
        const link = document.createElement("a");
        link.download = fileName;
        fileHandle = {
          createWritable: async () => {
            return {
              write: async (data) => {
                const url = URL.createObjectURL(
                  new Blob([data], { type: "video/mp4" })
                );
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
              },
              close: async () => {},
            };
          },
        };
      } else {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            { description: "MP4 Video", accept: { "video/mp4": [".mp4"] } },
          ],
        });
      }
      setIsExporting(true);
      setShowProgress(true);
      setProgressMessage("Preparing to export video...");
      setSaveProgress(0);
      if (!ffmpeg.loaded) {
        await loadFFmpeg();
      }
      let tempFiles = [];
      const processedFiles = [];
      const [width, height] = resolution.split("x").map(Number);

      // Calculate total slideshow duration and loop parameters
      const totalSlideshowDuration = stories.length * duration;
      const loopCount =
        isExportLoopEnabled && exportLoopDuration > 0
          ? Math.ceil(exportLoopDuration / totalSlideshowDuration)
          : 1;

      // OPTIMIZED APPROACH: Process each image only once, then create the loop structure

      // Step 1: Process each unique image only once
      for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        setProgressMessage(`Processing image ${i + 1}/${stories.length}`);

        // Get image data from pre-scaled export version if available
        let imageData;
        try {
          if (story.exportData) {
            // Use the pre-scaled export version (much faster)
            const imageBlob = base64ToBlob(story.exportData);
            imageData = new Uint8Array(await imageBlob.arrayBuffer());
          } else if (story.base64Data) {
            // Fall back to base64 data if available (from older uploads)
            const imageBlob = base64ToBlob(story.base64Data);
            imageData = new Uint8Array(await imageBlob.arrayBuffer());
          } else {
            // Last resort: fetch from URL
            imageData = await fetchFile(story.url);
          }
        } catch (imageError) {
          console.error(`Error fetching image ${i + 1}:`, imageError);
          throw new Error(
            `Failed to process image ${
              i + 1
            }. Please check if all images are valid.`
          );
        }

        const inputName = `input_${i}.png`;
        const outputName = `processed_${i}.mp4`;

        await ffmpeg.writeFile(inputName, imageData);
        tempFiles.push(inputName);

        console.log("Export settings:", finalExportSettings); // Debug log to verify settings
        console.log(
          "Current image fit mode:",
          finalExportSettings.imageFitMode
        ); // Debug specific setting

        // Make sure the filter is using the correct parameter
        // In handleSaveSession function:
        const scaleFilter = getCoverFilterString(
          width,
          height,
          finalExportSettings.imageFitMode
        );

        await ffmpeg.exec([
          "-loop",
          "1",
          "-i",
          inputName,
          "-c:v",
          "libx264",
          "-t",
          `${duration}`,
          "-pix_fmt",
          "yuv420p",
          "-vf",
          scaleFilter,
          "-r",
          "30",
          "-preset",
          "ultrafast",
          outputName,
        ]);

        tempFiles.push(outputName);
        processedFiles.push({ name: outputName });

        // Update progress for image processing phase (60% of the total)
        setSaveProgress(((i + 1) / stories.length) * 60);
      }

      // Step 2: Create a list file for the specified number of loops
      setProgressMessage("Preparing video segments...");
      setSaveProgress(65);

      // Generate file list content based on loop count
      let fileListContent = "";
      for (let loop = 0; loop < loopCount; loop++) {
        for (let i = 0; i < processedFiles.length; i++) {
          fileListContent += `file '${processedFiles[i].name}'\n`;
        }
      }

      // Write the list file
      await ffmpeg.writeFile("loop_list.txt", fileListContent);
      tempFiles.push("loop_list.txt");

      // Step 3: Concatenate all segments based on the loop count
      setProgressMessage("Creating final video...");
      setSaveProgress(70);

      // Concatenate processed files (based on the loop list)
      await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "loop_list.txt",
        "-c:v",
        "copy",
        "temp_output.mp4",
      ]);
      tempFiles.push("temp_output.mp4");

      // Add Background Music with improved error handling
      if (musicUrl) {
        setProgressMessage("Adding background music...");
        setSaveProgress(80);
        try {
          // Try to get music data and validate it
          let musicData;
          try {
            musicData = await fetchFile(musicUrl);
            console.log("Music data fetched, size:", musicData.byteLength);

            // Basic validation - ensure we have actual data
            if (!musicData || musicData.byteLength < 1000) {
              throw new Error("Music file appears to be invalid or too small");
            }
          } catch (fetchError) {
            console.error("Music fetch error:", fetchError);
            throw new Error("Could not access music file");
          }

          // Write music file to FFmpeg
          await ffmpeg.writeFile("background.mp3", musicData);

          // Process video with audio
          await ffmpeg.exec([
            "-i",
            "temp_output.mp4",
            "-ss",
            String(musicStartPoint),
            "-i",
            "background.mp3",
            "-shortest",
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "final_output.mp4",
          ]);

          // Clean up temporary music file
          try {
            await ffmpeg.deleteFile("background.mp3");
            await ffmpeg.deleteFile("temp_output.mp4");
          } catch (cleanupError) {
            console.warn("Non-critical cleanup error:", cleanupError);
            // Continue with export even if cleanup fails
          }
        } catch (musicError) {
          console.error("Music processing failed:", musicError);
          // Fallback: export without music
          setProgressMessage(
            "Music processing failed, creating video without audio..."
          );
          await ffmpeg.exec([
            "-i",
            "temp_output.mp4",
            "-c",
            "copy",
            "final_output.mp4",
          ]);
        }
      } else {
        // No music specified, just copy the video
        await ffmpeg.exec([
          "-i",
          "temp_output.mp4",
          "-c",
          "copy",
          "final_output.mp4",
        ]);
      }

      // Prepare final output
      setProgressMessage("Preparing download...");
      setSaveProgress(95);

      try {
        // Read the final file
        const data = await ffmpeg.readFile("final_output.mp4");
        setSaveProgress(100);

        // Write to target file
        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([data.buffer], { type: "video/mp4" }));
        await writable.close();

        // Clean up
        setShowProgress(false);
        setIsExporting(false);
        setShowShareNotification(true);

        // Clean up temporary files
        try {
          for (const tempFile of tempFiles) {
            await ffmpeg.deleteFile(tempFile);
          }
          await ffmpeg.deleteFile("final_output.mp4");
        } catch (cleanupError) {
          console.warn("Final cleanup error (non-critical):", cleanupError);
        }
      } catch (finalError) {
        console.error("Final output error:", finalError);
        throw new Error(`Failed to save video: ${finalError.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      setShowProgress(false);
      setIsExporting(false);
      alert(`Export failed: ${error.message}`);

      // Try to clean up any temp files in case of error
      try {
        for (const tempFile of tempFiles || []) {
          await ffmpeg.deleteFile(tempFile).catch(() => {});
        }
      } catch (e) {
        // Ignore cleanup errors on fail
      }
    }
  };
  // Handle Save Sessions
  const handleSaveSessionToDb = async (sessionName, isSilent = false) => {
    try {
      // Log the data being saved
      console.log("Saving session to IndexedDB:", {
        sessionName,
        storiesCount: stories.length,
        hasBase64Data: stories.map((story) => !!story.base64Data),
        firstImagePreview:
          stories.length > 0
            ? stories[0].base64Data
              ? stories[0].base64Data.substring(0, 50) + "..."
              : "Missing base64 data"
            : "No images",
      });

      // Only show saving indicator if not silent
      if (!isSilent) {
        setShowProgress(true);
        setProgressMessage("Saving session...");
        setSaveProgress(10);
      }

      // Prepare session data
      const sessionData = {
        name: sessionName,
        stories,
        musicUrl,
        bpm,
        musicStartPoint,
        imageFitMode,
        duration,
        isLoopingEnabled,
        currentIndex,
      };

      // Progress indicator updates if not silent
      if (!isSilent) {
        setSaveProgress(40);
      }

      // Save session to IndexedDB
      await saveSession(sessionData);

      // Log success
      console.log(`Session "${sessionName}" saved successfully!`, {
        timestamp: new Date().toISOString(),
        imageCount: stories.length,
      });

      // Update progress if not silent
      if (!isSilent) {
        setSaveProgress(100);
        setProgressMessage("Session saved successfully!");

        // Hide progress after a brief moment
        setTimeout(() => {
          setShowProgress(false);
          // Show success message
          if (!sessionName.startsWith("auto_save_")) {
            alert("Session saved successfully!");
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving session to database:", error, {
        sessionName,
        storiesCount: stories.length,
      });

      // Only show errors for non-silent operations
      if (!isSilent) {
        setShowProgress(false);
        alert(`Failed to save session: ${error.message}`);
      }
    }
  };
  // Render logic
  return (
    <>
      {showLanding ? (
        <GrooveGalleryLanding
          onCreateSlideshow={handleStartSlideshow}
          onLoadSession={handleLoadSession}
          onClose={() => setShowLanding(false)}
        />
      ) : (
        <div className="app-container">
          <div className="app-content">
            <div className="slider-container">
              <div className="title-bar">
                <h1 className="slider-title">Groove Slider</h1>
                <div className="photo-counter">
                  <span className={stories.length >= 25 ? "max-reached" : ""}>
                    {/* Add the image icon with desired size */}
                    {stories.length} / 25 <Images size={25} />
                  </span>
                </div>
                <button
                  onClick={() => setShowLanding(true)}
                  className="projects-button"
                >
                  <ArrowBigRight size={28} />
                </button>
              </div>
              <audio ref={audioRef} src={musicUrl} loop={true} />
              {stories.length === 0 ? (
                <EmptyState onFileUpload={handleFileUpload} />
              ) : (
                <div
                  className="story-container"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="story-slide">
                    <div className="media-wrapper">
                      <div
                        className="image-container"
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        {/* Toggle button commented out while standardizing on "contain" mode
<button
  className="image-fit-toggle"
  onClick={(e) => {
    e.preventDefault(); // Prevent any default behavior
    console.log("Image fit button clicked"); // Debug log
    setImageFitMode((current) => {
      const newMode = current === "cover" ? "contain" : "cover";
      console.log("New image fit mode:", newMode); // Log the new mode
      return newMode;
    });
  }}
>
  {imageFitMode === "cover" ? (
    <Minimize /> // Adjust the size and color as needed
  ) : (
    <Expand /> // Use the same icon for both modes, or change the icon if needed
  )}
</button>
*/}
                        {stories[currentIndex] && stories[currentIndex].url ? (
                          <img
                            src={stories[currentIndex].url}
                            alt={`Slide ${currentIndex + 1}`}
                            className="media-content"
                            style={{
                              objectFit: imageFitMode, // Use the current fit mode
                              width: "100%",
                              height: "100%",
                              display: "block",
                            }}
                            loading="eager"
                            onError={(e) => {
                              console.log(
                                "Image failed to load, attempting recovery"
                              );
                              const currentStory = stories[currentIndex];
                              if (currentStory && currentStory.base64Data) {
                                const blob = base64ToBlob(
                                  currentStory.base64Data
                                );
                                const newUrl = URL.createObjectURL(blob);
                                const updatedStories = [...stories];
                                updatedStories[currentIndex] = {
                                  ...currentStory,
                                  url: newUrl,
                                };
                                setStories(updatedStories);
                                e.target.src = newUrl;
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="empty-image-placeholder"
                            style={{
                              backgroundColor: "#f5f5f5",
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#333",
                            }}
                          >
                            Select an image to display
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <NavigationButtons
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    isFirstSlide={currentIndex === 0}
                    isLastSlide={currentIndex === stories.length - 1}
                  />
                  <ProgressBar
                    currentIndex={currentIndex}
                    totalSlides={stories.length}
                    onProgressClick={(index) => {
                      console.log("Current Index:", currentIndex);
                      console.log("Clicked Index:", index);
                      console.log("Total Stories:", stories.length);
                      setCurrentIndex(index);
                    }}
                  />
                </div>
              )}
               
              <BottomMenu
                audioRef={audioRef}
                onFileUpload={handleFileUpload}
                onSaveSession={() => setShowSaveModal(true)}
                onExportSession={() => setShowExportModal(true)}
                onPlayPause={handlePlayPause}
                isPlaying={isPlaying}
                duration={duration}
                onDurationChange={setDuration}
                onEdit={() => setShowEditPanel(!showEditPanel)}
                onMusicUpload={handleMusicUpload}
                onBPMChange={handleBPMChange}
                musicUrl={musicUrl}
                bpm={bpm}
                onStartPointChange={setMusicStartPoint}
                musicStartPoint={musicStartPoint}
                onMusicPanelToggle={() => setShowMusicPanel(!showMusicPanel)}
                isLoopingEnabled={isLoopingEnabled}
                setIsLoopingEnabled={setIsLoopingEnabled}
                showEditPanel={showEditPanel}
                setShowEditPanel={setShowEditPanel}
                stories={stories}
                setStories={setStories}
                handleDelete={handleDelete}
                handleReorder={handleReorder}
                saveStateOnEditPanelToggle={saveStateOnEditPanelToggle}
              />
               
              {showEditPanel && (
                <EditPanel
                  stories={stories}
                  onClose={() => {
                    setShowEditPanel(false);
                    saveStateOnEditPanelToggle(false);
                  }}
                  onReorder={handleReorder}
                  onDelete={handleDelete}
                />
              )}
               
              <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleSaveSession}
                isExporting={isExporting}
                progress={saveProgress}
                message={progressMessage}
                stories={stories}
                duration={duration}
                stopPlayback={stopPlayback}
                cancelExport={() => {
                  setIsExporting(false);
                  setShowExportModal(false);
                }}
                currentImageFitMode={imageFitMode}
              />
               
              <SaveSessionModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleSaveSessionToDb}
              />
               
              <ProgressModal
                isOpen={showProgress}
                progress={saveProgress}
                message={progressMessage}
                onCancel={handleCancelExport}
              />
              <ShareNotification
                isVisible={showShareNotification}
                onClose={() => setShowShareNotification(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default StorySlider;
