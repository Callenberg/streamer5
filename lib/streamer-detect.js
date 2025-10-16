//Copyright 2025 by Retro Audiophile Designs, all rights reserved.
//GNU General Public License v3.0 see license.txt            [Source code]
//      ~ controls for detecting events for pages and frames  ~
const fs = require('fs');                           //for reading files
//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

const aux = require('./machine-auxiliary.js');
const mod = require('/streamer/streamer-model.js');
const ctl = require('/streamer/streamer-control.js');

const alsa = require('/streamer/lib/streamer-alsa.js');

const exec = require('child_process').exec;         //for Raspian cmds
const execSync = require('child_process').execSync; //for synced Raspbian cmds

var watch = require('node-watch');                  //for checking log file, npm https://www.npmjs.com/package/node-watch

//........................................................................Detect
module.exports.beginStreamDetect = beginStreamDetect;
module.exports.stopStreamDetect = stopStreamDetect;
module.exports.beginPagesDetect = beginPagesDetect;
module.exports.stopPagesDetect = stopPagesDetect;
module.exports.stopStreamsensor = stopStreamsensor;

module.exports.whatIsStreaming = whatIsStreaming;
module.exports.whatStreaming = whatStreaming;

module.exports.monitorBluetoothSpeaker = monitorBluetoothSpeaker;
module.exports.noMonitorBluetoothSpeaker = noMonitorBluetoothSpeaker;

//........................................................Bluetooth detect loops
module.exports.restartBluetoothDetect = restartBluetoothDetect;
module.exports.loopCtlBootPreparations = loopCtlBootPreparations;
module.exports.startBluetoothDetect = startBluetoothDetect;
module.exports.stopBluetoothDetect = stopBluetoothDetect;

//_________________________________________________________________WATCH and DETECT
//1. One reason for all these detect loops are that when a streaming service starts
//to stream audio - all the other streamings services have to stop. When the on-
//going streaming eventually stops - all other streaming services starts again
//2. Another reason is that status frames on the web pages needs to be updated.

//As described below, detecting Bluetooth activities are pretty tedious and costly. It is
//therefore important to understand when bluetooth detecting must occur or can be paused.
//  i)  Bluetooth detection for analogue speakers must run when the amplifier is unmuted.
//           Use: alsa.isAmpMuted();
// ii)  Bluetooth detection for bluetooth speaker must run when the amplifier is muted
//           Use:alsa.isAmpMuted();
//iii)  Bluetooth detection for analogue speakers is not needed when another service is running
//           Use: global variable whatStreams
// iv)  Bluetooth detection for analogue speakers is not needed when no source device is connected
//           Use: mod.areConnectedBluetoothSources()
//  v)  Bluetooth detection for bluetooth speaker is not needed when the amplifier is unmuted
//           Use: alsa.isAmpMuted();

//File write / read solution:
// a) Spotify and Airplay use hooks that calls shell scripts, the scripts write
//    the value on file '/var/log/streamsensor.log'; 'spot:start' or 'airp:start'
//
// b) Bluetooth streaming to analogue speakers (through the amp) is discovered
//    when bluealsa-aplay uses the alsa. The pid is detected and 'btsp:start' is
//    written to /var/log/streamsensor.log'. If halted 'btsp:stop' is written.
//    Bluetooth speaker is a special case:
//    When bluetooth streaming and bluetooth speakers are used the discovery
//    is done by reading the file /var/log/bluetoothdetect where all the names
//    of open files of the systemd service bluealsa-aplay are written. The
//    pattern of what files are open will reveal if audio is streamed to the
//    bluetooth speaker.

// mod.newStreamingStatus() is the detector and manage changes
// pollStreamingStatus() is the main watcher reading '/var/log/streamsensor.log'
// It uses the npm node-watch package with a short interval.
//The watcher is running all the time.

//................................................................................
// btLoop() discovers bluetooth streaming and writes to '/var/log/streamsensor.log'.
// it also analyzes the content of the file that btDetect is writing to.
// btloop uses the timer 'btLoopTimer', timer [1]

// btDetect() writes the open file patterns of blueasalsa-aplay to figure out
// what kind of bluetooth streaming is going on (through amp / bluetooth speaker)
// btDetect uses timer 'btDetectTimer', timer [2]
//Detecting of Bluetooth streaming runs all the time, it is persistent.

//There are other watchers too:
// c) monitor for bluetoot speaker that disconnects/connects externally
// d) monitor for Wi-Fi connection disconnection externally
// e) monitor for source devices disconnects/connects externally
// f) watcher for wired status. Is there the LAN cable inserted or not?
// g) watcher for Internet status. Is there Internet access or not?
//These monitors and watchers are started if there is at least one start page open and
//stopped when there is no start page open.

//Global Variables_______________________________________________________________
//timer holders [timer type] 

//timer type: [0] means timers based on 'watcherInterval'
// might be started only when at least one page is open... + other triggers
var watcher = false;                    //[0] node-watch package, in-built timer
var lanWatcher = false;                 //[0] watch wired status, e.g. the LAN cable
var internetWatcher = false             //[0] watch internet status
var bluetoothSpeakerWatcher = false;    //[0] watch connected speaker
var trustedSpeakersWatcher = false;     //[0] watch trusted speakers
var bluetoothDeviceWatcher = false;     //[0] watch connected phones

//timer type [1] starts only when amplifier is unmuted + open page criteria
var btLoopTimer = false;      //[1] reads from file btDetect, requires alsa pid

//timer type [2] starts only when the amplifier is unmuted + open pages criteria
var btDetectTimer = false;    //[2] writes on file, might be reset, requires pid


//timer intervals
//[0] main interval for watcher, but also for many other timers - prime integers
const watcherInterval = 2001;  //base interval (node-watcher default: 200 ms) [0]

//[1] intervals write open file patterns on files...
const btDetectInterval = watcherInterval * 1.1; //writes bluetooth patterns [2]

//[2] reads [2] patterns and analyze them
const btLoopInterval = btDetectInterval * 1.27;                             //[1]

//Used to check for on-going streaming or idle
let whatStreams = "idle";   

//=======================================================================================
//Detect management of Streamer Pages ===================================================
//=======================================================================================

//Start Page is used for:
//  a) start / stop streaming services                [button + external]
//_______________________________________________________________________________________
//.................................................................... Streaming services
/**Start to detect streaming events that affects the Start Page streaming status frame.
 *It will be started at boot phase [3].
 * @return {boolean}      true
 */
async function beginStreamDetect() {
    //1. Start the writing the names of open files of Bluetooth streaming
    if (btDetectTimer !== false) {
        clearInterval(btDetectTimer);
        //console.log(aux.timeStamp(), 'detect: timer [2] - bt timer cleared first [X]');
    };
    bluetoothDetect();          //writes open files of bluetooth streaming[2]
    //2. Start Bluetooth streaming detect
    if (btLoopTimer !== false) {
        clearInterval(btLoopTimer);
        //console.log(aux.timeStamp(), 'detect: timer [1] - bt timer cleared first [X]');
    };
    bluetoothLoop();           //detects bluetooth streaming              [1]
    // 3. Last to start up is the main watcher of '/var/log/streamsensor.log'
    if (watcher !== false) {
        await watcher.close();
        //console.log(aux.timeStamp(), 'detect: timer [0] - watcher cleared first [X]');
        pollStreamingStatus(); //detects all streaming                    [0]
    }
    else {
        pollStreamingStatus(); //detects all streaming                    [0]
        //console.log(aux.timeStamp(), 'detect: watchers for ALL stream detecting STARTED.');
    };
    return true;
};
/**Stop to detect events for Start Page streaming status frame.
 *It will be stopped when? unknown...
 * @return {boolean}      true
 */
async function stopStreamDetect() {
    console.log(aux.timeStamp(), 'detect: stopping watcher/timers for stream detecting [X]');
    clearInterval(btDetectTimer);        //                                 stop [1]
    clearInterval(btLoopTimer); //                                          stop [2]
    await watcher.close();//                                                stop [0]
    return true;
};
//....................................................................all other detectors
/**Start to detect external events that affects Start, Bluetooth, Network pages frames.
 *They will then be running only if at least one page is open (e.g. connected via socket.io).
 * @return {boolean}      true
 */
function beginPagesDetect() {
    monitorBluetoothSpeaker();//detects when a connected speaker disconnects    [0]
    monitorTrustedSpeakers(); //detects auto-reconect of trusted speakers       [0]
    monitorSourceDevices()    //detects any bluetooth source device             [0]
    pollWiredStatus();        //detects LAN cable                               [0]
    //pollInternetStatus();     //detects Internet access                         [0]
    return true;
};
/**Stop to detect external events for all pages frames for good. All stop.
 * @return {boolean}      true
 */
function stopPagesDetect() {
    clearInterval(bluetoothSpeakerWatcher);//                               stop [0]
    clearInterval(bluetoothDeviceWatcher);//                                stop [0]
    clearInterval(trustedSpeakersWatcher) //                                stop [0]
    clearInterval(lanWatcher);//                                            stop [0]
    clearInterval(internetWatcher);//                                       stop [0]
    return true;
};
/**The bluetooth speaker monitor is a special case and is only running
 * when there is a speaker connected. Full stop.
 * @return {boolean}      true
 */
function noMonitorBluetoothSpeaker() {
    clearInterval(bluetoothSpeakerWatcher);
}
//_____________________________________________________________________________________------[Poller]-----
//..........................................[the streaming detector to detect them all]
/** Reads the file 'var/log/streamsensor.log' for all states of streaming.
 * This function reads the file when its been updated, trims the string value
 * and checks if the state has changed. If so it calls mod.newStreamingStatus('state')
 * The following scripts writes to the file:
 * '/streamer/spotifyevent.sh', '/streamer/airplayon.sh' and '/streamer/airplayoff.sh'
 * The functions btLoop() writes to the file as well.
 * The format is basically: 'idle:stop', '<service>:start', '<service>:stop'
 * Uses npm node-watch package because it is fast an accurate.
 * The default interval is 200 ms, which is quite often. 
 *   Use format: 'watch('./', { delay: nnnnn }, function(){ . . .   );
 *   Optional: 'fs.watchFile('/var/log/streamsensor.log', (curr, prev) => {'
 *          or 'fs.watch('/var/log/streamsensor.log', (eventType) => { '
 * @param {watcher}      interval, uses GV watcherInterval
 * @return {?}           of no interest
 */
async function pollStreamingStatus(interval = watcherInterval) {
    //A. Prepare for watcher:
    let state = "idle:stop";        //started at boot so it must be idle
    try {
        execSync(`sudo sync -d /var/log/streamsensor.log `,
            { uid: 1000, gid: 1000, encoding: 'utf8' });
        state = aux.mpdMsgTrim(fs.readFileSync('/var/log/streamsensor.log', 'utf8'));
       // console.log(aux.timeStamp(), "watcher: polled start status of streaming =>", state);
    }
    catch (err) {
        console.log(aux.timeStamp(), "watcher: ERROR\n", err);
    };
    let oldState = state;
   //B. Start to watch the sensor file... and detect.
    watcher = watch('/var/log/streamsensor.log', {delay: interval }, function (evt, name) {
     if (evt == 'update') {
       //console.log(aux.timeStamp(), "watcher: watch detected update          [CHANGE]");
         try {
         state = aux.mpdMsgTrim(fs.readFileSync('/var/log/streamsensor.log', 'utf8'));
             //console.log(aux.timeStamp(),"watcher: poller read new state   |", state );
             if (state.length === 0) {
                 //console.log(aux.timeStamp(), "watcher: poller read empty string  [FAIL] -", state.length);
                 //sometimes poller reads an empty string - discard
                 state = oldState;
             };
       }
       catch (err) {
         console.log(aux.timeStamp(),"watcher: ERROR\n", err);
         state = "idle:stop";
         oldState = "idle:stop";
       };
       if (state === oldState) {
         //NO CHANGE - no action
       }
       else {
           //CHANGE - notify streamer model
           somethingIsStreaming(state);
           //console.log(aux.timeStamp(),"watcher:[Change is:",oldState, "=>", state,"]");
           oldState = state;
           mod.newStreamingStatus(state);
       };
     };
   });
};
/**Sets the global variable 'whatStreams'
 * It recieves the streaming status format on file /var/log/streamsensor.log
 * and figures out what is streaming or no streaming = 'idle' (like 'spot:stop').
 * Sets the global variable WhatStreams - used in Bluetooth speaker loop.
 * @param  {string}  statusChanged, format: 'idle:stop','<service>:start/stop'
 * @global {string}  WhatStreams - idle, spotify, airplay or bluetooth
 * @return {string}  idle, spotify, airplay or bluetooth
 */
function somethingIsStreaming(statusChanged = "idle:stop" ) {
    switch (statusChanged) {
        case "idle:stop":
            whatStreams = "idle";
            break;
        case "spot:start":
            whatStreams = "spotify";
            break;
        case "airp:start":
            whatStreams = "airplay";
            break;
        case "btst:start":
            whatStreams = "bluetooth";
            break;
        default:
            whatStreams = "idle";
            break;
    };
    //console.log(aux.timeStamp(), "detect: now streaming:- ", whatStreams, "  -- <|~~~");
    return whatStreams;
};
/**Returns the value of the global variable 'whatStreams'
 * @global {string}  WhatStreams - idle, spotify, airplay or bluetooth
 * @return {boolean/string}  false, 'spotify', 'airplay' or 'bluetooth'
 */
function whatIsStreaming() {
    //console.log(aux.timeStamp(), "detect: ERROR\n", err);
    if (whatStreams == "idle") {
        return false;
    }
    else {
        return whatStreams;
    }; 
};

function whatStreaming() {
    return whatStreams;
};

 //...............................................................[Explicit write stop]
/**Write stop when all streaming services is stopped indirectly by Streamer
 * It also writes "idle:stop", as well as '<service>:stop' for user stops.
 * If Bluetooth is turned off and there is bluetooth streaming, then this function
 * will update /var/log/streamsensor.log with a write of 'idle:stop'
 * @param {string}  service, Spotify or Airplay, otherwise 'idle:stop' is written
 * @return {string} service or idle
 */
function stopStreamsensor(service) {
  if (service === "spotify" ) {
    fs.writeFileSync( '/var/log/streamsensor.log', "spot:stop");
  }
  else if (service === "airplay") {
    fs.writeFileSync( '/var/log/streamsensor.log', "airp:stop");
  }
  else {
      fs.writeFileSync('/var/log/streamsensor.log', "idle:stop");
      service = "idle";
  };
  return service;
};
//_______________________________________________________________________________________
//................................................bluetooth service, speakers and devices
//Start Page is used for:
//  a) stop Bluetooth                               [button]
//  b) disconnect Bluetooth Speaker                 [button + external] - same as d)
//Bluetooth Page is used for:
//  c) stop / start Bluetooth                       [button]
//  d) connect / disconnect Bluetooth Speaker       [button + external]
//  e) untrust earlier connected speakers,          [button]
//  f) disconnect source device,                    [button + external]
//  g) unpair source devices                        [button]
//Buttons should be caught in streamer-view.js Protocol P2.
//All external events needs to be detected when at least one page is open

/**Monitor if the bluetooth speaker gets disconnected, if there is at least one open page,
 * and more importantly when the amplifier is muted. Monitor when it gets disconnected
 * by an external event, i.e the speaker disconnects by itself.
 * Note: it notyfies only a disconnect of the speaker
 * This monitor starts at boot time.
 * There can only be one speaker connected by Bluetooth, it is always trusted.
 * 'state' and 'oldState' can be a BD-address or "".
 * Key triggers to monitor:
 *  - there is at least one open page,
 *  - the alsa is muted = a speaker is connected
 * Then check if the speaker is still connected, if not notify ctl.
 * @param  {integer}    interval, is set to watcherInterval as a default (2 sec)
 * @return {?}          of no interest
 */
async function monitorBluetoothSpeaker(interval = watcherInterval) {
    let state = await mod.theConnectedBluetoothSink();
    let oldState = "";
    interval = interval * 2.2;     //the interval is streached to about 4 seconds
    //console.log(aux.timeStamp(), "detect: bt speaker connection monitor is READY [ <| ]");
    //Monitor loop:
    bluetoothSpeakerWatcher = setInterval(async function () {
                if ((await mod.areOpenPages() == true) &&
                    (await alsa.isAmpMuted()  == true))
                {
                    state = await mod.theConnectedBluetoothSink();
                    //console.log(aux.timeStamp(), "detect: speaker monitor RUNS =", state, "old state:", oldState);
                    oldState = state;
                    if ((oldState == state) && (state == "")) {
                        //there is a disconnect of the speaker!
                        //console.log(aux.timeStamp(), "detect: speaker external DISCONNECT");
                        await ctl.speakerGotDisconnected(oldState);
                    };
                };
            }, interval);
            //... end of monitor loop
};
/**Monitor if any of the trusted, but not connected, speakers reconnects automatically.
 * That happens when a trusted speaker is turned on. Can happen any time.
 * This monitor starts at boot.
 * Note: the monitor is solely used when there are trusted speakers.
 * Key triggers to monitor:
 *  - there is at least one open page,
 *  - there are at least one trusted speaker
 *  - the amplifier is unmuted (critical criteria)
 * Then if there is a speaker connected - it must have been reconnected by itself.
 * @param  {integer}    interval, is set to watcherInterval as a default (2 sec)
 * @return {?}          of no interest
 */
async function monitorTrustedSpeakers(interval = watcherInterval) {
    interval = interval * 2.5; //the interval is streached to about 5 seconds
    //console.log(aux.timeStamp(), "detect: trusted speaker monitor STARTS");
    trustedSpeakersWatcher = setInterval(async function () {
        if ((await mod.areOpenPages() == true) &&
            (await mod.trustedOnlyBluetoothSpeakers() !== "") &&
            (await alsa.isAmpMuted() == false)) {
            let bdAddr = await mod.theConnectedBluetoothSink();
            //console.log(aux.timeStamp(), "detect: trusted speaker monitor RUNS, bdAddr =", bdAddr, "expect empty...");
            if (bdAddr.length > 0) {
                //the amplifier is muted - but there is a speaker connected!
                //notify ctl
                //console.log(aux.timeStamp(), "detect: trusted speaker CONNECTED, bdAddr:", bdAddr, "[CHANGE]");
                await ctl.speakerGotReconnected(bdAddr);
            };
        };
    }, interval);
};
    


/**Monitor the status of connected bluetooth source device, if there is at least one open page
 * There can be one or up to seven connected devices like phones.
 * Two arrays have to be compared. The problem is that each array element is an objects like: 
 * {bdAddr: "FC:58:FA:1B:06:66", name: "JVC HA-S22W"} and the bdAddr key values from each
 * array have to be compared with all the oter bdAddrs. In addition, there is no given order.
 * * 'stateArray'is an array, 'oldStateString' is a string of BD-addresses.
 * @param  {integer}    interval, is watcherInterval as a default (2 sec)
 * @return {?}          of no interest
 */
async function monitorSourceDevices(interval = watcherInterval) {
    let stateArray = await mod.connectedBluetoothSourcesNames();
    let oldStateString = "";
    for (let i = 0; i < stateArray.length; i++) {
        oldStateString = oldStateString + stateArray[i].bdAddr
    };
    interval = interval + 3000;     //every fifth second when page is open
    //console.log(aux.timeStamp(), "detect: bt SOURCE devices array at boot     =", stateArray);
    //console.log(aux.timeStamp(), "detect: bt SOURCE old bdAddr string at boot =", oldStateString);
    bluetoothDeviceWatcher = setInterval(async function () {
        if (await mod.areOpenPages() === true) {
            stateArray = await mod.connectedBluetoothSourcesNames();
            if (stateArray.length > 0) {
                oldStateString = checkConnectedDevices(stateArray, oldStateString)
            }
            else {
                oldStateString = noConnectedDevices(oldStateString)
            };
        };
    }, interval);

};
/**Helper to the monitorSourceDevices() when there is no connected source devices in the stateArray
 * it is empty []. Check if oldStateString is empty too, "". It might consists  the previous
 * known BD-address, like: "FC:58:FA:B8:F6:14FC:58:FA:1B:06:66FC:58:FA:1B:06:66"
 * If stateArray and oldStateString are empty - the oldStateString is returned. No change detected.
 * If oldStateString is not empty    - mod.newDeviceStatus() is called for render. The new oldStateString is
 * set to "" and returned.
 * @param  {string}   oldStateString, "<BD-address>,..." or ""
 * @return {string}   oldStatestring  ""
 */
function noConnectedDevices(oldStateString) {
    if (oldStateString !== "") {
        //console.log(aux.timeStamp(), "detect: NO bluetooth sources connected:", [], "[CHANGE]");
        mod.newDeviceStatus([]);
        oldStateString = "";
    }
    return oldStateString;
};
/**Helper to the monitorSourceDevices() when there are connected source devices in the stateArray
 * and their BD-addresses need to be compared with the oldStateString that might consists of the 
 * previous known BD-address, like: "FC:58:FA:B8:F6:14FC:58:FA:1B:06:66FC:58:FA:1B:06:66" or empty ""
 * If there are no changes - the oldStateString is returned.
 * If there is a change    - mod.newDeviceStatus() is called for render. The new oldStateString is
 * updated and returned.
 * @param  {array}    stateArray,     [{bdAddr: "<BD-address>"", name: "<name>""},...]
 * @param  {string}   oldStateString, "<BD-address>,..." or ""
 * @return {string}   oldStatestring  "<BD-address>,..."
 */
function checkConnectedDevices(stateArray, oldStateString) {
    const arrayLength = stateArray.length;
    for (let i = 0; i < arrayLength; i++) {
        if (oldStateString.indexOf(stateArray[i].bdAddr) === -1) {
            //A. at least one new BD-address is detected
            //console.log(aux.timeStamp(), "detect: new bluetooth sources:", stateArray[i].bdAddr, "[CHANGE]");
            mod.newDeviceStatus(stateArray); 
            //Update oldStateString with BD-address(es)
            for (let j = 0; j < arrayLength; j++) {
                oldStateString = oldStateString + stateArray[j].bdAddr;
            };
            i = arrayLength;
        };
        //B. loop continues...
    };
    return oldStateString;
};
//_______________________________________________________________________________________
//..........................................................Wireless: AP, Wi-Fi and Wired
//Start Page is used for:
//  a) disconnect Wi - Fi                           [button + external]
//  b) stop AP                                      [button]
//  c) wired acces or not                           [external] see below for monitor
//Network page is used for:
//  d) connect / disconnect Wi-Fi                   [button + external]
//  e) start / stop AP                              [button]
//  f) wired acces or not                           [external] - same as c)
//Buttons should be caught in streamer-view.js Protocol P2.
//All external events needs to be detected when at least one page is open

function monitorWiFi() {
    //did not happen
};
//_______________________________________________________________________________________
//.....................................................................Wired and Internet
//Start page is used for:
//  a) wired acces or not                           [external] - also Network page
//  b) Internet access                              [external]
/**Watch the LAN port for cable attach or detach, if there is at least one open page
 * The file '/sys/class/net/eth0/carrier' stores the status of the lan port.
 * If "1" the cable is physically connected, if "0" no cable in lan port.
 * This function instead directly calls mod.wiredStatus()
 * Format: "<ip addr> or "
 * Global variable watcherInterval is used.
 * @param  {integer}    interval, is set to watcherInterval as a default (2 sec)?
 * @return {?}          of no interest
 */
async function pollWiredStatus(interval = watcherInterval) {
    let state = await mod.wiredStatus()
    let oldState = state;
    interval = interval + 3000;     //every fifth second when page is open
    //console.log(aux.timeStamp(), "detect: LAN cable status at boot =", state);
    lanWatcher = setInterval(async function () {
        if (await mod.areOpenPages() === true) {
            state = await mod.wiredStatus();
            //console.log(aux.timeStamp(), "detect: timer [0] with wired check loop runs [", state, "]");
                if (state !== oldState) {
                //console.log(aux.timeStamp(), "detect: Ethernet LAN cable status", state, "[CHANGE]");
                    mod.newWiredStatus(state);  //will render the Wired frame...
                    oldState = state;
            };
        }; 
    }, interval);
};
//........................................................................Internet access
/**Watch for changes of the Internet access, if there is at least one open page!
 * Format: "connected" or "disconnected"
 * Global variable watcherInterval is used but prolonged to be minutes
 * @param  {integer}    interval, is set to watcherInterval as a default (2 sec)?
 * @return {?}          of no interest
 */
async function pollInternetStatus(interval = watcherInterval) {
    let state = await mod.internetStatus()
    let oldState = state;
    interval = interval * 100; //do not check too often, about 7.8 minutes interval... factor 200
    console.log(aux.timeStamp(), "detect: Internet access at boot =", state);
    internetWatcher = setInterval(async function () {
        if (await mod.areOpenPages() === true) {
            state = await mod.internetStatus();
            //console.log(aux.timeStamp(), "detect: timer [0] with Internet check loop runs [", state,"]");
            if (state !== oldState) {
                mod.newInternetStatus(state);   //will render the Internet frame...
                oldState = state;
            };
        };
    }, interval);
};
//_______________________________________________________________________________________------[Bluetooth]------
//Detect management of Bluetooth Streaming ==============================================
//...............................................[detect all kind of Bluetooth streaming]
//                          ~ This is a special case ~
//                            ... it is awful
//Always running==========================================[bluetooth streaming detection]
//=======================================================================================
//High level detect.....................[bluetooth streaming written to streamsensor.log]
/**Detect all bluetooth streaming - watcher for patterns that bluetooth is     Timer: [1]
 * streaming to Streamer, and/or streaming bluetooth to the connected bluetoth speaker.
 * The audio streaming is done by the bluealsa-aplay.service, to amplifier or to the 
 * connected bluetooth speaker.
 * All findings are eventually written to the file: '/var/log/streamsensor.log'
 * Bluetooth streaming to analogous speakers or the connected bluetooth speaker are caught.
 * As long as the bluetooth service is on and not blocked by 'rfkill' then:
 * Step 1. If amp is unmuted: find out if alsa is used by bluealsa-aplay.service
 * Step 2. If amp is muted: find out if Bluetooth is streaming to the connected
 *         bluetooth speaker.
 *      'detectAlsaBluetoothStreaming()'   checks the alsa.
 *      'detectBluetoohSpeakerStreaming()' checks the connected bluetooth speaker.
 * Both functions writes to file '/var/log/streamsensor.log'
 * 'bluetoothDetect()' continously writes the names of open file file descriptors used  
 * for streaming to the connected bluetooth speaker, to file /var/log/bluetoothdetect.log'
 * using the script: ./fdinfobluealsa.sh with <bluealsa pid> as an argument.
 * Note: streaming to the connected bluetooth speaker can be done by any service
 * not only bluetooth streaming from a phone.
 * @param  {integer}        interval, btLoopInterval is 2,75 seconds
 * @global {btLoopTimer}    holds pointer to timer
 * @return {object}         timer
 */
async function bluetoothLoop(interval = btLoopInterval) {
    //console.log(aux.timeStamp(),"bt loops: timer [1] step 1 & step 2 starts");
    let oldAlsaBin = "";            //start value
    let oldBtString = "idle";       //start value
    //Loop with btLoopTimer [1] if Bluetoot service is up...
    btLoopTimer = setInterval(async function () {
        if (await mod.bluetoothStatus() == "yes") {
            //console.log(aux.timeStamp(), "bt loops: timer [1] step 1 and step 2 running [++]");
    //Step 1: detect if bluetooth is using alsa for streaming (loop starts here)
            oldAlsaBin = await detectAlsaBluetoothStreaming(oldAlsaBin);

    //Step 2: detect if bt speaker is used by bluetooth (loop continues)
            oldBtString = await detectBluetoohSpeakerStreaming(oldBtString); 
        };
     }, interval);    // execute time interval in ms, pretty tight and often;  timer [1]
    btLoopTimer;
};
//Low level detections of patterns of bluetooth streaming::::::::::::::::::::::::::::::::::::::::btLoopTimer
/**Detect bluetooth streaming to alsa - if amplifier is unmuted..................................[alsa LOOP]                          
 * This function is LOOPED and only used for analogous speakers, not Bluetooth speaker.
 * If the amplifier is muted then the streamer is connected to a Bluetooth speaker
 * which means that this function stops immediately, no further checking...
 * But if the amplifier is unmuted the loop continues if the Streamer is idle or streams bluetooth.
 * It analyzes if alsa is used by the bluealsa-aplay.service (i.e. a phone streaming)
 * A) Find if a pid uses the alsa: [amplifier with analogue speakers]
 *    `cat /proc/asound/card0/pcm0p/sub0/status | grep  owner_pid | awk '{print $3}' | tr -d "\n" `
 * B) Find if Bluetooth is streaming to analogue speakers:
 * 'sudo pmap -q -A ffff1000,ffff1100 <pid> | cut -d'-' -f1 | awk '{print $2}' | tr -d "\n" '
 * This function writes its findings to the file: /var/log/streamsensor.log
 * Note: there might be timing issues
 *  'pmap -q -A ffff1000,ffff1100 <pid'                              [~35 ms]
 *  'cat /proc/asound/card0/pcm0p/sub0/status | fgrep  owner_pid...' [~22 ms]
 * @param   {string}        oldBin, path to previous bin file running alsa or ""
 * @global  {string}        whatStreams, idle, spotify, airplay or bluetooth
 * @return  {string}        path to most recent bin file running alsa or ""
 */
 async function detectAlsaBluetoothStreaming(oldBin) {
     const btBin = "/usr/bin/bluealsa"; //the bin file we are looking for
     let alsaBin = "";                  //the bin file running the alsa
     let alsaPid = "";                  //the pid that has the alsa, not alsa itself
     //When at least one phone is connected and amp is unmuted, streamer is idle or streaming bluetooth: 
     //do the alsa check loop A to B below...
     if ((await mod.areConnectedBluetoothSources() === true) &&
         (await alsa.isAmpMuted() === false) && 
         ((whatStreams == "idle") || (whatStreams == "bluetooth"))) {
         //console.log(aux.timeStamp(), "bt alsa: timer [1] with alsa loop runs [+]");
         try {
             alsaPid = execSync(
                 `sudo cat /proc/asound/card0/pcm0p/sub0/status | grep  owner_pid | awk '{print $3}' | tr -d "\n" `,
                 { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
             //console.log(aux.timeStamp(), "bt alsa: is alsa used by a process, alsa pid = ", alsaPid);
         }
         catch (err) {
             console.log(aux.timeStamp(), "bt alsa: alsa pid file read ERROR ", err);
             alsaPid = "";
             oldAlsaBin = "";
         };
         if (alsaPid == "") {
    //A. alsa is CLOSED - there is no pid, alsa is idle, check if alsa just stopped or not
             //console.log(aux.timeStamp(), "bt alsa: alsa must be closed [X]");
             if (btBin !== oldBin) {
    //A1. NO CHANGE - still idle, alsa was already closed - no action, all well...
                //NO ACTION!...                                         [LOOP END]----
             }
             else {
    //A2. CHANGE to CLOSED - alsa became idle after bluetooth streaming, no pid
                 //console.log(aux.timeStamp(), "bt alsa: CHANGED to NO alsa process, oldBin:", oldBin, "--> reset");
                 oldBin = "";
    //*** Write to /var/log/streamsensor.log that bluetooth streaming stopped
                 try {
                     exec(`sudo echo "btst:stop" > /var/log/streamsensor.log `,
                         { uid: 1000, gid: 1000, encoding: 'utf8' });
                     //console.log(aux.timeStamp(), "bt alsa: btst:stop written  [btst:stop]");
                 }
                 catch (err) {
                     console.log(aux.timeStamp(), "bt alsa: write failed ERROR \n ", err);
                     await aux.remountSSD();
                     exec(`sudo echo "btst:stop" > /var/log/streamsensor.log `,
                         { uid: 1000, gid: 1000, encoding: 'utf8' });
                 };
                 //alsa is not used anymore                              [LOOP END]----
             };
         }
         else {
             //console.log(aux.timeStamp(), "bt alsa: alsa must be open >", alsaPid);
     //B. alsa is OPEN, there is a pid RUNNING alsa - get the bin file name
             try {
                 alsaBin = execSync(
                     `sudo pmap -q -A ffff1000,ffff1100 ${alsaPid} | cut -d'-' -f1 |  awk '{print $2}' | tr -d "\n" `,
                     { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
             }
             catch (err) {
                 console.log(aux.timeStamp(), "bt alsa: pmap read ERROR ", err);
                 alsaBin = "";
                 oldBin = "";
             };

             //console.log(aux.timeStamp(), "bt alsa: /usr/bin/bluealsa equals alsaBin =", alsaBin, "?");
             //console.log(aux.timeStamp(), "bt alsa: /usr/bin/bluealsa equals oldBin  =", oldBin, "?");
             if (alsaBin.indexOf("/bin/bluealsa") == -1) {
                 //if (btBin != alsaBin) {
     //B1. NO CHANGE - it was NOT /usr/bin/bluealsa-aplay pid running alsa
                 //console.log(aux.timeStamp(), "bt alsa: /usr/bin/bluealsa do not equals alsaBin?     alsaBin =", alsaBin);
                 oldBin = alsaBin;
                 //NO ACTION!...                                         [LOOP END]----
             }
             else {
                 if (oldBin.indexOf("/bin/bluealsa") == -1) {
                     //if (btBin != oldBin) {
     //B2. CHANGE bluealsa-aplay started to use alsa - STREAMING STARTED...
                     oldBin = alsaBin;
                     //console.log(aux.timeStamp(), "bt alsa:", alsaPid, "got the alsa, a|", alsaBin, "[CHANGE]");
                     //console.log(aux.timeStamp(), "bt alsa: value of new oldBin|", oldBin, "         [CHANGE]");
                     //****Write to /var/log/streamsensor.log that bluetooth streaming STARTED
                     try {
                         exec(`sudo echo "btst:start" > /var/log/streamsensor.log `,
                             { uid: 1000, gid: 1000, encoding: 'utf8' });
                         //console.log(aux.timeStamp(), "bt alsa: btst:start written  [btst:start]");
                     }
                     catch (err) {
                         console.log(aux.timeStamp(), "bt alsa: write file failed ERROR \n ", err);
                         await aux.remountSSD();
                         exec(`sudo echo "btst:start" > /var/log/streamsensor.log `,
                             { uid: 1000, gid: 1000, encoding: 'utf8' });
                         
                     };
                     //alsa is used by btPid!                              [LOOP END]----
                 };          //alsa is OPEN - ends when btPis is not the oldPid -> bt streaming started B2
             };              //alsa is OPEN - ends when btPid = alsaPid, btPid has the alsa, continue to stream B1
         };
     };         //alsa is OPEN - ends when there the pid is checked B1 or B2
     return oldBin;
};
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::btLoopTimer
/**Detect  bluetooth streaming to the connected bluetooth speaker....................[bluetooth speaker LOOP]
 * This function is LOOPED and only used for the connected Bluetooth speaker, not analogous speakers
 * The paths of open files defined by file descriptors (fd) are analyzed
 * for the process of bluealsa-aplay service. Function is used only if alsa is closed!
 * The file '/var/log/bluetoothdetect.log' contains the file paths and they are
 * put into 'btString' as a string. That rather long string (btString) of 185 characters 
 * is analyzed in this function.
 * The key thing is the number of open files, when idle there are five or seven fds
 * (seven fds when a source device is connected) and when audio is streamed to the 
 * bluetooth speaker there are 11 fds. If streaming is going on btString is set to stream, 
 * otherwise set to idle.
 *  A. No streaming going on, but has it just stopped or is it idle for good?
 *  B. Streaming is going on, has it just started or is it on-going?
 * This function writes 'btst:stop' or 'btst:start' to the file: /var/log/streamsensor.log
 * depending on the answer to question A. and B.
 * Note: streaming to the connected bluetooth speaker can be done by any service
 * not only bluetooth streaming from a phone; that is why the amplifier is checked.
 * Note: bluetoothDetect() below continously writes the paths of open files fds.
 * @param  {string}         oldString, "idle" or "stream"
 * @return {string}         the current value of the btString
 */
async function detectBluetoohSpeakerStreaming(oldString) {
    let btString =  oldString;  //bt speaker streaming current value [/var/log/bluetoothdetect.log]
    //When amplifier is muted, streamer is idle or streaming bluetooth: do the speaker check loop A to B below.....
    if ((await alsa.isAmpMuted() === true)  &&
        ((whatStreams == "idle") || (whatStreams == "bluetooth"))) {
        let fsString = "";  //the string of fd's to be analyzed
   //Read part ...sync and read the value of /var/log/bluetoothdetect.log
        try {
            execSync(`sudo sync -d /var/log/bluetoothdetect.log`,
                     { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
            //fsString = aux.mpdMsgTrim(fs.readFileSync('/var/log/bluetoothdetect.log', 'utf8'));
            fsString = fs.readFileSync('/var/log/bluetoothdetect.log', 'utf8');
           
            if (fsString == "") {
            //fsString might be "", which is not a valid value, wait for next read
            };
        }
        catch (err) {
            btString = "idle";    //initial value written at boot
            oldString = "idle";
        };
    //Analayse part... are there less than 11 fds? if so NO audio is streamed to the speaker
        let counter = -1;   //-1 gets rid of an extra '\n' at the end of fsString

        //The number of fds are defined by counting the number of line breaks '\n'
        for (let i = 0, strLength = fsString.length; i < strLength; ++i) {
                if (fsString[i] == "\n") {
                    ++counter;
                };
        };
       
        //depending on the number of fds set btString to 'idle' or 'stream'
        if (counter < 11) {
            btString = "idle";          //less then 11 fds --> idle
        }
        else {
            btString = "stream";       //more than 10 fds --> streaming
        };
        //console.log(aux.timeStamp(), "bt spkr:", counter, "[fds] --", btString, "versus old--", oldString);

    //A. there is NO sound streaming to bt speakers, but has it just stopped or is it idle for good?
        if (btString == "idle") {
            if (btString === oldString) {
    //A1. NO CHANGE - bt speaker still IDLE
            //NO ACTION!...                                         [LOOP END]----
        }
        else {
    //A2. CHANGE to NO STREAMING - bt speaker are NOT used anymore
            oldString = btString;
    //*** Write to /var/log/streamsensor.log that bluetooth streaming stopped
            try {
                exec(`sudo echo "btst:stop" > /var/log/streamsensor.log `,
                    { uid: 1000, gid: 1000, encoding: 'utf8' });
                //console.log(aux.timeStamp(), "bt spkr: btst:stop written for bt speaker  [btst:stop]");
            }
            catch (err) {
                console.log(aux.timeStamp(), "bt spkr: write failed ERROR \n ", err);
                await aux.remountSSD();
                exec(`sudo echo "btst:stop" > /var/log/streamsensor.log `,
                    { uid: 1000, gid: 1000, encoding: 'utf8' });
            };
            //bt speaker is not used anymore, STOP                  [LOOP END]----
        };
    }
    else {
    //B. bt speaker is used, STREAMING. There are more than 10 fds.
    //   But has it just started or is streaming on-going?
        if (btString === oldString) {
    //B1. NO CHANGE - stream on...
            //bt speaker still used, it is streaming...             [LOOP END]----
        }
        else {
    //B2. CHANGE bt speaker has just STARTED to be used
            oldString = btString;
    //****Write to /var/log/streamsensor.log that bluetooth streaming STARTED
            try {
                exec(`sudo echo "btst:start" > /var/log/streamsensor.log `,
                    { uid: 1000, gid: 1000, encoding: 'utf8' });
                //console.log(aux.timeStamp(), "bt spkr: btst:start written for bt speaker  [btst:start]");
            }
            catch (err) {
                console.log(aux.timeStamp(), "bt spkr: write failed ERROR \n ", err);
                await aux.remountSSD();
                exec(`sudo echo "btst:start" > /var/log/streamsensor.log `,
                    { uid: 1000, gid: 1000, encoding: 'utf8' });
                };
            };  //ends when btString != oldString, bt speaker just got the audio stream
        };      //ends when btString == oldstring, bt speaker is in use and streaming...
    };
    return oldString;
};
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::btDetectTimer
//Low level fd write....................................[blues-alsa streaming written to bluetoothdetect.log]
/** Detect bluetooth streaming - writes all open file paths of              Timer: [2]
 * bluealsa-aplay in order for detectBluetoohSpeakerStreaming() to detect streaming to
 * the connected bluetooth speaker.
 * It makes the paths of open files defined by file descriptors (fd) for
 * the process of bluealsa-aplay service to be written to /var/log/bluetoothdetect.log'.
 * How to find out if Bluetooth is streaming to the connected blutooth speaker:
 * Get the bluealsa-aplay pid, find it quickly: [under 50 ms]
 *  'systemctl status bluealsa-aplay | grep  "Main PID:" | cut -d' ' -f6  | tr -d "\n" '
 * Note the 'btPid' is not constant - it changes at boot, it changes to/from
 * bt speaker or at restarts, all makes the btPid to change.
 * Given the btPid, continously write the file paths of the file desriptors in
 *  /proc/<btPid>/fd', that is done by the script '/streamer/fdinfobluesalsa.sh,
 * The CLI 'readlink <fd>' is used by the script, 8 ms per fd.
 *    readlink 'my_symlink'  prints the path to which my_symlink points...
 * The CLI 'lsof -p <pid>' can be used for analyze - but not in code.
 * @param {integer}           interval, in ms, btDetectInterval =
 * @global {btDetectTimer}    holds pointer to timer
 * @return {object}           timer
 */
function bluetoothDetect(interval = btDetectInterval) {
  //A. Start up of low level Bluetooth file descriptor writes of bluealsa-aplay
  let btPid = "";
  //console.log(aux.timeStamp(),"bt fd:   timer [2] started loop, writing...");
  exec(`echo "idle" > /var/log/bluetoothdetect.log`,
                 {uid: 1000, gid: 1000, encoding: 'utf8'});
  //B. Loop: given btPid, continously write the fds of open files to bluetoothdetect.log
    btDetectTimer = setInterval(async function () {
        //When amplifier is muted, streamer is idle or streaming bluetooth: write paths to file.....
        if ((await alsa.isAmpMuted() === true) &&
            ((whatStreams == "idle") || (whatStreams == "bluetooth"))) {
            //console.log(aux.timeStamp(), "bt fd: timer [2] with writing paths runs [+]");
            try {
                btPid = (execSync(`sudo systemctl status bluealsa-aplay | grep  "Main PID:" | cut -d' ' -f6  | tr -d "\n" `,
                                       { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 }));
                //console.log(aux.timeStamp(), "bt fd: timer [2]: polled aplay pid =", btPid);
            }
            catch (err) {
                console.log(aux.timeStamp(), "detect: pid ERROR", err);
                await aux.remountSSD();
                btPid = (execSync(`sudo systemctl status bluealsa-aplay | grep  "Main PID:" | cut -d' ' -f6  | tr -d "\n" `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 }));
            };
            //writes the fds of open bluealsa-aplay file paths into file /var/log/bluetoothdetect.log`,
            exec(`sudo /streamer/fdinfobluesalsa.sh ${btPid}`,
                            { uid: 1000, gid: 1000, encoding: 'utf8' });
        };
    }, interval);
    return btDetectTimer;
};

//________________________________________________________________________________________________ [restarts]
 /**Restart the detector for bluetooth streaming to bluetooth speakers.
  * Called at connect/disconnect, reconnect, but also at boot.
  * Check out: 'ctl.restartBluealsaAplay()' -- THIS SEEMS LIKE IT IS NOT NEEDED ANYMORE
  * @return {boolean}       true
  */
 async function restartBluetoothDetect() {
   if (btDetectTimer !== false)  {
     clearInterval(btDetectTimer);
    // console.log(aux.timeStamp(),'bt fd: restart  timer: [2] - bt timer cleared [X]');
   };
     await bluetoothDetect();
     //console.log(aux.timeStamp(),'bt fd: RESTART of bt detect loop         -> -> ->');
   return true;
 };

//BOOT ================================================================================
//.................................................................preparations at BOOT
//-------------------------------------------------------------------------------------
/** Called by machine at boot - clears log files
 * @return {?}        of no interest
 */
async function loopCtlBootPreparations() {
  await resetLogFile("/var/log/streamsensor.log", "idle:stop");
  await resetLogFile("/var/log/bluetoothdetect.log", "idle");
  //console.log(aux.timeStamp(),"detect ctl: log files reset");
};
/** Called by loopCtlBootPreparations() - erases a file
 * @param {string}    path file path
 * @return {?}        of no interest
 */
async function resetLogFile(path, initString) {
  try {   //Confirm that the log file is in place
    execSync(`sudo touch  ${path} && sudo chmod 0777 ${path} && sudo echo ${initString} >  ${path}`,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000});
  }
  catch (err) { //ERROR: If error try again...
      console.log(aux.timeStamp(), 'detect: log file reset ERROR:,', path, "\n", err);
    await aux.remountSSD();
    await touchError(path);
    await echoError(path, initString);
  };
};
//helper to above when things go wrong, removes and creates the files
async function touchError(path) {
  let outcome = false;
  try {
    execSync(`sudo rm -f ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000});
    execSync(`sudo sleep 2`,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000});
    execSync(`sudo touch  ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
    execSync(`sudo chmod 0777 ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000});
    outcome = true;
  }
  catch (err) {
      console.log(aux.timeStamp(), 'detect: FATAL FILE ERROR [touch],', path, "\n", err);
      await aux.remountSSD();
  };
  return outcome;
};
//Helper to above when things go wrong, tries to write aswell
async function echoError(path, initString) {
  let outcome = false;
  try {
    execSync(`sudo rm -f ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000});
    execSync(`sudo sleep 2`,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000});
    execSync(`sudo touch  ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
    execSync(`sudo chmod 0777 ${path} `,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000});
    execSync(`sudo echo ${initString} >  ${path}`,
                    {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
    outcome = true;
  }
  catch (err) {
      console.log(aux.timeStamp(), 'detect: FATAL FILE ERROR [echo],', path, "\n", err);
      await aux.remountSSD();
  };
  return outcome;
};
///.....................................................preparations during BOOT
/**Bluetooth detection has always to be running...
 *It will monitor changes of Bluetooth streaming.
 * @return {boolean}      true
 */
async function startBluetoothDetect() {
    //console.log(aux.timeStamp(), "ctl:       ...[START detecting Bluetooth streaming]");
    //A. detection of bt audio stream to speakers has to be has to be started first [1]
    await bluetoothDetect();
    //B. bt audio streamed to Streamer starts a little bit delayed                  [2]
    await bluetoothLoop();
    return true;
};


/** Stop watching all the files for changes in service states. 
 * Used when a streaming service stopped or there is no start pages connected.
 * @return {boolean}       true
 */
async function stopBluetoothDetect() {
    clearInterval(btDetectTimer);        //                                    stop [2]
    clearInterval(btLoopTimer);          //                                    stop [1]
    return true;
};