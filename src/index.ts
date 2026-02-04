#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import {
  searchPapers,
  searchByConference,
  listAvailableConferences,
  getAvailableYears,
  getConferenceInfo
} from './paperSearch.js';

const server = new McpServer({
  name: 'security-paper-search',
  version: '1.0.0'
});

// Tool 1: Search papers with various filters
server.registerTool(
  'search_papers',
  {
    title: 'Search Security Papers',
    description: `Search for security research papers from top-tier (S&P, USENIX Security, CCS, NDSS) and second-tier (ACSAC, RAID, ESORICS) conferences.

Supports filtering by:
- keyword: Search in paper titles
- author: Author name
- yearFrom/yearTo: Year range (2020-present)
- conferences: Specific conference keys (sp, usenix, ccs, ndss, acsac, raid, esorics)
- tier: "top", "second", or "all"`,
    inputSchema: {
      keyword: z.string().optional().describe('Keyword to search in paper titles'),
      author: z.string().optional().describe('Author name to search'),
      yearFrom: z.number().min(2020).max(2026).optional().describe('Start year (default: 2020)'),
      yearTo: z.number().min(2020).max(2026).optional().describe('End year (default: current year)'),
      conferences: z.array(z.string()).optional().describe('Conference keys: sp, usenix, ccs, ndss, acsac, raid, esorics'),
      tier: z.enum(['top', 'second', 'all']).optional().describe('Conference tier filter'),
      limit: z.number().min(1).max(200).optional().describe('Max results (default: 50)')
    }
  },
  async (args) => {
    try {
      const papers = await searchPapers({
        keyword: args.keyword,
        author: args.author,
        yearFrom: args.yearFrom || 2020,
        yearTo: args.yearTo || new Date().getFullYear(),
        conferences: args.conferences,
        tier: args.tier || 'all',
        limit: args.limit || 50
      });

      const resultText = papers.length > 0
        ? `Found ${papers.length} papers:\n\n${papers.map((p, i) =>
            `${i + 1}. "${p.title}"\n   Authors: ${p.authors.join(', ')}\n   Conference: ${p.conference} ${p.year} (${p.tier}-tier)\n   Paper URL: ${p.url || 'N/A'}${p.conferenceUrl ? `\n   Conference Page: ${p.conferenceUrl}` : ''}`
          ).join('\n\n')}`
        : 'No papers found matching your criteria.';

      return {
        content: [{ type: 'text', text: resultText }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error searching papers: ${error}` }],
        isError: true
      };
    }
  }
);

// Tool 2: Get papers from a specific conference and year
server.registerTool(
  'get_conference_papers',
  {
    title: 'Get Conference Papers',
    description: 'Get all papers from a specific security conference in a specific year.',
    inputSchema: {
      conference: z.enum(['sp', 'usenix', 'ccs', 'ndss', 'acsac', 'raid', 'esorics'])
        .describe('Conference key'),
      year: z.number().min(2020).max(2026)
        .describe('Conference year')
    }
  },
  async ({ conference, year }) => {
    try {
      const confInfo = getConferenceInfo(conference);
      const papers = await searchByConference(conference, year);

      const resultText = papers.length > 0
        ? `${confInfo?.name || conference} ${year} - Found ${papers.length} papers:\n\n${papers.map((p, i) =>
            `${i + 1}. "${p.title}"\n   Authors: ${p.authors.join(', ')}\n   Paper URL: ${p.url || 'N/A'}${p.conferenceUrl ? `\n   Conference Page: ${p.conferenceUrl}` : ''}`
          ).join('\n\n')}`
        : `No papers found for ${conference} ${year}.`;

      return {
        content: [{ type: 'text', text: resultText }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true
      };
    }
  }
);

// Tool 3: List available conferences
server.registerTool(
  'list_conferences',
  {
    title: 'List Available Conferences',
    description: 'List all supported security conferences with their keys and full names.',
    inputSchema: {}
  },
  async () => {
    const { topTier, secondTier } = listAvailableConferences();
    const years = getAvailableYears();

    const text = `## Supported Security Conferences

### Top-Tier (Big 4)
${topTier.map(c => `- **${c.shortName}** (key: \`${c.key}\`)\n  ${c.name}\n  Available years: ${c.years.join(', ')}`).join('\n')}

### Second-Tier
${secondTier.map(c => `- **${c.shortName}** (key: \`${c.key}\`)\n  ${c.name}\n  Available years: ${c.years.join(', ')}`).join('\n')}

### Data Source
- Primary: DBLP (reliable, structured API)
- Conference URLs: Reference links to official conference pages

### Available Years
${years.join(', ')}

### Usage Examples
- Search by keyword: \`search_papers(keyword: "fuzzing")\`
- Search by author: \`search_papers(author: "John Smith")\`
- Filter by year: \`search_papers(yearFrom: 2023, yearTo: 2024)\`
- Specific conference: \`get_conference_papers(conference: "sp", year: 2024)\`
- Top-tier only: \`search_papers(keyword: "malware", tier: "top")\``;

    return {
      content: [{ type: 'text', text: text }]
    };
  }
);

// Tool 4: Get conference statistics
server.registerTool(
  'get_stats',
  {
    title: 'Get Paper Statistics',
    description: 'Get statistics about papers matching search criteria (count by year, conference, etc.)',
    inputSchema: {
      keyword: z.string().optional().describe('Keyword to search'),
      tier: z.enum(['top', 'second', 'all']).optional().describe('Conference tier')
    }
  },
  async ({ keyword, tier }) => {
    try {
      const papers = await searchPapers({
        keyword,
        tier: tier || 'all',
        limit: 200
      });

      // Group by year
      const byYear: Record<number, number> = {};
      const byConference: Record<string, number> = {};

      for (const paper of papers) {
        byYear[paper.year] = (byYear[paper.year] || 0) + 1;
        byConference[paper.conference] = (byConference[paper.conference] || 0) + 1;
      }

      const text = `## Paper Statistics${keyword ? ` for "${keyword}"` : ''}

**Total papers found:** ${papers.length}

### By Year
${Object.entries(byYear)
  .sort(([a], [b]) => Number(b) - Number(a))
  .map(([year, count]) => `- ${year}: ${count} papers`)
  .join('\n')}

### By Conference
${Object.entries(byConference)
  .sort(([, a], [, b]) => b - a)
  .map(([conf, count]) => `- ${conf}: ${count} papers`)
  .join('\n')}`;

      return {
        content: [{ type: 'text', text: text }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Security Paper Search MCP Server running on stdio');
}

main().catch(console.error);
