#!/bin/bash
# Copyright 2025 by Retro Audiophile Designs, all rights reserved.
#   ~ script runs every time when shairport-sync STARTS playing ~
# Set as script for: 'run_this_before_play_begins' in shairport-sync config file
# File streamsensor.log is read by streamer-loop.js and streamer-view.js
 
# UTF8 required -if wrong CR characters, remove with: sed -i -e 's/\r$//' airplayon.sh

echo "airp:start" > /var/log/streamsensor.log
sync -d /var/log/streamsensor.log
