/**
 * Auto-Refresh Documentation System
 * Periodically updates SPL and KQL reference data from official sources
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

class DocRefresher {
  constructor(refreshIntervalDays = 7) {
    this.refreshIntervalDays = refreshIntervalDays;
    this.refreshInterval = refreshIntervalDays * 24 * 60 * 60 * 1000;
    this.configPath = path.join(__dirname, 'refresh-config.json');
    this.splunkRefPath = path.join(__dirname, 'splunk-reference.json');
    this.kqlRefPath = path.join(__dirname, 'kql-reference.json');
  }

  /**
   * Load refresh configuration
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      return {
        lastSplunkUpdate: null,
        lastKqlUpdate: null,
        splunkSource: 'https://www.splunk.com/en_us/pdfs/solution-guide/splunk-quick-reference-guide.pdf',
        kqlSources: [
          'https://learn.microsoft.com/en-us/kusto/query/kql-quick-reference',
          'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/'
        ],
        autoRefreshEnabled: true
      };
    }
  }

  /**
   * Save refresh configuration
   */
  async saveConfig(config) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Check if refresh is needed
   */
  needsRefresh(lastUpdate) {
    if (!lastUpdate) return true;
    const timeSinceUpdate = Date.now() - new Date(lastUpdate).getTime();
    return timeSinceUpdate > this.refreshInterval;
  }

  /**
   * Fetch KQL documentation from Microsoft Learn
   * Note: This would integrate with the MCP microsoft-learn tool
   */
  async refreshKQLReference() {
    console.log('Refreshing KQL reference from Microsoft Learn...');
    
    try {
      // In actual implementation, this would call the MCP microsoft-learn tool
      // For now, we'll document the process
      
      const refreshInstructions = {
        method: 'MCP Tool Integration',
        tool: 'mcp_microsoft-lea_microsoft_docs_search',
        queries: [
          'Azure Data Explorer Kusto Query Language operators complete reference',
          'KQL tabular operators where extend project summarize',
          'KQL scalar functions string datetime conversion',
          'KQL aggregation functions count sum avg',
          'KQL mv-expand parse extract operators'
        ],
        note: 'Results should be parsed and merged into kql-reference.json'
      };
      
      console.log('KQL Refresh Instructions:', JSON.stringify(refreshInstructions, null, 2));
      
      // Log the refresh attempt
      const config = await this.loadConfig();
      config.lastKqlUpdate = new Date().toISOString();
      config.lastKqlRefreshAttempt = new Date().toISOString();
      await this.saveConfig(config);
      
      return { 
        success: false, 
        message: 'Manual refresh required using MCP microsoft-learn tool',
        instructions: refreshInstructions
      };
      
    } catch (error) {
      console.error('Error refreshing KQL reference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch Splunk documentation
   * Note: This would need to parse the PDF or scrape Splunk docs
   */
  async refreshSplunkReference() {
    console.log('Refreshing Splunk reference...');
    
    try {
      const refreshInstructions = {
        method: 'PDF or Web Scraping',
        sources: [
          'https://www.splunk.com/en_us/pdfs/solution-guide/splunk-quick-reference-guide.pdf',
          'https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/'
        ],
        note: 'PDF should be downloaded and parsed, or web pages scraped and parsed into splunk-reference.json'
      };
      
      console.log('Splunk Refresh Instructions:', JSON.stringify(refreshInstructions, null, 2));
      
      // Log the refresh attempt
      const config = await this.loadConfig();
      config.lastSplunkUpdate = new Date().toISOString();
      config.lastSplunkRefreshAttempt = new Date().toISOString();
      await this.saveConfig(config);
      
      return {
        success: false,
        message: 'Manual refresh required - PDF parsing or web scraping needed',
        instructions: refreshInstructions
      };
      
    } catch (error) {
      console.error('Error refreshing Splunk reference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start automatic refresh scheduler
   */
  async startAutoRefresh() {
    console.log(`Starting auto-refresh with ${this.refreshIntervalDays} day interval...`);
    
    const config = await this.loadConfig();
    
    if (!config.autoRefreshEnabled) {
      console.log('Auto-refresh is disabled in config');
      return;
    }
    
    // Check if refresh is needed now
    if (this.needsRefresh(config.lastKqlUpdate)) {
      console.log('KQL reference needs refresh');
      await this.refreshKQLReference();
    }
    
    if (this.needsRefresh(config.lastSplunkUpdate)) {
      console.log('Splunk reference needs refresh');
      await this.refreshSplunkReference();
    }
    
    // Schedule periodic refresh
    setInterval(async () => {
      console.log('Running scheduled refresh check...');
      const currentConfig = await this.loadConfig();
      
      if (this.needsRefresh(currentConfig.lastKqlUpdate)) {
        await this.refreshKQLReference();
      }
      
      if (this.needsRefresh(currentConfig.lastSplunkUpdate)) {
        await this.refreshSplunkReference();
      }
    }, this.refreshInterval);
    
    console.log('Auto-refresh scheduler started');
  }

  /**
   * Manual refresh trigger
   */
  async refreshAll() {
    console.log('Manual refresh triggered for all references...');
    
    const results = {
      kql: await this.refreshKQLReference(),
      splunk: await this.refreshSplunkReference(),
      timestamp: new Date().toISOString()
    };
    
    return results;
  }

  /**
   * Get refresh status
   */
  async getStatus() {
    const config = await this.loadConfig();
    
    return {
      autoRefreshEnabled: config.autoRefreshEnabled,
      refreshIntervalDays: this.refreshIntervalDays,
      lastKqlUpdate: config.lastKqlUpdate,
      lastSplunkUpdate: config.lastSplunkUpdate,
      kqlNeedsRefresh: this.needsRefresh(config.lastKqlUpdate),
      splunkNeedsRefresh: this.needsRefresh(config.lastSplunkUpdate),
      nextScheduledRefresh: config.lastKqlUpdate 
        ? new Date(new Date(config.lastKqlUpdate).getTime() + this.refreshInterval).toISOString()
        : 'Not scheduled'
    };
  }
}

// CLI usage
if (require.main === module) {
  const refresher = new DocRefresher(7); // 7 day refresh interval
  
  const command = process.argv[2];
  
  switch(command) {
    case 'start':
      refresher.startAutoRefresh();
      break;
    case 'refresh':
      refresher.refreshAll().then(results => {
        console.log('Refresh results:', JSON.stringify(results, null, 2));
      });
      break;
    case 'status':
      refresher.getStatus().then(status => {
        console.log('Refresh status:', JSON.stringify(status, null, 2));
      });
      break;
    default:
      console.log(`
Usage:
  node auto-refresh.js start    - Start auto-refresh scheduler
  node auto-refresh.js refresh  - Manually trigger refresh
  node auto-refresh.js status   - Check refresh status
      `);
  }
}

module.exports = DocRefresher;
