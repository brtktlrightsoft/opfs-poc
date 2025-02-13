import { useState, useEffect } from 'react';

function App() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadVideo() {
      try {
        const rootDir = await navigator.storage.getDirectory();
        let fileHandle;

        try {
          fileHandle = await rootDir.getFileHandle('video', { create: false });
          const file = await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
          setLoading(false);
        } catch (err) {
          console.log(err);
          const remoteUrl ='https://videos.pexels.com/video-files/6251392/6251392-uhd_2732_1440_24fps.mp4';
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

          fileHandle = await rootDir.getFileHandle('video', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
        setLoading(false);
      }
    }
    loadVideo();
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