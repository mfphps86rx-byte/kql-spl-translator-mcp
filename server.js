#!/usr/bin/env node

/**
 * KQL-SPL Translator MCP Server
 * 
 * A Model Context Protocol server that provides bidirectional translation
 * between KQL (Kusto Query Language) and SPL (Splunk Processing Language).
 * 
 * Features:
 * - Translate queries between KQL and SPL
 * - Explain queries in plain English
 * - Validate query syntax
 * - Custom table-to-index mapping support
 * - Confidence scoring for translations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QueryTranslator } from './enhanced-translator.js';
import fs from 'fs';
import path from 'path';

// Initialize translator (can be configured with custom mappings)
let translator;

// Load custom mappings if they exist
function loadCustomMappings() {
  const mappingPath = path.join(process.cwd(), 'splunk-mappings.json');
  if (fs.existsSync(mappingPath)) {
    try {
      const customMappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.error(`✓ Loaded custom mappings from ${mappingPath}`);
      return customMappings;
    } catch (error) {
      console.error(`⚠ Failed to load custom mappings: ${error.message}`);
      return null;
    }
  }
  return null;
}

const customMappings = loadCustomMappings();
translator = new QueryTranslator(customMappings);

// Create MCP server
const server = new Server(
  {
    name: 'kql-spl-translator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'translate',
        description: 'Translate a query between KQL and SPL. Supports both directions: KQL→SPL and SPL→KQL. Returns the translated query with confidence score and validation results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to translate',
            },
            from: {
              type: 'string',
              enum: ['kql', 'spl'],
              description: 'Source query language (kql or spl)',
            },
            to: {
              type: 'string',
              enum: ['kql', 'spl'],
              description: 'Target query language (kql or spl)',
            },
          },
          required: ['query', 'from', 'to'],
        },
      },
      {
        name: 'translate_kql_to_spl',
        description: 'Translate a KQL query to SPL. Uses custom table-to-index mappings if configured. Returns translated query with validation and confidence score.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The KQL query to translate',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'translate_spl_to_kql',
        description: 'Translate an SPL query to KQL. Converts Splunk search syntax to Kusto Query Language.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SPL query to translate',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'explain_query',
        description: 'Explain what a KQL or SPL query does in plain English. Breaks down each operation and describes the query logic.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to explain',
            },
            language: {
              type: 'string',
              enum: ['kql', 'spl'],
              description: 'The query language (kql or spl)',
            },
          },
          required: ['query', 'language'],
        },
      },
      {
        name: 'set_table_mapping',
        description: 'Set or update custom KQL table to Splunk index/sourcetype mappings. Use this to configure environment-specific mappings.',
        inputSchema: {
          type: 'object',
          properties: {
            mapping: {
              type: 'object',
              description: 'Mapping object where keys are KQL table names and values are objects with "index", "sourcetype", and optional "note" properties',
            },
          },
          required: ['mapping'],
        },
      },
      {
        name: 'get_table_mapping',
        description: 'Get the current KQL table to Splunk index/sourcetype mappings being used by the translator.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_discovery_queries',
        description: 'Generate Splunk discovery queries to help find where a KQL table\'s data lives in your Splunk environment. Useful for Azure Event Hub ingestion scenarios.',
        inputSchema: {
          type: 'object',
          properties: {
            kqlTable: {
              type: 'string',
              description: 'The KQL table name to generate discovery queries for',
            },
          },
          required: ['kqlTable'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'translate': {
        const result = await translator.translate(args.query, args.from, args.to);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'translate_kql_to_spl': {
        const result = await translator.translateKQLtoSPL(args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'translate_spl_to_kql': {
        const result = await translator.translateSPLtoKQL(args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'explain_query': {
        const result = await translator.explainQuery(args.query, args.language);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'set_table_mapping': {
        translator.setTableMapping(args.mapping);
        return {
          content: [
            {
              type: 'text',
              text: 'Table mapping updated successfully',
            },
          ],
        };
      }

      case 'get_table_mapping': {
        const mapping = translator.getTableMapping();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mapping, null, 2),
            },
          ],
        };
      }

      case 'generate_discovery_queries': {
        const queries = translator.generateDiscoveryQueries(args.kqlTable);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(queries, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('KQL-SPL Translator MCP Server running on stdio');
  
  if (customMappings) {
    console.error(`Using custom table mappings with ${Object.keys(customMappings).length} entries`);
  } else {
    console.error('Using default table mappings');
    console.error('Tip: Create splunk-mappings.json to use custom mappings');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
