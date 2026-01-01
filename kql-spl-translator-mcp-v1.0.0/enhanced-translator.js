/**
 * Enhanced Query Translator with Validation
 * Translates between SPL and KQL using official documentation references
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QueryTranslator {
  constructor(customTableMapping = null) {
    this.splunkRef = null;
    this.kqlRef = null;
    this.lastUpdate = null;
    this.updateInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    // Default KQL table to Splunk index/sourcetype mappings
    // Users should customize this based on their environment
    this.tableToIndexMapping = customTableMapping || this.getDefaultTableMapping();
  }

  /**
   * Default KQL table to Splunk index/sourcetype mapping
   * These are common mappings but may need to be customized per environment
   */
  getDefaultTableMapping() {
    return {
      // Windows Security & Defender Tables
      'SecurityEvent': { 
        index: 'windows', 
        sourcetype: 'WinEventLog:Security',
        note: 'Common for Windows Security events' 
      },
      'DeviceProcessEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceProcessEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceNetworkEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceNetworkEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceFileEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceFileEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceRegistryEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceRegistryEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceLogonEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceLogonEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      'DeviceImageLoadEvents': { 
        index: 'defender', 
        sourcetype: 'MDE:DeviceImageLoadEvents',
        note: 'Microsoft Defender for Endpoint' 
      },
      
      // Azure AD / Entra ID Tables
      'SigninLogs': { 
        index: 'azuread', 
        sourcetype: 'azure:aad:signin',
        note: 'Azure AD Sign-in logs' 
      },
      'AuditLogs': { 
        index: 'azuread', 
        sourcetype: 'azure:aad:audit',
        note: 'Azure AD Audit logs' 
      },
      'AADSignInEventsBeta': { 
        index: 'azuread', 
        sourcetype: 'azure:aad:signin',
        note: 'Azure AD Sign-in logs (beta)' 
      },
      
      // Office 365 / Email Tables
      'EmailEvents': { 
        index: 'o365', 
        sourcetype: 'ms:o365:reporting:messagetrace',
        note: 'Office 365 Email events' 
      },
      'EmailUrlInfo': { 
        index: 'o365', 
        sourcetype: 'ms:o365:reporting:messagetrace',
        note: 'Office 365 Email URL info' 
      },
      'EmailAttachmentInfo': { 
        index: 'o365', 
        sourcetype: 'ms:o365:reporting:messagetrace',
        note: 'Office 365 Email attachments' 
      },
      'CloudAppEvents': { 
        index: 'o365', 
        sourcetype: 'ms:o365:management',
        note: 'Office 365 Cloud App events' 
      },
      'OfficeActivity': { 
        index: 'o365', 
        sourcetype: 'ms:o365:management',
        note: 'Office 365 Activity' 
      },
      
      // Identity & Threat Tables
      'IdentityInfo': { 
        index: 'security', 
        sourcetype: 'MDI:IdentityInfo',
        note: 'Microsoft Defender for Identity' 
      },
      'IdentityLogonEvents': { 
        index: 'security', 
        sourcetype: 'MDI:IdentityLogonEvents',
        note: 'Microsoft Defender for Identity' 
      },
      'IdentityQueryEvents': { 
        index: 'security', 
        sourcetype: 'MDI:IdentityQueryEvents',
        note: 'Microsoft Defender for Identity' 
      },
      'ThreatIntelligenceIndicator': { 
        index: 'threatintel', 
        sourcetype: 'ti:indicators',
        note: 'Threat Intelligence indicators' 
      },
      'SecurityAlert': { 
        index: 'security', 
        sourcetype: 'security:alerts',
        note: 'Security alerts from various sources' 
      },
      'SecurityIncident': { 
        index: 'security', 
        sourcetype: 'security:incidents',
        note: 'Security incidents' 
      },
      'AlertEvidence': { 
        index: 'security', 
        sourcetype: 'security:alert:evidence',
        note: 'Security alert evidence' 
      },
      
      // Azure Resources
      'Resources': { 
        index: 'azure', 
        sourcetype: 'azure:resource:graph',
        note: 'Azure Resource Graph' 
      },
      'ResourceChanges': { 
        index: 'azure', 
        sourcetype: 'azure:resource:changes',
        note: 'Azure Resource Changes' 
      },
      
      // Generic/Unknown - use main index
      'default': { 
        index: 'main', 
        sourcetype: null,
        note: 'Default fallback - adjust to your environment' 
      }
    };
  }

  /**
   * Load reference data from JSON files
   */
  async loadReferences() {
    try {
      const splunkPath = path.join(__dirname, 'splunk-reference.json');
      const kqlPath = path.join(__dirname, 'kql-reference.json');
      
      this.splunkRef = JSON.parse(await fs.promises.readFile(splunkPath, 'utf8'));
      this.kqlRef = JSON.parse(await fs.promises.readFile(kqlPath, 'utf8'));
      this.lastUpdate = new Date();
      
      console.log('References loaded successfully');
    } catch (error) {
      console.error('Error loading references:', error);
      throw error;
    }
  }

  /**
   * Set custom table to index mapping for your Splunk environment
   * 
   * @param {Object} mapping - Object mapping KQL tables to Splunk index/sourcetype
   * @example
   * translator.setTableMapping({
   *   'SecurityEvent': { 
   *     index: 'windows', 
   *     sourcetype: 'WinEventLog:Security',
   *     note: 'Windows Security events' 
   *   },
   *   'DeviceProcessEvents': { 
   *     index: 'my_custom_index', 
   *     sourcetype: 'defender:process',
   *     note: 'Custom Defender data' 
   *   }
   * });
   */
  setTableMapping(mapping) {
    this.tableToIndexMapping = { ...this.tableToIndexMapping, ...mapping };
  }

  /**
   * Get current table mapping
   */
  getTableMapping() {
    return this.tableToIndexMapping;
  }

  /**
   * Generate Splunk discovery queries to help users find their data mappings
   * Especially useful for Splunk Cloud environments where Azure data comes via Event Hub
   * 
   * @param {string} kqlTable - Optional: specific KQL table to find
   * @returns {Object} Object containing discovery queries
   */
  generateDiscoveryQueries(kqlTable = null) {
    const queries = {};

    if (kqlTable) {
      // Generate specific discovery query for this table
      const keywords = this.getSearchKeywordsForTable(kqlTable);
      queries[`find_${kqlTable}`] = `index=* (${keywords.join(' OR ')})
| stats count by index, sourcetype
| sort -count
| head 10`;

      queries[`sample_${kqlTable}`] = `index=* (${keywords.join(' OR ')})
| head 5
| table _time, index, sourcetype, _raw`;
    } else {
      // Generate general discovery queries
      queries.all_azure_data = `index=* (azure OR entra OR microsoft OR defender OR office365)
| stats count by index, sourcetype
| sort -count`;

      queries.all_indexes = `| eventcount summarize=false index=* 
| dedup index 
| table index`;

      queries.all_sourcetypes = `| metadata type=sourcetypes 
| table sourcetype, totalCount, lastTime`;

      queries.eventhub_data = `index=* source=*eventhub* OR sourcetype=*eventhub* OR sourcetype=*azure*
| stats count by index, sourcetype, source
| sort -count`;
    }

    return queries;
  }

  /**
   * Get search keywords for a specific KQL table
   * @private
   */
  getSearchKeywordsForTable(tableName) {
    const keywordMap = {
      'SecurityEvent': ['EventCode=4624', 'EventID', 'Windows Security', 'WinEventLog'],
      'DeviceProcessEvents': ['DeviceName', 'ProcessCommandLine', 'InitiatingProcessFileName', 'DeviceId'],
      'DeviceNetworkEvents': ['DeviceName', 'RemoteIP', 'RemoteUrl', 'InitiatingProcessFileName'],
      'DeviceFileEvents': ['DeviceName', 'FileName', 'FolderPath', 'SHA256'],
      'SigninLogs': ['UserPrincipalName', 'SignInLogs', 'Azure AD', 'ConditionalAccessStatus'],
      'AuditLogs': ['AuditLogs', 'OperationName', 'InitiatedBy', 'Azure AD'],
      'EmailEvents': ['SenderFromAddress', 'RecipientEmailAddress', 'Subject', 'NetworkMessageId'],
      'OfficeActivity': ['Office 365', 'Operation', 'UserId', 'Workload'],
      'IdentityInfo': ['OnPremisesUserPrincipalName', 'AccountDisplayName', 'IdentityInfo']
    };

    return keywordMap[tableName] || [tableName];
  }

  /**
   * Check if references need updating
   */
  needsUpdate() {
    if (!this.lastUpdate) return true;
    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime();
    return timeSinceUpdate > this.updateInterval;
  }

  /**
   * Validate SPL syntax
   */
  validateSPL(query) {
    const errors = [];
    const warnings = [];
    
    // Check for pipe character
    if (!query.includes('|') && !query.startsWith('index=') && !query.startsWith('source=')) {
      warnings.push('Query may be missing pipe character for chaining commands');
    }
    
    // Extract commands from query
    const commands = query.split('|').map(cmd => cmd.trim());
    
    for (const cmd of commands) {
      if (!cmd) continue;
      
      const commandName = cmd.split(/\s+/)[0];
      
      // Check if command exists in reference
      if (this.splunkRef && this.splunkRef.spl_commands) {
        if (!this.splunkRef.spl_commands[commandName] && 
            !commandName.startsWith('index=') && 
            !commandName.startsWith('source=') &&
            !commandName.startsWith('sourcetype=')) {
          warnings.push(`Unknown SPL command: ${commandName}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate KQL syntax
   */
  validateKQL(query) {
    const errors = [];
    const warnings = [];
    
    // Check for pipe character
    if (!query.includes('|')) {
      warnings.push('Query may be missing pipe character for chaining operators');
    }
    
    // Check for table name at start
    const lines = query.split('\n').filter(l => l.trim());
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.startsWith('|')) {
      errors.push('KQL query must start with a table name, not a pipe');
    }
    
    // Extract operators from query
    const operators = query.split('|').map(op => op.trim());
    
    for (const op of operators) {
      if (!op) continue;
      
      const operatorName = op.split(/\s+/)[0];
      
      // Check if operator exists in reference
      if (this.kqlRef && this.kqlRef.kql_operators) {
        if (!this.kqlRef.kql_operators[operatorName] && 
            operatorName !== operators[0].split(/\s+/)[0]) { // Skip table name
          warnings.push(`Unknown KQL operator: ${operatorName}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Translate SPL to KQL with validation
   */
  async translateSPLtoKQL(splQuery) {
    if (!this.splunkRef || !this.kqlRef) {
      await this.loadReferences();
    }
    
    // Validate input
    const validation = this.validateSPL(splQuery);
    
    let kqlQuery = '';
    const translationNotes = [];
    
    try {
      // Parse SPL query
      const parts = splQuery.split('|').map(p => p.trim());
      
      // Handle search criteria (index, source, sourcetype)
      let searchPart = parts[0];
      let tableName = 'TableName'; // Placeholder
      let whereConditions = [];
      
      // Extract index/source/sourcetype
      if (searchPart.includes('index=')) {
        const indexMatch = searchPart.match(/index=(\S+)/);
        if (indexMatch) {
          tableName = indexMatch[1].replace(/[*"]/g, '');
          translationNotes.push(`Mapped index="${indexMatch[1]}" to table "${tableName}"`);
        }
      }
      
      if (searchPart.includes('sourcetype=')) {
        const stMatch = searchPart.match(/sourcetype=(\S+)/);
        if (stMatch) {
          whereConditions.push(`SourceType == "${stMatch[1].replace(/"/g, '')}"`);
        }
      }
      
      if (searchPart.includes('source=')) {
        const srcMatch = searchPart.match(/source=(\S+)/);
        if (srcMatch) {
          whereConditions.push(`Source == "${srcMatch[1].replace(/"/g, '')}"`);
        }
      }
      
      // Extract search terms (keywords)
      const searchTerms = searchPart
        .replace(/index=\S+/g, '')
        .replace(/source=\S+/g, '')
        .replace(/sourcetype=\S+/g, '')
        .trim()
        .split(/\s+/)
        .filter(t => t && !t.includes('='));
      
      if (searchTerms.length > 0) {
        const searchConditions = searchTerms.map(term => 
          `* contains "${term.replace(/"/g, '')}"`
        ).join(' and ');
        if (searchConditions) {
          whereConditions.push(searchConditions);
        }
      }
      
      // Start building KQL
      kqlQuery = tableName;
      
      // Add time range if earliest/latest present
      if (searchPart.includes('earliest=')) {
        const earliestMatch = searchPart.match(/earliest=(-?\d+[smhd]|"[^"]+"|[^\s]+)/);
        if (earliestMatch) {
          const timeStr = earliestMatch[1].replace(/"/g, '');
          whereConditions.unshift(`TimeGenerated >= ago(${timeStr.replace('-', '')})`);
          translationNotes.push(`Translated earliest=${timeStr} to ago()`);
        }
      }
      
      if (whereConditions.length > 0) {
        kqlQuery += '\n| where ' + whereConditions.join(' and ');
      }
      
      // Process remaining commands
      for (let i = 1; i < parts.length; i++) {
        const cmd = parts[i];
        const cmdName = cmd.split(/\s+/)[0];
        
        const cmdRef = this.splunkRef.spl_commands[cmdName];
        if (cmdRef) {
          kqlQuery += `\n| ${this.translateCommand(cmd, cmdName, cmdRef, translationNotes)}`;
        } else {
          kqlQuery += `\n| ${cmd} // WARNING: Unknown SPL command`;
          translationNotes.push(`Unknown command: ${cmdName}`);
        }
      }
      
    } catch (error) {
      translationNotes.push(`Translation error: ${error.message}`);
    }
    
    // Validate output
    const outputValidation = this.validateKQL(kqlQuery);
    
    return {
      originalQuery: splQuery,
      translatedQuery: kqlQuery,
      inputValidation: validation,
      outputValidation: outputValidation,
      translationNotes: translationNotes,
      confidence: this.calculateConfidence(validation, outputValidation, translationNotes),
      validation: {
        input: validation,
        output: outputValidation
      }
    };
  }

  /**
   * Translate individual SPL command to KQL
   */
  translateCommand(cmd, cmdName, cmdRef, notes) {
    const args = cmd.substring(cmdName.length).trim();
    
    switch(cmdName) {
      case 'stats':
        return this.translateStats(args, notes);
      case 'eval':
        return this.translateEval(args, notes);
      case 'where':
        return `where ${args}`;
      case 'fields':
        return this.translateFields(args, notes);
      case 'table':
        return `project ${args}`;
      case 'sort':
        return this.translateSort(args, notes);
      case 'head':
        return `take ${args}`;
      case 'dedup':
        return `distinct ${args}`;
      case 'rename':
        return this.translateRename(args, notes);
      case 'mvexpand':
        return `mv-expand ${args}`;
      case 'spath':
        return this.translateSpath(args, notes);
      case 'rex':
        return this.translateRex(args, notes);
      case 'timechart':
        return this.translateTimechart(args, notes);
      default:
        notes.push(`No specific translation for ${cmdName}, using generic mapping`);
        return `${cmdRef.kql_equivalent} /* ${cmd} */`;
    }
  }

  translateStats(args, notes) {
    // stats count by field -> summarize count() by field
    // stats avg(x) by y -> summarize avg(x) by y
    return `summarize ${args}`;
  }

  translateEval(args, notes) {
    // eval newfield=expression -> extend newfield=expression
    return `extend ${args}`;
  }

  translateFields(args, notes) {
    if (args.startsWith('+')) {
      return `project ${args.substring(1).trim()}`;
    } else if (args.startsWith('-')) {
      return `project-away ${args.substring(1).trim()}`;
    }
    return `project ${args}`;
  }

  translateSort(args, notes) {
    // sort +field -> order by field asc
    // sort -field -> order by field desc
    const descMatch = args.match(/^-(\S+)/);
    if (descMatch) {
      return `order by ${descMatch[1]} desc`;
    }
    const ascMatch = args.match(/^\+?(\S+)/);
    if (ascMatch) {
      return `order by ${ascMatch[1]} asc`;
    }
    return `order by ${args}`;
  }

  translateRename(args, notes) {
    // rename old as new -> project-rename new = old
    const match = args.match(/(\S+)\s+as\s+(\S+)/);
    if (match) {
      return `project-rename ${match[2]} = ${match[1]}`;
    }
    return `project-rename ${args}`;
  }

  translateSpath(args, notes) {
    // spath path=x.y output=z -> extend z = tostring(data.x.y)
    const pathMatch = args.match(/path=([^\s]+)/);
    const outputMatch = args.match(/output=([^\s]+)/);
    const inputMatch = args.match(/input=([^\s]+)/);
    
    if (pathMatch && outputMatch) {
      const path = pathMatch[1].replace(/\{\}/g, '');
      const output = outputMatch[1];
      const input = inputMatch ? inputMatch[1] : 'dynamic_field';
      notes.push(`spath: Extracting ${path} from JSON`);
      return `extend ${output} = tostring(${input}.${path})`;
    }
    
    notes.push('spath requires manual adjustment for complex JSON parsing');
    return `extend /* spath ${args} - requires manual adjustment */`;
  }

  translateRex(args, notes) {
    // rex field=_raw "pattern" -> parse _raw with pattern
    notes.push('rex: Regular expression extraction may require manual adjustment');
    return `parse /* ${args} - requires manual regex adjustment */`;
  }

  translateTimechart(args, notes) {
    // timechart span=1h count by field -> summarize count() by bin(TimeGenerated, 1h), field
    const spanMatch = args.match(/span=(\S+)/);
    const span = spanMatch ? spanMatch[1] : '1h';
    const restArgs = args.replace(/span=\S+/, '').trim();
    
    return `summarize ${restArgs} by bin(TimeGenerated, ${span})`;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(inputVal, outputVal, notes) {
    let score = 100;
    
    // Deduct for input errors/warnings
    score -= inputVal.errors.length * 20;
    score -= inputVal.warnings.length * 5;
    
    // Deduct for output errors/warnings  
    score -= outputVal.errors.length * 20;
    score -= outputVal.warnings.length * 5;
    
    // Deduct for translation issues
    const issueNotes = notes.filter(n => 
      n.includes('Unknown') || n.includes('manual') || n.includes('WARNING')
    );
    score -= issueNotes.length * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Translate KQL to SPL (basic implementation)
   */
  async translateKQLtoSPL(kqlQuery) {
    if (!this.splunkRef || !this.kqlRef) {
      await this.loadReferences();
    }
    
    // Validate input
    const validation = this.validateKQL(kqlQuery);
    
    let splQuery = '';
    const translationNotes = [];
    
    try {
      // Parse KQL query
      const lines = kqlQuery.split('\n').map(l => l.trim()).filter(l => l);
      const parts = lines.join(' ').split('|').map(p => p.trim());
      
      // First part should be table name
      const tableName = parts[0];
      
      // Look up table mapping
      const mapping = this.tableToIndexMapping[tableName] || 
                     this.tableToIndexMapping[tableName.toLowerCase()] ||
                     this.tableToIndexMapping['default'];
      
      // Build Splunk search with index and sourcetype
      if (mapping.sourcetype) {
        splQuery = `index=${mapping.index} sourcetype="${mapping.sourcetype}"`;
        translationNotes.push(`Mapped table "${tableName}" to index="${mapping.index}" sourcetype="${mapping.sourcetype}" (${mapping.note})`);
      } else {
        splQuery = `index=${mapping.index}`;
        translationNotes.push(`Mapped table "${tableName}" to index="${mapping.index}" (${mapping.note})`);
      }
      
      // Warn if using default mapping
      if (mapping === this.tableToIndexMapping['default']) {
        translationNotes.push(`⚠️ WARNING: Unknown table "${tableName}" - using default index. Please verify index/sourcetype in your Splunk environment!`);
      }
      
      // Process remaining operators
      for (let i = 1; i < parts.length; i++) {
        const op = parts[i];
        const opName = op.split(/\s+/)[0];
        const opArgs = op.substring(opName.length).trim();
        
        switch(opName) {
          case 'where':
            splQuery += ` ${opArgs.replace(/==/g, '=')}`;
            break;
          case 'summarize':
            splQuery += ` | stats ${opArgs}`;
            break;
          case 'extend':
            splQuery += ` | eval ${opArgs}`;
            break;
          case 'project':
            splQuery += ` | fields ${opArgs}`;
            break;
          case 'project-away':
            splQuery += ` | fields - ${opArgs}`;
            break;
          case 'project-rename':
            // project-rename new = old -> rename old as new
            const renameMatch = opArgs.match(/(\S+)\s*=\s*(\S+)/);
            if (renameMatch) {
              splQuery += ` | rename ${renameMatch[2]} as ${renameMatch[1]}`;
            } else {
              splQuery += ` | rename ${opArgs}`;
            }
            break;
          case 'order':
            // order by field asc/desc -> sort +field or sort -field
            const orderMatch = opArgs.match(/by\s+(\S+)\s*(asc|desc)?/);
            if (orderMatch) {
              const prefix = orderMatch[2] === 'desc' ? '-' : '+';
              splQuery += ` | sort ${prefix}${orderMatch[1]}`;
            } else {
              splQuery += ` | sort ${opArgs}`;
            }
            break;
          case 'take':
            splQuery += ` | head ${opArgs}`;
            break;
          case 'distinct':
            splQuery += ` | dedup ${opArgs}`;
            break;
          case 'mv-expand':
            splQuery += ` | mvexpand ${opArgs}`;
            break;
          case 'parse':
            splQuery += ` | rex ${opArgs}`;
            translationNotes.push('parse requires manual adjustment for regex patterns');
            break;
          default:
            splQuery += ` | ${op} /* WARNING: Manual translation needed */`;
            translationNotes.push(`Unknown KQL operator: ${opName}`);
        }
      }
      
    } catch (error) {
      translationNotes.push(`Translation error: ${error.message}`);
    }
    
    // Validate output
    const outputValidation = this.validateSPL(splQuery);
    
    return {
      originalQuery: kqlQuery,
      translatedQuery: splQuery,
      inputValidation: validation,
      outputValidation: outputValidation,
      translationNotes: translationNotes,
      confidence: this.calculateConfidence(validation, outputValidation, translationNotes),
      validation: {
        input: validation,
        output: outputValidation
      }
    };
  }

  /**
   * Main translate method - routes to appropriate translation
   */
  async translate(query, fromLanguage, toLanguage) {
    const from = fromLanguage.toLowerCase();
    const to = toLanguage.toLowerCase();
    
    if (from === 'spl' && to === 'kql') {
      return await this.translateSPLtoKQL(query);
    } else if (from === 'kql' && to === 'spl') {
      return await this.translateKQLtoSPL(query);
    } else {
      throw new Error(`Unsupported translation: ${from} to ${to}`);
    }
  }

  /**
   * Explain what a query does
   */
  async explainQuery(query, language) {
    if (!this.splunkRef || !this.kqlRef) {
      await this.loadReferences();
    }
    
    const lang = language.toLowerCase();
    let explanation = '';
    
    try {
      if (lang === 'spl') {
        const parts = query.split('|').map(p => p.trim());
        explanation = 'This SPL query:\n';
        
        // Explain search criteria
        const searchPart = parts[0];
        if (searchPart.includes('index=')) {
          const indexMatch = searchPart.match(/index=(\S+)/);
          explanation += `1. Searches in the "${indexMatch[1]}" index\n`;
        }
        
        const searchTerms = searchPart
          .replace(/index=\S+/g, '')
          .replace(/source=\S+/g, '')
          .replace(/sourcetype=\S+/g, '')
          .trim();
        
        if (searchTerms) {
          explanation += `2. Filters for events containing: "${searchTerms}"\n`;
        }
        
        // Explain each command
        for (let i = 1; i < parts.length; i++) {
          const cmd = parts[i];
          const cmdName = cmd.split(/\s+/)[0];
          const cmdRef = this.splunkRef.spl_commands[cmdName];
          
          if (cmdRef) {
            explanation += `${i + 1}. ${cmdRef.description || cmdName}\n`;
          } else {
            explanation += `${i + 1}. Executes: ${cmd}\n`;
          }
        }
      } else if (lang === 'kql') {
        const parts = query.split('|').map(p => p.trim());
        explanation = 'This KQL query:\n';
        
        explanation += `1. Queries the "${parts[0]}" table\n`;
        
        for (let i = 1; i < parts.length; i++) {
          const op = parts[i];
          const opName = op.split(/\s+/)[0];
          const opRef = this.kqlRef.kql_operators[opName];
          
          if (opRef) {
            explanation += `${i + 1}. ${opRef.description || opName}\n`;
          } else {
            explanation += `${i + 1}. Applies: ${op}\n`;
          }
        }
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }
    } catch (error) {
      explanation = `Error explaining query: ${error.message}`;
    }
    
    return explanation;
  }
}

export { QueryTranslator };
