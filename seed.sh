#!/bin/bash

# Seed script for BAWASA database
# Usage: ./seed.sh [dry-run] [years]
# Examples:
#   ./seed.sh                    # Run seed for default years (2022-2025)
#   ./seed.sh dry-run            # Dry run (no data inserted)
#   ./seed.sh "" "[2024,2025]"   # Seed only 2024 and 2025

# Try to detect port from environment, default to 3001 (common when 3000 is busy)
PORT="${PORT:-${NEXT_PUBLIC_PORT:-3001}}"
BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${PORT}}"
DRY_RUN="${1:-false}"
YEARS="${2:-[2022,2023,2024,2025]}"

# Convert dry-run string to boolean
if [ "$DRY_RUN" = "dry-run" ] || [ "$DRY_RUN" = "true" ]; then
  DRY_RUN="true"
else
  DRY_RUN="false"
fi

echo "🌱 Running seed with options:"
echo "   Dry Run: $DRY_RUN"
echo "   Years: $YEARS"
echo "   URL: $BASE_URL/api/seed"
echo ""

curl -X POST "$BASE_URL/api/seed" \
  -H "Content-Type: application/json" \
  -d "{
    \"dryRun\": $DRY_RUN,
    \"years\": $YEARS
  }" \
  | jq '.'

echo ""
echo "✅ Seed request completed!"

