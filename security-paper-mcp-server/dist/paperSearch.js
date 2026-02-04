import conferencesData from './conferences.json' with { type: 'json' };
const conferences = conferencesData;
// DBLP venue key mappings for accurate matching
const DBLP_VENUE_MAPPINGS = {
    'sp': ['sp', 'ieee symposium on security and privacy', 's&p', 'oakland'],
    'usenix': ['uss', 'usenix security', 'usenix security symposium'],
    'ccs': ['ccs', 'acm ccs', 'computer and communications security'],
    'ndss': ['ndss', 'network and distributed system security'],
    'acsac': ['acsac', 'annual computer security applications'],
    'raid': ['raid', 'research in attacks', 'intrusions and defenses'],
    'esorics': ['esorics', 'european symposium on research in computer security']
};
export function getAllConferences() {
    return {
        ...conferences.conferences.top_tier,
        ...conferences.conferences.second_tier
    };
}
export function getConferencesByTier(tier) {
    if (tier === 'top') {
        return conferences.conferences.top_tier;
    }
    else if (tier === 'second') {
        return conferences.conferences.second_tier;
    }
    return getAllConferences();
}
export function getConferenceInfo(key) {
    const all = getAllConferences();
    return all[key.toLowerCase()];
}
// Get conference website URL for a specific year
export function getConferenceWebsiteUrl(key, year) {
    const conf = getConferenceInfo(key);
    if (!conf)
        return undefined;
    return conf.urls[year.toString()];
}
function buildDblpQuery(options) {
    const parts = [];
    if (options.keyword) {
        parts.push(options.keyword);
    }
    if (options.author) {
        parts.push(`author:${options.author}`);
    }
    // Build venue filter
    const targetConferences = options.conferences?.length
        ? options.conferences
        : Object.keys(getConferencesByTier(options.tier || 'all'));
    const venueQueries = targetConferences
        .map(c => {
        const conf = getConferenceInfo(c);
        return conf?.dblpKey;
    })
        .filter(Boolean);
    if (venueQueries.length > 0) {
        // DBLP uses venue: prefix for conference filtering
        const venueFilter = venueQueries.map(v => `venue:${v}:`).join('|');
        parts.push(venueFilter);
    }
    return parts.join(' ');
}
// Improved venue matching using multiple identifiers
function matchConference(venue) {
    const venueLower = venue.toLowerCase();
    const allConfs = getAllConferences();
    for (const [key, conf] of Object.entries(allConfs)) {
        // Check against DBLP key
        if (venueLower.includes(conf.dblpKey)) {
            return { key, conf };
        }
        // Check against known venue mappings
        const mappings = DBLP_VENUE_MAPPINGS[key] || [];
        for (const mapping of mappings) {
            if (venueLower.includes(mapping)) {
                return { key, conf };
            }
        }
        // Check against short name
        if (venueLower.includes(key) || venueLower.includes(conf.shortName.toLowerCase())) {
            return { key, conf };
        }
    }
    return null;
}
export async function searchPapers(options) {
    const query = buildDblpQuery(options);
    const limit = options.limit || 50;
    const url = new URL('https://dblp.org/search/publ/api');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('h', limit.toString()); // max hits
    try {
        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'SecurityPaperMCP/1.0'
            }
        });
        if (!response.ok) {
            throw new Error(`DBLP API error: ${response.status}`);
        }
        const data = await response.json();
        const hits = data.result?.hits?.hit || [];
        const papers = [];
        for (const hit of hits) {
            const info = hit.info;
            const year = parseInt(info.year, 10);
            // Apply year filter
            if (options.yearFrom && year < options.yearFrom)
                continue;
            if (options.yearTo && year > options.yearTo)
                continue;
            // Extract authors
            let authors = [];
            if (info.authors?.author) {
                const authorData = info.authors.author;
                if (Array.isArray(authorData)) {
                    authors = authorData.map(a => a.text);
                }
                else {
                    authors = [authorData.text];
                }
            }
            // Match conference using improved matching
            const venue = info.venue || '';
            const matched = matchConference(venue);
            // Filter by requested conferences
            if (options.conferences?.length && matched && !options.conferences.includes(matched.key)) {
                continue;
            }
            // Get conference website URL for reference
            const confWebsiteUrl = matched ? getConferenceWebsiteUrl(matched.key, year) : undefined;
            papers.push({
                title: info.title,
                authors,
                year,
                conference: matched?.conf.shortName || info.venue,
                conferenceFull: matched?.conf.name || info.venue,
                tier: matched?.conf.tier || 'second',
                url: info.ee || info.url,
                doi: info.doi,
                conferenceUrl: confWebsiteUrl // Reference link to conference website
            });
        }
        return papers;
    }
    catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}
export async function searchByConference(conferenceKey, year) {
    const conf = getConferenceInfo(conferenceKey);
    if (!conf) {
        throw new Error(`Unknown conference: ${conferenceKey}`);
    }
    return searchPapers({
        conferences: [conferenceKey],
        yearFrom: year,
        yearTo: year,
        limit: 200
    });
}
export function listAvailableConferences() {
    const topTier = Object.entries(conferences.conferences.top_tier).map(([key, conf]) => ({
        key,
        name: conf.name,
        shortName: conf.shortName,
        years: Object.keys(conf.urls).sort()
    }));
    const secondTier = Object.entries(conferences.conferences.second_tier).map(([key, conf]) => ({
        key,
        name: conf.name,
        shortName: conf.shortName,
        years: Object.keys(conf.urls).sort()
    }));
    return { topTier, secondTier };
}
export function getAvailableYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2020; y <= currentYear + 1; y++) { // Include next year for upcoming conferences
        years.push(y);
    }
    return years;
}
