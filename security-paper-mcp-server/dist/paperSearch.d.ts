import { Paper, SearchOptions, ConferenceInfo } from './types.js';
export declare function getAllConferences(): Record<string, ConferenceInfo>;
export declare function getConferencesByTier(tier: 'top' | 'second' | 'all'): Record<string, ConferenceInfo>;
export declare function getConferenceInfo(key: string): ConferenceInfo | undefined;
export declare function getConferenceWebsiteUrl(key: string, year: number): string | undefined;
export declare function searchPapers(options: SearchOptions): Promise<Paper[]>;
export declare function searchByConference(conferenceKey: string, year: number): Promise<Paper[]>;
export declare function listAvailableConferences(): {
    topTier: {
        key: string;
        name: string;
        shortName: string;
        years: string[];
    }[];
    secondTier: {
        key: string;
        name: string;
        shortName: string;
        years: string[];
    }[];
};
export declare function getAvailableYears(): number[];
