#!/usr/bin/env node
/**
 * Test script for the Query Translator MCP Server
 * This script tests the translation functionality directly
 */

import { QueryTranslator } from './enhanced-translator.js';

async function testTranslator() {
  console.log('🧪 Testing Query Translator MCP Server\n');
  
  const translator = new QueryTranslator();
  
  try {
    // Load references
    console.log('📚 Loading reference data...');
    await translator.loadReferences();
    console.log('✅ References loaded successfully\n');
    
    // Test 1: SPL to KQL translation
    console.log('Test 1: SPL to KQL Translation');
    console.log('================================');
    const splQuery = 'index=main error | stats count by host';
    console.log('Input SPL:', splQuery);
    
    const kqlResult = await translator.translate(splQuery, 'spl', 'kql');
    console.log('Output KQL:', kqlResult.translatedQuery);
    console.log('Confidence:', kqlResult.confidence);
    console.log('Validation:', kqlResult.validation);
    console.log('');
    
    // Test 2: KQL to SPL translation
    console.log('Test 2: KQL to SPL Translation');
    console.log('================================');
    const kqlQuery = 'SecurityEvent | where EventID == 4624 | summarize count() by Computer';
    console.log('Input KQL:', kqlQuery);
    
    const splResult = await translator.translate(kqlQuery, 'kql', 'spl');
    console.log('Output SPL:', splResult.translatedQuery);
    console.log('Confidence:', splResult.confidence);
    console.log('Validation:', splResult.validation);
    console.log('');
    
    // Test 3: Invalid query handling
    console.log('Test 3: Invalid Query Handling');
    console.log('================================');
    const invalidQuery = 'this is not a valid query';
    console.log('Input:', invalidQuery);
    
    try {
      const invalidResult = await translator.translate(invalidQuery, 'spl', 'kql');
      console.log('Output:', invalidResult.translatedQuery);
      console.log('Validation:', invalidResult.validation);
    } catch (error) {
      console.log('Error caught (expected):', error.message);
    }
    console.log('');
    
    // Test 4: Explain query
    console.log('Test 4: Explain Query');
    console.log('================================');
    const explainQuery = 'search index=main | stats avg(response_time) by host';
    console.log('Input:', explainQuery);
    
    const explanation = await translator.explainQuery(explainQuery, 'spl');
    console.log('Explanation:', explanation);
    console.log('');
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testTranslator();
