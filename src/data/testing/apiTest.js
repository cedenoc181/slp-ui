import gamesService from '../services/gamesService';
import teamsService from '../services/teamsService';
import teamStatsService from '../services/teamStatsService';
import rosterService from '../services/rosterService';
import teamLeadersService from '../services/teamLeadersService';
import { TEAM_IDS, SEASON_TYPES, PLAYER_ROLES } from '../constants/apiConstants';

/**
 * Test utility to run API endpoint tests
 * Usage: Import this file in a component and call testAllEndpoints()
 */

class ApiTester {
  constructor() {
    this.results = [];
    this.testTeamId = TEAM_IDS.LAD; // Using Dodgers for testing
    this.testSeason = '2025';
  }

  // Helper to log test results
  logResult(testName, success, data = null, error = null) {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      data: success ? data : null,
      error: error ? error.message : null,
    };
    this.results.push(result);
    
    if (success) {
      console.log(`✅ PASS: ${testName}`);
      console.log('Data:', data);
    } else {
      console.error(`❌ FAIL: ${testName}`);
      console.error('Error:', error);
    }
    console.log('---');
  }

  // ========== GAMES SERVICE TESTS ==========

  async testGetTeamGames() {
    try {
      const data = await gamesService.getTeamGames(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTeamGames', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamGames', false, null, error);
      return null;
    }
  }

  async testGetTeamLast10() {
    try {
      const data = await gamesService.getTeamLast10(this.testTeamId, this.testSeason);
      this.logResult('getTeamLast10', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamLast10', false, null, error);
      return null;
    }
  }

  async testGetTeamHomeGames() {
    try {
      const data = await gamesService.getTeamHomeGames(this.testTeamId, this.testSeason);
      this.logResult('getTeamHomeGames', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamHomeGames', false, null, error);
      return null;
    }
  }

  async testGetTeamAwayGames() {
    try {
      const data = await gamesService.getTeamAwayGames(this.testTeamId, this.testSeason);
      this.logResult('getTeamAwayGames', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamAwayGames', false, null, error);
      return null;
    }
  }

  // ========== TEAMS SERVICE TESTS ==========

  async testGetTeamSeason() {
    try {
      const data = await teamsService.getTeamSeason(this.testTeamId, this.testSeason);
      this.logResult('getTeamSeason', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamSeason', false, null, error);
      return null;
    }
  }

  async testGetTeamMonthly() {
    try {
      const data = await teamsService.getTeamMonthly(this.testTeamId, this.testSeason);
      this.logResult('getTeamMonthly', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamMonthly', false, null, error);
      return null;
    }
  }

  // ========== TEAM STATS SERVICE TESTS ==========

  async testGetTeamBattingStats() {
    try {
      const data = await teamStatsService.getTeamBattingStats(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTeamBattingStats', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamBattingStats', false, null, error);
      return null;
    }
  }

  async testGetTeamPitchingStats() {
    try {
      const data = await teamStatsService.getTeamPitchingStats(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTeamPitchingStats', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamPitchingStats', false, null, error);
      return null;
    }
  }

  // ========== ROSTER SERVICE TESTS ==========

  async testGetTeamRoster() {
    try {
      const data = await rosterService.getTeamRoster(this.testTeamId, this.testSeason);
      this.logResult('getTeamRoster (All)', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamRoster (All)', false, null, error);
      return null;
    }
  }

  async testGetTeamPitchers() {
    try {
      const data = await rosterService.getTeamPitchers(this.testTeamId, this.testSeason);
      this.logResult('getTeamPitchers', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamPitchers', false, null, error);
      return null;
    }
  }

  async testGetTeamBatters() {
    try {
      const data = await rosterService.getTeamBatters(this.testTeamId, this.testSeason);
      this.logResult('getTeamBatters', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamBatters', false, null, error);
      return null;
    }
  }

  // ========== TEAM LEADERS SERVICE TESTS ==========

  async testGetTeamBattingLeaders() {
    try {
      const data = await teamLeadersService.getTeamBattingLeaders(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTeamBattingLeaders', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamBattingLeaders', false, null, error);
      return null;
    }
  }

  async testGetTeamPitchingLeaders() {
    try {
      const data = await teamLeadersService.getTeamPitchingLeaders(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTeamPitchingLeaders', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamPitchingLeaders', false, null, error);
      return null;
    }
  }

  async testGetTopBattingLeaders() {
    try {
      const data = await teamLeadersService.getTopBattingLeaders(this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTopBattingLeaders (MLB)', true, data);
      return data;
    } catch (error) {
      this.logResult('getTopBattingLeaders (MLB)', false, null, error);
      return null;
    }
  }

  async testGetTopPitchingLeaders() {
    try {
      const data = await teamLeadersService.getTopPitchingLeaders(this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getTopPitchingLeaders (MLB)', true, data);
      return data;
    } catch (error) {
      this.logResult('getTopPitchingLeaders (MLB)', false, null, error);
      return null;
    }
  }

  async testGetHotTeamBattingLeaders() {
    try {
      const data = await teamLeadersService.getHotTeamBattingLeaders(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR);
      this.logResult('getHotTeamBattingLeaders', true, data);
      return data;
    } catch (error) {
      this.logResult('getHotTeamBattingLeaders', false, null, error);
      return null;
    }
  }

  async testGetTeamSplits() {
    try {
      const data = await teamLeadersService.getTeamSplits(this.testTeamId, this.testSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER);
      this.logResult('getTeamSplits', true, data);
      return data;
    } catch (error) {
      this.logResult('getTeamSplits', false, null, error);
      return null;
    }
  }

  // ========== RUN ALL TESTS ==========

  async runAllTests() {
    console.log('🧪 Starting API Endpoint Tests...');
    console.log(`Testing Team: ${this.testTeamId} (LAD - Dodgers)`);
    console.log(`Testing Season: ${this.testSeason}`);
    console.log('================================\n');

    // Games Service Tests
    console.log('📋 TESTING GAMES SERVICE');
    await this.testGetTeamGames();
    await this.testGetTeamLast10();
    await this.testGetTeamHomeGames();
    await this.testGetTeamAwayGames();

    // Teams Service Tests
    console.log('\n📋 TESTING TEAMS SERVICE');
    await this.testGetTeamSeason();
    await this.testGetTeamMonthly();

    // Team Stats Service Tests
    console.log('\n📋 TESTING TEAM STATS SERVICE');
    await this.testGetTeamBattingStats();
    await this.testGetTeamPitchingStats();

    // Roster Service Tests
    console.log('\n📋 TESTING ROSTER SERVICE');
    await this.testGetTeamRoster();
    await this.testGetTeamPitchers();
    await this.testGetTeamBatters();

    // Team Leaders Service Tests
    console.log('\n📋 TESTING TEAM LEADERS SERVICE');
    await this.testGetTeamBattingLeaders();
    await this.testGetTeamPitchingLeaders();
    await this.testGetTopBattingLeaders();
    await this.testGetTopPitchingLeaders();
    await this.testGetHotTeamBattingLeaders();
    await this.testGetTeamSplits();

    // Summary
    this.printSummary();
  }

  // Print test summary
  printSummary() {
    console.log('\n================================');
    console.log('📊 TEST SUMMARY');
    console.log('================================');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
    }
    
    console.log('================================\n');
  }

  // Test individual endpoint
  async testEndpoint(serviceName, methodName, ...args) {
    const services = {
      games: gamesService,
      teams: teamsService,
      teamStats: teamStatsService,
      roster: rosterService,
      teamLeaders: teamLeadersService,
    };

    try {
      const service = services[serviceName];
      if (!service || !service[methodName]) {
        throw new Error(`Service or method not found: ${serviceName}.${methodName}`);
      }

      const data = await service[methodName](...args);
      this.logResult(`${serviceName}.${methodName}`, true, data);
      return data;
    } catch (error) {
      this.logResult(`${serviceName}.${methodName}`, false, null, error);
      return null;
    }
  }
}

// Export singleton instance
const apiTester = new ApiTester();

// Export functions for easy use
export const testAllEndpoints = () => apiTester.runAllTests();
export const testEndpoint = (serviceName, methodName, ...args) => 
  apiTester.testEndpoint(serviceName, methodName, ...args);

export default apiTester;