import { useState, useEffect } from 'react';

function App() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('videos')) {
            db.createObjectStore('videos');
          }
        };
      });
    }

    async function loadVideo() {
      try {
        const db = await initDB();
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get('mainVideo');

        request.onsuccess = async () => {
          if (request.result) {
            const url = URL.createObjectURL(request.result);
            setVideoUrl(url);
            setLoading(false);
          } else {
            try {
              const remoteUrl = 'https://videos.pexels.com/video-files/6251392/6251392-uhd_2732_1440_24fps.mp4';
              const response = await fetch(remoteUrl);
              if (!response.ok || !response.body) {
                throw new Error('Network response was not ok');
              }

              const contentLength = response.headers.get('Content-Length');
              const total = contentLength ? parseInt(contentLength, 10) : 0;
              const reader = response.body.getReader();
              let receivedLength = 0;
              const chunks = [];

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                if (total) {
                  setProgress((receivedLength / total) * 100);
                }
              }

              const blob = new Blob(chunks);
              
              // Store the video in IndexedDB
              const writeTransaction = db.transaction(['videos'], 'readwrite');
              const writeStore = writeTransaction.objectStore('videos');
              await new Promise((resolve, reject) => {
                const writeRequest = writeStore.put(blob, 'mainVideo');
                writeRequest.onsuccess = () => resolve();
                writeRequest.onerror = () => reject(writeRequest.error);
              });

              const url = URL.createObjectURL(blob);
              setVideoUrl(url);
              setLoading(false);
            } catch (err) {
              console.error(err);
              setError(err.message);
              setLoading(false);
            }
          }
        };

        request.onerror = () => {
          setError(request.error.message);
          setLoading(false);
        };
      } catch (e) {
        console.error(e);
        setError(e.message);
        setLoading(false);
      }
    }

    loadVideo();

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Video Player</h1>
      {loading && (
        <div>
          <p>Loading video...</p>
          {progress > 0 && (
            <progress value={progress} max="100" style={{ width: '100%' }}>
              {progress.toFixed(0)}%
            </progress>
          )}
        </div>
      )}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {videoUrl && !loading && (
        <video controls width="600">
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}

export default App;