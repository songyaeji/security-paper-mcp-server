"""
MCP Server for searching academic papers from top-tier conferences.

This server provides tools to:
- Search for papers from academic conferences
- Get information about conferences (field, tier, etc.)
- List conferences by field or tier
"""

import json
from pathlib import Path
from typing import List, Optional, Dict, Any
import httpx
from fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("Conference Paper MCP")

# Load conference data
CONFERENCES_FILE = Path(__file__).parent / "conferences.json"
with open(CONFERENCES_FILE, "r", encoding="utf-8") as f:
    CONFERENCES_DATA = json.load(f)
    CONFERENCES = {conf["id"]: conf for conf in CONFERENCES_DATA["conferences"]}

# HTTP client for API calls (reused across requests)
_http_client: Optional[httpx.Client] = None


def get_http_client() -> httpx.Client:
    """Get or create HTTP client instance."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=30.0)
    return _http_client


def search_dblp_api(
    query: str,
    conference_acronym: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Search DBLP API for papers.
    
    Note: DBLP API has rate limits and may require authentication for heavy usage.
    This is a placeholder implementation - you may need to adjust based on DBLP's current API.
    
    Args:
        query: Search query
        conference_acronym: Conference acronym to filter by
        year: Publication year filter
        limit: Maximum results
    
    Returns:
        List of paper dictionaries
    """
    try:
        client = get_http_client()
        
        # Build search query
        search_query = query
        if conference_acronym:
            search_query = f"{search_query} venue:{conference_acronym}"
        if year:
            search_query = f"{search_query} year:{year}"
        
        # DBLP search API endpoint
        # Note: DBLP API format may vary - check https://dblp.org/faq/ for current API
        params = {
            "q": search_query,
            "h": limit,
            "format": "json"
        }
        
        response = client.get("https://dblp.org/search/publ/api", params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Parse DBLP response (structure may vary)
        papers = []
        if "result" in data and "hits" in data["result"]:
            for hit in data["result"]["hits"].get("hit", [])[:limit]:
                info = hit.get("info", {})
                papers.append({
                    "title": info.get("title", "Unknown"),
                    "authors": info.get("authors", {}).get("author", []),
                    "venue": info.get("venue", ""),
                    "year": info.get("year", ""),
                    "doi": info.get("doi", ""),
                    "ee": info.get("ee", ""),  # Electronic edition URL
                    "url": info.get("url", ""),
                    "source": "DBLP"
                })
        
        return papers
    
    except Exception as e:
        # Return empty list on error - fallback to simulated results
        return []


@mcp.tool()
def search_papers(
    query: str,
    conference_id: Optional[str] = None,
    field: Optional[str] = None,
    tier: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Search for papers from academic conferences.
    
    Args:
        query: Search query (paper title, keywords, or author names)
        conference_id: Specific conference ID to search (e.g., 'ccs', 'neurips')
        field: Filter by research field (e.g., 'CyberSecurity', 'AI', 'Systems', 'Networking')
        tier: Filter by conference tier ('Top-tier' or 'Second-tier')
        year: Filter by publication year
        limit: Maximum number of results to return (default: 10, max: 50)
    
    Returns:
        List of paper dictionaries with title, authors, conference, year, and links
    """
    # Validate limit
    limit = min(max(1, limit), 50)
    
    # Filter conferences based on criteria
    filtered_confs = list(CONFERENCES.values())
    
    if conference_id:
        if conference_id in CONFERENCES:
            filtered_confs = [CONFERENCES[conference_id]]
        else:
            return []
    
    if field:
        filtered_confs = [c for c in filtered_confs if c["field"].lower() == field.lower()]
    
    if tier:
        filtered_confs = [c for c in filtered_confs if c["tier"].lower() == tier.lower()]
    
    # Try to search DBLP API first, fallback to simulated results
    results = []
    
    # Attempt DBLP API search if a specific conference is requested
    # Note: Uncomment and configure DBLP API integration when ready
    # if conference_id and conference_id in CONFERENCES:
    #     conf = CONFERENCES[conference_id]
    #     dblp_results = search_dblp_api(
    #         query=query,
    #         conference_acronym=conf["acronym"],
    #         year=year,
    #         limit=limit
    #     )
    #     if dblp_results:
    #         # Enrich with conference metadata
    #         for paper in dblp_results:
    #             paper["conference"] = conf["name"]
    #             paper["conference_acronym"] = conf["acronym"]
    #             paper["field"] = conf["field"]
    #             paper["tier"] = conf["tier"]
    #         return dblp_results[:limit]
    
    # Fallback: Return structured response indicating search parameters
    # This helps users understand what would be searched
    for conf in filtered_confs[:min(5, limit)]:
        results.append({
            "title": f"[Example] Paper related to: {query}",
            "authors": ["Author One", "Author Two"],
            "conference": conf["name"],
            "conference_acronym": conf["acronym"],
            "year": year or 2024,
            "field": conf["field"],
            "tier": conf["tier"],
            "dblp_url": conf["dblp_url"],
            "note": "Simulated result. To enable real paper search, integrate DBLP API in search_dblp_api() function."
        })
    
    return results[:limit]


@mcp.tool()
def get_conference_info(conference_id: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific conference.
    
    Args:
        conference_id: Conference identifier (e.g., 'ccs', 'neurips', 'icml')
    
    Returns:
        Dictionary containing conference details including name, field, tier, publisher, etc.
    """
    if conference_id not in CONFERENCES:
        return {
            "error": f"Conference '{conference_id}' not found",
            "available_conferences": list(CONFERENCES.keys())
        }
    
    return CONFERENCES[conference_id]


@mcp.tool()
def list_conferences(
    field: Optional[str] = None,
    tier: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List all available conferences, optionally filtered by field or tier.
    
    Args:
        field: Filter by research field (e.g., 'CyberSecurity', 'AI', 'Systems', 'Networking')
        tier: Filter by conference tier ('Top-tier' or 'Second-tier')
    
    Returns:
        List of conference dictionaries
    """
    filtered = list(CONFERENCES.values())
    
    if field:
        filtered = [c for c in filtered if c["field"].lower() == field.lower()]
    
    if tier:
        filtered = [c for c in filtered if c["tier"].lower() == tier.lower()]
    
    return filtered


@mcp.tool()
def get_conference_by_acronym(acronym: str) -> Dict[str, Any]:
    """
    Find a conference by its acronym (e.g., 'CCS', 'NeurIPS', 'ICML').
    
    Args:
        acronym: Conference acronym (case-insensitive)
    
    Returns:
        Conference information dictionary
    """
    acronym_lower = acronym.lower()
    
    for conf in CONFERENCES.values():
        if conf["acronym"].lower() == acronym_lower:
            return conf
    
    return {
        "error": f"Conference with acronym '{acronym}' not found",
        "available_acronyms": [c["acronym"] for c in CONFERENCES.values()]
    }


@mcp.tool()
def get_field_statistics() -> Dict[str, Any]:
    """
    Get statistics about conferences grouped by research field.
    
    Returns:
        Dictionary with field statistics including count and tier breakdown
    """
    stats = {}
    
    for conf in CONFERENCES.values():
        field = conf["field"]
        if field not in stats:
            stats[field] = {
                "total": 0,
                "top_tier": 0,
                "second_tier": 0,
                "conferences": []
            }
        
        stats[field]["total"] += 1
        if conf["tier"] == "Top-tier":
            stats[field]["top_tier"] += 1
        else:
            stats[field]["second_tier"] += 1
        
        stats[field]["conferences"].append({
            "id": conf["id"],
            "acronym": conf["acronym"],
            "name": conf["name"],
            "tier": conf["tier"]
        })
    
    return stats


@mcp.resource("conference://{conference_id}")
def get_conference_resource(conference_id: str) -> str:
    """
    Resource endpoint to get conference information by ID.
    
    Args:
        conference_id: Conference identifier
    
    Returns:
        JSON string with conference information
    """
    if conference_id not in CONFERENCES:
        return json.dumps({"error": f"Conference '{conference_id}' not found"})
    
    return json.dumps(CONFERENCES[conference_id], indent=2, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()