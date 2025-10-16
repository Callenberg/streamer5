#!/bin/sh
# Copyright 2025 by Retro Audiophile Designs.
#   ~ returns the names of open files in for the bluealsa-aplay pid ~
# Called by function btDetect() in filestreamer-startpage.js
#Usage: '/streamer/fdinfobluesalsa.sh 31280' -- where as an example 31280 is the pid of mpd

# wrong CR characters, remove with: sed -i -e 's/\r$//' fdinfobluesalsa.sh

echo "" > /var/log/bluetoothdetect.log
readlink /proc/$1/fd/* >> /var/log/bluetoothdetect.log
