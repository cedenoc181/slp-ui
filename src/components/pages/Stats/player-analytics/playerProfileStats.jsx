import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SEASONS, TEAM_METADATA } from '../../../../data/constants/apiConstants';
import playerStatsService from '../../../../data/services/playerStatsServices';
import injuryService from '../../../../data/services/injuryService';
import rosterService from '../../../../data/services/rosterService';
import gamesService from '../../../../data/services/gamesService';
import '../../../../styles/stats-page-styling/player-profile.css';

// Helper to extract MLB ID from name slug (e.g., "aaron-judge-592450" -> 592450)
// Also handles raw numeric IDs for backwards compatibility
const extractMlbIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // If the slug is just a number, treat it as the MLB ID directly
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  
  // MLB ID is the last segment after the final hyphen (always numeric)
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

function PlayerProfileStats() {
  const { nameSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract MLB ID from the SEO-friendly slug
  const mlbIdFromSlug = useMemo(() => {
    const id = extractMlbIdFromSlug(nameSlug);
    console.log('Extracted MLB ID from slug:', nameSlug, '->', id);
    return id;
  }, [nameSlug]);
  
  // Initialize season from URL params or default
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    return '2025';
  });

  // State for active tabs/filters
  const [activeStatsTab, setActiveStatsTab] = useState('current'); // current, career
  const [activeSplitsTab, setActiveSplitsTab] = useState('handedness'); // handedness, homeAway
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);
  const [gameLogSeasonType, setGameLogSeasonType] = useState('R'); // R (Regular), S (Spring Training), P (Postseason)
  const [gameLogPage, setGameLogPage] = useState(1); // Current page for game log pagination
  const gamesPerPage = 10; // Number of games per page
  
  // Recent Form section has its own season type (independent from Game Log)
  const [recentFormSeasonType, setRecentFormSeasonType] = useState('R'); // R (Regular), S (Spring Training), P (Postseason)
  const [recentFormGameLog, setRecentFormGameLog] = useState([]); // Separate game log for recent form (batting for TWP)
  const [pitchingRecentFormGameLog, setPitchingRecentFormGameLog] = useState([]); // Separate pitching game log for TWP recent form
  const [recentFormLoading, setRecentFormLoading] = useState(false);
  
  const [trendTimeframe, setTrendTimeframe] = useState('5y'); // 1y, 3y, 5y, career
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr'); // hr, h, avg, ops, bb, so
  const [twoWayViewMode, setTwoWayViewMode] = useState('batting'); // batting (default), pitching - for TWP players

  // Loading states
  const [playerLoading, setPlayerLoading] = useState(true);
  const [gameLogLoading, setGameLogLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Player data state (populated by API)
  const [playerInfo, setPlayerInfo] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [careerStats, setCareerStats] = useState([]);
  const [careerTotals, setCareerTotals] = useState(null);
  const [careerTotalsLoading, setCareerTotalsLoading] = useState(false);
  const [vsHandSplits, setVsHandSplits] = useState([]);
  const [homeRoadSplits, setHomeRoadSplits] = useState([]);
  const [vsHandSplitsCareer, setVsHandSplitsCareer] = useState(null);
  const [homeRoadSplitsCareer, setHomeRoadSplitsCareer] = useState(null);
  const [careerSplitsLoading, setCareerSplitsLoading] = useState(false);
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  
  // Two-way player: separate pitching stats (batting stats stored in regular state above)
  const [pitchingSeasonStats, setPitchingSeasonStats] = useState(null);
  const [pitchingCareerStats, setPitchingCareerStats] = useState([]);
  const [pitchingVsHandSplits, setPitchingVsHandSplits] = useState([]);
  const [pitchingHomeRoadSplits, setPitchingHomeRoadSplits] = useState([]);
  const [pitchingMonthlyPerformance, setPitchingMonthlyPerformance] = useState(null);
  const [pitchingCareerTotals, setPitchingCareerTotals] = useState(null);
  const [pitchingVsHandSplitsCareer, setPitchingVsHandSplitsCareer] = useState(null);
  const [pitchingHomeRoadSplitsCareer, setPitchingHomeRoadSplitsCareer] = useState(null);
  
  const [teamHistory, setTeamHistory] = useState([]);
  const [injuryHistory, setInjuryHistory] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);

  // Sync season FROM URL params when they change
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      setSelectedSeason(seasonParam);
    }
  }, [searchParams, selectedSeason]);

  // Close season dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update URL when season changes
  const handleSeasonChange = (newSeason) => {
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  };

  // Fetch player info on mount or when nameSlug changes
  useEffect(() => {
    const fetchPlayerInfo = async () => {
      if (!mlbIdFromSlug) {
        console.warn('No MLB ID extracted from slug:', nameSlug);
        setError('Invalid player URL');
        setPlayerLoading(false);
        return;
      }
      
      setPlayerLoading(true);
      setError(null);
      
      try {
        // Use MLB ID from slug to fetch player info
        console.log('Fetching player info for MLB ID:', mlbIdFromSlug);
        const data = await playerStatsService.getPlayerInfoByMlbId(mlbIdFromSlug);
        console.log('Player info response:', data);
        
        // Handle different response formats - API might return data nested or flat
        const playerData = data?.player || data;
        
        // Ensure we have an id field for subsequent API calls
        if (!playerData?.id && playerData?.player_id) {
          playerData.id = playerData.player_id;
        }
        
        setPlayerInfo(playerData);
      } catch (err) {
        console.error('Error fetching player info:', err);
        setError('Failed to load player information');
        setPlayerInfo(null);
      } finally {
        setPlayerLoading(false);
      }
    };
    
    fetchPlayerInfo();
  }, [mlbIdFromSlug]);

  // Fetch player injury history when playerInfo loads
  useEffect(() => {
    const fetchInjuryHistory = async () => {
      if (!playerInfo?.id) return;
      
      try {
        // Pass player.id (internal DB ID) to get accurate injury history
        // Don't pass season to get full history
        const response = await injuryService.getPlayerInjuryHistory(playerInfo.id);
        // API returns { player_id, season, total_injuries, injuries: [...] }
        const injuries = response?.injuries || [];
        setInjuryHistory(Array.isArray(injuries) ? injuries : []);
      } catch (err) {
        console.error('Error fetching injury history:', err);
        setInjuryHistory([]);
      }
    };
    
    fetchInjuryHistory();
  }, [playerInfo]);

  // Fetch team history (roster history) when playerInfo changes
  useEffect(() => {
    const fetchTeamHistory = async () => {
      if (!playerInfo?.id) return;
      
      try {
        // Get player roster history without season param for full history
        const response = await rosterService.getPlayerRosterHistory(playerInfo.id);
        // API returns { player_id, player_mlb_id, player_name, seasons: [...] }
        const seasons = response?.seasons || [];
        setTeamHistory(Array.isArray(seasons) ? seasons : []);
      } catch (err) {
        console.error('Error fetching team history:', err);
        setTeamHistory([]);
      }
    };
    
    fetchTeamHistory();
  }, [playerInfo]);

  // Fetch game logs when player, season, season type, or TWP view mode changes
  useEffect(() => {
    const fetchGameLogs = async () => {
      if (!playerInfo?.id) return;
      
      setGameLogLoading(true);
      try {
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcher = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        // Only consider true TWP (position explicitly set to TWP) for game log fetching
        const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
        
        // For TWP: use twoWayViewMode to determine which game logs to fetch
        // For pitchers: always fetch pitcher logs. For batters: always fetch batter logs.
        const shouldFetchPitcherLogs = isTruelyTwoWay ? twoWayViewMode === 'pitching' : isPitcher;
        
        console.log('Game Log fetch - position:', pos, 'isPitcher:', isPitcher, 'isTruelyTwoWay:', isTruelyTwoWay, 'twoWayViewMode:', twoWayViewMode, 'shouldFetchPitcherLogs:', shouldFetchPitcherLogs, 'seasonType:', gameLogSeasonType);
        
        let response;
        if (shouldFetchPitcherLogs) {
          console.log('Fetching PITCHER game logs for main Game Log section...');
          response = await gamesService.getPitcherGameLogs(
            playerInfo.id,
            selectedSeason,
            gameLogSeasonType
            // No limit - load all games
          );
          console.log('Main Game Log pitcher response:', response);
        } else {
          console.log('Fetching BATTER game logs for main Game Log section...');
          response = await gamesService.getBatterGameLogs(
            playerInfo.id,
            selectedSeason,
            gameLogSeasonType
            // No limit - load all games (up to 162 for regular season)
          );
        }
        
        // API returns { games: [...] }
        const games = response?.games || [];
        console.log('Main Game Log games count:', games.length);
        setGameLog(Array.isArray(games) ? games : []);
        // Reset to page 1 when fetching new data
        setGameLogPage(1);
      } catch (err) {
        console.error('Error fetching game logs:', err);
        setGameLog([]);
      } finally {
        setGameLogLoading(false);
      }
    };
    
    fetchGameLogs();
  }, [playerInfo, selectedSeason, gameLogSeasonType, twoWayViewMode]);

  // Fetch game logs for Recent Form section (independent from Game Log section)
  useEffect(() => {
    const fetchRecentFormGameLogs = async () => {
      if (!playerInfo?.id) return;
      
      setRecentFormLoading(true);
      try {
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcherPos = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        // Only consider true TWP (position explicitly set to TWP) for separate game log fetching
        // Regular pitchers with is_two_way flag should still use pitcher game logs
        const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
        
        console.log('Recent Form fetch - position:', pos, 'isPitcher:', isPitcherPos, 'isTruelyTwoWay:', isTruelyTwoWay, 'is_two_way flag:', playerInfo.is_two_way, 'seasonType:', recentFormSeasonType);
        
        if (isTruelyTwoWay) {
          // For true TWP (like Ohtani), fetch BOTH batting and pitching game logs
          const [battingResponse, pitchingResponse] = await Promise.all([
            gamesService.getBatterGameLogs(playerInfo.id, selectedSeason, recentFormSeasonType).catch(() => ({ games: [] })),
            gamesService.getPitcherGameLogs(playerInfo.id, selectedSeason, recentFormSeasonType).catch(() => ({ games: [] })),
          ]);
          
          const battingGames = battingResponse?.games || [];
          const pitchingGames = pitchingResponse?.games || [];
          console.log('TWP Recent Form - batting games:', battingGames.length, 'pitching games:', pitchingGames.length);
          setRecentFormGameLog(Array.isArray(battingGames) ? battingGames : []);
          setPitchingRecentFormGameLog(Array.isArray(pitchingGames) ? pitchingGames : []);
        } else if (isPitcherPos) {
          // Regular pitcher - fetch pitcher game logs into recentFormGameLog
          console.log('Fetching pitcher game logs for player:', playerInfo.id, 'season:', selectedSeason, 'seasonType:', recentFormSeasonType);
          const response = await gamesService.getPitcherGameLogs(
            playerInfo.id,
            selectedSeason,
            recentFormSeasonType
          );
          console.log('Pitcher Recent Form FULL response:', JSON.stringify(response));
          const games = response?.games || response || [];
          console.log('Pitcher Recent Form games:', games.length, 'isArray:', Array.isArray(games));
          setRecentFormGameLog(Array.isArray(games) ? games : []);
          setPitchingRecentFormGameLog([]);
        } else {
          const response = await gamesService.getBatterGameLogs(
            playerInfo.id,
            selectedSeason,
            recentFormSeasonType
          );
          const games = response?.games || [];
          console.log('Batter Recent Form games:', games.length);
          setRecentFormGameLog(Array.isArray(games) ? games : []);
          setPitchingRecentFormGameLog([]);
        }
      } catch (err) {
        console.error('Error fetching recent form game logs:', err);
        setRecentFormGameLog([]);
        setPitchingRecentFormGameLog([]);
      } finally {
        setRecentFormLoading(false);
      }
    };
    
    fetchRecentFormGameLogs();
  }, [playerInfo, selectedSeason, recentFormSeasonType]);

  // Fetch season stats, career stats, and splits when player info or season changes
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!playerInfo?.id) {
        console.log('Skipping stats fetch - no playerInfo.id. playerInfo:', playerInfo);
        return;
      }
      
      const internalPlayerId = playerInfo.id;
      console.log('Fetching stats for internal player ID:', internalPlayerId, 'season:', selectedSeason);
      setStatsLoading(true);
      
      try {
        // Determine player type based on position
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcher = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        const isTwoWay = pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
        
        console.log('Player type detection - position:', pos, 'isPitcher:', isPitcher, 'isTwoWay:', isTwoWay);
        
        // Fetch current season stats
        if (isPitcher && !isTwoWay) {
          console.log('Fetching PITCHER stats...');
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch((e) => { console.error('getPitcherCurrentStats error:', e); return null; }),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch((e) => { console.error('getPitcherCareerStats error:', e); return []; }),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch((e) => { console.error('getPitcherVsHandSplits error:', e); return []; }),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch((e) => { console.error('getPitcherHomeRoadSplits error:', e); return []; }),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch((e) => { console.error('getPitcherMonthlyPerformance error:', e); return null; }),
          ]);
          console.log('Pitcher stats results - current:', current, 'career:', career, 'vsHand:', vsHand, 'homeRoad:', homeRoad, 'monthly:', monthly);
          setSeasonStats(current);
          setCareerStats(career);
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        } else if (isTwoWay) {
          // Two-way player: fetch BOTH batting AND pitching stats
          console.log('Fetching BOTH batting and pitching stats for two-way player...');
          const [
            currentBatting, careerBatting, vsHandBatting, homeRoadBatting, monthlyBatting,
            currentPitching, careerPitching, vsHandPitching, homeRoadPitching, monthlyPitching
          ] = await Promise.all([
            // Batting stats
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
            // Pitching stats
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          // Store batting stats in regular state
          setSeasonStats(currentBatting);
          setCareerStats(careerBatting);
          setVsHandSplits(vsHandBatting);
          setHomeRoadSplits(homeRoadBatting);
          setMonthlyPerformance(monthlyBatting);
          
          // Store pitching stats in separate TWP state
          setPitchingSeasonStats(currentPitching);
          setPitchingCareerStats(careerPitching);
          setPitchingVsHandSplits(vsHandPitching);
          setPitchingHomeRoadSplits(homeRoadPitching);
          setPitchingMonthlyPerformance(monthlyPitching);
          
          console.log('TWP stats - batting:', currentBatting, 'pitching:', currentPitching);
        } else {
          // Batter only
          console.log('Fetching BATTER stats...');
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch((err) => {
              console.error('Monthly performance API error:', err);
              return null;
            }),
          ]);
          setSeasonStats(current);
          setCareerStats(career);
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        }
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchPlayerStats();
  }, [playerInfo, selectedSeason]);

  // Helper to determine if player is a pitcher
  const isPitcher = useMemo(() => {
    if (!playerInfo) return false;
    const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
    return pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
  }, [playerInfo]);

  const isTwoWay = useMemo(() => {
    if (!playerInfo) return false;
    const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
    return pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
  }, [playerInfo]);

  // Computed: should we show pitching stats?
  // For TWP: use twoWayViewMode. For pitchers: yes. For batters: no.
  const showPitchingStats = useMemo(() => {
    if (isTwoWay) return twoWayViewMode === 'pitching';
    return isPitcher;
  }, [isTwoWay, twoWayViewMode, isPitcher]);

  // For TWP: get the active stats based on current view mode
  const activeSeasonStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingSeasonStats;
    return seasonStats;
  }, [isTwoWay, twoWayViewMode, pitchingSeasonStats, seasonStats]);

  const activeCareerStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerStats;
    return careerStats;
  }, [isTwoWay, twoWayViewMode, pitchingCareerStats, careerStats]);

  const activeVsHandSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplits;
    return vsHandSplits;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplits, vsHandSplits]);

  const activeHomeRoadSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplits;
    return homeRoadSplits;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplits, homeRoadSplits]);

  const activeMonthlyPerformance = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingMonthlyPerformance;
    return monthlyPerformance;
  }, [isTwoWay, twoWayViewMode, pitchingMonthlyPerformance, monthlyPerformance]);

  const activeCareerTotals = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerTotals;
    return careerTotals;
  }, [isTwoWay, twoWayViewMode, pitchingCareerTotals, careerTotals]);

  const activeVsHandSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplitsCareer;
    return vsHandSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplitsCareer, vsHandSplitsCareer]);

  const activeHomeRoadSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplitsCareer;
    return homeRoadSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplitsCareer, homeRoadSplitsCareer]);

  // Fetch career totals and career splits when Career tab is selected
  const handleCareerTabClick = useCallback(async () => {
    setActiveStatsTab('career');
    
    if (!playerInfo?.id) return;
    
    const internalPlayerId = playerInfo.id;
    
    // Fetch career totals if not already loaded
    if (!careerTotals) {
      setCareerTotalsLoading(true);
      try {
        let totals;
        if (isPitcher && !isTwoWay) {
          totals = await playerStatsService.getPitcherCareerTotals(internalPlayerId);
        } else {
          totals = await playerStatsService.getBatterCareerTotals(internalPlayerId);
        }
        setCareerTotals(totals);
      } catch (err) {
        console.error('Error fetching career totals:', err);
        setCareerTotals(null);
      } finally {
        setCareerTotalsLoading(false);
      }
    }
    
    // For TWP, also fetch pitching career totals if not already loaded
    if (isTwoWay && !pitchingCareerTotals) {
      try {
        const pitchingTotals = await playerStatsService.getPitcherCareerTotals(internalPlayerId);
        setPitchingCareerTotals(pitchingTotals);
      } catch (err) {
        console.error('Error fetching pitching career totals for TWP:', err);
        setPitchingCareerTotals(null);
      }
    }
    
    // Fetch career splits if not already loaded
    if (!vsHandSplitsCareer && !homeRoadSplitsCareer) {
      setCareerSplitsLoading(true);
      try {
        let vsHandCareer, homeRoadCareer;
        if (isPitcher && !isTwoWay) {
          [vsHandCareer, homeRoadCareer] = await Promise.all([
            playerStatsService.getPitcherVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
            playerStatsService.getPitcherHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
          ]);
        } else {
          [vsHandCareer, homeRoadCareer] = await Promise.all([
            playerStatsService.getBatterVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
            playerStatsService.getBatterHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
          ]);
        }
        setVsHandSplitsCareer(vsHandCareer);
        setHomeRoadSplitsCareer(homeRoadCareer);
      } catch (err) {
        console.error('Error fetching career splits:', err);
      } finally {
        setCareerSplitsLoading(false);
      }
    }
    
    // For TWP, also fetch pitching career splits if not already loaded
    if (isTwoWay && !pitchingVsHandSplitsCareer && !pitchingHomeRoadSplitsCareer) {
      try {
        const [pitchingVsHandCareer, pitchingHomeRoadCareer] = await Promise.all([
          playerStatsService.getPitcherVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
          playerStatsService.getPitcherHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
        ]);
        setPitchingVsHandSplitsCareer(pitchingVsHandCareer);
        setPitchingHomeRoadSplitsCareer(pitchingHomeRoadCareer);
      } catch (err) {
        console.error('Error fetching pitching career splits for TWP:', err);
      }
    }
  }, [playerInfo, careerTotals, vsHandSplitsCareer, homeRoadSplitsCareer, isPitcher, isTwoWay, pitchingCareerTotals, pitchingVsHandSplitsCareer, pitchingHomeRoadSplitsCareer]);

  // Get available seasons from career stats (only seasons the player has data for)
  const availableSeasons = useMemo(() => {
    if (!careerStats || careerStats.length === 0) {
      // If no career stats loaded yet, show current year as fallback
      return [new Date().getFullYear().toString()];
    }
    
    // Extract unique seasons from career stats, filter for regular season only
    const seasons = careerStats
      .filter(s => s.season_type === 2 || s.season_type === '2' || s.season_type === 'R')
      .map(s => String(s.season || s.year))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort((a, b) => parseInt(b) - parseInt(a)); // descending (most recent first)
    
    return seasons.length > 0 ? seasons : [new Date().getFullYear().toString()];
  }, [careerStats]);

  // Auto-select the most recent available season when career stats load
  useEffect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
      // Current selected season is not in available seasons, switch to most recent
      setSelectedSeason(availableSeasons[0]);
    }
  }, [availableSeasons, selectedSeason]);

  // Calculate player age
  const playerAge = useMemo(() => {
    if (!playerInfo?.birth_date) return null;
    const birth = new Date(playerInfo.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [playerInfo]);

  // Format date helper
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Get team logo URL
  const getTeamLogoUrl = useCallback((teamId) => {
    return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  }, []);

  // Get player headshot URL
  const getPlayerHeadshotUrl = useCallback((mlbId) => {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${mlbId}/headshot/67/current`;
  }, []);

  // Chart metric options and labels - different for batters vs pitchers
  const batterChartMetricOptions = {
    hr: { label: 'Home Runs', short: 'HR' },
    h: { label: 'Hits', short: 'H' },
    rbi: { label: 'RBIs', short: 'RBI' },
    r: { label: 'Runs', short: 'R' },
    avg: { label: 'Batting Average', short: 'AVG' },
    ops: { label: 'OPS', short: 'OPS' },
    bb: { label: 'Walks', short: 'BB' },
    so: { label: 'Strikeouts', short: 'SO' }
  };

  const pitcherChartMetricOptions = {
    era: { label: 'ERA', short: 'ERA' },
    whip: { label: 'WHIP', short: 'WHIP' },
    so: { label: 'Strikeouts', short: 'K' },
    wins: { label: 'Wins', short: 'W' },
    ip: { label: 'Innings Pitched', short: 'IP' },
    k_per_9: { label: 'K/9', short: 'K/9' },
    bb_per_9: { label: 'BB/9', short: 'BB/9' },
    quality_starts: { label: 'Quality Starts', short: 'QS' }
  };

  // Use appropriate chart options based on player type
  const chartMetricOptions = useMemo(() => {
    // For TWP: use twoWayViewMode. For pitchers: pitching. For batters: batting
    if (isTwoWay) {
      return twoWayViewMode === 'pitching' ? pitcherChartMetricOptions : batterChartMetricOptions;
    }
    return isPitcher ? pitcherChartMetricOptions : batterChartMetricOptions;
  }, [isPitcher, isTwoWay, twoWayViewMode]);

  // Get current metric safely - fallback to first available if selected doesn't exist
  const currentChartMetric = useMemo(() => {
    if (chartMetricOptions[selectedChartMetric]) {
      return { key: selectedChartMetric, ...chartMetricOptions[selectedChartMetric] };
    }
    // Fallback to first available metric
    const firstKey = Object.keys(chartMetricOptions)[0];
    return { key: firstKey, ...chartMetricOptions[firstKey] };
  }, [chartMetricOptions, selectedChartMetric]);

  // Set default chart metric based on player type
  useEffect(() => {
    // For TWP: use twoWayViewMode. For pitchers: pitching. For batters: batting
    const showPitching = isTwoWay ? twoWayViewMode === 'pitching' : isPitcher;
    if (showPitching) {
      setSelectedChartMetric('era');
    } else {
      setSelectedChartMetric('hr');
    }
  }, [isPitcher, isTwoWay, twoWayViewMode]);

  // Transform monthly performance API data into chart format
  // For TWP: uses activeMonthlyPerformance which switches based on batting/pitching toggle
  const getMonthlyChartData = useMemo(() => {
    console.log('activeMonthlyPerformance:', activeMonthlyPerformance);
    
    if (!activeMonthlyPerformance) return {};
    
    // API returns data under 'monthly_stats' or 'batting' object with full month names
    const statsData = activeMonthlyPerformance.monthly_stats || activeMonthlyPerformance.batting || activeMonthlyPerformance.pitching || activeMonthlyPerformance;
    console.log('statsData:', statsData);
    
    if (!statsData || typeof statsData !== 'object') return {};
    
    // Month mapping: display label -> API key (full month name)
    const monthMapping = [
      { display: 'Mar', apiKey: 'March' },
      { display: 'Apr', apiKey: 'April' },
      { display: 'May', apiKey: 'May' },
      { display: 'Jun', apiKey: 'June' },
      { display: 'Jul', apiKey: 'July' },
      { display: 'Aug', apiKey: 'August' },
      { display: 'Sep', apiKey: 'September' },
      { display: 'Oct', apiKey: 'October' }
    ];
    
    const result = {};
    
    // Map chart metrics to API response field names - include both batter and pitcher fields
    const fieldMappings = {
      // Batter fields
      hr: 'home_runs',
      h: 'hits',
      rbi: 'rbis',
      r: 'runs',
      avg: 'avg',
      ops: 'ops',
      bb: 'walks',
      so: 'strikeouts',
      // Pitcher fields
      era: 'era',
      whip: 'whip',
      wins: 'wins',
      ip: 'innings_pitched',
      k_per_9: 'k_per_9',
      bb_per_9: 'bb_per_9',
      quality_starts: 'quality_starts'
    };
    
    Object.entries(fieldMappings).forEach(([metric, apiField]) => {
      result[metric] = monthMapping
        .map(({ display, apiKey }) => {
          const monthData = statsData[apiKey] || {};
          return {
            period: display,
            value: monthData[apiField] || 0
          };
        })
        .filter(item => {
          // Include months that have data (any games played)
          const monthKey = monthMapping.find(m => m.display === item.period)?.apiKey;
          const monthData = statsData[monthKey] || {};
          return monthData.games > 0;
        });
    });
    
    console.log('getMonthlyChartData result:', result);
    return result;
  }, [activeMonthlyPerformance]);

  // Transform career stats API data into yearly chart format (regular season only - season_type: 2)
  const getYearlyChartData = useMemo(() => {
    if (!careerStats || careerStats.length === 0) return {};
    
    // Filter to only include regular season stats (season_type: 2 or "2")
    const regularSeasonStats = careerStats.filter(season => 
      season.season_type === 2 || season.season_type === '2' || season.season_type === 'R'
    );
    
    if (regularSeasonStats.length === 0) return {};
    
    const result = {};
    
    // Batter metrics
    const batterMetrics = ['hr', 'h', 'rbi', 'r', 'avg', 'ops', 'bb', 'so'];
    const batterFieldMappings = {
      hr: ['hr', 'home_runs', 'HR'],
      h: ['h', 'hits', 'H'],
      rbi: ['rbi', 'rbis', 'RBI'],
      r: ['r', 'runs', 'R'],
      avg: ['avg', 'batting_avg', 'AVG', 'batting_average'],
      ops: ['ops', 'OPS'],
      bb: ['bb', 'walks', 'BB', 'base_on_balls'],
      so: ['so', 'strikeouts', 'SO', 'strike_outs']
    };

    // Pitcher metrics
    const pitcherMetrics = ['era', 'whip', 'so', 'wins', 'ip', 'k_per_9', 'bb_per_9'];
    const pitcherFieldMappings = {
      era: ['era', 'ERA'],
      whip: ['whip', 'WHIP'],
      so: ['so', 'strikeouts', 'SO', 'strike_outs'],
      wins: ['wins', 'w', 'W'],
      ip: ['ip', 'innings_pitched', 'IP'],
      k_per_9: ['k_per_9', 'k9', 'strikeouts_per_9'],
      bb_per_9: ['bb_per_9', 'bb9', 'walks_per_9']
    };

    // Determine which metrics to use based on player type
    const metrics = showPitchingStats ? pitcherMetrics : batterMetrics;
    const fieldMappings = showPitchingStats ? pitcherFieldMappings : batterFieldMappings;
    
    metrics.forEach(metric => {
      result[metric] = regularSeasonStats
        .map(season => {
          // Find the value from any of the possible field names
          let value = 0;
          for (const field of fieldMappings[metric]) {
            if (season[field] !== undefined) {
              value = season[field];
              break;
            }
          }
          return {
            period: String(season.season || season.year),
            value: value || 0
          };
        })
        .sort((a, b) => parseInt(a.period) - parseInt(b.period)); // Sort by year
    });
    
    return result;
  }, [careerStats, showPitchingStats]);

  // Calculate recent form stats from game log (L5, L10, L30 rolling averages for pitchers OR L7, L15, L30 for batters)
  // For postseason/spring training, still compare against regular season baseline
  // Uses its own recentFormGameLog (independent from Game Log section)
  // For TWP: uses pitchingRecentFormGameLog when in pitching mode
  const recentFormStats = useMemo(() => {
    // Check if this is a true TWP (position explicitly set to TWP, not just is_two_way flag)
    const pos = playerInfo?.position_abbreviation || playerInfo?.position || playerInfo?.primary_position;
    const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
    
    // Determine which game log to use based on toggle mode
    // Only use separate pitching game log for true TWP players
    const activeGameLog = showPitchingStats && isTruelyTwoWay ? pitchingRecentFormGameLog : recentFormGameLog;
    
    console.log('recentFormStats calculation - showPitchingStats:', showPitchingStats, 'isTwoWay:', isTwoWay, 'isTruelyTwoWay:', isTruelyTwoWay, 'position:', pos);
    console.log('recentFormStats - recentFormGameLog length:', recentFormGameLog?.length, 'pitchingRecentFormGameLog length:', pitchingRecentFormGameLog?.length);
    console.log('recentFormStats - activeGameLog length:', activeGameLog?.length);
    
    if (!activeGameLog || activeGameLog.length === 0) {
      console.log('recentFormStats returning null - no game log data');
      return null;
    }
    
    // Sort games by date (most recent first)
    const sortedGames = [...activeGameLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('recentFormStats - sortedGames first game:', sortedGames[0]);
    
    // ========== PITCHER STATS CALCULATION ==========
    if (showPitchingStats) {
      const calculatePitcherRollingStats = (games) => {
        if (games.length === 0) return null;
        
        const totals = games.reduce((acc, g) => ({
          inningsPitched: acc.inningsPitched + (g.innings_pitched || 0),
          strikeouts: acc.strikeouts + (g.strikeouts || 0),
          walks: acc.walks + (g.walks || 0),
          earnedRuns: acc.earnedRuns + (g.earned_runs || 0),
          hitsAllowed: acc.hitsAllowed + (g.hits_allowed || 0),
          homeRunsAllowed: acc.homeRunsAllowed + (g.home_runs_allowed || 0),
          wins: acc.wins + (g.win ? 1 : 0),
          losses: acc.losses + (g.loss ? 1 : 0),
          qualityStarts: acc.qualityStarts + (g.quality_start ? 1 : 0),
          games: acc.games + 1,
        }), { inningsPitched: 0, strikeouts: 0, walks: 0, earnedRuns: 0, hitsAllowed: 0, homeRunsAllowed: 0, wins: 0, losses: 0, qualityStarts: 0, games: 0 });
        
        const era = totals.inningsPitched > 0 ? (totals.earnedRuns / totals.inningsPitched) * 9 : 0;
        const whip = totals.inningsPitched > 0 ? (totals.walks + totals.hitsAllowed) / totals.inningsPitched : 0;
        const kPer9 = totals.inningsPitched > 0 ? (totals.strikeouts / totals.inningsPitched) * 9 : 0;
        const bbPer9 = totals.inningsPitched > 0 ? (totals.walks / totals.inningsPitched) * 9 : 0;
        
        return {
          ...totals,
          era,
          whip,
          kPer9,
          bbPer9,
          kPerGame: totals.strikeouts / totals.games,
          ipPerGame: totals.inningsPitched / totals.games,
        };
      };
      
      // Calculate quality start streak
      let qualityStartStreak = 0;
      for (const game of sortedGames) {
        if (game.quality_start || (game.innings_pitched >= 6 && game.earned_runs <= 3)) {
          qualityStartStreak++;
        } else {
          break;
        }
      }
      
      // Count quality starts in last 10
      const last10 = sortedGames.slice(0, 10);
      const qualityStartsL10 = last10.filter(g => g.quality_start || (g.innings_pitched >= 6 && g.earned_runs <= 3)).length;
      
      // Calculate L5, L10, L30 for pitchers
      const l5 = calculatePitcherRollingStats(sortedGames.slice(0, 5));
      const l10 = calculatePitcherRollingStats(sortedGames.slice(0, 10));
      const l30 = calculatePitcherRollingStats(sortedGames.slice(0, 30));
      
      // Season baseline for pitchers
      let season = null;
      if (recentFormSeasonType === 'R') {
        season = calculatePitcherRollingStats(sortedGames);
      } else if (activeSeasonStats) {
        const gs = activeSeasonStats.games_started || activeSeasonStats.gs || 0;
        const ip = activeSeasonStats.innings_pitched || activeSeasonStats.ip || 0;
        const era = activeSeasonStats.era || 0;
        const whip = activeSeasonStats.whip || 0;
        const strikeouts = activeSeasonStats.strikeouts || activeSeasonStats.so || 0;
        const walks = activeSeasonStats.walks || activeSeasonStats.bb || 0;
        
        season = {
          games: gs,
          inningsPitched: ip,
          strikeouts,
          walks,
          earnedRuns: activeSeasonStats.earned_runs_allowed || 0,
          hitsAllowed: activeSeasonStats.hits_allowed || 0,
          homeRunsAllowed: activeSeasonStats.home_runs_allowed || 0,
          wins: activeSeasonStats.wins || 0,
          losses: activeSeasonStats.losses || 0,
          era,
          whip,
          kPer9: activeSeasonStats.k_per_9 || 0,
          bbPer9: activeSeasonStats.bb_per_9 || 0,
          kPerGame: gs > 0 ? strikeouts / gs : 0,
          ipPerGame: gs > 0 ? ip / gs : 0,
          isRegularSeasonBaseline: true,
        };
      }
      
      // Determine hot/cold status for pitchers (ERA-based)
      let formStatus = 'neutral';
      if (l5 && season && season.era > 0) {
        // For ERA, lower is better, so we invert the comparison
        const eraDiff = ((season.era - l5.era) / season.era) * 100;
        if (eraDiff >= 20) formStatus = 'hot'; // ERA much lower than season avg
        else if (eraDiff <= -20) formStatus = 'cold'; // ERA much higher than season avg
        else if (eraDiff >= 10) formStatus = 'warming';
        else if (eraDiff <= -10) formStatus = 'cooling';
      }
      
      const pitcherResult = {
        l5,
        l10,
        l30,
        season,
        qualityStartStreak,
        qualityStartsL10,
        formStatus,
        gamesPlayed: sortedGames.length,
        lastGameDate: sortedGames[0]?.date,
        isPostseasonView: recentFormSeasonType !== 'R',
        isPitcher: true,
      };
      console.log('recentFormStats - returning pitcher stats:', pitcherResult);
      return pitcherResult;
    }
    
    // ========== BATTER STATS CALCULATION ==========
    // Calculate rolling averages for different windows
    const calculateRollingStats = (games) => {
      if (games.length === 0) return null;
      
      const totals = games.reduce((acc, g) => ({
        hits: acc.hits + (g.hits || 0),
        atBats: acc.atBats + (g.at_bats || 0),
        homeRuns: acc.homeRuns + (g.home_runs || 0),
        rbis: acc.rbis + (g.rbis || 0),
        runs: acc.runs + (g.runs || 0),
        walks: acc.walks + (g.walks || 0),
        strikeouts: acc.strikeouts + (g.strikeouts || 0),
        stolenBases: acc.stolenBases + (g.stolen_bases || 0),
        totalBases: acc.totalBases + (g.total_bases || 0),
        games: acc.games + 1,
      }), { hits: 0, atBats: 0, homeRuns: 0, rbis: 0, runs: 0, walks: 0, strikeouts: 0, stolenBases: 0, totalBases: 0, games: 0 });
      
      const avg = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
      const obp = (totals.atBats + totals.walks) > 0 
        ? (totals.hits + totals.walks) / (totals.atBats + totals.walks) : 0;
      const slg = totals.atBats > 0 ? totals.totalBases / totals.atBats : 0;
      const ops = obp + slg;
      
      return {
        ...totals,
        avg,
        obp,
        slg,
        ops,
        hitsPerGame: totals.hits / totals.games,
        hrPerGame: totals.homeRuns / totals.games,
        rbisPerGame: totals.rbis / totals.games,
      };
    };
    
    // Calculate hitting streak
    let hittingStreak = 0;
    for (const game of sortedGames) {
      if (game.hits > 0) {
        hittingStreak++;
      } else {
        break;
      }
    }
    
    // Calculate multi-hit game streak
    let multiHitStreak = 0;
    for (const game of sortedGames) {
      if (game.hits >= 2) {
        multiHitStreak++;
      } else {
        break;
      }
    }
    
    // Count multi-hit games in last 15
    const last15 = sortedGames.slice(0, 15);
    const multiHitGamesL15 = last15.filter(g => g.hits >= 2).length;
    
    // Calculate L7, L15, L30 from current game log (could be postseason/spring)
    const l7 = calculateRollingStats(sortedGames.slice(0, 7));
    const l15 = calculateRollingStats(sortedGames.slice(0, 15));
    const l30 = calculateRollingStats(sortedGames.slice(0, 30));
    
    // For "season" baseline, always use regular season stats for better comparison
    // This allows comparing postseason performance to regular season baseline
    let season = null;
    if (recentFormSeasonType === 'R') {
      // Regular season - calculate from game log
      season = calculateRollingStats(sortedGames);
    } else if (activeSeasonStats) {
      // Postseason/Spring Training - use regular season stats as baseline
      const g = activeSeasonStats.g || activeSeasonStats.games_played || 0;
      const atBats = activeSeasonStats.ab || activeSeasonStats.at_bats || 0;
      const hits = activeSeasonStats.h || activeSeasonStats.hits || 0;
      const homeRuns = activeSeasonStats.hr || activeSeasonStats.home_runs || 0;
      const rbis = activeSeasonStats.rbis || activeSeasonStats.rbi || 0;
      const walks = activeSeasonStats.bb || activeSeasonStats.walks || activeSeasonStats.base_on_balls || 0;
      const strikeouts = activeSeasonStats.so || activeSeasonStats.strikeouts || activeSeasonStats.strike_outs || 0;
      const avg = activeSeasonStats.avg || activeSeasonStats.batting_avg || 0;
      const ops = activeSeasonStats.ops || 0;
      
      season = {
        games: g,
        atBats,
        hits,
        homeRuns,
        rbis,
        runs: activeSeasonStats.r || activeSeasonStats.runs || 0,
        walks,
        strikeouts,
        stolenBases: activeSeasonStats.sb || activeSeasonStats.stolen_bases || 0,
        totalBases: activeSeasonStats.tb || activeSeasonStats.total_bases || 0,
        avg,
        ops,
        obp: activeSeasonStats.obp || 0,
        slg: activeSeasonStats.slg || 0,
        hitsPerGame: g > 0 ? hits / g : 0,
        hrPerGame: g > 0 ? homeRuns / g : 0,
        rbisPerGame: g > 0 ? rbis / g : 0,
        isRegularSeasonBaseline: true, // Flag to show this is regular season baseline
      };
    }
    
    // Determine hot/cold status by comparing L7 to season baseline
    let formStatus = 'neutral';
    if (l7 && season && season.avg > 0) {
      const avgDiff = ((l7.avg - season.avg) / season.avg) * 100;
      if (avgDiff >= 15) formStatus = 'hot';
      else if (avgDiff <= -15) formStatus = 'cold';
      else if (avgDiff >= 5) formStatus = 'warming';
      else if (avgDiff <= -5) formStatus = 'cooling';
    }
    
    return {
      l7,
      l15,
      l30,
      season,
      hittingStreak,
      multiHitStreak,
      multiHitGamesL15,
      formStatus,
      gamesPlayed: sortedGames.length,
      lastGameDate: sortedGames[0]?.date,
      isPostseasonView: recentFormSeasonType !== 'R',
      isPitcher: false,
    };
  }, [recentFormGameLog, pitchingRecentFormGameLog, recentFormSeasonType, activeSeasonStats, showPitchingStats, playerInfo]);

  // Get the current chart data based on view mode
  const getChartData = () => {
    const metricKey = currentChartMetric.key;
    if (activeStatsTab === 'career') {
      return getYearlyChartData[metricKey] || [];
    }
    return getMonthlyChartData[metricKey] || [];
  };

  // Get max value for scaling bars
  const getMaxValue = (data) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.value));
  };

  // Format value for display
  const formatChartValue = (value) => {
    const metricKey = currentChartMetric.key;
    if (metricKey === 'avg' || metricKey === 'ops') {
      return value.toFixed(3).replace(/^0/, '');
    }
    if (metricKey === 'era' || metricKey === 'whip' || metricKey === 'k_per_9' || metricKey === 'bb_per_9') {
      return value.toFixed(2);
    }
    if (metricKey === 'ip') {
      return value.toFixed(1);
    }
    return Math.round(value);
  };

  if (playerLoading) {
    return (
      <div className="pps-page">
        <div className="pps-loading-container">
          <div className="pps-loading-spinner"></div>
          <span>Loading player profile...</span>
        </div>
      </div>
    );
  }

  if (!playerInfo) {
    return (
      <div className="pps-page">
        <div className="pps-error-container">
          <span className="pps-error-icon">⚠️</span>
          <h2>Player Not Found</h2>
          <p>We couldn't find the player you're looking for.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pps-page">
      {/* ========== PLAYER HEADER SECTION ========== */}
      <header className="pps-header">
        <div className="pps-container">
          <div className="pps-header-content">
            {/* Player Photo & Basic Info */}
            <div className="pps-player-identity">
              <div className="pps-photo-wrapper">
                <img 
                  src={getPlayerHeadshotUrl(playerInfo.player_mlb_id)} 
                  alt={playerInfo.full_name || playerInfo.player_name}
                  className="pps-player-photo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="pps-jersey-number">#{playerInfo.jersey_number}</div>
              </div>
              
              <div className="pps-name-info">
                <h1 className="pps-player-name">{playerInfo.full_name || playerInfo.player_name}</h1>
                <div className="pps-team-position">
                  <span className="pps-position">{playerInfo.position_abbreviation || playerInfo.position}</span>
                  <span className="pps-separator">•</span>
                  <div className="pps-team-with-logo">
                    {playerInfo.current_team?.mlb_team_id && (
                      <img 
                        src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                        alt={playerInfo.current_team?.team_name || ''}
                        className="pps-team-logo"
                      />
                    )}
                    <span className="pps-team">
                      {playerInfo.current_team?.team_name || ''}
                    </span>
                  </div>
                </div>
                <div className="pps-status-badge">
                  <span className={`pps-status-dot ${playerInfo.injury_status?.toLowerCase() || (playerInfo.active ? 'active' : 'inactive')}`}></span>
                  {playerInfo.injury_status || playerInfo.roster_status || (playerInfo.active ? 'Active' : 'Inactive')}
                </div>
                
                {/* Two-Way Player Toggle */}
                {isTwoWay && (
                  <div className="pps-twoway-toggle">
                    <button
                      className={`pps-twoway-btn ${twoWayViewMode === 'batting' ? 'active' : ''}`}
                      onClick={() => setTwoWayViewMode('batting')}
                    >
                      ⚾ Batting
                    </button>
                    <button
                      className={`pps-twoway-btn ${twoWayViewMode === 'pitching' ? 'active' : ''}`}
                      onClick={() => setTwoWayViewMode('pitching')}
                    >
                      ⚡ Pitching
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Player Quick Stats */}
            <div className="pps-quick-stats">
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Bats</span>
                <span className="pps-quick-stat-value">{playerInfo.bats === 'L' ? 'Left' : playerInfo.bats === 'R' ? 'Right' : 'Switch'}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Throws</span>
                <span className="pps-quick-stat-value">{playerInfo.throws === 'L' ? 'Left' : 'Right'}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Age</span>
                <span className="pps-quick-stat-value">{playerInfo.current_age || playerAge}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Height</span>
                <span className="pps-quick-stat-value">{playerInfo.height}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Weight</span>
                <span className="pps-quick-stat-value">{playerInfo.weight} lbs</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Debut</span>
                <span className="pps-quick-stat-value">{formatDate(playerInfo.mlb_debut_date || playerInfo.debut_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pps-content">
        <div className="pps-container">
          
          {/* ========== RECENT FORM (Betting Edge) ========== */}
          <section className="pps-section pps-recent-form-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Recent Form</h2>
                <p className="pps-section-subtitle">
                  {selectedSeason} {recentFormSeasonType === 'R' ? 'Regular Season' : recentFormSeasonType === 'S' ? 'Spring Training' : 'Postseason'} rolling averages & trends
                </p>
              </div>
              <div className="pps-recent-form-controls">
                <select 
                  className="pps-season-type-filter"
                  value={recentFormSeasonType}
                  onChange={(e) => setRecentFormSeasonType(e.target.value)}
                >
                  <option value="R">Regular Season</option>
                  <option value="S">Spring Training</option>
                  <option value="P">Postseason</option>
                </select>
                {recentFormStats && (
                  <div className={`pps-form-badge ${recentFormStats.formStatus}`}>
                    <span className="pps-form-badge-icon">
                      {recentFormStats.formStatus === 'hot' ? '🔥' : 
                       recentFormStats.formStatus === 'warming' ? '📈' :
                       recentFormStats.formStatus === 'cold' ? '❄️' :
                       recentFormStats.formStatus === 'cooling' ? '📉' : '➖'}
                    </span>
                    <span className="pps-form-badge-text">
                      {recentFormStats.formStatus === 'hot' ? 'HOT' : 
                       recentFormStats.formStatus === 'warming' ? 'Warming Up' :
                       recentFormStats.formStatus === 'cold' ? 'COLD' :
                       recentFormStats.formStatus === 'cooling' ? 'Cooling Off' : 'Neutral'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {recentFormLoading ? (
              <div className="pps-stats-loading">Loading recent form data...</div>
            ) : recentFormStats ? (
              <div className="pps-recent-form-content">
                {/* Streak Indicators - Different for pitchers vs batters */}
                {recentFormStats.isPitcher ? (
                  <div className="pps-streak-row">
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.qualityStartStreak}</span>
                      <span className="pps-streak-label">QS Streak</span>
                    </div>
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.qualityStartsL10}</span>
                      <span className="pps-streak-label">Quality Starts (L10)</span>
                    </div>
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.gamesPlayed}</span>
                      <span className="pps-streak-label">Games Started</span>
                    </div>
                  </div>
                ) : (
                  <div className="pps-streak-row">
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.hittingStreak}</span>
                      <span className="pps-streak-label">Game Hit Streak</span>
                    </div>
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.multiHitGamesL15}</span>
                      <span className="pps-streak-label">Multi-Hit Games (L15)</span>
                    </div>
                    <div className="pps-streak-card">
                      <span className="pps-streak-value">{recentFormStats.gamesPlayed}</span>
                      <span className="pps-streak-label">Games Played</span>
                    </div>
                  </div>
                )}
                
                {/* Rolling Averages Comparison Table - Different for pitchers vs batters */}
                <div className="pps-rolling-table-wrapper">
                  {recentFormStats.isPitcher ? (
                    /* Pitcher Rolling Stats Table */
                    <table className="pps-rolling-table">
                      <thead>
                        <tr>
                          <th>Split</th>
                          <th>GS</th>
                          <th>ERA</th>
                          <th>WHIP</th>
                          <th>IP</th>
                          <th>K</th>
                          <th>BB</th>
                          <th>K/9</th>
                          <th>W</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Last 5 Starts */}
                        {recentFormStats.l5 && (
                          <tr className="pps-rolling-row l7">
                            <td className="pps-split-label-cell">Last 5</td>
                            <td>{recentFormStats.l5.games}</td>
                            <td className={recentFormStats.l5.era < (recentFormStats.season?.era || 99) ? 'pps-above' : recentFormStats.l5.era > (recentFormStats.season?.era || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l5.era.toFixed(2)}
                            </td>
                            <td className={recentFormStats.l5.whip < (recentFormStats.season?.whip || 99) ? 'pps-above' : recentFormStats.l5.whip > (recentFormStats.season?.whip || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l5.whip.toFixed(2)}
                            </td>
                            <td>{recentFormStats.l5.inningsPitched.toFixed(1)}</td>
                            <td>{recentFormStats.l5.strikeouts}</td>
                            <td>{recentFormStats.l5.walks}</td>
                            <td>{recentFormStats.l5.kPer9.toFixed(2)}</td>
                            <td>{recentFormStats.l5.wins}</td>
                          </tr>
                        )}
                        {/* Last 10 Starts */}
                        {recentFormStats.l10 && (
                          <tr className="pps-rolling-row l15">
                            <td className="pps-split-label-cell">Last 10</td>
                            <td>{recentFormStats.l10.games}</td>
                            <td className={recentFormStats.l10.era < (recentFormStats.season?.era || 99) ? 'pps-above' : recentFormStats.l10.era > (recentFormStats.season?.era || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l10.era.toFixed(2)}
                            </td>
                            <td className={recentFormStats.l10.whip < (recentFormStats.season?.whip || 99) ? 'pps-above' : recentFormStats.l10.whip > (recentFormStats.season?.whip || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l10.whip.toFixed(2)}
                            </td>
                            <td>{recentFormStats.l10.inningsPitched.toFixed(1)}</td>
                            <td>{recentFormStats.l10.strikeouts}</td>
                            <td>{recentFormStats.l10.walks}</td>
                            <td>{recentFormStats.l10.kPer9.toFixed(2)}</td>
                            <td>{recentFormStats.l10.wins}</td>
                          </tr>
                        )}
                        {/* Season Totals */}
                        {recentFormStats.season && (
                          <tr className="pps-rolling-row season">
                            <td className="pps-split-label-cell">
                              {recentFormStats.isPostseasonView ? 'Reg Season' : 'Season'}
                            </td>
                            <td>{recentFormStats.season.games}</td>
                            <td>{recentFormStats.season.era.toFixed(2)}</td>
                            <td>{recentFormStats.season.whip.toFixed(2)}</td>
                            <td>{recentFormStats.season.inningsPitched.toFixed(1)}</td>
                            <td>{recentFormStats.season.strikeouts}</td>
                            <td>{recentFormStats.season.walks}</td>
                            <td>{recentFormStats.season.kPer9.toFixed(2)}</td>
                            <td>{recentFormStats.season.wins}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Batter Rolling Stats Table */
                    <table className="pps-rolling-table">
                      <thead>
                        <tr>
                          <th>Split</th>
                          <th>G</th>
                          <th>AVG</th>
                          <th>OPS</th>
                          <th>H</th>
                          <th>HR</th>
                          <th>RBI</th>
                          <th>BB</th>
                          <th>SO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Last 7 Games */}
                        {recentFormStats.l7 && (
                          <tr className="pps-rolling-row l7">
                            <td className="pps-split-label-cell">Last 7</td>
                            <td>{recentFormStats.l7.games}</td>
                            <td className={recentFormStats.l7.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l7.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l7.avg.toFixed(3).replace(/^0/, '')}
                            </td>
                            <td className={recentFormStats.l7.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l7.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l7.ops.toFixed(3)}
                            </td>
                            <td>{recentFormStats.l7.hits}</td>
                            <td>{recentFormStats.l7.homeRuns}</td>
                            <td>{recentFormStats.l7.rbis}</td>
                            <td>{recentFormStats.l7.walks}</td>
                            <td>{recentFormStats.l7.strikeouts}</td>
                          </tr>
                        )}
                        {/* Last 15 Games */}
                        {recentFormStats.l15 && (
                          <tr className="pps-rolling-row l15">
                            <td className="pps-split-label-cell">Last 15</td>
                            <td>{recentFormStats.l15.games}</td>
                            <td className={recentFormStats.l15.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l15.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l15.avg.toFixed(3).replace(/^0/, '')}
                            </td>
                            <td className={recentFormStats.l15.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l15.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l15.ops.toFixed(3)}
                            </td>
                            <td>{recentFormStats.l15.hits}</td>
                            <td>{recentFormStats.l15.homeRuns}</td>
                            <td>{recentFormStats.l15.rbis}</td>
                            <td>{recentFormStats.l15.walks}</td>
                            <td>{recentFormStats.l15.strikeouts}</td>
                          </tr>
                        )}
                        {/* Last 30 Games */}
                        {recentFormStats.l30 && recentFormStats.l30.games >= 20 && (
                          <tr className="pps-rolling-row l30">
                            <td className="pps-split-label-cell">Last 30</td>
                            <td>{recentFormStats.l30.games}</td>
                            <td className={recentFormStats.l30.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l30.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l30.avg.toFixed(3).replace(/^0/, '')}
                            </td>
                            <td className={recentFormStats.l30.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l30.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                              {recentFormStats.l30.ops.toFixed(3)}
                            </td>
                            <td>{recentFormStats.l30.hits}</td>
                            <td>{recentFormStats.l30.homeRuns}</td>
                            <td>{recentFormStats.l30.rbis}</td>
                            <td>{recentFormStats.l30.walks}</td>
                            <td>{recentFormStats.l30.strikeouts}</td>
                          </tr>
                        )}
                        {/* Season Totals (Regular Season baseline for postseason/spring comparisons) */}
                        {recentFormStats.season && (
                          <tr className="pps-rolling-row season">
                            <td className="pps-split-label-cell">
                              {recentFormStats.isPostseasonView ? 'Reg Season' : 'Season'}
                            </td>
                            <td>{recentFormStats.season.games}</td>
                            <td>{recentFormStats.season.avg.toFixed(3).replace(/^0/, '')}</td>
                            <td>{recentFormStats.season.ops.toFixed(3)}</td>
                            <td>{recentFormStats.season.hits}</td>
                            <td>{recentFormStats.season.homeRuns}</td>
                            <td>{recentFormStats.season.rbis}</td>
                            <td>{recentFormStats.season.walks}</td>
                            <td>{recentFormStats.season.strikeouts}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {/* Trend Insight - Different for pitchers vs batters */}
                {recentFormStats.isPitcher ? (
                  /* Pitcher Trend Insights */
                  recentFormStats.l5 && recentFormStats.season && (
                    <div className="pps-trend-insight">
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">
                          L5 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} ERA
                        </span>
                        <span className={`pps-insight-value ${recentFormStats.l5.era <= recentFormStats.season.era ? 'positive' : 'negative'}`}>
                          {recentFormStats.l5.era <= recentFormStats.season.era ? '' : '+'}
                          {(recentFormStats.l5.era - recentFormStats.season.era).toFixed(2)}
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">
                          L5 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} WHIP
                        </span>
                        <span className={`pps-insight-value ${recentFormStats.l5.whip <= recentFormStats.season.whip ? 'positive' : 'negative'}`}>
                          {recentFormStats.l5.whip <= recentFormStats.season.whip ? '' : '+'}
                          {(recentFormStats.l5.whip - recentFormStats.season.whip).toFixed(2)}
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">K/Game (L5)</span>
                        <span className="pps-insight-value">
                          {recentFormStats.l5.kPerGame.toFixed(1)}
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">IP/Game (L5)</span>
                        <span className="pps-insight-value">
                          {recentFormStats.l5.ipPerGame.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  /* Batter Trend Insights */
                  recentFormStats.l7 && recentFormStats.season && (
                    <div className="pps-trend-insight">
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">
                          L7 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} AVG
                        </span>
                        <span className={`pps-insight-value ${recentFormStats.l7.avg >= recentFormStats.season.avg ? 'positive' : 'negative'}`}>
                          {recentFormStats.l7.avg >= recentFormStats.season.avg ? '+' : ''}
                          {((recentFormStats.l7.avg - recentFormStats.season.avg) * 1000).toFixed(0)} pts
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">
                          L7 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} OPS
                        </span>
                        <span className={`pps-insight-value ${recentFormStats.l7.ops >= recentFormStats.season.ops ? 'positive' : 'negative'}`}>
                          {recentFormStats.l7.ops >= recentFormStats.season.ops ? '+' : ''}
                          {((recentFormStats.l7.ops - recentFormStats.season.ops) * 1000).toFixed(0)} pts
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">Hits/Game (L7)</span>
                        <span className="pps-insight-value">
                          {recentFormStats.l7.hitsPerGame.toFixed(2)}
                        </span>
                      </div>
                      <div className="pps-insight-item">
                        <span className="pps-insight-label">K Rate (L7)</span>
                        <span className="pps-insight-value">
                          {recentFormStats.l7.atBats > 0 
                            ? ((recentFormStats.l7.strikeouts / recentFormStats.l7.atBats) * 100).toFixed(1) 
                            : '0'}%
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="pps-no-data-placeholder">
                <div className="pps-no-data-icon">📊</div>
                <h3 className="pps-no-data-title">No Recent Form Data</h3>
                <p className="pps-no-data-text">
                  Game log data is needed to calculate recent form trends.
                </p>
              </div>
            )}
          </section>

          {/* ========== SEASON STATS ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Season Statistics</h2>
                <p className="pps-section-subtitle">
                  {activeStatsTab === 'career' ? 'Career performance' : `${selectedSeason} season performance`}
                </p>
              </div>
              <div className="pps-tab-toggle" ref={seasonDropdownRef}>
                <button
                  className={`pps-tab-btn pps-dropdown-btn ${activeStatsTab === 'current' ? 'active' : ''}`}
                  onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                >
                  {selectedSeason}
                  <span className={`pps-dropdown-arrow ${seasonDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {seasonDropdownOpen && (
                  <div className="pps-dropdown-menu">
                    {availableSeasons.filter(season => season !== selectedSeason).map((season) => (
                      <button
                        key={season}
                        className="pps-dropdown-item"
                        onClick={() => {
                          setActiveStatsTab('current');
                          handleSeasonChange(season);
                          setSeasonDropdownOpen(false);
                        }}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={`pps-tab-btn ${activeStatsTab === 'career' ? 'active' : ''}`}
                  onClick={handleCareerTabClick}
                >
                  Career
                </button>
              </div>
            </div>
            
            <div className="pps-stats-grid">
              {/* Conditional stats cards based on player type */}
              {/* For TWP: use twoWayViewMode toggle. For pitchers: show pitching. For batters: show batting */}
              {showPitchingStats ? (
                <>
                  {/* Pitching Stats Card - Primary */}
                  <div className="pps-stats-card">
                    <h3 className="pps-stats-card-title">Pitching</h3>
                    {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                      <div className="pps-stats-loading">Loading stats...</div>
                    ) : (activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats) ? (
                      <div className="pps-stats-table">
                        <div className="pps-stat-row header">
                          <span>W</span>
                          <span>L</span>
                          <span>ERA</span>
                          <span>GS</span>
                          <span>IP</span>
                          <span>SO</span>
                          <span>WHIP</span>
                        </div>
                        <div className="pps-stat-row values">
                          {(() => {
                            const stats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
                            return (
                              <>
                                <span className="pps-highlight">{stats.wins || stats.w || '-'}</span>
                                <span>{stats.losses || stats.l || '-'}</span>
                                <span className="pps-highlight">{stats.era?.toFixed(2) || '-'}</span>
                                <span>{stats.games_started || stats.gs || '-'}</span>
                                <span>{stats.innings_pitched || stats.ip || '-'}</span>
                                <span>{stats.strikeouts || stats.so || '-'}</span>
                                <span className="pps-highlight">{stats.whip?.toFixed(2) || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="pps-stats-no-data">No pitching stats available</div>
                    )}
                  </div>

                  {/* Additional Pitching Stats Card */}
                  <div className="pps-stats-card">
                    <h3 className="pps-stats-card-title">Advanced</h3>
                    {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                      <div className="pps-stats-loading">Loading stats...</div>
                    ) : (activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats) ? (
                      <div className="pps-stats-table">
                        <div className="pps-stat-row header">
                          <span>K/9</span>
                          <span>BB/9</span>
                          <span>HR/9</span>
                          <span>H/9</span>
                          <span>K/BB</span>
                        </div>
                        <div className="pps-stat-row values">
                          {(() => {
                            const stats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
                            return (
                              <>
                                <span className="pps-highlight">{stats.k_per_9?.toFixed(2) || '-'}</span>
                                <span>{stats.bb_per_9?.toFixed(2) || '-'}</span>
                                <span>{stats.hr_per_9?.toFixed(2) || '-'}</span>
                                <span>{stats.hits_per_9?.toFixed(2) || '-'}</span>
                                <span>{stats.strikeout_walk_ratio?.toFixed(2) || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="pps-stats-no-data">No advanced stats available</div>
                    )}
                  </div>

                  {/* Opponent Stats Card */}
                  <div className="pps-stats-card">
                    <h3 className="pps-stats-card-title">vs Opponents</h3>
                    {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                      <div className="pps-stats-loading">Loading stats...</div>
                    ) : (activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats) ? (
                      <div className="pps-stats-table">
                        <div className="pps-stat-row header">
                          <span>OPP AVG</span>
                          <span>OPP OPS</span>
                          <span>H</span>
                          <span>HR</span>
                          <span>BB</span>
                        </div>
                        <div className="pps-stat-row values">
                          {(() => {
                            const stats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
                            return (
                              <>
                                <span>{stats.opponent_avg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                                <span>{stats.opponent_ops?.toFixed(3) || '-'}</span>
                                <span>{stats.hits_allowed || '-'}</span>
                                <span>{stats.home_runs_allowed || '-'}</span>
                                <span>{stats.walks || stats.bb || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="pps-stats-no-data">No opponent stats available</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Batting Stats Card */}
                  <div className="pps-stats-card">
                    <h3 className="pps-stats-card-title">Batting</h3>
                    {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                      <div className="pps-stats-loading">Loading stats...</div>
                    ) : (activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats) ? (
                      <div className="pps-stats-table">
                        <div className="pps-stat-row header">
                          <span>G</span>
                          <span>AB</span>
                          <span>H</span>
                          <span>HR</span>
                          <span>RBI</span>
                          <span>R</span>
                          <span>AVG</span>
                          <span>OPS</span>
                        </div>
                        <div className="pps-stat-row values">
                          {(() => {
                            const stats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
                            return (
                              <>
                                <span>{stats.g || stats.games_played || '-'}</span>
                                <span>{stats.ab || stats.at_bats || '-'}</span>
                                <span>{stats.h || stats.hits || '-'}</span>
                                <span className="pps-highlight">{stats.hr || stats.home_runs || '-'}</span>
                                <span>{stats.rbis || stats.rbi || '-'}</span>
                                <span>{stats.r || stats.runs || '-'}</span>
                                <span>{stats.avg?.toFixed(3)?.replace(/^0/, '') || stats.batting_avg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                                <span className="pps-highlight">{stats.ops?.toFixed(3) || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="pps-stats-no-data">No batting stats available</div>
                    )}
                  </div>

                  {/* Additional Stats Card */}
                  <div className="pps-stats-card">
                    <h3 className="pps-stats-card-title">Additional</h3>
                    {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                      <div className="pps-stats-loading">Loading stats...</div>
                    ) : (activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats) ? (
                      <div className="pps-stats-table">
                        <div className="pps-stat-row header">
                          <span>SB</span>
                          <span>BB</span>
                          <span>SO</span>
                          <span>2B</span>
                          <span>3B</span>
                          <span>TB</span>
                        </div>
                        <div className="pps-stat-row values">
                          {(() => {
                            const stats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
                            return (
                              <>
                                <span>{stats.sb || stats.stolen_bases || '-'}</span>
                                <span>{stats.bb || stats.walks || stats.base_on_balls || '-'}</span>
                                <span>{stats.so || stats.strikeouts || stats.strike_outs || '-'}</span>
                                <span>{stats.doubles || stats['2b'] || '-'}</span>
                                <span>{stats.triples || stats['3b'] || '-'}</span>
                                <span>{stats.tb || stats.total_bases || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="pps-stats-no-data">No additional stats available</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Season Comparison Chart */}
            <div className="pps-comparison-chart">
              <div className="pps-comparison-chart-header">
                <h4>
                  {activeStatsTab === 'career' 
                    ? `${currentChartMetric.label} by Year`
                    : `Monthly ${currentChartMetric.label}`
                  }
                </h4>
                <select 
                  className="pps-metric-select"
                  value={currentChartMetric.key}
                  onChange={(e) => setSelectedChartMetric(e.target.value)}
                >
                  {Object.entries(chartMetricOptions).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="pps-comparison-chart-container">
                {statsLoading ? (
                  <div className="pps-chart-loading">Loading chart data...</div>
                ) : (
                  <div className="pps-chart-placeholder">
                    <div className="pps-comparison-bars">
                      {(() => {
                        const chartData = getChartData();
                        if (!chartData || chartData.length === 0) {
                          return (
                            <div className="pps-chart-no-data">
                              No {activeStatsTab === 'career' ? 'career' : 'monthly'} data available
                            </div>
                          );
                        }
                        const maxValue = getMaxValue(chartData);
                        return chartData.map(({ period, value }) => (
                          <div key={period} className="pps-comparison-bar-group">
                            <div 
                              className="pps-comparison-bar"
                              style={{ 
                                '--bar-height': `${(value / maxValue) * 100}%`
                              }}
                            >
                              <span className="pps-bar-value">{formatChartValue(value)}</span>
                            </div>
                            <span className="pps-bar-label">{period}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========== SPLITS SECTION ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Player Splits</h2>
                <p className="pps-section-subtitle">
                  {activeStatsTab === 'career' ? 'Career' : selectedSeason} performance breakdowns
                </p>
              </div>
              <div className="pps-tab-toggle">
                <button
                  className={`pps-tab-btn ${activeSplitsTab === 'handedness' ? 'active' : ''}`}
                  onClick={() => setActiveSplitsTab('handedness')}
                >
                  vs L/R
                </button>
                <button
                  className={`pps-tab-btn ${activeSplitsTab === 'homeAway' ? 'active' : ''}`}
                  onClick={() => setActiveSplitsTab('homeAway')}
                >
                  Home/Away
                </button>
              </div>
            </div>

            <div className="pps-splits-content">
              {statsLoading || careerSplitsLoading ? (
                <div className="pps-stats-loading">Loading splits...</div>
              ) : activeSplitsTab === 'handedness' ? (
                <div className="pps-splits-comparison">
                  {/* vs LHP/LHB Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let vsLeft;
                    if (activeStatsTab === 'career' && activeVsHandSplitsCareer) {
                      // For pitchers: vs_lhb, for batters: vs_lhp
                      vsLeft = showPitchingStats ? activeVsHandSplitsCareer?.vs_lhb : activeVsHandSplitsCareer?.vs_lhp;
                    } else {
                      // API returns array with season entries containing vs_lhp/vs_rhp nested objects
                      const seasonSplits = activeVsHandSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      vsLeft = showPitchingStats 
                        ? (seasonSplits?.vs_lhb || activeVsHandSplits?.find(s => s.split_type === 'vs_lhb' || s.vs_hand === 'L'))
                        : (seasonSplits?.vs_lhp || activeVsHandSplits?.find(s => s.split_type === 'vs_lhp' || s.vs_hand === 'L'));
                    }
                    
                    // Pitcher splits
                    if (showPitchingStats) {
                      return (
                        <div className="pps-split-card vs-left">
                          <div className="pps-split-header">
                            <span className="pps-split-label">vs LHB</span>
                            <span className="pps-split-sample">{vsLeft?.tb_allowed || '-'} TB Allowed</span>
                          </div>
                          <div className="pps-split-stats">
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP AVG</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.ops?.toFixed(3) || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP OPS</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.whip?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">WHIP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.k_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">K/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.hr_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">HR/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.hits_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">H/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsLeft?.go_ao_ratio?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">GO/AO</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Batter splits
                    return (
                      <div className="pps-split-card vs-left">
                        <div className="pps-split-header">
                          <span className="pps-split-label">vs LHP</span>
                          <span className="pps-split-sample">{vsLeft?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pps-split-vs-divider">VS</div>

                  {/* vs RHP/RHB Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let vsRight;
                    if (activeStatsTab === 'career' && activeVsHandSplitsCareer) {
                      // For pitchers: vs_rhb, for batters: vs_rhp
                      vsRight = showPitchingStats ? activeVsHandSplitsCareer?.vs_rhb : activeVsHandSplitsCareer?.vs_rhp;
                    } else {
                      // API returns array with season entries containing vs_lhp/vs_rhp nested objects
                      const seasonSplits = activeVsHandSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      vsRight = showPitchingStats 
                        ? (seasonSplits?.vs_rhb || activeVsHandSplits?.find(s => s.split_type === 'vs_rhb' || s.vs_hand === 'R'))
                        : (seasonSplits?.vs_rhp || activeVsHandSplits?.find(s => s.split_type === 'vs_rhp' || s.vs_hand === 'R'));
                    }
                    
                    // Pitcher splits
                    if (showPitchingStats) {
                      return (
                        <div className="pps-split-card vs-right">
                          <div className="pps-split-header">
                            <span className="pps-split-label">vs RHB</span>
                            <span className="pps-split-sample">{vsRight?.tb_allowed || '-'} TB Allowed</span>
                          </div>
                          <div className="pps-split-stats">
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP AVG</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.ops?.toFixed(3) || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP OPS</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.whip?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">WHIP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.k_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">K/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.hr_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">HR/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.hits_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">H/9</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {vsRight?.go_ao_ratio?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">GO/AO</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Batter splits
                    return (
                      <div className="pps-split-card vs-right">
                        <div className="pps-split-header">
                          <span className="pps-split-label">vs RHP</span>
                          <span className="pps-split-sample">{vsRight?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="pps-splits-comparison">
                  {/* Home Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let homeSplit;
                    if (activeStatsTab === 'career' && activeHomeRoadSplitsCareer) {
                      homeSplit = activeHomeRoadSplitsCareer?.at_home;
                    } else {
                      // API returns array with season entries containing at_home/on_road nested objects
                      const seasonSplits = activeHomeRoadSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      homeSplit = seasonSplits?.at_home || activeHomeRoadSplits?.find(s => 
                        s.split_type === 'home' || s.split_type === 'at_home' || 
                        s.split === 'home' || s.location === 'home'
                      );
                    }
                    
                    // Pitcher Home/Road splits
                    if (showPitchingStats) {
                      return (
                        <div className="pps-split-card home">
                          <div className="pps-split-header">
                            <span className="pps-split-label">Home</span>
                            <span className="pps-split-sample">{homeSplit?.wins || 0}-{homeSplit?.losses || 0} ({homeSplit?.games_started || 0} GS)</span>
                          </div>
                          <div className="pps-split-stats">
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {homeSplit?.era?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">ERA</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {homeSplit?.whip?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">WHIP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {homeSplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP AVG</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {homeSplit?.innings_pitched?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">IP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">{homeSplit?.strikeouts || '-'}</span>
                              <span className="pps-split-stat-label">K</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">{homeSplit?.walks_allowed || homeSplit?.walks || '-'}</span>
                              <span className="pps-split-stat-label">BB</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {homeSplit?.k_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">K/9</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Batter Home/Road splits
                    return (
                      <div className="pps-split-card home">
                        <div className="pps-split-header">
                          <span className="pps-split-label">Home</span>
                          <span className="pps-split-sample">{homeSplit?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pps-split-vs-divider">VS</div>

                  {/* Away/Road Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let awaySplit;
                    if (activeStatsTab === 'career' && activeHomeRoadSplitsCareer) {
                      awaySplit = activeHomeRoadSplitsCareer?.on_road;
                    } else {
                      // API returns array with season entries containing at_home/on_road nested objects
                      const seasonSplits = activeHomeRoadSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      awaySplit = seasonSplits?.on_road || activeHomeRoadSplits?.find(s => 
                        s.split_type === 'away' || s.split_type === 'road' || s.split_type === 'on_road' ||
                        s.split === 'away' || s.split === 'road' || s.location === 'away'
                      );
                    }
                    
                    // Pitcher Away/Road splits
                    if (showPitchingStats) {
                      return (
                        <div className="pps-split-card away">
                          <div className="pps-split-header">
                            <span className="pps-split-label">Away</span>
                            <span className="pps-split-sample">{awaySplit?.wins || 0}-{awaySplit?.losses || 0} ({awaySplit?.games_started || 0} GS)</span>
                          </div>
                          <div className="pps-split-stats">
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {awaySplit?.era?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">ERA</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {awaySplit?.whip?.toFixed(2) || '-'}
                              </span>
                              <span className="pps-split-stat-label">WHIP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {awaySplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                              </span>
                              <span className="pps-split-stat-label">OPP AVG</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {awaySplit?.innings_pitched?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">IP</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">{awaySplit?.strikeouts || '-'}</span>
                              <span className="pps-split-stat-label">K</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">{awaySplit?.walks_allowed || awaySplit?.walks || '-'}</span>
                              <span className="pps-split-stat-label">BB</span>
                            </div>
                            <div className="pps-split-stat">
                              <span className="pps-split-stat-value">
                                {awaySplit?.k_per_9?.toFixed(1) || '-'}
                              </span>
                              <span className="pps-split-stat-label">K/9</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Batter Away/Road splits
                    return (
                      <div className="pps-split-card away">
                        <div className="pps-split-header">
                          <span className="pps-split-label">Away</span>
                          <span className="pps-split-sample">{awaySplit?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* ========== TWO COLUMN LAYOUT: TEAM HISTORY & INJURY HISTORY ========== */}
          <div className="pps-two-column">
            {/* Team History */}
            <section className="pps-section">
              <div className="pps-section-header">
                <div>
                  <h2 className="pps-section-title">Team History</h2>
                  <p className="pps-section-subtitle">Career journey</p>
                </div>
              </div>
              <div className="pps-timeline">
                {/* Generate team history from roster API */}
                {(() => {
                  // Group roster history by team_id and calculate date ranges
                  const teamHistoryData = teamHistory.reduce((acc, season) => {
                    const teamId = season.team_id;
                    const teamAbbr = season.team_abbreviation;
                    // Look up MLB team ID from TEAM_METADATA using abbreviation
                    const mlbTeamId = TEAM_METADATA[teamAbbr]?.mlbId;
                    const teamName = season.team_name || 'Unknown Team';
                    const year = season.season;
                    const gamesPlayed = season.games_played || 0;
                    
                    if (!teamId) return acc;
                    
                    if (!acc[teamId]) {
                      acc[teamId] = {
                        teamId,
                        mlbTeamId,
                        teamName,
                        teamAbbreviation: teamAbbr,
                        seasons: [],
                        totalGames: 0,
                      };
                    }
                    acc[teamId].seasons.push(year);
                    acc[teamId].totalGames += gamesPlayed;
                    return acc;
                  }, {});

                  // Convert to array and sort by most recent
                  const groupedTeams = Object.values(teamHistoryData)
                    .map(team => ({
                      ...team,
                      startYear: Math.min(...team.seasons),
                      endYear: Math.max(...team.seasons),
                      seasonCount: team.seasons.length,
                    }))
                    .sort((a, b) => b.endYear - a.endYear);

                  if (groupedTeams.length === 0) {
                    // Fallback to current team if no roster history
                    return (
                      <div className="pps-timeline-item current">
                        <div className="pps-timeline-marker"></div>
                        <div className="pps-timeline-content">
                          <div className="pps-timeline-team">
                            {playerInfo.current_team?.mlb_team_id && (
                              <img 
                                src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                                alt={playerInfo.current_team?.team_name || ''}
                                className="pps-timeline-team-logo"
                              />
                            )}
                            <div className="pps-timeline-team-info">
                              <span className="pps-timeline-team-name">
                                {playerInfo.current_team?.team_name || 'Current Team'}
                              </span>
                              <span className="pps-timeline-years">
                                {playerInfo.first_active_season 
                                  ? `${playerInfo.first_active_season} - Present` 
                                  : 'Present'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return groupedTeams.map((team, idx) => (
                    <div key={team.teamId} className={`pps-timeline-item ${idx === 0 ? 'current' : ''}`}>
                      <div className="pps-timeline-marker"></div>
                      <div className="pps-timeline-content">
                        <div className="pps-timeline-team">
                          {team.mlbTeamId && (
                            <img 
                              src={getTeamLogoUrl(team.mlbTeamId)} 
                              alt={team.teamName}
                              className="pps-timeline-team-logo"
                            />
                          )}
                          <div className="pps-timeline-team-info">
                            <span className="pps-timeline-team-name">{team.teamName}</span>
                            <span className="pps-timeline-years">
                              {team.startYear === team.endYear 
                                ? team.startYear 
                                : `${team.startYear} - ${idx === 0 && team.endYear >= new Date().getFullYear() ? 'Present' : team.endYear}`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="pps-timeline-stats">
                          <span>{team.seasonCount} season{team.seasonCount !== 1 ? 's' : ''}</span>
                          {team.totalGames > 0 && (
                            <>
                              <span className="pps-separator">•</span>
                              <span>{team.totalGames} G</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* Injury History */}
            <section className="pps-section">
              <div className="pps-section-header">
                <div>
                  <h2 className="pps-section-title">Injury History</h2>
                  <p className="pps-section-subtitle">IL stints & recovery</p>
                </div>
              </div>
              <div className="pps-injury-list">
                {injuryHistory.length > 0 ? (
                  injuryHistory.map((injury, idx) => {
                    // Determine if injury is still active (no activation_date means still on IL)
                    const isActive = !injury.activation_date;
                    // Format injury description - capitalize first letter
                    const injuryDesc = injury.injury_desc 
                      ? injury.injury_desc.charAt(0).toUpperCase() + injury.injury_desc.slice(1)
                      : 'Injury';
                    
                    return (
                      <div key={injury.id || idx} className="pps-injury-item">
                        <div className="pps-injury-date">
                          <span className="pps-injury-month">
                            {new Date(injury.injury_date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="pps-injury-year">
                            {injury.season || new Date(injury.injury_date).getFullYear()}
                          </span>
                        </div>
                        <div className="pps-injury-details">
                          <span className="pps-injury-type">{injuryDesc}</span>
                          <span className="pps-injury-duration">
                            {injury.days_on_il ? `${injury.days_on_il} days` : injury.injury_period || 'IL'}
                          </span>
                        </div>
                        <div className={`pps-injury-status ${isActive ? 'active' : 'recovered'}`}>
                          <span>{isActive ? 'Active' : 'Recovered'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pps-no-injuries-note">
                    <span>✓ No injury history available</span>
                  </div>
                )}
                {!playerInfo.is_injured && injuryHistory.length > 0 && (
                  <div className="pps-no-injuries-note">
                    <span>✓ No active injuries</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ========== GAME LOG ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Game Log</h2>
                <p className="pps-section-subtitle">
                  {selectedSeason} {gameLogSeasonType === 'R' ? 'Regular Season' : gameLogSeasonType === 'S' ? 'Spring Training' : 'Postseason'} results
                </p>
              </div>
              <div className="pps-game-log-filters">
                <select 
                  className="pps-season-type-filter"
                  value={gameLogSeasonType}
                  onChange={(e) => {
                    setGameLogSeasonType(e.target.value);
                    setGameLogPage(1); // Reset to first page when season type changes
                  }}
                >
                  <option value="R">Regular Season</option>
                  <option value="S">Spring Training</option>
                  <option value="P">Postseason</option>
                </select>
              </div>
            </div>

            <div className="pps-game-log-container">
              {gameLogLoading ? (
                <div className="pps-stats-loading">Loading game logs...</div>
              ) : gameLog.length > 0 ? (
                <>
                  <div className="pps-game-log-table-wrapper">
                    <table className="pps-game-log-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Opp</th>
                          <th>Result</th>
                          {showPitchingStats ? (
                            <>
                              <th>Dec</th>
                              <th>IP</th>
                              <th>H</th>
                              <th>R</th>
                              <th>ER</th>
                              <th>BB</th>
                              <th>K</th>
                              <th>HR</th>
                              <th>PC</th>
                            </>
                          ) : (
                            <>
                              <th>AB</th>
                              <th>H</th>
                              <th>HR</th>
                              <th>RBI</th>
                              <th>R</th>
                              <th>BB</th>
                              <th>SO</th>
                              <th>SB</th>
                              <th>TB</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const startIndex = (gameLogPage - 1) * gamesPerPage;
                          const endIndex = startIndex + gamesPerPage;
                          const paginatedGames = gameLog.slice(startIndex, endIndex);
                          
                          return paginatedGames.map((game) => {
                            // Determine game result (W/L) - support both new (team_score/opponent_score) and old (home_runs_score/away_runs_score) API formats
                            const playerScore = game.team_score ?? (game.is_home ? game.home_runs_score : game.away_runs_score);
                            const oppScore = game.opponent_score ?? (game.is_home ? game.away_runs_score : game.home_runs_score);
                            const result = playerScore > oppScore ? 'W' : playerScore < oppScore ? 'L' : 'T';
                            const resultClass = result === 'W' ? 'win' : result === 'L' ? 'loss' : 'tie';
                            
                            // Format date
                            const gameDate = new Date(game.date);
                            const formattedDate = gameDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            });
                            
                            // Pitcher decision (W/L/ND) - uses win, loss, no_decision booleans from API
                            const pitcherDecision = game.win ? 'W' : game.loss ? 'L' : '-';
                            const decisionClass = pitcherDecision === 'W' ? 'win' : pitcherDecision === 'L' ? 'loss' : '';
                            
                            return (
                              <tr key={game.game_pk}>
                                <td className="pps-game-date">{formattedDate}</td>
                                <td className="pps-game-opponent">
                                  <span className="pps-home-away-indicator">{game.is_home ? 'vs' : '@'}</span>
                                  {game.opponent}
                                </td>
                                <td className={`pps-game-result ${resultClass}`}>
                                  {result} {playerScore}-{oppScore}
                                </td>
                                {showPitchingStats ? (
                                  <>
                                    <td className={`pps-decision ${decisionClass}`}>{pitcherDecision}</td>
                                    <td className={game.innings_pitched >= 6 ? 'pps-highlight' : ''}>{game.innings_pitched?.toFixed(1) || '-'}</td>
                                    <td>{game.hits_allowed ?? game.hits ?? '-'}</td>
                                    <td>{game.runs ?? game.runs_allowed ?? '-'}</td>
                                    <td className={(game.earned_runs ?? game.earned_runs_allowed) === 0 ? 'pps-highlight' : ''}>{game.earned_runs ?? game.earned_runs_allowed ?? '-'}</td>
                                    <td>{game.walks ?? game.walks_allowed ?? '-'}</td>
                                    <td className={game.strikeouts >= 10 ? 'pps-highlight pps-k' : ''}>{game.strikeouts ?? '-'}</td>
                                    <td className={game.home_runs_allowed > 0 ? 'pps-danger' : ''}>{game.home_runs_allowed ?? '-'}</td>
                                    <td>{game.pitches_thrown ?? game.pitch_count ?? game.pitches ?? '-'}</td>
                                  </>
                                ) : (
                                  <>
                                    <td>{game.at_bats}</td>
                                    <td className={game.hits > 0 ? 'pps-highlight' : ''}>{game.hits}</td>
                                    <td className={game.home_runs > 0 ? 'pps-highlight pps-hr' : ''}>{game.home_runs}</td>
                                    <td>{game.rbis}</td>
                                    <td>{game.runs}</td>
                                    <td>{game.walks}</td>
                                    <td>{game.strikeouts}</td>
                                    <td>{game.stolen_bases}</td>
                                    <td>{game.total_bases}</td>
                                  </>
                                )}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {gameLog.length > gamesPerPage && (
                    <div className="pps-pagination">
                      <button 
                        className="pps-pagination-btn"
                        onClick={() => setGameLogPage(prev => Math.max(1, prev - 1))}
                        disabled={gameLogPage === 1}
                      >
                        ← Prev
                      </button>
                      <span className="pps-pagination-info">
                        Page {gameLogPage} of {Math.ceil(gameLog.length / gamesPerPage)} ({gameLog.length} games)
                      </span>
                      <button 
                        className="pps-pagination-btn"
                        onClick={() => setGameLogPage(prev => Math.min(Math.ceil(gameLog.length / gamesPerPage), prev + 1))}
                        disabled={gameLogPage >= Math.ceil(gameLog.length / gamesPerPage)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="pps-no-data-placeholder">
                  <div className="pps-no-data-icon">📋</div>
                  <h3 className="pps-no-data-title">No Game Logs Available</h3>
                  <p className="pps-no-data-text">
                    No {gameLogSeasonType === 'R' ? 'regular season' : gameLogSeasonType === 'S' ? 'spring training' : 'postseason'} games found for {selectedSeason}.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default PlayerProfileStats;
