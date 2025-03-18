// MyMusicLibrary.js
import React, { useState, useRef, useEffect } from "react";
import { Music, Play, Pause, Download, Check, X, Activity } from "lucide-react";
import { analyze } from "web-audio-beat-detector";
import musicCatalogData from './musicCatalog.json';

const MyMusicLibrary = ({ onTrackSelect, onClose }) => {
  const [musicCatalog, setMusicCatalog] = useState(musicCatalogData.tracks);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [previewTrackId, setPreviewTrackId] = useState(null);
  const [analyzingBpmTrackId, setAnalyzingBpmTrackId] = useState(null);
  const [customBpmValues, setCustomBpmValues] = useState({});
  const previewAudioRef = useRef(new Audio());
  
  // Effect to stop preview when modal is closed
  useEffect(() => {
    return () => {
      // When component unmounts (modal closes), stop the preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = ''; // Clear the source
      }
    };
  }, []);
  
  // Preview handling
  const handlePreview = (trackId) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    
    if (previewTrackId === trackId) {
      setPreviewTrackId(null);
      return;
    }
    
    const track = musicCatalog.find(t => t.id === trackId);
    setPreviewTrackId(trackId);
    previewAudioRef.current.src = track.streamUrl;
    previewAudioRef.current.play();
  };
  
  // BPM detection handler
  const handleDetectBpm = async (e, trackId) => {
    e.stopPropagation(); // Prevent triggering card click
    
    // Find the track
    const track = musicCatalog.find(t => t.id === trackId);
    if (!track) return;
    
    // Set analyzing state
    setAnalyzingBpmTrackId(trackId);
    
    try {
      // Fetch the track data
      const response = await fetch(track.streamUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Create audio context for analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Decode the audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Use the web-audio-beat-detector library to analyze tempo
      const detectedTempo = await analyze(audioBuffer);
      
      // Adjust for double-time if needed
      let adjustedTempo = detectedTempo;
      if (detectedTempo > 140) {
        adjustedTempo = detectedTempo / 2;
      }
      
      const finalTempo = Math.round(adjustedTempo);
      console.log(`Detected BPM for ${track.title}: ${finalTempo}`);
      
      // Update the catalog with the new BPM
      const updatedCatalog = musicCatalog.map(t => 
        t.id === trackId ? {...t, bpm: finalTempo} : t
      );
      
      // Update the state
      setMusicCatalog(updatedCatalog);
      
      // Update the custom BPM values state
      setCustomBpmValues(prev => ({
        ...prev,
        [trackId]: finalTempo
      }));
      
      // Clean up
      audioContext.close();
    } catch (error) {
      console.error(`Error detecting BPM for track ${trackId}:`, error);
    } finally {
      setAnalyzingBpmTrackId(null);
    }
  };
  
  // Select and "download" handling
  const handleSelectTrack = async (track) => {
    setSelectedTrackId(track.id);
    setDownloadProgress({...downloadProgress, [track.id]: 0});
    
    // Simulate download or actually download if hosted externally
    try {
      // Simulate progress updates
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[track.id] || 0;
          if (current < 95) {
            return {...prev, [track.id]: current + 5};
          }
          return prev;
        });
      }, 100);
      
      // Fetch the track if it's hosted externally
      const response = await fetch(track.streamUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      clearInterval(interval);
      setDownloadProgress({...downloadProgress, [track.id]: 100});
      
      // Stop preview if playing
      if (previewTrackId === track.id) {
        previewAudioRef.current.pause();
        setPreviewTrackId(null);
      }
      
      // Get the appropriate BPM - prefer custom detected value if available
      const trackBpm = customBpmValues[track.id] || track.bpm || 120;
      
      // Pass the track to the parent component
      onTrackSelect({
        ...track,
        streamUrl: objectUrl, // Use the local object URL
        bpm: trackBpm // Use custom detected BPM if available
      });
      
      // Close the modal
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error("Error loading track:", error);
      setDownloadProgress({...downloadProgress, [track.id]: -1}); // -1 for error
      setSelectedTrackId(null);
    }
  };
  
  return (
    <div className="my-music-modal" style={{
      position: 'fixed',
      top: '-340px',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 20000,
      width: 'calc(100% - 10px)',
      maxWidth: '800px',
      maxHeight: '80vh',
      backgroundColor: '#121212',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      padding: '20px',
      overflowY: 'auto',
      color: '#ffffff',
    }}>
      <div className="modal-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{margin: 0}}>Current Track List</h2>
        <button 
          onClick={() => {
            // Stop preview when closing
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current.src = ''; // Clear the source
            }
            setPreviewTrackId(null);
            onClose();
          }} 
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="tracks-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', // Reduced from 200px to 150px
        gap: '10px', // Reduced from 15px
        paddingBottom: '10px' // Reduced from 15px
      }}>
        {musicCatalog.map(track => (
          <div key={track.id} className="track-card" style={{
            border: '2px solid rgba(72, 9, 111, 0.87)',
            borderRadius: '8px',
            padding: '8px', // Reduced from 10px
            backgroundColor: '#1e1e1e',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div className="track-artwork" style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              marginBottom: '8px', // Reduced from 10px
              overflow: 'hidden',
              borderRadius: '6px'
            }}>
              <img 
                src={track.coverArt} 
                alt={track.title} 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* Control buttons container */}
              <div style={{
                position: 'absolute',
                bottom: '8px', // Reduced from 10px
                right: '8px', // Reduced from 10px
                display: 'flex',
                gap: '6px' // Reduced from 8px
              }}>
                {/* BPM detection button */}
                <button 
                  className="bpm-detect-button" 
                  onClick={(e) => handleDetectBpm(e, track.id)}
                  disabled={analyzingBpmTrackId === track.id}
                  style={{
                    width: '35px', // Reduced from 40px
                    height: '35px', // Reduced from 40px
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '2px solid white',
                    color: 'white',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: analyzingBpmTrackId === track.id ? 'wait' : 'pointer',

                  }}
                >
                  {analyzingBpmTrackId === track.id ? (
                    <div style={{ 
                      width: '18px', // Reduced from 20px
                      height: '18px', // Reduced from 20px
                      borderRadius: '50%', 
                      border: '2px solid transparent', 
                      borderTopColor: 'white',
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                  ) : (
                    <Activity size={18} /> // Reduced from 20px
                  )}
                </button>
                
                {/* Play/pause button */}
                <button 
                  className="preview-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(track.id);
                  }}
                  style={{
                    width: '60px', // Reduced from 40px
                    height: '60px', // Reduced from 40px
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '2px solid white',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {previewTrackId === track.id ? <Pause size={18} /> : <Play size={18} />} 
                </button>
              </div>
            </div>
            
            <div className="track-details" style={{
              marginBottom: '8px' // Reduced from 10px
            }}>
              <h3 style={{
                margin: '0 0 4px 0', // Reduced from 5px
                fontSize: '14px', // Reduced from 16px
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{track.title}</h3>
              <p style={{
                margin: '0 0 4px 0', // Reduced from 5px
                color: '#aaa',
                fontSize: '12px' // Reduced from 14px
              }}>By {track.artist}</p>
              <div style={{
                display: 'flex',
                gap: '6px', // Reduced from 8px
                marginBottom: '4px' // Reduced from 5px
              }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: customBpmValues[track.id] ? '#ff8800' : '#6c0d9c',
                  padding: '2px 6px', // Reduced from 3px 8px
                  borderRadius: '12px',
                  fontSize: '10px', // Reduced from 12px
                  color: 'white'
                }}>
                  {customBpmValues[track.id] || track.bpm || 120} BPM
                  {customBpmValues[track.id] && " (Detected)"}
                </span>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#2c8dc4',
                  padding: '2px 6px', // Reduced from 3px 8px
                  borderRadius: '12px',
                  fontSize: '10px', // Reduced from 12px
                  color: 'white'
                }}>
                  {track.genre}
                </span>
              </div>
            </div>
            
            <div className="track-actions">
              {downloadProgress[track.id] > 0 ? (
                <div className="download-progress" style={{
                  width: '100%',
                  height: '25px', // Reduced from 30px
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div className="progress-bar" style={{
                    height: '100%',
                    width: `${downloadProgress[track.id]}%`,
                    backgroundColor: '#6c0d9c',
                    transition: 'width 0.2s'
                  }}></div>
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px' // Reduced from default
                  }}>{downloadProgress[track.id]}%</span>
                </div>
              ) : (
                <button 
                  className="add-track-button"
                  onClick={() => handleSelectTrack(track)}
                  disabled={selectedTrackId === track.id}
                  style={{
                    width: '100%',
                    padding: '6px 10px', // Reduced from 8px 12px
                    backgroundColor: selectedTrackId === track.id ? '#4a0b69' : '#6c0d9c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedTrackId === track.id ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center', 
                    gap: '6px', // Reduced from 8px
                    fontSize: '12px' // Reduced from default
                  }}
                >
                  {selectedTrackId === track.id ? <Check size={14} /> : <Download size={14} />} 
                  {selectedTrackId === track.id ? "Added" : "Add to Project"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="modal-footer" style={{
        padding: '15px',
        textAlign: 'center',
        opacity: '0.7',
        fontSize: '0.9rem',
        marginTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <p style={{margin: 0}}>Original music by Your Name/Studio</p>
      </div>
      
      {/* Add a keyframe animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default MyMusicLibrary;