export type MediaSourceType = 'screen' | 'scrape' | 'webcam';

export type BaseMediaSource = {
  id: string;
  type: MediaSourceType;
  timestamp: number;
  title?: string;
};

type ScreenMediaSource = BaseMediaSource & {
  type: 'screen';
  stream: MediaStream;
};

type ScrapeMediaSource = BaseMediaSource & {
  type: 'scrape';
  content: string;
  url: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    favicon?: string;
  };
};

type WebcamMediaSource = BaseMediaSource & {
  type: 'webcam';
  stream: MediaStream;
};

export type MediaSource = ScreenMediaSource | ScrapeMediaSource | WebcamMediaSource; 