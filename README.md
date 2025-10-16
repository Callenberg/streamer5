# streamer4

Streamer Software Version 5 --- backend and frontend for a Raspberry Pi music network streamer

This is the software that comes with the network music streamers custom built by Retro Audiophile Designs.

The software makes it possible to stream music using Bluetooth, Spotify and Airplay. It connects the hardware to Bluetooth (as a sink) and it is also possible to connect to home networks with cable or Wi-Fi. It is even possible to connect a Bluetooth speaker or Bluetooth headphones (as a renderer) and in addition, it an be connected to old fashioned wired passive Hi-Fi speakers. The system and its connections are managed by a web interface.

Hardware requirements:
=====================
Raspberry Pi 5, 2GB or more RAM, works with Raspberry Pi 3 and Pi 4 too.

A Wi-Fi dongle (two Wi-Fi circuits makes the set up easier and better signal coverage).

Class D amplifier IQaudio Pi-DigiAMP+ HAT for Raspberry Pi.

12-24V power source.

Software requirements:
=====================
Raspberry Pi OS based on Debian Bookworm https://www.raspberrypi.com/documentation/computers/os.html

librespot https://github.com/librespot-org/librespot

Shairport Sync https://github.com/mikebrady/shairport-sync

Bluetooth Audio ALSA Backend https://github.com/Arkq/bluez-alsa

Node.js https://nodejs.org/en/download/

socket.io https://socket.io/

Express https://expressjs.com/

Usage
====

This is only a plain software depository. There is no package to install. The best usage is probably to look at the source code of the topics that interests you and maybe the code can inspire you.

Topics that might be of interest
================================
Bluetooth connections
---------------------
Connecting a device via Bluetooth is mainly managed in the file /lib/streamer-network.js It also covers how a bluetooth speaker is connected. It might also be of interest to check out status and any information about current connections as well as starting and stoping the Bluetooth service.

Bluetooth streaming
--------------------
One challenge is how to detect when Bluetooth is used to stream audio to the Streamer and to a Bluetooth speaker. Since the alsa and the audio card is not used in this case so no need to monitor those things. Instead file descriptors are scanned to find the open file that represents the bluetooth streaming. Look further in the script fdinfobluealsa.sh that writes to the file bluetoothdetect.log that has to be present in the /var/log/ directory of the Raspberry Pi. The streaming is detected among other events in the file /lib/streamer-detect.js. It is a little bit messy - there most be a better way to do this?

Configuration
-------------
Various config files can be found in /config/. However, the config files for Wi-Fi can be found in /data/.

Streaming
---------
One of the most frequent events is when streaming starts and stops. In order to detect those different hooks are used. Librespot (Spotify) provides a nice set of hooks that are used, see the script spotifyevent.sh. Shairport-sync (AirPlay) provides hooks as well and those are used in the scripts airplayoff.sh and airplayon.sh. All these hooks write their status in a file that has to exist in /var/log/ directory of the Raspberry Pi and it is named streamsensor.log. The actual detection of various streaming is done in the file /lib/machine-detect.js reading the value of the streamsensor.log. 

User interface
--------------
The user interface is used for managing the Streamer system itself (i.e. do settings and managing connections and show status of the Streamer. It is not used for manaing the actually streaming - you use your streaming apps like the Spotify app. The front end code can be found in /pages,

Wi-Fi
-----
In order to manage all aspects of wireless networks nmcli is used. Open the file /lib/streamer-network and have a look.
