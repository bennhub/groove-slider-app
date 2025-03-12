import React, { useState, useEffect, useRef } from "react";
import { Search, PlayCircle, X, Music, ExternalLink } from "lucide-react";
import { db } from "../firebase"; // Import Firebase instance from the correct path
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

// List of Audius provider endpoints to try
const AUDIUS_PROVIDERS = [
  "https://discoveryprovider.audius.co",
  "https://dn1.audius-metadata.io",
  "https://dn2.audius-metadata.io",
  "https://audius-discovery-1.cultur3stake.com",
  "https://audius-discovery-2.cultur3stake.com",
  "https://audius-discovery-3.cultur3stake.com",
  "https://audius-discovery-4.cultur3stake.com",
];

const AudiusTrackSearch = ({ onTrackSelect, onClose }) => {
  const [tracks, setTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save search query to Firestore
  const saveSearchQuery = async (query) => {
    try {
      await addDoc(collection(db, "searchQueries"), {
        query,
        timestamp: new Date().toISOString(),
      });
      console.log("Search query saved to Firestore!");
    } catch (error) {
      console.error("Error saving search query to Firestore:", error);
    }
  };

  // Fetch tracks from Firestore based on search query
  const fetchTracksFromFirestore = async (searchTerm = "") => {
    try {
      const tracksSnapshot = await getDocs(collection(db, "audiusTracks"));

      const tracksData = [];

      tracksSnapshot.forEach((doc) => {
        // Get the document data
        const data = doc.data();

        // If there's no search term, include all tracks
        if (!searchTerm) {
          tracksData.push(createTrackObject(doc.id, data));
          return;
        }

        // Check if track matches search term
        const searchTermLower = searchTerm.toLowerCase();
        const artistName = (data.artist || "").toLowerCase();
        const trackName = (data.trackName || "").toLowerCase();
        const genre = (data.genre || "").toLowerCase();

        if (
          artistName.includes(searchTermLower) ||
          trackName.includes(searchTermLower) ||
          genre.includes(searchTermLower)
        ) {
          tracksData.push(createTrackObject(doc.id, data));
        }
      });

      // Log the tracks data for debugging
      console.log("Fetched tracks data:", tracksData);

      return tracksData;
    } catch (error) {
      console.error("Error fetching tracks from Firestore:", error);
      throw error;
    }
  };

  // Extract Audius track ID from various URL formats
  const extractAudiusTrackId = (url) => {
    console.group('Extracting Audius Track ID');
    console.log('Input URL:', url);

    if (!url) {
        console.warn('URL is null or undefined');
        console.groupEnd();
        return null;
    }

    try {
      // Handle embed URLs like https://audius.co/embed/track/YJY1W2p
      if (url.includes("/embed/track/")) {
        const parts = url.split("/embed/track/");
        const trackId = parts[1]?.trim();
        console.log('Embed URL track ID:', trackId);
        console.groupEnd();
        return trackId;
      }

      // Handle direct stream URLs
      if (url.includes("/tracks/") && url.includes("/stream")) {
        const match = url.match(/\/tracks\/([a-zA-Z0-9]+)\/stream/);
        const trackId = match && match[1] ? match[1] : null;
        console.log('Stream URL track ID:', trackId);
        console.groupEnd();
        return trackId;
      }

      // Handle permalink URLs like https://audius.co/artist/track-name
      if (url.includes("audius.co/") && !url.includes("/tracks/")) {
        console.log('Permalink URL detected');
        const permalinkUrl = "permalink:" + url;
        console.groupEnd();
        return permalinkUrl;
      }

      console.warn('No matching URL pattern found');
      console.groupEnd();
      return null;
    } catch (error) {
      console.error("Detailed error extracting Audius track ID:", {
        errorMessage: error.message,
        errorStack: error.stack,
        inputUrl: url
      });
      console.groupEnd();
      return null;
    }
  };

  // Extract artist handle from various URL formats
  const extractArtistHandle = (url) => {
    if (!url) return null;

    try {
      // Handle URLs like https://audius.co/artistname/trackname
      if (url.includes("audius.co/")) {
        const parts = url.split("audius.co/");
        if (parts.length > 1) {
          const pathParts = parts[1].split("/");
          if (pathParts.length > 0) {
            return pathParts[0]; // First part after domain is typically the artist handle
          }
        }
      }

      // Handle embed URLs
      if (url.includes("/embed/track/")) {
        // We can't directly get the artist handle from this format
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error extracting artist handle:", error);
      return null;
    }
  };

  // Generate direct stream URLs for an Audius track
  const getAudiusStreamUrl = (trackId) => {
    if (!trackId) return null;

    // Return the first provider's URL, but we'll try others if this fails
    return `https://lingering-surf-27dd.benhayze.workers.dev/${trackId}`;
  };

  // Helper function to create a consistent track object from Firestore data
  const createTrackObject = (id, data) => {
    // If we have the original track object stored, use that
    if (data.originalTrack) {
      return {
        ...processTrackStreamUrl(data.originalTrack),
        bpm: data.bpm || null  // Add this line
      };
    }
  
    // Extract artist handle from streamUrl if possible
    let artistHandle = "";
    
    // Try to extract artist handle from various sources
    if (data.artistHandle) {
      // Use directly if available
      artistHandle = data.artistHandle;
    } else if (data.streamUrl) {
      // Try to extract from streamUrl
      artistHandle = extractArtistHandle(data.streamUrl);
    }
    
    // Extract track ID from the URL to get the correct path
    const trackId = data.streamUrl ? 
      data.streamUrl.split("/embed/track/")[1] || 
      data.streamUrl.split("/").pop() : 
      null;
  
    // Otherwise create a track object from the stored fields
    const trackObj = {
      id: id,
      title: data.trackName,
      user: {
        name: data.artist,
        handle: artistHandle || (data.artist ? data.artist.toLowerCase().replace(/\s+/g, '') : "")
      },
      genre: data.genre || "Unknown",
      permalink: data.streamUrl ? data.streamUrl.split("/").pop() : "",
      streamUrl: data.streamUrl,
      embedUrl: data.embedUrl || null,
      artistUrl: artistHandle ? `https://audius.co/${artistHandle}` : null,
      bpm: data.bpm || null
    };
  
    return processTrackStreamUrl(trackObj);
  };

  // Process track to ensure it has a valid streaming URL
  const processTrackStreamUrl = (track) => {
    if (!track) return track;

    // Try to extract a trackId from the existing URLs
    let trackId = null;

    // First check if we have an embed URL
    if (track.embedUrl) {
      trackId = extractAudiusTrackId(track.embedUrl);
    }

    // Then check the stream URL
    if (!trackId && track.streamUrl) {
      trackId = extractAudiusTrackId(track.streamUrl);
    }

    // If we have a track ID that's not a permalink, create a direct streaming URL
    if (trackId && !trackId.startsWith("permalink:")) {
      track.directStreamUrl = getAudiusStreamUrl(trackId);
      track.trackId = trackId;
    }

    return track;
  };

  // Search for tracks in Firestore
  const searchTracks = async () => {
    if (!searchQuery) return;

    setIsLoading(true);
    setError(null);

    // Save search query to Firestore
    await saveSearchQuery(searchQuery);

    try {
      // Search in Firestore
      const firestoreTracks = await fetchTracksFromFirestore(searchQuery);

      if (firestoreTracks.length > 0) {
        setTracks(firestoreTracks);
      } else {
        setError(
          "No tracks found matching your search term. Try adding tracks to your Firestore database first."
        );
      }
    } catch (error) {
      console.error("Error searching tracks:", error);
      setError("Unable to search tracks. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial tracks from Firestore when component mounts
  useEffect(() => {
    const loadInitialTracks = async () => {
      setIsLoading(true);
      try {
        const initialTracks = await fetchTracksFromFirestore();
        if (initialTracks.length > 0) {
          setTracks(initialTracks);
        }
      } catch (error) {
        console.error("Error loading initial tracks:", error);
        setError("Unable to load initial tracks.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialTracks();
  }, []);

  const handleTrackSelect = (track) => {
    try {
      // Extract the track ID if possible
      let trackId =
        track.trackId ||
        extractAudiusTrackId(track.embedUrl || track.streamUrl);
  
      // Common track formatting logic
      const formatTrack = (streamUrl) => ({
        id: track.id,
        title: track.title,
        artist: track.user?.name || "Unknown Artist",
        streamUrl: streamUrl,
        trackId: trackId || null,
        bpm: track.bpm || null,
        genre: track.genre || "Unknown Genre"
      });
  
      // Prioritize proxy URL if track ID exists
      if (trackId) {
        const proxyUrl = `https://lingering-surf-27dd.benhayze.workers.dev/${trackId}`;
        onTrackSelect(formatTrack(proxyUrl));
        return;
      }
  
      // Fallback to stream URL
      if (track.streamUrl) {
        onTrackSelect(formatTrack(track.streamUrl));
        return;
      }
  
      // If we reach here, we don't have a valid URL
      throw new Error("Track doesn't have a playable URL");
    } catch (error) {
      console.error("Error handling track selection:", error);
      alert(
        "Unable to play this track. Please try another one or contact support."
      );
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      searchTracks();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '-300px',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        width: 'calc(100% - 40px)',
        maxWidth: '800px',
        maxHeight: '80vh',
        backgroundColor: '#121212', // Darker background to match app theme
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        padding: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        color: '#ffffff', // Light text for dark background
      }}
    >
      {/* Close button in top right */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          backgroundColor: 'rgba(240, 235, 235, 0.1)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1001,
        }}
      >
        <X size={20} />
      </button>

      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        marginTop: '5px',
        color: '#ffffff'
      }}>
        Find Music for Your Slideshow
      </h2>

      <div
        style={{
          display: "flex",
          marginBottom: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for tracks in your library"
          style={{
            flex: 1,
            padding: "12px 15px",
            border: "none",
            fontSize: "16px",
            outline: "none",
            backgroundColor: "#2a2a2a", // Darker input field
            color: "white", // White text
          }}
        />
        <button
          onClick={searchTracks}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: isLoading ? "#444444" : "#6c0d9c", // Matches your purple theme
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          <Search size={20} />
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div style={{ textAlign: "center", color: "#ff6b6b", padding: "20px" }}>
          {error}
        </div>
      )}

      {tracks.length === 0 && !isLoading && !error && (
        <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
          No tracks available. Please add tracks to your Firestore database
          first.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "15px",
          paddingBottom: "15px",
        }}
      >
        {tracks.map((track) => (
          <div
            key={track.id}
            style={{
              border: "2px solid rgba(72, 9, 111, 0.87)",
              borderRadius: "8px",
              padding: "10px",
              backgroundColor: "#1e1e1e", // Darker card background
              boxShadow: "0 4px 6px rgb(53, 53, 53)",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
            onClick={() => handleTrackSelect(track)}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "0 6px 10px rgba(0,0,0,0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            {/* Artist profile link section instead of artwork */}
            <div style={{
              width: "100%",
              height: "50px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {track.user && track.user.handle ? (
                <a
                  href={`https://audius.co/${track.user.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    color: "white",
                    border: "1px solid #6c0d9c",
                    borderRadius: "5px",
                    textDecoration: "none",
                    fontSize: "10px",
                    transition: "background-color 0.2s",
                    backgroundColor: "transparent", // Default state
                    '&:hover': {
                      backgroundColor: "#8a1cc2" // Hover state
                    }
                  }}
                >
                  <Music size={16} style={{marginRight: "8px"}} />
                  View Artist Profile
                </a>
              ) : (
                <div style={{
                  padding: "8px 12px",
                  backgroundColor: "#333",
                  color: "#888",
                  borderRadius: "5px",
                  fontSize: "14px"
                }}>
                  Artist Profile Unavailable
                </div>
              )}
            </div>

            <div>
              <h3
                style={{
                  margin: "0 0 5px 0",
                  fontSize: "16px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#ffffff",
                }}
              >
                {track.title}
              </h3>
              <p
                style={{
                  margin: "0 0 5px 0",
                  color: "#aaa", // Lighter gray text
                  fontSize: "14px",
                }}
              >
                By {track.user?.name || "Unknown Artist"}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                }}
              >
                <div style={{ fontSize: "14px", color: "#888" }}>
                  <span>BPM: {track.bpm || "N/A"}</span>
                  <span style={{ marginLeft: "10px" }}>
                    Genre: {track.genre || "Unknown"}
                  </span>
                </div>
                <PlayCircle size={38} color="#6c0d9c" /> {/* Match your theme color */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudiusTrackSearch;