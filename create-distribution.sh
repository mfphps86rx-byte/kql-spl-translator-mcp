#!/bin/bash

# Package KQL-SPL Translator MCP Server for Distribution
# Creates a clean distribution package ready to share

echo "📦 Creating distribution package..."

# Create distribution directory
DIST_DIR="kql-spl-translator-mcp-v1.0.0"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "✓ Created distribution directory"

# Copy essential files
cp server.js "$DIST_DIR/"
cp enhanced-translator.js "$DIST_DIR/"
cp package.json "$DIST_DIR/"
cp .gitignore "$DIST_DIR/"

echo "✓ Copied core files"

# Copy documentation
cp DISTRIBUTION-README.md "$DIST_DIR/README.md"
cp QUICK-START.md "$DIST_DIR/"
cp SPLUNK-CLOUD-EVENT-HUB-GUIDE.md "$DIST_DIR/"
cp CHANGELOG.md "$DIST_DIR/"

echo "✓ Copied documentation"

# Copy reference data
cp kql-reference.json "$DIST_DIR/"
cp splunk-reference.json "$DIST_DIR/"

echo "✓ Copied reference data"

# Copy example config
cp splunk-mappings.example.json "$DIST_DIR/"

echo "✓ Copied example configuration"

# Copy test files
cp test-mcp.js "$DIST_DIR/"
cp stress-test.js "$DIST_DIR/"
cp validation-test.js "$DIST_DIR/"
cp kqlsearch-test.js "$DIST_DIR/"

echo "✓ Copied test files"

# Copy utilities
cp splunk-data-discovery.js "$DIST_DIR/"
cp test-table-mapping.js "$DIST_DIR/"

echo "✓ Copied utilities"

# Create tarball
tar -czf "${DIST_DIR}.tar.gz" "$DIST_DIR"

echo ""
echo "✅ Distribution package created successfully!"
echo ""
echo "📦 Package: ${DIST_DIR}.tar.gz"
echo "📂 Directory: ${DIST_DIR}/"
echo ""
echo "To share:"
echo "  1. Send ${DIST_DIR}.tar.gz to others"
echo "  2. They extract: tar -xzf ${DIST_DIR}.tar.gz"
echo "  3. They run: cd ${DIST_DIR} && npm install"
echo "  4. They test: npm test"
echo ""
echo "Contents:"
ls -lh "${DIST_DIR}.tar.gz"
echo ""
echo "Files included:"
cd "$DIST_DIR" && find . -type f | sort
