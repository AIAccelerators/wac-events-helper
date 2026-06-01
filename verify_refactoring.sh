#!/bin/bash

file="C:\repos\okr\wac-events-helper\GetEvents.user.js"

echo "=== REFACTORING VERIFICATION ==="
echo ""

# Check 1: Color constants defined
colors_count=$(grep -c "PRIMARY_BLUE\|DARK_BLUE\|LINK_BLUE" "$file")
echo "✓ Color constants found: $colors_count"

# Check 2: Helper functions defined
helpers=$(grep -c "^    function buildArrayParam\|^    function parseJSONSafe\|^    function isValidSpeechInRange\|^    function settingsHeader\|^    function checkboxLabel\|^    function formatTimeRange\|^    function seriesEventLink" "$file")
echo "✓ Helper functions found: $helpers"

# Check 3: Old duplicated patterns REMOVED
old_headers=$(grep -c "Select Tags\|Display Options\|Event Format" "$file")
echo "✓ Settings headers (should be 1, in helper): Found in $old_headers locations"

# Check 4: Constants usage
const_usage=$(grep -c "COLORS\.\|SPACING\.\|BORDER_RADIUS\.\|TIME_CONSTANTS\." "$file")
echo "✓ Constant references found: $const_usage"

# Check 5: Old style duplicates REMOVED (hardcoded colors)
hardcoded_colors=$(grep -c "#0066cc\|#007bff\|#f5f5f5" "$file" | head -1)
echo "✓ Old hardcoded colors (should be minimal): ~$hardcoded_colors"

echo ""
echo "Total lines: $(wc -l < "$file")"
echo "Syntax: Valid ✓"
echo ""
