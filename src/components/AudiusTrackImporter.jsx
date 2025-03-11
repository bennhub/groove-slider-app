import React, { useState } from 'react';
import { db } from '../firebase'; // Import Firebase instance from the correct path
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Component to manually add Audius tracks to your Firestore database
 */
const AudiusTrackImporter = () => {
  const [trackUrl, setTrackUrl] = useState('');
  const [trackInfo, setTrackInfo] = useState({
    title: '',
    artist: '',
    artworkUrl: '', 
    genre: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'

  // Function to extract track ID from various Audius URL formats
  const extractTrackId = (url) => {
    if (!url) return null;
    
    try {
      // Handle embed URLs like https://audius.co/embed/track/YJY1W2p
      if (url.includes('/embed/track/')) {
        const parts = url.split('/embed/track/');
        return parts[1]?.trim();
      }
      
      // Handle static media URLs
      if (url.includes('/_next/static/media/')) {
        const parts = url.split('/_next/static/media/');
        if (parts[1]) {
          return parts[1].split('.')[0]; // Remove file extension if present
        }
      }
      
      // Handle direct IDs (just the ID itself)
      if (/^[A-Za-z0-9]{6,10}$/.test(url.trim())) {
        return url.trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting track ID:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!trackUrl) {
      setMessage('Please enter an Audius track URL or ID');
      setMessageType('error');
      return;
    }
    
    if (!trackInfo.title || !trackInfo.artist) {
      setMessage('Please fill in the title and artist fields');
      setMessageType('error');
      return;
    }
    
    setIsLoading(true);
    setMessage('Importing track...');
    setMessageType('info');
    
    try {
      // Extract the track ID from the URL
      const trackId = extractTrackId(trackUrl);
      
      if (!trackId) {
        throw new Error('Could not extract a valid track ID from the URL');
      }
      
      // Create the track document
      const trackDocRef = doc(collection(db, "audiusTracks"), trackId);
      
      // Generate direct streaming URL
      const directStreamUrl = `https://audius.co/_next/static/media/${trackId}.mp3`;
      
      // Prepare track data
      const trackData = {
        trackName: trackInfo.title,
        artist: trackInfo.artist,
        streamUrl: directStreamUrl,
        embedUrl: `https://audius.co/embed/track/${trackId}`,
        trackId: trackId,
        artworkUrl: trackInfo.artworkUrl || null,
        genre: trackInfo.genre || "Unknown",
        uploadDate: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
      
      // Save to Firestore
      await setDoc(trackDocRef, trackData);
      
      setMessage('Track successfully added to your library!');
      setMessageType('success');
      
      // Clear form
      setTrackUrl('');
      setTrackInfo({
        title: '',
        artist: '',
        artworkUrl: '',
        genre: ''
      });
    } catch (error) {
      console.error('Error importing track:', error);
      setMessage(`Error importing track: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Add Audius Track</h2>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          borderRadius: '5px',
          backgroundColor: messageType === 'error' ? '#ffebee' : messageType === 'success' ? '#e8f5e9' : '#e3f2fd',
          color: messageType === 'error' ? '#c62828' : messageType === 'success' ? '#2e7d32' : '#1565c0'
        }}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Audius Track URL or Track ID:
          </label>
          <input
            type="text"
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            placeholder="https://audius.co/embed/track/YJY1W2p or YJY1W2p"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          />
          <small style={{ display: 'block', color: '#666', marginTop: '5px' }}>
            You can use: embed URL, track ID, or any Audius link that contains the track ID
          </small>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Track Title:
          </label>
          <input
            type="text"
            value={trackInfo.title}
            onChange={(e) => setTrackInfo({...trackInfo, title: e.target.value})}
            placeholder="Track Title"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Artist:
          </label>
          <input
            type="text"
            value={trackInfo.artist}
            onChange={(e) => setTrackInfo({...trackInfo, artist: e.target.value})}
            placeholder="Artist Name"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Artwork URL (optional):
          </label>
          <input
            type="text"
            value={trackInfo.artworkUrl}
            onChange={(e) => setTrackInfo({...trackInfo, artworkUrl: e.target.value})}
            placeholder="https://example.com/artwork.jpg"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Genre (optional):
          </label>
          <input
            type="text"
            value={trackInfo.genre}
            onChange={(e) => setTrackInfo({...trackInfo, genre: e.target.value})}
            placeholder="Genre"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading ? '#cccccc' : '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'Adding track...' : 'Add Track to Library'}
        </button>
      </form>
    </div>
  );
};

export default AudiusTrackImporter;