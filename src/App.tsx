/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { WebScraper } from "./components/web-scraper/WebScraper";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";
import { MediaSource } from "./types/media";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(-1);

  const handleNewScrapedContent = (content: string, url: string) => {
    setMediaSources(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'scrape' as const,
      content,
      url,
      timestamp: Date.now()
    }]);
  };

  const cycleMedia = () => {
    if (mediaSources.length === 0) return;
    setCurrentMediaIndex(prev => (prev + 1) % (mediaSources.length + 1));
  };

  const currentContent = currentMediaIndex >= 0 && currentMediaIndex < mediaSources.length 
    ? mediaSources[currentMediaIndex] 
    : null;

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              <WebScraper onNewContent={handleNewScrapedContent} />
              {currentContent?.type === 'scrape' ? (
                <div className="scraped-content-view">
                  <h3>Scraped Content from: {currentContent.url}</h3>
                  <div className="content-preview">
                    <pre>{currentContent.content}</pre>
                  </div>
                </div>
              ) : (
                <video
                  className={cn("stream", {
                    hidden: !videoRef.current || !videoStream,
                  })}
                  ref={videoRef}
                  autoPlay
                  playsInline
                />
              )}
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            >
              <button 
                className="action-button"
                onClick={cycleMedia}
                disabled={mediaSources.length === 0}
              >
                <span className="material-symbols-outlined">switch_video</span>
              </button>
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
