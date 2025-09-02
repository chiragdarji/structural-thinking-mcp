#!/bin/bash

# PromptSpec MCP Server Startup Script
# This script ensures the server starts correctly for Cursor

cd "/Users/chiragkumar.darji@avalara.com/Library/CloudStorage/OneDrive-Avalara/Documents/Tech/MCP/promptspec-mcp"

# Use absolute path to node to avoid PATH issues
/usr/local/bin/node dist/server.js
