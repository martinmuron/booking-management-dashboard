#!/bin/bash

# Add missing Nuki environment variables to production with actual device IDs

echo "Adding missing Nuki environment variables to production..."

echo "17958559348" | vercel env add NUKI_BORIVOJOVA_ENTRY_ID production --stdin
echo "18090678500" | vercel env add NUKI_LAUNDRY_ID production --stdin
echo "18154937741" | vercel env add NUKI_LUGGAGE_ID production --stdin
echo "18120565789" | vercel env add NUKI_MAIN_DOOR_ID production --stdin
echo "18111759996" | vercel env add NUKI_REHOROVA_ID production --stdin

echo "Environment variables added to production!"