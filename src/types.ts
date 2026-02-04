export interface Paper {
  title: string;
  authors: string[];
  year: number;
  conference: string;
  conferenceFull: string;
  tier: 'top' | 'second';
  url?: string;
  doi?: string;
  abstract?: string;
  conferenceUrl?: string;  // Reference link to conference website
}

export interface ConferenceInfo {
  name: string;
  shortName: string;
  tier: 'top' | 'second';
  urls: Record<string, string>;
  dblpKey: string;
}

export interface ConferencesConfig {
  conferences: {
    top_tier: Record<string, ConferenceInfo>;
    second_tier: Record<string, ConferenceInfo>;
  };
  dblpBaseUrl: string;
  alternativeSources: Record<string, {
    description: string;
    searchUrl: string;
    venueUrl?: string;
  }>;
}

export interface SearchOptions {
  keyword?: string;
  author?: string;
  yearFrom?: number;
  yearTo?: number;
  conferences?: string[];
  tier?: 'top' | 'second' | 'all';
  limit?: number;
}

export interface DblpHit {
  info: {
    title: string;
    authors?: {
      author: { text: string } | { text: string }[];
    };
    year: string;
    venue: string;
    url?: string;
    doi?: string;
    ee?: string;
  };
}

export interface DblpResponse {
  result: {
    hits: {
      hit?: DblpHit[];
      '@total': string;
    };
  };
}
