#!/bin/bash
# wrong CR characters, remove with: sed -i -e 's/\r$//' rad

echo "Streamer service starting... calling node"
/bin/nodejs /streamer/streamer-control.js


