#!/bin/bash
# Copyright 2025 by Retro Audiophile Designs, GPL 3.0.
#   ~ script runs every time when librespot fires a player event ~
# Set as option for '--onevent=' in librespot config file librespot.service
# which can be found in /usr/lib/systemd/system
# File streamsensor.log is read by streamer-loop.js & streamer-view.js
# Call script by ./streamer/spotifyevent.sh
# Has to be UTF-8 -- wrong CR characters? remove with: sed -i -e 's/\r$//' spotifyevent.sh

#Test
#date >>  /streamer/tester

#touch /var/log/streamsensor.log
#sync -d /var/log/streamsensor.log
#chmod 0777 /var/log/streamsensor.log


if [[ $PLAYER_EVENT == "playing" ]]; then
	echo "spot:start" > /var/log/streamsensor.log
  	sync -d /var/log/streamsensor.log
fi

#older behaviour of Spotify:
#if [[ $PLAYER_EVENT == "started" ]]; then
#	echo "spot:start" > /var/log/streamsensor.log
#  	sync -d /var/log/streamsensor.log
#fi

if [[ $PLAYER_EVENT == "paused" ]]; then
	echo "spot:stop" >  /var/log/streamsensor.log
 	sync -d /var/log/streamsensor.log
fi


if [[ $PLAYER_EVENT == "stopped" ]]; then
	echo "spot:stop" >  /var/log/streamsensor.log
  	sync -d /var/log/streamsensor.log
fi

