//Copyright 2025 by Retro Audiophile Designs
//GNU General Public License v3.0 or later see license.txt            [Source code]
//                      ~ machine - data model ~
const RAD_SYSTEM_VERSION = "5.128 [open source]";   //official version
const RAD_SOUND_CARD = "Raspberry Pi DigiAMP+"

const fs = require('fs');                                           //for reading files
//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

const exec = require('child_process').exec;         //for OS cmds
const execSync = require('child_process').execSync; //for synced OS cmds
const ctl = require('/streamer/streamer-control.js');
const view = require('/streamer/streamer-view.js');
const { mpdMsgTrim } = require('/streamer/lib/machine-auxiliary');  //make no sense...
const aux = require('/streamer/lib/machine-auxiliary.js');          //all the utils
const detect = require('/streamer/lib/streamer-detect.js');   //detect functions for model
const nwork = require('/streamer/lib/streamer-network.js');    //detect functions for model
const alsa = require('/streamer/lib/streamer-alsa.js');       //all about alsa management



module.exports.getIo = getIo;
module.exports.getVersion = getVersion;

//------------------------------------------------------------------Detect states
module.exports.newStreamingStatus = newStreamingStatus;
module.exports.newWiredStatus = newWiredStatus;
module.exports.newInternetStatus = newInternetStatus;
module.exports.newSpeakerStatus = newSpeakerStatus;
module.exports.newDeviceStatus = newDeviceStatus;

//---------------------------------------------------------------------Read states
module.exports.getStreamingStatus = getStreamingStatus;
module.exports.getVolume = getVolume;
module.exports.bluetoothStatus = bluetoothStatus;
module.exports.bluetoothSpeakerName = bluetoothSpeakerName;
module.exports.wirelessStatus = wirelessStatus;
module.exports.accesspointStatus = accesspointStatus;
module.exports.wiredStatus = wiredStatus;
module.exports.internetStatus = internetStatus;
module.exports.trustedOnlyBluetoothSpeakers = trustedOnlyBluetoothSpeakers
module.exports.connectedBluetoothSourcesNames = connectedBluetoothSourcesNames;
module.exports.pairedOnlyBluetoothSources = pairedOnlyBluetoothSources;
//-----------------------------------------------------------------Internal states
module.exports.isOpenStartPage = isOpenStartPage;
module.exports.areOpenPages = areOpenPages;
module.exports.areConnectedBluetoothSources = areConnectedBluetoothSources;
module.exports.theConnectedBluetoothSink = theConnectedBluetoothSink;
//---------------------------------------------------------------------------About
module.exports.aboutTimeandVersions = aboutTimeandVersions;
module.exports.aboutMemoryUsage = aboutMemoryUsage;
module.exports.aboutRAMUsage = aboutRAMUsage;
module.exports.aboutStreamingServices = aboutStreamingServices;
module.exports.aboutAmplifier = aboutAmplifier;
module.exports.aboutConnections = aboutConnections;
module.exports.aboutHardware = aboutHardware;
//-----------------------------------------------------------About internal states
module.exports.internalStates = internalStates;
module.exports.internalErrors = internalErrors;
//------------------------------------------------------------------------ Helpers
module.exports.readServicePid = readServicePid;


//Global variables
io = false;

function getIo(ioObject) {
    io = ioObject;
};

/** Returns the version of this software.
 * @return {string}      current version
 */
function getVersion() {
    return RAD_SYSTEM_VERSION;
};

//____________________________________________________________________________________
//[M] MODEL definition ========================================================= MODEL
//The model of Streamer is kept as close as possible to Raspberry Pi OS (Linux).
//Most model states are calls to Linux console and the result in stdout (or stderr
//in some cases) is interpreted, set and the state is returned.
//Many states of the model just needed to be read. Some state changes are external
//events like a user starts streaming Spotify on the their phone, or connects via
//Bluetooth,... these changes has to detected.
//
//Definition of Model states:_______________________________________________________
// Start Page:
//   [State of streaming services:  Idle, Spotify, Bluetooth, Airplay : detect/read]
//   [State of Streamer volume:     0-100%                            : read       ]
//   [State of Bluetooth service:   yes or no                         : read       ]
//   [State of Bluetooth speaker:   name or ""                        : read       ]
//   [State of Wi-FI:               {ssid, ip-addr} or {}             : read       ]
//   [State of AP:                  up or down                        : read       ]
//   [State of LAN connection:      IP address or ""                  : detect/read]
//   [State of Internet:            access or ""                      : detect/read]
// Bluetooth Page:
//   [State of Bluetooth service:   yes or no                         : read       ]
//   [State of connected  speaker:  name or ""                        : read       ]
//   [State of paired speakers:     {speaker, speaker,...} or {}      : detect/read]
//   [State of connected devices:   {device, device,...} or {}        : detect/read]
// Network Page:
//   [State of Wi-FI:               {ssid, ip-addr} or {}             : read       ]
//   [State of AP:                  up or down                        : read       ]
//   [State of LAN connection:      IP address or ""                  : detect/read]
// Settings Page:
// Internal states (not shown on web pages):
//   [are there at all any web pages open                             : read     ]
//   [are there at all any bluetooth devices connected                : read     ]

//______________________________________________________________________________________
//==================================================================DETECT changed state
//.............[State of streaming services CHANGED:  Idle, Spotify, Bluetooth, Airplay]
/** When the state has changed detected by is startpage.pollStreamingStatus() 
 * The status format is: 'idle:stop', '<service>:start', '<service>:stop'
 * '<service>:stop' means CHANGE to idle state.
 * idle:stop means that nothing has been streamed so far, or reset.
 * @param  {newState}     newState, idle:stop, <service>:start, <service>:stop
 * @return {?}            of no interest
 */
function newStreamingStatus(newState) {
    //console.log(aux.timeStamp(), "mod: incoming new state [", newState, "]");
    switch (newState) { 
        case "spot:stop":
            ctl.stoppedStreaming("spotify");
            view.streamingUpdate("idle");
            break;
        case "spot:start":
            ctl.startedStreaming("spotify")
            view.streamingUpdate("spotify");
            break;
        case "airp:stop":
            ctl.stoppedStreaming("airplay");
            view.streamingUpdate("idle");
            break;
        case "airp:start":
            ctl.startedStreaming("airplay")
            view.streamingUpdate("airplay");
            break;
        case "btst:stop":
            ctl.stoppedStreaming("bluetooth");
            view.streamingUpdate("idle");
            break;
        case "btst:start":
            ctl.startedStreaming("bluetooth")
            view.streamingUpdate("bluetooth");
            break;
        case "idle:stop":    //bluetooth was turned off while streaming       
            view.streamingUpdate("idle");
            ctl.restartAllStreaming();
        case "":
            //"", empty string, is not a valid value, wait for next read
            break;
        default:
            detect.stopStreamsensor();    //writes "idle:stop" on file!
            ctl.restartAllStreaming();
            view.streamingUpdate("idle");
            break;
    };
};
//..................................[State of LAN connection CHANGED:  IP address or ""]
/**When the state has changed detected by is detect.pollWiredStatus() and the new state       
 * is sent to view. No need for a lock up. The status format is: "ip address" or ""
 * @return {string}    <ip address> or ""
 */
function newWiredStatus(state) {
    //console.log(aux.timeStamp(), "mod NEW:  wired status", state, "[LAN cable or empty]");
    view.wiredUpdate(state);
};
//.......................[State of Internet access CHANGED:  connected or disconnected]
/**When the state has changed detected by  detect.pollInternetStatus(). The new state        
 * is sent to view, no need to check again, The status format is: "connected"" or "disconnected"
 * @return {string}    connected or disconnected
 */
function newInternetStatus(state) {
    view.internetUpdate(state)
};
//..............................[State of bluetooth devices CHANGED:  sources and sinks]
//---------------------------------------------------------------------Bluetooth speaker
/**When the state has changed detected by is detect.monitorBluetoothSpeaker(). The new        
 * state is sent from ctl. The status format is: "<bd-addr>" or "" as well.
 * Note: connects/disconnects often effects the trusted speakers as well - render them too.
 * @param  {string}    bdAddr, the device that just got connected and trusted by nwork.btConnectCtl, or
 *                             a BD-address that is not reachable or "". There will be no name = no speaker.
 * @return {string}    BD-address 
 */
function newSpeakerStatus(bdAddr) {
    let nameString = "";
    //lets get the name of the connected and trusted speaker since we know the bdAddr
    try {
        nameString =
            execSync(`sudo bluetoothctl info ${bdAddr} | grep "Name: " |cut -d ':' -f2   `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod NEW: device not found, might be not reachable:", bdAddr );
    };
    view.bluetoothSpeakerUpdate(nameString);
    view.trustedSpeakersUpdate();
};
  
//---------------------------------------------------------------------Bluetooth sources
/**When the state has changed detected by detect.monitorSourceDevices(). The new array is        
 * sent to view, no need to check every bluetooth device again. 
 * The status format is: [ {bdAddr: "<bd-addr>", name: "<name>" }, ... ] or []
 * When there is a change among connected devices paired devices needs an update too, but
 * the paired devices need to be checked.
 * @return {string}    BD-address
 */
function newDeviceStatus(array) {
    //console.log(aux.timeStamp(), "mod NEW: connected bluetooth sources:", array, "[sources or empty]");
    view.connectedDevicesUpdate(array);
    view.pairedDevicesUpdate();
};  

//______________________________________________________________________________________
//Readers using Linux CLI directly ====================================READ actual state
//-------------------------------------------------------------------------START PAGE []
//.....................[State of streaming services:  Idle, Spotify, Bluetooth, Airplay] [H]
/**Read the actual status on streaming from file:  /var/log/streamsensor.log           
 * The status format is: 'idle:stop', '<service>:start', '<service>:stop'
 * '<service>:stop' means it is idle state - "Idle..." will be rendered.
 * @return {string}     idle, spotify, bluetooth, airplay
 */
async function getStreamingStatus() {                                            
    let status = "idle:stop" //will hold read streaming status from file
    let state = "";          //will be streaming the state format
    try {
        status = aux.mpdMsgTrim(fs.readFileSync('/var/log/streamsensor.log', 'utf8'));
        //console.log(aux.timeStamp(), "mod: polled the streaming =>", status);
    }
    catch (err) {
        console.log(aux.timeStamp(), "poller: ERROR\n", err);
        state = "idle:stop";
    };
    switch (status) {
        case "idle:stop":
            state = "idle";
            break;
        case "spot:start":
            state = "spotify";
            break;
        case "airp:start":
            state = "airplay";
            break;
        case "btst:start":
            state = "bluetooth";
            break;
        default:
            state = "idle";
            break;
    };
    //console.log(aux.timeStamp(), "mod: state of streaming", state);
    return state;
};
//............................................................[State of Streamer Volume] [H]
/**Read the volume directly from the alsa mixer.              
 * CLI: amixer -c 0 sget Digital toggle | grep 'Right:' | awk -F'[][%]' '{ print $2 }'
 * Output line from amixer: Front Right: Playback 104 [50%] [-51.50dB] [on]
 * The string 50 is then converted to an integer by "* 1"
 * Linear voluem is 0 - 100%, scale volume is 0-207 -- use option -M for linear
 * @param  {string}  caller, for testing purposes only
 * @return {integer} 0 to 100
 */
async function getVolume(caller = "") {
    let ampVolume = -1;
    try {
         ampVolume =
             execSync(`sudo amixer -Mc 0 get Digital | grep 'Right:' | awk -F'[][%]' '{ print $2 }' `,
                 { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }) * 1;
         //console.log(aux.timeStamp(),"mod: read volume = ", ampVolume, " reason:", caller, "[mod.getVolume]");
    }
    catch (err) {
         console.log("model: Error, cannot read volume", err);
    };
    return ampVolume;
};
//...........................................................[Bluetooth state yes or no] [H] [B]
/**Bluetooth - read if bluetooth service is up and running using rfkill.         
 * with 'sudo rfkill block bluetooth' or 'sudo rfkill unblock bluetooth
 * If rfkill returns YES it means NO, bluetooth is blocked.
 * rfkill list | grep -A2 hci (where -A2 is next two following lines),
 * gives status of interest: "0: hci0: Bluetooth \n Soft blocked: yes \n Hard blocked: no"
 * But that string is hard to scan and analyze in a simple and fast way.
 * We need to do a linux call for each case:
 *  rfkill list | grep -A2 hci | grep Soft | cut -d' ' -f3      -> "yes"/"no"
 *  rfkill list | grep -A2 hci | grep Hard | cut -d' ' -f3      -> "yes"/"no"
 * 'yes' is the good answer here = unblocked.
 * @return {string}     unblocked -> "yes", otherwise "no" = it is blocked
 */
async function bluetoothStatus() {
    let rfkillSoftStatus = "";
    let rfkillHardStatus = "";
    let bluetoothIndicator = "no";
    //Get SOFT status:
    try {
        rfkillSoftStatus = 
            execSync(`sudo  rfkill list | grep -A2 hci | grep Soft | cut -d' ' -f3 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
    }
    catch (err) {
    };
    //Get HARD status:
    try {
        rfkillHardStatus = 
            execSync(`sudo  rfkill list | grep -A2 hci | grep Hard | cut -d' ' -f3 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
    }
    catch (err) {
    };
    if ((rfkillSoftStatus.indexOf("no") > -1) && (rfkillHardStatus.indexOf("no") > -1)) {
        bluetoothIndicator = "yes";
        //console.log(aux.timeStamp(), "mod: bt must be on", bluetoothIndicator);
    };
    return bluetoothIndicator
};
//.................................................[Bluetooth speaker state: name or ""] [H] [B]
/**Returns the name of the one and only connected bluetooth speaker (sink resource) 
 * Get all trusted devices:   - a connected or paired only speaker is always trusted!
 *  bluetoothctl devices Trusted | awk '{print substr($0, index($0,$2))}'
 * Connected Bluetooth Device Addresses (BD) string format:
 *  "FC:58:FA:1B:06:66 JVC HA-S22W \n
 *   8C:DE:E6:25:C5:8C Galaxy S21 Ultra 5G"
 * Split the long string at \n into an array for each device (each row)
 * Then split each row into two parts and check if it is connected
 *  bluetoothctl info BD-address | grep "Connected: yes" | tr -d '\n'
 * ... so if one audio sink (speaker) is a connected devices,
 * then immediately return the device name.  
 * @return {string}     name of connected speaker or ""
 */
async function bluetoothSpeakerName() {
    let connectedString = "";
    let connectedArray = [];
    let arrayLength = 0;
    let deviceInfo = "";
    let speakerName = "";
    try {
        connectedString = aux.mpdMsgTrim(
            execSync(`sudo bluetoothctl devices Trusted | awk '{print substr($0, index($0,$2))}' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        //console.log(aux.timeStamp(), "mod[bSN]: total trusted string ", connectedString, "all <| ");
        if (connectedString.length > 1) {
            connectedArray = connectedString.split('\n');
            arrayLength = connectedArray.length;
            for (let i = 0; i < arrayLength; i++) {
                //Each trusted device string has to be split into BD-address and name
                //const delimiterIndex = connectedArray[i].indexOf(' '); //this is always 17
                const delimiterIndex = 17;
                let bdAddr = connectedArray[i].substring(0, delimiterIndex);
                let name = connectedArray[i].slice(delimiterIndex + 1);
                //Now check if for each 'BD-address' indicates "Connected" for each speaker with 'name'
                try {
                    deviceInfo =
                        execSync(`sudo bluetoothctl info ${bdAddr} | grep "Connected: yes" | tr -d '\n' `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                    if (deviceInfo.length > 1) {
                        //console.log(aux.timeStamp(), "mod[bSN]: Connected spkr:", name, " <| ~~~");
                        speakerName = name;
                        //Stop loop and return name
                        i = arrayLength;
                    };
                }
                catch (err) {
                    console.log(aux.timeStamp(), "mod[bSN]: bluetoothctl speaker info error\n", err);
                };
            };
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod[bSN]: btctl trusted error\n", err);
    };
    //console.log(aux.timeStamp(), "mod [bSN]: connected speaker name:", speakerName,"...might be empty ' ' ");
    return speakerName;
};  
//...............................................[State of Wi-FI {ssid, ip-addr} or {} ] [H] [N]
/**Returns SSID of Streamer's connected Wi-Fi and Streamer's Wi-Fi IP address   
 * Also returns the Streamer's IP address of the connected WLAN.
 * nmcli device status | grep wlan1 | awk '{print $4}' | tr -d '\n'
 * ...where | tr -d '\n' is removing new line 
 * If wlan1 is disconnected the result is: "--"
 * ip -f inet -o addr  show wlan1 | awk '{ print $4 }' | cut -d'/' -f1 | tr -d '\n'
 * ... and then return the array ["<ssid>", "<ip-address>"] or [].
 * Should we test for "connected" first?
 * @return {array}     SSID and IP address, or []
 */
async function wirelessStatus() {
    let ssidName = "";
    let ipAddress = "";
    try {
        ssidName = 
            execSync(`sudo nmcli device status | grep wlan1 | awk '{print $4}' | cut -d'/' -f1 | tr -d '\n'  `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        //console.log(aux.timeStamp(),"mod: SSID name is =:", ssidName );
        if (ssidName == '--') {
            return [];                              //EXIT:  '--' means that wlan1 is disconnected
        }
    }
    catch (err) {
        return [];                                  //EXIT: error - no SSID found?
    };
    try {
        ipAddress = mpdMsgTrim(
            execSync(`sudo ip -f inet -o addr  show wlan1 | awk '{ print $4 }' | cut -d'/' -f1 | tr -d '\n'   `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
    }
    catch (err) {
        return [];                                  //EXIT: error - no IP address
    };
   
    return [ssidName, ipAddress];                   //EXIT: wlan1 is connected to Wi-Fi
};
//.............................................................[State of AP: up or down] [H] [N]
/**Returns the state of the AP (Hotspot) - up or down         
 * nmcli device status | grep Hotspot-1
 * The connection profile for the ap is called Hotspot-1.
 * and can be found in /etc/NetworkManager/system-connections,
 * @return {string}    up or down  
 */
async function accesspointStatus() {
    let apStatus = "";
    try {
        apStatus = mpdMsgTrim(
            execSync(`sudo nmcli device status | grep Hotspot-1 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        if (apStatus !== "") {
            return "up";
        }
        else {
            return "down";
        };
    }
    catch (err) {
        return "down";    //EXIT: connection profile is not up
    };
};
//...........................................[State of LAN connection; IP address or ""] [H] [N]
/**Returns the Ethernet LAN IP address or "", if the LAN cable is attached
 * ip -f inet -o addr  show eth0 | awk '{ print $4 }' | cut -d'/' -f1
 * will return the IP adress if the cable is attached.
 * @return {string}   IP address or ""
 */
async function wiredStatus() {
    let ipAddr = "";
    try {
        ipAddr = mpdMsgTrim(
            execSync(`sudo ip -f inet -o addr  show eth0 | awk '{ print $4 }' | cut -d'/' -f1 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
    }
    catch (err) {
    };
    return ipAddr;
};
//......................................................[State of Internet access or ""] [H] [N]
/**Return status of Internet access - access or ""      
 * There are 8 urls to check. They are picked in random order not using Fisher-Yates.
 * If there is no Internet access for the first picked url try the next one until
 * some url works.
 * Gives up after 8 checked url - there is no access then...
 * curl -Is https://www.google.com | grep "HTTP/2 200" | tr -d '\n'
 * will return "HTTP/2 200 \r" 
 * Option: wget  --spider https://www.google.com
 * @return {string}   access or ""
 */
async function internetStatus() {
    let outcome = "";
    let urlArray = ["https://www.google.com", "https://www.youtube.com", "https://www.facebook.com", "https://www.weather.com",
        "https://www.bing.com", "https://www.instagram.com", "https://www.wikipedia.org/", "https://www.reddit.com"];
    let randomIndex = 7;
    //let randomIndexArray = aux.shuffleFisherYates([0, 1, 2, 3, 4, 5, 6, 7]);
    for (let i = 0; i < 8; i++) {
        try {
            randomIndex = Math.floor(Math.random() * 8);
            outcome =
                execSync(`sudo curl -Is  ${urlArray[randomIndex]} | grep "HTTP/2 200"  | tr -d '\n' `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 20000 });
            console.log(aux.timeStamp(), "mod: ping to:", urlArray[randomIndex], "index =", randomIndex);
            if (outcome.length > 0) {
                outcome = "access";
                i = 8;
            };
        }
        catch (err) {
            console.log(aux.timeStamp(), "mod: ping error",err);
            //Error: can not check access
        };
    };
    return outcome;                            
};
//---------------------------------------------------------------------BLUETOOTH PAGE []
//.................[State of disconnected trusted only speakers: <name>, <name>,...] [B]
/** The streamer wants to know the names of the bluetooth speakers that are trusted only.
* These speakers have been connected before and are now disconnected, but still trusted!
*   CLI: bluetoothctl devices Trusted | awk '{print substr($0, index($0,$2))}' 
* Returns a string of trusted devices: "FC:58:FA:1B:06:66 JVC HA-S22W \n <bd-addr> <name> \n"
* Split the long string at \n into an array of bd-addresses and device names strings.
* Then split each string into an object where the first key holds the BDaddr 
* and the rest of the string is the name. Check if each trusted BDaddr is disconnected:
*   CLI: bluetoothctl info <bd-addr> | grep "Connected: no" | tr -d '\n'
* @return   {array}  trusted sinks [{bdAddr: <BD-address>, name: <name>},...]  or []
*/
function trustedOnlyBluetoothSpeakers() {
    let trustedString = ""; //string of trusted devices, with '\n'
    let trustedArray = [];  //each row in trustedString is put in this array
    let deviceInfo = "";    //long string with information about each trusted device
    let speakerArray = [];  //resulting array with disconnected trusted objects
    try {
        trustedString = aux.mpdMsgTrim(
            execSync(`sudo bluetoothctl devices Trusted | awk '{print substr($0, index($0,$2))}' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        if (trustedString.length > 1) {
            trustedArray = trustedString.split('\n');
            for (let i = 0; i < trustedArray.length; i++) {
                //const delimiterIndex = connectedArray[i].indexOf(' '); //this is always 17
                const delimiterIndex = 17;
                let bdAddr = trustedArray[i].substring(0, delimiterIndex);
                let name = trustedArray[i].slice(delimiterIndex + 1);
                try {
                    deviceInfo =
                        execSync(`sudo bluetoothctl info ${bdAddr} | grep "Connected: no" | tr -d '\n' `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                    //console.log(aux.timeStamp(), "mod[tOBS]: SINK indicator found for:", name, "element",i);
                    if (deviceInfo.length > 1) {
                        speakerArray.push({ bdAddr: bdAddr, name: name });
                        //console.log(aux.timeStamp(), "mod[tOBS]: speaker array:", speakerArray, "element", i);
                    };
                }
                catch (err) {
                    console.log(aux.timeStamp(), "mod[tOBS]: btctl sink info error\n", err);
                };
            };
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod[tOBS]: btctl info Connect error\n", err);
    };
    //console.log(aux.timeStamp(), "mod[tOBS]: trusted speaker array:", speakerArray, "[T]");
    return speakerArray;

};

//Test object: { bdAddr: "FC:58:FA:1B:06:66", name: "JVC HA-S22W" }

//...............................[State of connected source devices:  <name>, <name>,...] [B]
/** The streamer wants to know the names of bluetooth devices connected as sources,
* i.e. phones, which might stream Bluetooth audio. Could be PCs, ipad, tablets,... too.
* Note the BD-address is needed for disconencting an device, but not shown in frames.
*   CLI: bluetoothctl devices Connected | awk '{print substr($0, index($0,$2))}' 
* Returns a string: "8C:DE:E6:25:C5:8C Galaxy S21 Ultra 5G \n <bd-addr> <name> \n"
* Split the long string at \n into an array of BD-addresses and device names strings.
* Then split each string into an object where the first key holds the BDaddr 
* and the rest of the string is the name using delimiterIndex based on the first ' '. 
* aux.mpdMsgTrim() shaves of an extra irritating '' at the end that shows up.
* Push the connected source devices into an resulting array.
* Check if each BD-addr is a source or not:
*   CLI: bluetoothctl info <bd-addr> | grep "UUID: Audio Source  " | tr -d '\n'
* @return   {array}  names of connected sources as a string inside an object, 
*                    format [{bdAddr: <bd-addr>, name: <name>}, ...] or []
*/
function connectedBluetoothSourcesNames() {
    let connectedString = "";  //long string of connected devices, with '\n'
    let connectedArray = [];   //each row in connectedString is put in this array
    let deviceInfo = "";       //long string with information about each device
    let deviceArray = [];      //resulting array with connected objects
    try {
        connectedString = aux.mpdMsgTrim(
            execSync(`sudo bluetoothctl devices Connected | awk '{print substr($0, index($0,$2))}' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        if (connectedString.length > 1) {
            connectedArray = connectedString.split('\n');
            //console.log(aux.timeStamp(), "mod: connected Array is", connectedArray);
            for (let i = 0; i < connectedArray.length; i++) {
                //const delimiterIndex = connectedArray[i].indexOf(' '); //this is always 17
                const delimiterIndex = 17;
                let bdAddr = connectedArray[i].substring(0, delimiterIndex);
                let name = connectedArray[i].slice(delimiterIndex + 1);
                try {
                    deviceInfo =
                        execSync(`sudo bluetoothctl info ${bdAddr} | grep "UUID: Audio Source  " | tr -d '\n' `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                    //console.log(aux.timeStamp(), "mod[cBSN]: found connected SOURCE -->", name, "[!]");
                    if (deviceInfo.length > 1) {
                        deviceArray.push({ bdAddr: bdAddr, name: name });
                    };
                }
                catch (err) {
                    console.log(aux.timeStamp(), "mod[cBSN]: btctl source info error\n", err);
                };
            };
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod[cBSN]: btctl info Connect error\n", err);
    };
    //console.log(aux.timeStamp(), "mod[cBSN]: connected SOURCE array:", deviceArray, "[C]");
    return deviceArray;
};
//.......................[State of disconnected paired source devices:  <name>, <name>,...] [B]
/** The streamer wants to know the names of bluetooth devices paired as sources, but
* not connected. Note the BD-address is needed for deleting a device, but not shown in frames.
*   CLI: bluetoothctl devices Paired | awk '{print substr($0, index($0,$2))}' 
* Returns a string: "8C:DE:E6:25:C5:8C Galaxy S21 Ultra 5G \n <bd-addr> <name> \n"
* Split the long string at \n into an array of BD-addresses and device names strings.
* Then split each string into an object where the first key holds the BD-address 
* and the rest of the string is the name using delimiterIndex based on the first ' '. 
* aux.mpdMsgTrim() shaves of an extra irritating '' at the end that shows up.
* Check if each BDaddr is not connected, but it is a source. 
* Push the paired disconnected source devices into an resulting array.
*   CLI: bluetoothctl info <bd-addr>  and filter on "UUID: Audio Source  " and "Connected: no"
* @return   {array}  paired disconneced sources, format [{bdAddr: "<bd-addr>"", name: "<name>""}, ...] or []
*/
async function pairedOnlyBluetoothSources() {
    let pairedString = "";      //long string of paired devices, with '\n'
    let pairedArray = [];       //each row in pairedString is put in the array
    let deviceInfo = "";        //long string with information about each device
    let deviceArray = [];       //resulting array with disconnected and paired objects
    try {
        pairedString = aux.mpdMsgTrim(
            execSync(`sudo bluetoothctl devices Paired | awk '{print substr($0, index($0,$2))}' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        //console.log(aux.timeStamp(), "mod: paired string:", pairedString);
        if (pairedString.length > 1) {
            pairedArray = pairedString.split('\n');
            for (let i = 0; i < pairedArray.length; i++) {
                //const delimiterIndex = pairedArray[i].indexOf(' ');
                const delimiterIndex = 17;
                let bdAddr = pairedArray[i].substring(0, delimiterIndex);
                let name = pairedArray[i].slice(delimiterIndex + 1);
                try {
                    deviceInfo =
                        execSync(`sudo bluetoothctl info ${bdAddr}  `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                    //filter out devices that are paired disconnected sources
                    if ((deviceInfo.length > 1) &&
                        (deviceInfo.indexOf("UUID: Audio Source  ") > 0) &&
                        (deviceInfo.indexOf("Connected: no") > 0)) {
                        //console.log(aux.timeStamp(), "mod[pOBS]: found disconnected PAIRED SOURCE -->", name, "[!]");
                        deviceArray.push({ bdAddr: bdAddr, name: name });
                    };
                }
                catch (err) {
                    console.log(aux.timeStamp(), "mod[pOBS]: bluetoothctl info error\n", err);
                };
            };
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod[pOBS]: bluetoothctl device Paired error\n", err);
    };
    //console.log(aux.timeStamp(), "mod[pOBS]: paired SOURCE array =>", deviceArray, "[P]");
    return deviceArray;
};


//______________________________________________________________________________________
//Functions for defining internal states:
//==================================================================================READ
//                                                       Readers for socket object data:
//The streamer wants to know if there are web pages connected (loaded into a browser),
//they can be open or hidden, it does not matter.
//The socket.io method  "io.fetchSockets()"   -- gets all connected sockets.
//It takes 250ms to find out that there are no sockets (no pages connected).
//In order to know what kind of page each socket is they are "marked"" when connected,
//this is done in view.incomingPageRequests(socket);
//The object 'socket.data' can store arbitrary system specific data. The type of page
//is stored in extra attributes for example 'startpage' of 'socket.data'.
//If that attribute is true - at least on start page is connected.
//Attributes used: "startpage", "bluetoothpage". "wifipage" and "settingspage"
//Reference: https://socket.io/docs/v4/server-instance/#utility-methods
//......................................................................any start pages?
/** The streamer wants to know if there is at least one start page connected 
 * (loaded into a browser), it can be open or hidden. This functions checks the extra 
  * attribute called 'startpage' and returns the value: true or false.
  * @param     {io}            view.io, the GV for socket.io object, i.e. connected web pages
  * @return    {boolean}       true if there is at least one start page connected, else undefined
  */
async function isOpenStartPage() {
    //console.log(aux.timeStamp(), "mod: checking if there are any start pages connected [startpage?]");
    let isSocket = false;
    const sockets = await io.fetchSockets();       //get all connected sockets
    let socketLength = sockets.length;
    //console.log(aux.timeStamp(), "mod: number of open start pages [startpage?]", socketLength);
    for (let i = 0; i < socketLength; i++) {
        if (sockets[i].data.startpage == true) {
            //console.log(aux.timeStamp(), "ctl: io socket start page found!");
            isSocket = true;
            i = socketLength;
        };
    };
    return isSocket;
};
//...........................................................are there any pages at all?
/** The streamer wants to know if there are any pages connected (loaded into a browser),
  * it can be open or hidden. 
  * @param     {io}            view.io, the GV for socket.io object, i.e. connected web pages
  * @return    {boolean}       true if there is at least one page connected
  */
async function areOpenPages() {
    let isSocket = false;
    const sockets = await io.fetchSockets();       //get all connected sockets
    //console.log(aux.timeStamp(), "mod: number of open pages [ ]", sockets.length);
    if (sockets.length > 0) {
        isSocket = true;
    };
    return isSocket;
};
//______________________________________________________________________________________
//                                                        Readers for bluetoothctl data:
//............................................are there any connected bluetooth devices?
/** The streamer wants to know if there are any bluetooth devices connected at all,
  * i.e. phones, PCs, ipads, tablets,... and speakers too.
  *  bluetoothctl devices Connected
  *  returns: Device 8C:DE:E6:25:C5:8C Galaxy S21 Ultra 5G or ""
  * The function should be named: 'areConnectedBluetoothDevices'
  * @return    {boolean}       true if there is at least one device connected
  */
async function areConnectedBluetoothSources() {
    let connectedString = "";
    let isConnectedDevice = false;
    try {
        connectedString =
            execSync(`sudo bluetoothctl devices Connected `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        if (connectedString.length > 0) {
            isConnectedDevice = true;
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod: btctl info connect error\n", err);
    };
    return isConnectedDevice;
};
/** The streamer wants to manage the connected bluetooth speaker. Only the name is shown 
* to the user, but the BD-address is needed. There can only be one connected speaker and
* a connected speaker is always trusted.
*   CLI: bluetoothctl devices Connected | cut -d' ' -f2 
* Returns a string: "FC:58:FA:1B:06:66  \n 8C:DE:E6:25:C5:8C  \n 34:14:5F:48:32:F8 \n"
* Split the long string at \n into an array of bd-addresses.
* A connected speaker is a trusted speaker. Check if each BD-address is trustedor not:
*   CLI: bluetoothctl info <bd-addr> | grep "UUID: Audio Sink  " | tr -d '\n'
* As soon a trusted sink is found - return BD-address or if no one was found  "".
* @return   {string}  BD-address as a string or ""
*/
async function theConnectedBluetoothSink() {
    let connectedString = "";  //long string of connected devices, with '\n'
    let connectedArray = [];   //each row (bd-addr) in connectedString is put in the array
    let arrayLength = 0;
    let deviceInfo = "";       //long string with information about each device
    let bdAddr = "";           //found bd-addr for a speaker or ""
    try {
        connectedString = aux.mpdMsgTrim(
            execSync(`sudo bluetoothctl devices Connected | cut -d' ' -f2 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 }));
        if (connectedString.length > 1) {
            connectedArray = connectedString.split('\n');
            //console.log(aux.timeStamp(), "mod: connected Array for speaker", connectedArray);
            arrayLength = connectedArray.length;
            for (let i = 0; i < arrayLength; i++) {
                try {
                    deviceInfo =
                        execSync(`sudo bluetoothctl info ${connectedArray[i]} | grep "UUID: Audio Sink" | tr -d '\n' `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                    if (deviceInfo.length > 1) {
                        bdAddr = connectedArray[i];
                        //console.log(aux.timeStamp(), "mod: connected SINK <| is", bdAddr);
                        i = arrayLength;
                    };
                }
                catch (err) {
                    console.log(aux.timeStamp(), "mod: btctl sink info error\n", err);
                };
            };
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "mod: btctl device Connect error\n", err);
    };
    //console.log(aux.timeStamp(), "mod: connected speaker bd-address:", bdAddr);
    return bdAddr;
};
//______________________________________________________________________________________________
//Functions to provide all sorts of information about the Streamer.
//=========================================================================================ABOUT
/**ABOUT - get the time data, software and OS version
 * 'uptime | cut -d'p' -f2 |cut -d',' -f -2'
 * 'date | cut -d'E' -f1 date | cut -d' '  -f -3' '
 * 'timedatectl show --property=TimeUSec | cut -d'=' -f2 | cut -d' ' -f -3´'
 * Set time zone: 'timedatectl Canada/Central' 
 * @return {object}  { date: "day...", time: "hh:mm...", version: "5.xxxx", os: "...", license: "GNU .." }
 */
function aboutTimeandVersions() {
    let frameData = { date: "", time: "", version: "", os: "", license: "GNU General Public License version 3.0 or later " };
    let date = "";
    let time = "";
    try {
        frameData.date =
            aux.mpdMsgTrim(
                execSync(`sudo  timedatectl show --property=TimeUSec | cut -d'=' -f2 | cut -d' ' -f -3 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
    } catch (err) {
        frameData.date = "---"
    };
    try {
        time =
            aux.mpdMsgTrim(
                execSync(`sudo  uptime -s `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        frameData.time = time;
    } catch (err) {
        frameData.time = "---"
    };
    frameData.version = RAD_SYSTEM_VERSION;
    try {
        frameData.os =
            execSync(`sudo  cat /etc/os-release | head -n1 | cut -d'"' -f2
 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    } catch (err) {
        frameData.os = "---"
    };
    return frameData;
};
/**ABOUT - memory usage of disk system
 *  df -h --total
 * @return {object}  { size: "nnn GB", used: "nn%" } 
 */
function aboutMemoryUsage() {
    let frameData = { size: "", used: "" };
    try {
        frameData.size =
            aux.mpdMsgTrim(
                execSync(` sudo df -h --total | grep total | cut -d'G' -f1 | cut -dl -f2 `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }))
            + " GB";
    } catch (err) {
        frameData.size = "---"
    };
    try {
        frameData.used =
            aux.mpdMsgTrim(
                execSync(` sudo df -h --total | grep total | cut -dl -f2 | awk '{print $4}' `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
    } catch (err) {
        frameData.inUse = "---"
    };
    return frameData;
};
/**ABOUT - RAM usage
 *  free -h
 * @return {object}  { ram: "n GB", inUse: "nn%" }
 */
function aboutRAMUsage() {
    let frameData = { ram: "", inUse: "" };
    let ramSize = "";
    let ramUsed = 0;
    let ratio = 0;
    try {
        ramSize =
            Math.round(
                parseFloat(
                    aux.mpdMsgTrim(
                        execSync(` sudo free -h |  awk '/Mem:/ {print $2}'|cut -d'G' -f1 `,
                            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }))));
        //console.log(aux.timeStamp(), "mod: ram size:", ramSize);
    } catch (err) {
        frameData.ram = "---"
    };
    try {
        ramUsed =
            parseFloat(
            aux.mpdMsgTrim(
                execSync(` sudo free -h |  awk '/Mem:/ {print $3}' | cut -d'M' -f1 `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 })));
        //console.log(aux.timeStamp(), "mod: ram used:", ramUsed);
    } catch (err) {
        frameData.inUse = "---"
    };
    if (ramSize > 0) {
        frameData.ram =  `${ramSize}  GB ` ;
        ratio = ramUsed / (ramSize * 1000);
        //console.log(aux.timeStamp(), "mod: ram ratio:", ratio);
        frameData.inUse = ratio.toLocaleString("en-US", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    return frameData;
};
/**ABOUT - which streaming services are up an running?
 *  systemctl is-active
 * @return {object}  { spotify: false, airplay: false, bluealsa: false }
 */
function aboutStreamingServices() {
    let frameData = { spotify: false, airplay: false, bluealsa: false };
    let spotifyActive = "";
    let airplayActive = "";
    let bluealsaActive = "";
    try {
        spotifyActive =
            execSync(` sudo systemctl is-active librespot `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            if (spotifyActive.indexOf("active") === -1) {
                frameData.spotify = false;
            }
            else {
                frameData.spotify = true;
            };

    } catch (err) {
        frameData.spotify = false;
    };
    try {
        airplayActive =
            execSync(` sudo systemctl is-active shairport-sync `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        if (airplayActive.indexOf("active") === -1) {
            frameData.airplay = false;
        }
        else {
            frameData.airplay = true;
        };

    } catch (err) {
        frameData.airplay = false;
    };
    try {
        bluealsaActive =
            execSync(` sudo systemctl is-active bluealsa-aplay `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        if (bluealsaActive.indexOf("active") === -1) {
            frameData.bluealsa = false;
        }
        else {
            frameData.bluealsa = true;
        };

    } catch (err) {
        frameData.bluealsa = false;
    };
    return frameData;
};
/**ABOUT - which streaming services is using the alsa, or is there a Bluetooth speaker?
 *  Given that a process is using the alsa - figure out the bin-file
 *  ps -A -q <pid> | tail -n1 | awk '{print $4}'
 * 'shairport'
 * 'librespot'                 - from this derive the service running
 * 'bluealsa-aplay'
 * ...where -A is all processes incl session leaders
 * when alsa: cat /proc/asound/card0/pcm0p/sub0/hw_params | grep rate |cut -d':' -f2 | cut -d' ' -f2     -->  sampling rate in Hz 
 *            44100
 *            cat /proc/asound/card0/pcm0p/sub0/hw_params | grep format: | head -n1 | cut -d':' -f2                     -->  sample format  S16_LE 
 *            S16_LE
 * 
 * @return {object} { muted: true, usingAlsa: "", speaker: "",  sampling: "", format: "" }
 */
async function aboutAmplifier() {
    let frameData = { muted: true, usingAlsa: "", speaker: "", sampling: "", format: "" };
    let alsaPid = "";
    let alsaBin = "";
    frameData.muted = await alsa.isAmpMuted();
    frameData.speaker = await bluetoothSpeakerName();
    try {
        alsaPid = execSync(
            `sudo cat /proc/asound/card0/pcm0p/sub0/status | grep  owner_pid | awk '{print $3}' | tr -d "\n" `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
        //console.log(aux.timeStamp(), "about: is alsa used by a process, alsa pid = ", alsaPid);
    }
    catch (err) {
        console.log(aux.timeStamp(), "about: alsa pid file read ERROR ", err);
        alsaPid = "";
    };
    if (alsaPid.length > 0) {
        try {
            alsaBin = execSync(
                `sudo ps -Aq ${alsaPid} | tail -n1 | awk '{print $4}'  `,
                     { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
        }
        catch (err) {
            console.log(aux.timeStamp(), "about: ps read ERROR ", err);
            alsaBin = "";
        };
        if (alsaBin.indexOf("libre") > -1) {
            frameData.usingAlsa = "Spotify";
        };
        if (alsaBin.indexOf("blue") > -1) {
            frameData.usingAlsa = "Bluetooth";
        };
        if (alsaBin.indexOf("shair") > -1) {
            frameData.usingAlsa = "Airplay";
        };
        if (alsaBin.length > 0) {
            let sampling = "";
            let format = "";
            try {
                sampling = execSync(
                    `sudo cat /proc/asound/card0/pcm0p/sub0/hw_params | grep rate |cut -d':' -f2 | cut -d' ' -f2  `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
                frameData.sampling = sampling +" kHz";
            }
            catch (err) {
                console.log(aux.timeStamp(), "about: ps read ERROR ", err);
                frameData.sampling = "---";
            };
            try {
                format = execSync(
                    ` cat /proc/asound/card0/pcm0p/sub0/hw_params | grep format: | head -n1 | cut -d':' -f2  `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 1000 });
                frameData.format = format;
            }
            catch (err) {
                console.log(aux.timeStamp(), "about: ps read ERROR ", err);
                frameData.format = "---";
            };

        };
    }
    else {
        frameData.usingAlsa = "idle"
    };
    return frameData;
};//
/**ABOUT - Wi-Fi connection and Bluetooth link quality and Bluetooth version
 * If connected to Wi-Fi and/or connected Bluetooth devices figure out the link quality.
 *  cat  /proc/cpuinfo | grep Model | cut -d':' -f2      -> Bluetoth version
 * @return {object}  { wifi: false/"Link Quality...", ssid: "<ssid>",                          -- Wi-Fi part
 *                     bluetooth: boolean, speaker: false/{name: <name>, link: "Good..."},     -- Bluetooth and speaker
 *                     sources: false/[ {name: <name>, link: "Good..."}, ...], version:"" }    -- all sources
 */
async function aboutConnections() {
    let frameData = { wifi: false, ssid: "", bluetooth: false, speaker: false, sources: false };
    let isWireless = await wirelessStatus();
    let isBluetooth = await bluetoothStatus();
//A. Wi-Fi part
    if (isWireless.length > 0) {
        try {
            frameData.wifi =
                aux.mpdMsgTrim(
                    execSync(` sudo iwconfig wlan1 | grep Link | tr '=' ' ' `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }))
             frameData.ssid = isWireless[0];
        } catch (err) {
            frameData.wifi = "---"
        };
    };
//B. Bluetooth and speaker
    if (isBluetooth.length === 3) {
        let isSpeakerBDaddr = await theConnectedBluetoothSink();
        let connectedSources = await connectedBluetoothSourcesNames();
        frameData.bluetooth = true;
        try {
            frameData.version =
                aux.mpdMsgTrim(
                    execSync(` sudo hciconfig -a | grep LMP | awk '{print $3}' `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }))
        } catch (err) {
            frameData.version = "---"
        };
        if (isSpeakerBDaddr.length > 0) {
            let name = await bluetoothSpeakerName();
            let link = await bluetoothLinkQuality(isSpeakerBDaddr);
            frameData.speaker = { name: name, link: link }
        };
 //C. All sources
        let arrayLength = connectedSources.length;
        let objectArray = [];
        //console.log(aux.timeStamp(), "about: connected sources array ", connectedSources);
        if (arrayLength > 0) {
            for (let i = 0; i < arrayLength; i++) {
                let name = connectedSources[i].name;
                let link = await bluetoothLinkQuality(connectedSources[i].bdAddr);
                objectArray.push({ name: name, link: link });
            };
            frameData.sources = objectArray;
        }
        else {
            frameData.sources = false;
        };
    };
    return frameData;
};
/**ABOUT - helper to estimate ta bluetooth link quality
 *  hcitool lq  <bdAddr>
 * 'Link quality: 17 25 186 230 235 242 or 255' -- read about every 22 second
 * 'HCI read_link_quality request failed: Input/output error' -- no connection
 * @param   {string}    bdAddr,
 * @return  {string}    link quality as a string
 */
function bluetoothLinkQuality(bdAddr) {
    let link = 0;
    let quality = "";
    try {
        link =
            parseInt(
                aux.mpdMsgTrim(
                    execSync(` sudo hcitool lq ${bdAddr} | grep Link | awk '{print $3}' `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 })));
        //console.log(aux.timeStamp(), "mod: bluetooth link quality value:", link);
    }
    catch (err) {
        return "---";
    };
    if (isNaN(link) === false) {
        if (link > 225) {
            quality = "strong +++";
        }
        else if (link > 100) {
            quality = "fair ++";
        }
        else if (link > 40) {
            quality = "weak  +"
        }
        else {
            quality = "very weak  -"
        }
    }
    else {
        link = "No connection"
    }
    //console.log(aux.timeStamp(), "mod: bluetooth link quality:", link);
    return quality;
};

/**ABOUT - hardware
 *  cat  /proc/cpuinfo | grep Model | cut -d':' -f2
 * @return {object}  { computer: "", card: "" }
 */
function aboutHardware() {
    let frameData = { computer: "", card: RAD_SOUND_CARD };
    try {
        frameData.computer =
            aux.mpdMsgTrim(
                execSync(` sudo cat  /proc/cpuinfo | grep Model | cut -d':' -f2 `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
    } catch (err) {
        frameData.computer = "---"
    };
    return frameData;
};

/**Internal states - amplifier state, pages open, is conf file
 * @return {object}  { muted: boolean, isOpenPage: boolean, isStartPage: boolean, isFile: boolean }
 */
async function internalStates() {
    let frameData = { muted: false, isOpenPage: false, isStartPage: false, isFile: false };
    isAmpMuted = await alsa.isAmpMuted();
    isOpenPage = await areOpenPages();
    isStartPage = await isOpenStartPage();
    isFile = await nwork.isFile();
    return frameData = { muted: isAmpMuted, isOpenPage: isOpenPage, isStartPage: isStartPage, isFile: isFile };
};
/**Internal errors - has there been under powered, to hot and throttling of the CPU?
 * @return {object}  { throttle: false, power: false, hot: false, temp: string, volt: string }
 */
async function internalErrors() {
    let frameData = { throttle: true, power: true, hot: true, temp: "0", volt: "0" };
    isThrottled = false;
    isUnderPowered = false;
    isTooHot = false;
    currentTemp = "0";
    currentVolt = "0";
    try {
        isThrottled = mpdMsgTrim(
            execSync(` sudo vcgencmd get_throttled `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log(aux.timeStamp(), "mod: Throttling string:", isThrottled);
        if (isThrottled.indexOf("=0x0") > -1) {
            frameData.throttle = false
        };
    } catch (err) {
    };
    /*
    try {
        console.log(aux.timeStamp(), "mod: Voltage string?");
        isUnderPowered = mpdMsgTrim(
            execSync(` sudo dmesg -H | grep -i voltage `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log(aux.timeStamp(), "mod: Voltage string:", isUnderPowered);
        if (isUnderPowered.length === 0) {
            frameData.power = false
        };
    } catch (err) {
        console.log(aux.timeStamp(), "mod: Voltage string:",err);
    };
    try {
        console.log(aux.timeStamp(), "mod: Voltage string?");
        isTooHot = mpdMsgTrim(
            execSync(` sudo dmesg -H | grep -i temperature `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log(aux.timeStamp(), "mod: Temp string:", isTooHot);
        if (isTooHot.length === 0) {
            frameData.hot = false
        };
    } catch (err) {
        console.log(aux.timeStamp(), "mod: temperature string:", err);
    };*/
    try {
        currentTemp =
            mpdMsgTrim(
                execSync(` sudo vcgencmd  measure_temp | cut -d"=" -f2 | cut -d"." -f1
 `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log(aux.timeStamp(), "mod: Current Temp string:", currentTemp);
        frameData.temp = currentTemp;
    } catch (err) {
    };
    try {
        currentVolt =
            mpdMsgTrim(
                execSync(` sudo vcgencmd measure_volts | cut -d"=" -f2 | cut -d"V" -f1  `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log(aux.timeStamp(), "mod: Current Volt string:", currentVolt);
        frameData.volt = currentVolt;
    } catch (err) {
    };
    return frameData;
};


// hciconfig -a | grep LMP | awk '{print $3}' -- bluetooth version
//iwconfig wlan1 | grep Link | tr '=' ' '
//hcitool lq  8C:DE:E6:25:C5:8C //This shows the strength of the BT signal, as a value between 0 and 255. The value 255 is good, the rest is weak.
//  HCI read_link_quality request failed: Input/output error
//  Link quality: 17        Link quality: 25


//=======================================================================================HELPERS
//..................................................................................... the pider
/**HELP - util, finds the main pid of a systemd service
 * Otherwise use 'sudo ps aux | fgrep <process name>'
 * This is the line:  'Main PID: 504 (bluetoothd)'  ...example bluetooth service
 * @param {string}           service systemd service name
 * @return {string}          process id
 */
function readServicePid(service) {
    let pid = "";
    try {
        pid =
            mpdMsgTrim(
                execSync(`sudo systemctl status ${service} | grep "Main PID:" | cut -d' ' -f6 `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 2000 }));
    }
    catch (err) {
    };
    return pid;
};

//============= SIMULATION =================
// Eneby 30: FC:58:FA:B8:F6:14
// Eneby 20: FC:58:FA:ED:57:60
// Hk spkr   FC:58:FA:CC:30:A4
// Galaxy    34:14:5F:48:32:F8
// FC:58:FA:1B:06:66 Galaxy S21 Ultra 5G
// F8:E5:CE:72:58:35 Kailash’s iPhone

//connectedDevices = [{ bdAddr: "FC:58:FA:1B:06:66", name: "Galaxy S21 Ultra 5G" }, { bdAddr: "CA:38:AB:1C:06:77", name: "My iPhone" }, { bdAddr: "FF:88:FF:FF:01:00", name: "Samsung Galaxy 8" } ];
//pairedDevices = [{ bdAddr: "FC:58:FA:1B:06:66", name: "Galaxy S21 Ultra 5G" }, { bdAddr: "CA:38:AB:1C:06:77", name: "My iPhone" }, { bdAddr: "FF:88:FF:FF:01:00", name: "Samsung Galaxy 8" } ];
