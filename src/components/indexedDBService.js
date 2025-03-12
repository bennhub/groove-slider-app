// IndexedDB Service for Groove Gallery App
// This service handles all database operations for saving and loading sessions

const DB_CONFIG = {
  name: "GrooveGalleryDB",
  version: 3, // Increment version for schema changes
  stores: {
    sessions: { keyPath: "id", autoIncrement: true },
    images: { keyPath: "id", autoIncrement: true, indexes: [{ name: "sessionId", keyPath: "sessionId", unique: false }] },
    music: { keyPath: "id", autoIncrement: true, indexes: [{ name: "sessionId", keyPath: "sessionId", unique: false }] },
    bpmValues: { keyPath: "audioUrl" }
  }
};

/**
 * Clean up object URLs to prevent memory leaks
 * @param {Array} urls - Array of object URLs to revoke
 */
export const cleanupObjectUrls = (urls) => {
  urls.forEach(url => {
    if (url && typeof url === 'string') {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Error revoking object URL:', error);
      }
    }
  });
};

/**
 * Initialize the database
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // Use DB_CONFIG.version directly instead of incrementing it
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      console.log("Database upgrade in progress. Current version:", event.oldVersion);
      console.log("Configured stores:", Object.keys(DB_CONFIG.stores));

      // Create each store specified in DB_CONFIG
      Object.entries(DB_CONFIG.stores).forEach(([storeName, storeConfig]) => {
        // Check if store exists and delete it if version change requires complete rebuild
        if (db.objectStoreNames.contains(storeName) && storeName !== 'sessions') {
          db.deleteObjectStore(storeName);
          console.log(`Deleted existing object store: ${storeName} for rebuild`);
        }
        
        // Create the store if it doesn't exist
        if (!db.objectStoreNames.contains(storeName)) {
          console.log(`Creating object store: ${storeName}`);
          
          const store = db.createObjectStore(storeName, {
            keyPath: storeConfig.keyPath,
            autoIncrement: storeConfig.autoIncrement || false
          });

          // Add indexes as specified in the config
          if (storeConfig.indexes) {
            storeConfig.indexes.forEach(indexConfig => {
              store.createIndex(indexConfig.name, indexConfig.keyPath, { 
                unique: indexConfig.unique || false 
              });
              console.log(`Created index: ${indexConfig.name} on store: ${storeName}`);
            });
          }

          // Add special indexes for bpmValues store
          if (storeName === 'bpmValues') {
            store.createIndex('audioUrl', 'audioUrl', { unique: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('Created indexes for bpmValues store');
          }

          console.log(`Object store ${storeName} created successfully`);
        } else {
          console.log(`Object store ${storeName} already exists`);
          
          // Check and add any missing indexes for existing stores
          if (storeConfig.indexes && storeName !== 'sessions') {
            const transaction = event.target.transaction;
            const existingStore = transaction.objectStore(storeName);
            
            storeConfig.indexes.forEach(indexConfig => {
              if (!existingStore.indexNames.contains(indexConfig.name)) {
                existingStore.createIndex(indexConfig.name, indexConfig.keyPath, { 
                  unique: indexConfig.unique || false 
                });
                console.log(`Added missing index: ${indexConfig.name} to existing store: ${storeName}`);
              }
            });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log("Database opened successfully. Available stores:", Array.from(db.objectStoreNames));
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB initialization error:", event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Save a BPM value to the database
 * @param {string} audioUrl - URL of the audio file
 * @param {number} bpm - BPM value to save
 * @returns {Promise<boolean>} A promise that resolves to true if successful
 */
export const saveBpmValue = async (audioUrl, bpm) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('bpmValues', 'readwrite');
      const store = transaction.objectStore('bpmValues');
      
      const request = store.put({
        audioUrl,
        bpm,
        timestamp: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        console.log(`BPM value ${bpm} saved for ${audioUrl}`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error("Error saving BPM value:", event.target.error);
        reject(false);
      };
    });
  } catch (error) {
    console.error("saveBpmValue error:", error);
    return false;
  }
};

/**
 * Get a BPM value from the database
 * @param {string} audioUrl - URL of the audio file
 * @returns {Promise<number|null>} A promise that resolves to the BPM value or null if not found
 */
export const getBpmValue = async (audioUrl) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      // Double-check store existence before transaction
      if (!db.objectStoreNames.contains('bpmValues')) {
        console.error('bpmValues store does not exist in the database');
        return resolve(null);
      }

      try {
        const transaction = db.transaction(['bpmValues'], 'readonly');
        const store = transaction.objectStore('bpmValues');
        const request = store.get(audioUrl);
        
        request.onsuccess = (event) => {
          const result = event.target.result;
          if (result) {
            console.log(`Retrieved cached BPM for ${audioUrl}: ${result.bpm}`);
            resolve(result.bpm);
          } else {
            console.log(`No cached BPM found for ${audioUrl}`);
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          console.error("Error retrieving BPM value:", event.target.error);
          resolve(null);
        };

        transaction.onerror = (event) => {
          console.error("Transaction error:", event.target.error);
          resolve(null);
        };
      } catch (transactionError) {
        console.error("Transaction creation error:", transactionError);
        resolve(null);
      }
    });
  } catch (error) {
    console.error("getBpmValue error:", error);
    return null;
  }
};

/**
 * Save a session to the database
 * @param {Object} sessionData - Session data to save
 * @returns {Promise<number>} A promise that resolves to the session ID
 */
export const saveSession = async (sessionData) => {
  try {
    // Process images: convert blob URLs to actual blobs
    const imageBlobs = [];
    for (const story of sessionData.stories) {
      try {
        const response = await fetch(story.url);
        const blob = await response.blob();
        imageBlobs.push({
          type: story.type,
          blob: blob
        });
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }
    
    // Process music: convert blob URL to actual blob
    let musicBlob = null;
    if (sessionData.musicUrl) {
      try {
        const response = await fetch(sessionData.musicUrl);
        musicBlob = await response.blob();
      } catch (error) {
        console.error("Error processing music:", error);
      }
    }
    
    // Initialize database
    const db = await initDB();
    
    // Create a transaction that includes all stores
    const transaction = db.transaction(['sessions', 'images', 'music'], 'readwrite');
    
    // Create session record
    const sessionsStore = transaction.objectStore('sessions');
    const sessionRecord = {
      name: sessionData.name,
      createdAt: new Date(),
      bpm: sessionData.bpm,
      musicStartPoint: sessionData.musicStartPoint,
      imageFitMode: sessionData.imageFitMode,
      duration: sessionData.duration,
      isLoopingEnabled: sessionData.isLoopingEnabled,
      currentIndex: sessionData.currentIndex
    };
    
    // Save session and get the ID
    const sessionRequest = sessionsStore.add(sessionRecord);
    
    return new Promise((resolve, reject) => {
      sessionRequest.onsuccess = async (event) => {
        const sessionId = event.target.result;
        
        // Save images
        const imagesStore = transaction.objectStore('images');
        for (const imageData of imageBlobs) {
          imagesStore.add({
            sessionId: sessionId,
            type: imageData.type,
            blob: imageData.blob
          });
        }
        
        // Save music if exists
        if (musicBlob) {
          const musicStore = transaction.objectStore('music');
          musicStore.add({
            sessionId: sessionId,
            blob: musicBlob
          });
        }
        
        transaction.oncomplete = () => {
          console.log(`Session saved with ID: ${sessionId}`);
          resolve(sessionId);
        };
        
        transaction.onerror = (event) => {
          console.error("Transaction error:", event.target.error);
          reject(event.target.error);
        };
      };
      
      sessionRequest.onerror = (event) => {
        console.error("Error adding session:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("saveSession error:", error);
    throw error;
  }
};

/**
 * Load a session from the database
 * @param {number} sessionId - ID of the session to load
 * @returns {Promise<Object>} A promise that resolves to the session data
 */
export const loadSession = async (sessionId) => {
  try {
    const db = await initDB();
    
    // Get session data
    const sessionData = await new Promise((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.get(sessionId);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
    
    if (!sessionData) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    // Get images for the session
    const images = await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readonly');
      const store = transaction.objectStore('images');
      
      // Check if index exists
      if (!store.indexNames.contains('sessionId')) {
        console.warn('sessionId index not found on images store - falling back to cursor');
        // Fallback: Use cursor to filter manually
        const images = [];
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.sessionId === sessionId) {
              images.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(images);
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
        
        return;
      }
      
      // If we have the index, use it
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
    
    // Convert image blobs back to URLs
    const stories = images.map(imageData => ({
      type: imageData.type,
      url: URL.createObjectURL(imageData.blob)
    }));
    
    // Get music for the session
    const musicData = await new Promise((resolve, reject) => {
      const transaction = db.transaction('music', 'readonly');
      const store = transaction.objectStore('music');
      
      // Check if index exists
      if (!store.indexNames.contains('sessionId')) {
        console.warn('sessionId index not found on music store - falling back to cursor');
        // Fallback: Use cursor to filter manually
        let musicData = null;
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.sessionId === sessionId) {
              musicData = cursor.value;
              // Found what we need, no need to continue
              resolve(musicData);
              return;
            }
            cursor.continue();
          } else {
            resolve(musicData);
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
        
        return;
      }
      
      // If we have the index, use it
      const index = store.index('sessionId');
      const request = index.get(sessionId);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
    
    // Convert music blob back to URL if exists
    let musicUrl = null;
    if (musicData && musicData.blob) {
      musicUrl = URL.createObjectURL(musicData.blob);
    }
    
    // Combine all data with cleanup method
    return {
      ...sessionData,
      stories,
      musicUrl,
      cleanup: () => {
        cleanupObjectUrls([
          ...stories.map(story => story.url),
          musicUrl
        ]);
      }
    };
  } catch (error) {
    console.error("loadSession error:", error);
    throw error;
  }
};

/**
 * Get all sessions from the database
 * @returns {Promise<Array>} A promise that resolves to an array of sessions
 */
export const getAllSessions = async () => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("getAllSessions error:", error);
    throw error;
  }
};

/**
 * Delete a session from the database
 * @param {number} sessionId - ID of the session to delete
 * @returns {Promise<void>}
 */
export const deleteSession = async (sessionId) => {
  try {
    // First, load the session to get its URLs for cleanup
    // We need to use a modified loadSession approach that doesn't fail if indexes are missing
    const db = await initDB();
    
    // Use a transaction for all stores
    const transaction = db.transaction(['sessions', 'images', 'music'], 'readwrite');
    
    // Delete session
    const sessionsStore = transaction.objectStore('sessions');
    sessionsStore.delete(sessionId);
    
    // Delete associated images - handle with or without index
    const imagesStore = transaction.objectStore('images');
    if (imagesStore.indexNames.contains('sessionId')) {
      // Use index if available
      const imagesIndex = imagesStore.index('sessionId');
      const imagesRequest = imagesIndex.openCursor(IDBKeyRange.only(sessionId));
      
      imagesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } else {
      // Fallback - use cursor and filter
      const imagesRequest = imagesStore.openCursor();
      
      imagesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
    
    // Delete associated music - handle with or without index
    const musicStore = transaction.objectStore('music');
    if (musicStore.indexNames.contains('sessionId')) {
      // Use index if available
      const musicIndex = musicStore.index('sessionId');
      const musicRequest = musicIndex.openCursor(IDBKeyRange.only(sessionId));
      
      musicRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } else {
      // Fallback - use cursor and filter
      const musicRequest = musicStore.openCursor();
      
      musicRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`Session ${sessionId} deleted successfully`);
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error("Error deleting session:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("deleteSession error:", error);
    throw error;
  }
};