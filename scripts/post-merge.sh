#!/bin/bash
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "⚠️  Database schema push is NOT automatic."
echo "If you have schema changes, run manually:"
echo "  pnpm --filter db push"
echo ""
