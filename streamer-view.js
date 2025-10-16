//Copyright 2025 by Retro Audiophile Designs
//GNU General Public License v3.0 see license.txt            [Source code]
//                      ~ view of Streamer ~

//--------------------------------------------------debugging to files in /streamer/data
const fs = require('fs');
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

const aux =   require('/streamer/lib/machine-auxiliary.js'); //auxiliary functions
const mod =   require('/streamer/streamer-model.js');
const detect =  require('/streamer/lib/streamer-detect.js');
const ctl =   require('/streamer/streamer-control.js');
const nwork = require('/streamer/lib/streamer-network.js');
const route = require('/streamer/streamer-routing.js');
//------------------------------------------boot:
module.exports.bootWebServer = bootWebServer;
//-----------------------------------------pages:
module.exports.renderAllPages = renderAllPages;
module.exports.renderStartPage = renderStartPage;
module.exports.renderScannedSSIDs = renderScannedSSIDs;
module.exports.renderBluetoothPage = renderBluetoothPage;
module.exports.renderScannedSpeakers = renderScannedSpeakers;
module.exports.renderMessage = renderMessage;
//-----------------------------------------frames:
module.exports.streamingUpdate = streamingUpdate;
module.exports.volumeUpdate = volumeUpdate;
module.exports.bluetoothUpdate = bluetoothUpdate;
module.exports.bluetoothSpeakerUpdate = bluetoothSpeakerUpdate;
module.exports.wirelessUpdate = wirelessUpdate;
module.exports.accesspointUpdate = accesspointUpdate;
module.exports.wiredUpdate = wiredUpdate;
module.exports.internetUpdate = internetUpdate;
module.exports.trustedSpeakersUpdate = trustedSpeakersUpdate;
module.exports.connectedDevicesUpdate = connectedDevicesUpdate;
module.exports.pairedDevicesUpdate = pairedDevicesUpdate;
//--------------------------------------protocols:
module.exports.setupFrontEndProtocol = setupFrontEndProtocol;


//[V] VIEW definition ===================================== packers for frontend
//Packing frame data for frontend render functions------------------------------
//The frontend is a state-based UI - states defines the rendering. Each frame
//functions that creates data frames based on the state of Streamer.
//  A. Start page       -- parsed in streamer.js
//  B. Bluetooth page   -- parsed in streamerbluetooth.js
//  C. Network pages    -- parsed in streamernetwork.js
//  D. Settings page    -- parsed in playersettings.js
//  a.1 OS state page   -- parsed in playerstate.js
//  a.2 model page      -- parsed in playermachine.js

//Global variables
var io;               //holder for socket.io server object, set in bootWebServer()
var blockUI = false;  //during connections the UI needs to be blocked

//Export the the socket.io server object as an global variable
module.exports.io = io;


//BOOT =============================================================================================
//Start web server and sockets........................................................... boot phase

/**Boot. Start the Express webserver and io.sockets for front- and backend 
 * communications with io.on (recieve) and io.emit (send).
 * Define the web pages to be shown
 * @param {integer}   wait, pause time in ms, default 500
 * @global {io}       socket.io server object
 * @return {boolean}  of no interest
 */
async function bootWebServer(wait = 200) {
    let pages = [
        '/pages/streamer.html',
        '/pages/streamerbluetooth.html',
        '/pages/streamernetwork.html',
        '/pages/streamerabout.html',
        '/pages/streamermodel.html'
    ];
    let ioObject = await route.startWebServer(pages);
    io = ioObject;                   //set GV 'io' to socket.io server object
    mod.getIo(ioObject);
    aux.sleep(wait).then(() => {
        console.log(aux.timeStamp(), "view: Webserver and io.socket up...");
        setupFrontEndProtocol(ioObject);     //start listening on 'io'
    });
    return true;
};
//PAGES================================================================================== Page Level

/**Organize events from the frontend through socket.io --- socket
 * Here the event handling is divided into two parts:
 *  P1. Incoming request when web page opens or asks for updates
 *  P2. User events on web pages
 * Reference: https://socket.io/docs/v4/emit-cheatsheet/
 * @param     {object}         ioServer, socket.io object, also GV 'io',
 *                             Note: 'socket' is a connected web page
 * @listener  {socket.io}     'connection'
 * @return    {boolean}        true - of no interest
 */
function setupFrontEndProtocol(ioServer) {
    ioServer.on('connection', function (socket) {
        //P1. Protocol for page requests (e.g page open,...)
        incomingPageRequests(socket);
        //P2. Protocol for user commands (e.g. turn on Bluetooth,..)
        incomingUserRequests(socket);
    });
    return true;
};

/**Boot. Renders all web pages, used at boot and at restarts.
 * Render any previously open pages, also done automatically by socket.io
 * @return {boolean} always true
 */
function renderAllPages() {
    //isOpenStartPage();
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render all pages... [H] [B] [N] [S]");
    //console.log(aux.timeStamp(), "=========================================");
    renderStartPage();
    renderBluetoothPage();
    renderNetworkPage();
    return true;
};
/**Renders start page
 * Render all frames.
 * @return {boolean} always true
 */
function renderStartPage() {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render start page...            [H]");
    streamingUpdate();
    volumeUpdate();
    bluetoothUpdate();
    bluetoothSpeakerUpdate();
    wirelessUpdate();
    accesspointUpdate();
    wiredUpdate();
    //internetUpdate();
    //console.log(aux.timeStamp(), "--------------------------------------[H]");
    return true;
};
/**Renders network page
 * Render all frames.
 * @return {boolean} always true
 */
function renderNetworkPage() {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render network page...          [N]");
    wirelessUpdate();
    accesspointUpdate();
    wiredUpdate();
    //console.log(aux.timeStamp(), "--------------------------------------[N]");
    return true;
};
/**Renders the ssid modal form on front end, part of connect to Wi-Fi
 * Render a modal input form in front of Network page
 * @param  {array}   wifiArray, array of SSID strings or []
 * @return {boolean} always true
 */
function renderScannedSSIDs(wifiArray) {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render available ssids...  ~~~  [N]");
    io.emit('wifi-networks', wifiArray);
    blockUI = false;    //just to be sure to release the user interface
    //console.log(aux.timeStamp(), "--------------------------------------[N]");
    return true;
};
/**Renders bluetooth page
 * Render all frames.
 * @return {boolean} always true
 */
function renderBluetoothPage() {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render bluetooth page...        [B]");
    bluetoothUpdate();
    bluetoothSpeakerUpdate();
    trustedSpeakersUpdate();
    connectedDevicesUpdate();
    pairedDevicesUpdate();
    //console.log(aux.timeStamp(), "--------------------------------------[B]");
    return true;
};
/**Renders the bluetooth speaker modal form on front end,
 * Render a modal input form with available speakers in front of Bluetooth page
 * @param  {array}   nameArray, array of [{bdAddr: "<BD-address"">, name: "<name>"},...] or []
 * @return {boolean} always true
 */
function renderScannedSpeakers(speakerArray) {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render scanned speakers...  <|  [B]");
    io.emit('speakers', speakerArray);
    blockUI = false;    //just to be sure to release the user interface
    //console.log(aux.timeStamp(), "--------------------------------------[B]");
    return true;
};
/**Renders bluetooth page
 * Render all frames.
 * @return {boolean} always true
 */
function renderAboutPage() {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render about Streamer           [A]");
    timeVersionsLicenseUpdate();
    //internetUpdate();
    diskMemoryUpdate();
    ramMemoryUpdate();
    nowStreamingUpdate();
    amplifierUpdate();
    signalUpdate();
    hardwareUpdate();
    //console.log(aux.timeStamp(), "--------------------------------------[A]");
    return true;
};
/**Renders bluetooth page
 * Render all frames.
 * @return {boolean} always true
 */
function renderModelPage() {
    //console.log(aux.timeStamp(), "_________________________________________");
    //console.log(aux.timeStamp(), "view: render  Streamer  Model         [M]");
    timeVersionsLicenseUpdate();
    streamingUpdate();
    volumeUpdate();
    bluetoothUpdate();
    bluetoothSpeakerUpdate();
    wirelessUpdate();
    accesspointUpdate();
    wiredUpdate();
    //internetUpdate();
    trustedSpeakersUpdate();
    connectedDevicesUpdate();
    pairedDevicesUpdate();
    internalUpdate();
    criticalUpdate();
    //console.log(aux.timeStamp(), "--------------------------------------[M]");
    return true;
};
/**Renders a pop-up modal notifier on front end, using an object on the format:
 *  {page: "<page>", type: "<type of message>", missive: "<message>" }
 *          page:    can be start, bluetooth, wifi, <undefined> =  to all pages
 *          type:    can be error, done, info, mishap, long
 *          missive: is the actual message 
 * @param  {array}   message, {page: "<page>", type: "<type of message>", missive: "<message>" }
 * @return {boolean} always true
 */
function renderMessage(message) {
    switch (message.page) {
        case "start":
            io.emit('startMessage', message);
            break;
        case "bluetooth":
            io.emit('bluetoothMessage', message);
            break;
        case "network":
            io.emit('networkMessage', message);
            break;
        default:
            io.emit('startMessage', message);
            io.emit('bluetoothMessage', message);
            io.emit('networkMessage', message);
            return true;
    };
};

//FRAMES ============================================================================== Frame Level
//Render start page frames........................................................Start Page Frames

/**Updates streaming information to frontend by sending a frame: 

 * @param  {string}     ifNewState, streamer changed into a new state
 * @global {io}         "streamerStatus"
 * @return {string}      streaming status
 */
async function streamingUpdate(ifNewState = "") {
    //read content '/var/log/streamsensor.log'
    let streaming = ifNewState;
    if (ifNewState == "") {
        //console.log(aux.timeStamp(), "view: get streaming from file:-", ifNewState);
        streaming = await mod.getStreamingStatus();
    };
    console.log(aux.timeStamp(), "view: status frame updated:-", streaming );
    io.emit("streamerStatus", streaming);
    return streaming;
};
/**Updates volume information from backend to frontend by sending a frame: 
 * Emits ("volume", 0 - 100 )  - integer 
 * Note: used ONLY at boot of streamer, often the user sets the volume
 * @global {io}     "volume"
 * @return {integer} volume as an integer, interval: 0 - 100
 */
async function volumeUpdate() {
    let currentVolume = await mod.getVolume();
    console.log(aux.timeStamp(), "view: volume slider updated:-", currentVolume);
    io.emit("volume", currentVolume);
    return currentVolume;
};
/**Updates Bluetooth connection status to frontend by sending a frame:           [also Bluetooth Page]
 * Emits ("bluetooth",	"yes" / "no" )   - yes means unblocked.
 * @global {io}     "bluetooth"
 * @return {string}  bluetooth connection status, on or off
 */
async function bluetoothUpdate() {
    let bluetoothStatus = await mod.bluetoothStatus();
    console.log(aux.timeStamp(), "view: bt frame updated:-", bluetoothStatus);
    io.emit("bluetooth", bluetoothStatus);
    return bluetoothStatus;
};
/**Updates Bluetooth speaker status to frontend by sending a frame:             [also Bluetooth Page]
 * Emits ("bluetoothSpeaker",	"<name>" / "") 
 * When name is empty "" -> there is no speaker connected. It will render the scan button instead.
 * @param  {string}  speaker, might be undefined, "<name>" or ""
 * @global {io}     "bluetoothSpeaker" render name or scan button
 * @return {string}  bluetooth speaker name or ""
 */
async function bluetoothSpeakerUpdate(speaker) {
    //console.log(aux.timeStamp(), "view: incoming 'speakers' name:-", speaker, "might be empty" );
    let speakerName = speaker;
    if ((typeof speaker === 'undefined') || (speakerName.length < 1)) {
        speakerName = await mod.bluetoothSpeakerName();
    };
    console.log(aux.timeStamp(), "view: SPEAKER frame updated:-", speakerName, "might be empty");
    io.emit("bluetoothSpeaker", speakerName);
    return speakerName;
};
/**Updates the wireless information                                                 [also Network Page]
 * Emits ("wireless", ["<ssid>", "<ipaddress>"] / [])
 * @global {io}    "wireless"
 * @return {array}  SSID and IP address or the empty array
 */
async function wirelessUpdate() {
    let wifiStatusArray = await mod.wirelessStatus();
    console.log(aux.timeStamp(), "view: wireless frame updated:-", wifiStatusArray);
    io.emit("wireless", wifiStatusArray);
    return wifiStatusArray;
};
/**Updates the access point information                                         [also Network Page]
 * Emits ("accesspoint", "up" / "down")
 * @global {io}     "accesspoint"
 * @return {string}  up or down
 */
async function accesspointUpdate() {
    let apStatus = await mod.accesspointStatus();
    console.log(aux.timeStamp(), "view: AP frame updated:-", apStatus);
    io.emit("accesspoint", apStatus);
    return apStatus;
};
/**Updates the wired information                                                [also Network Page]
 * Emits ("wired", "<ipadress>" / "")
 * @param  {string}  state, is set if a change is detected
 * @global {io}     "wired"
 * @return {string}  IP address or ""
 */
async function wiredUpdate(state = false) {                                    
    let lanStatus = state;
    if (state == false) {
        lanStatus = await mod.wiredStatus();
    };
    console.log(aux.timeStamp(), "view: LAN frame updated:-", lanStatus);     
    io.emit("wired", lanStatus);
    return lanStatus;
};
/**Updates the Internet information                                          [now only on About page]
 * Emits ("internet", "connected" / "disconnected")
 * @param  {string}  state, is set if a change is detected
 * @global {io}     "internet"
 * @return {string}  connected or disconencted
 */
async function internetUpdate(state = false) {                                  
    let internetAccess = state;
    if (state == false) {
         internetAccess = await mod.internetStatus();
    };
    console.log(aux.timeStamp(), "view: Internet frame updated:-", internetAccess);
    io.emit("internet", internetAccess);
    return internetAccess;
};
//...............................................................................[only Bluetooth page]
/**Updates the trusted Bluetooth speakers list
 * Emits ("trustedSpeakers", [{bdAddr: <BD-address>, name: <name>},...] )
 * @param  {array}  speakers, is set if a change is detected or 'undefined'
 * @global {io}     "trustedSpeakers"
 * @return {string}  [{bdAddr: <BD-address>, name: <name>},...]  or []
 */
async function trustedSpeakersUpdate(speakers) {
    //console.log(aux.timeStamp(), "view: incoming trusted 'speakers' value:-", speakers);
    let trustedSpeakers = speakers;
    if (typeof speakers === 'undefined') {
        //console.log(aux.timeStamp(), "view: okay, call tOBS to get disconnected speakers-------------------");
        trustedSpeakers = await mod.trustedOnlyBluetoothSpeakers();
    };
    //console.log(aux.timeStamp(), "view: TRUSTED speakers list frame updated:-", trustedSpeakers);
    io.emit("trustedSpeakers", trustedSpeakers);
    return trustedSpeakers;
};
/**Updates the connected Bluetooth source device list
 * Emits ("connectedDevices", [{bdAddr: <BD-address>, name: <name>},...] )
 * @param  {array}  devices, is set if a change is detected
 * @global {io}     "connectedDevices"
 * @return {string}  [{bdAddr: <BD-address>, name: <name>},...]  or []
 */
async function connectedDevicesUpdate(devices) {
    //console.log(aux.timeStamp(), "view: incoming connecting 'devices' value:-", devices);
    let connectedDevices = devices;
    if (typeof devices === 'undefined') {
        connectedDevices = await mod.connectedBluetoothSourcesNames();
    };
    //console.log(aux.timeStamp(), "view: CONNECTED device sources frame updated:-", connectedDevices);
    io.emit("connectedDevices", connectedDevices);
    return connectedDevices;
};
/**Updates the paired Bluetooth source device list
 * Emits ("pairedDevices", [{bdAddr: <BD-address>, name: <name>},...] )
 * @param  {array}  devices, is set if a change is detected
 * @global {io}     "paireddDevices"
 * @return {string}  [{bdAddr: <BD-address>, name: <name>},...]  or []
 */
async function pairedDevicesUpdate(devices) {
    //console.log(aux.timeStamp(), "view: incoming paired 'devices' value:-", devices);
    let pairedDevices = devices;
    if (typeof devices === 'undefined') {
        pairedDevices = await mod.pairedOnlyBluetoothSources();
    };
    //console.log(aux.timeStamp(), "view: disconnected PAIRED device frame updated:-", pairedDevices);
    io.emit("pairedDevices", pairedDevices);
    return pairedDevices;
};
//........................................................................HELPER
/**Renders a network frame showing the connection status or it removes the frame
 * from the start page if disconnected/stopped.
 * It is a part of P2. Incoming User Request for connect/disconnect of a network
 * @param {networkType} networkType, bluetooth, hotspot or wifi as a string
 * @return {?}          no interest
 */
function networkUpdate(networkType) {
    //console.log(aux.timeStamp(), "View: request update of frame:", networkType);
    switch (networkType) {
        //Bluetooth off - turns off the bluetooth network service
        case "bluetooth":
            bluetoothUpdate()
            break;
        //Hotspot off
        case "hotspot":
            accesspointUpdate();
            break;
        //Wi-Fi off
        case "wifi":
            wirelessUpdate();
            accesspointUpdate(); //often the AP is going up instead of Wi-Fi
            break;
        default:
            return false;
    };
};
//...............................................................................[only About page]
/**Updates the frame about time, date, uptime, versions and licence
 * Emits ("timestamp-versions", { date: "day...", time: "hh:mm...", ..." } )
 * @param  {object}  frameData, { date: "day...", time: "hh:mm...", version: "5.xxxx", os: "...", license: "GNU .." }
 * @global {io}     "timestamp-versions"
 * @return {string}  frameData
 */
async function timeVersionsLicenseUpdate() {
    let frameData = await mod.aboutTimeandVersions();
    io.emit("timestamp-versions", frameData);
    return frameData;
};
/**Updates the frame about memory disk usage
 * Emits ("diskmemory",  { size: "nnn GB", used: "nn%" }  )
 * @param  {object}  frameData,  { size: "nnn GB", used: "nn%" } 
 * @global {io}     "timestamp-versions"
 * @return {string}  frameData
 */
async function diskMemoryUpdate() {
    let frameData = await mod.aboutMemoryUsage();
    io.emit("diskmemory", frameData);
    return frameData;
};
/**Updates the frame about RAM usage
 * Emits ("ram-usage",   { ram: "n GB", inUse: "nn%" }  )
 * @param  {object}  frameData, { ram: "n GB", inUse: "nn%" }
 * @global {io}     "ram-usage"
 * @return {string}  frameData
 */
async function ramMemoryUpdate() {
    let frameData = await mod.aboutRAMUsage();
    io.emit("ram-usage", frameData);
    return frameData;
};
/**Updates the frame about streaming services
 * Emits ("streaming",   { spotify: false, airplay: false, bluealsa: false } )
 * @param  {object}  frameData, { spotify: boolean, airplay: boolean, bluealsa: boolean }
 * @global {io}     "streaming"
 * @return {string}  frameData
 */
async function nowStreamingUpdate() {
    let frameData = await mod.aboutStreamingServices();
    io.emit("streaming", frameData);
    return frameData;
};
/**Updates the frame about amplifier and Bluetoot Speaker
 * Emits ("streaming",   { muted: true, usingAlsa: "", speaker: "" } )
 * @param  {object}  frameData, { muted: boolean, usingAlsa: "", speaker: "", sampling: "", format: "" } }
 * @global {io}     "amplifier"
 * @return {string}  frameData
 */
async function amplifierUpdate() {
    let frameData = await mod.aboutAmplifier();
    io.emit("amplifier", frameData);
    return frameData;
};
/**Updates the frame about signal levels for Wi-Fi and Bluetooth
 * Emits ("signal",   { wifi: false, ssid: "",...}  ...)
 * @param  {object}  frameData,  { wifi: false/"Link Quality...", ssid: "<ssid>", bluetooth: boolean, 
 *                                 speaker: false/{name: <name>, link: "Good..."}, 
 *                                 sources: false/[ {name: <name>, link: "Good..."}, ...], version:"" }
 * @global {io}     "signal"
 * @return {string}  frameData
 */
async function signalUpdate() {
    let frameData = await mod.aboutConnections();
    io.emit("signal", frameData);
    return frameData;
};
/**Updates the frame about the hardware
 * Emits ("hardware",   { computer: "", card: "" } )
 * @param  {object}  frameData, { computer: "", card: ""  }
 * @global {io}     "hardware"
 * @return {string}  frameData
 */
async function hardwareUpdate() {
    let frameData = await mod.aboutHardware();
    io.emit("hardware", frameData);
    return frameData;
};
//render important internal states_________________________________only used by the hidden Streamer Model page
/**Updates the frame about internal states of interest
 * Emits ("internal",  { muted: boolean, ... see below )
 * @param  {object}  frameData, { muted: boolean, isOpenPage: boolean, isStartPage: boolean, isFile: boolean }
 * @global {io}     "internal"
 * @return {string}  frameData
 */
async function internalUpdate() {
    let frameData = await mod.internalStates();
    io.emit("internal", frameData);
    return frameData;
};
/**Updates the frame about critical error regarding CPU, temperature and voltage
 * Emits ("internal",  { throttle: false, power: false, hot: ...     see below )
 * @param  {object}  frameData, { throttle: false, power: false, hot: false, temp: string, volt: string }
 * @global {io}     "critical"
 * @return {string}  frameData
 */
async function criticalUpdate() {
    let frameData = await mod.internalErrors();
    io.emit("critical", frameData);
    return frameData;
}

//==========================================================================================Incoming
//Protocol for incoming PAGES requests ===========================================================P1
//--------------------------------------------------------------------------------------------------
/** P1. set up listener for incoming render request from socket page that has
 * opened or wants an update, i.e. rerendering. This specific listener causes
 * rerendering of Streamer web pages. All actions are end points.
 * The object 'socket.data' can store arbitrary system specific data. The type of page
 * is stored in extra attributes for example 'startpage' of 'socket.data'. True if it is a startpage.
 * Attributes used: "startpage", "bluetoothpage". "wifipage" and "settingspage"
 * This attribute is checked and used by ctl.isOpenStartPage()
 * References: https://socket.io/docs/v4/server-instance/#utility-methods
 * @param     {object}        socket, socket.io object, i.e. a connected web page
 * @param     {object}        socket.data, add attribute 'page' -  set to type of page
 * @listener  {socket}        sets up listeners for page rendering events
 * @return    {?}             of no interest
 */
function incomingPageRequests(socket) {
    //Listener for render request from socket connected web page that has opened...
    socket.on('page-opens', async function (data) {
        //console.log("[OPEN]");
        //console.log(aux.timeStamp(), "view: page is open:", data.page);       
        
        switch (data.page) {
            case "startpage":
                //console.log(aux.timeStamp(), "view: start page, reason[H]:", data.when);
                //mark the socket with type of page
                socket.data.startpage || (socket.data.startpage = true);
                renderStartPage(); //end-point in function - render full start page
               
                break;
            case "wifipage":
                //console.log(aux.timeStamp(), "view: network page, reason[N]:", data.whe,);
                //mark the socket with type of page
                socket.data.wifipage || (socket.data.wifipage = true);
                renderNetworkPage(); //end-point in function - render full start page

                break;
            case "bluetoothpage":
                //console.log(aux.timeStamp(), "view: bluetooth page, reason[B]:", data.when);
                //mark the socket with type of page
                socket.data.bluetoothpage || (socket.data.bluetoothpage = true);
                renderBluetoothPage();
                break;
            case "aboutpage":
                //console.log(aux.timeStamp(), "view: about page, reason[A]:", data.when);
                //mark the socket with type of page
                socket.data.aboutpage || (socket.data.aboutpage = true);
                renderAboutPage();
                break;
            case "modelpage":
                //console.log(aux.timeStamp(), "view: model page, reason[M]:", data.when);
                //mark the socket with type of page
                socket.data.modelpage || (socket.data.modelpage = true);
                renderModelPage()
                break;
        };
    });
};

//==========================================================================================Incoming
//Protocol for incoming USER requests ============================================================P2
//--------------------------------------------------------------------------------------------------
 /** P2. Sets up listeners for incoming user request from socket page that are
  * opened. This function defines the frontend protocol of user requests.
  * This set of listeners causes different kind of control actions to be done
  * by streamer-control.js and specialized library function in the folder /lib. Unlike
  * P1 above the end points are not in this function - it occurs at completion of the request.
  * The GV blockUI is set here, in the parsing of user requests. Also in renderScannedSpeakers()
  * and renderScannedSSIDs() - just to be sure to release the user interface.
  * @param     {socket.io}     socket, socket.io object, i.e. a connected web page
  * @global    {boolean}       blockUI, during connections the UI needs to be blocked
  * @listener  {socket.io}     page generated user events
  * @return    {?}             no one knows...
  */
function incomingUserRequests(socket) {
    //__________________________________________________________________________________
    //Stop streaming..................................................... STOP streaming
    socket.on('stop-streaming-now', function (data) {
        console.log(aux.timeStamp(), "[H] Frontend: stop streaming", data);
        ctl.userStopStreaming(data);
    });


   //Volume change................................................. --|-- VOLUME slider
    socket.on('volume', function (data) {
     //console.log(aux.timeStamp(), "[H] Frontend: volume changed", data);
     ctl.setVolume(data); 
    });
    //Reset streamer............................................................. RESET
    socket.on('reset', async function (data) {
        //console.log(aux.timeStamp(), "[H] Frontend: RESET streamer", data);
        if (blockUI === false) {
            blockUI = true;  //no user interference during restart
            await ctl.restartStreamer();
            blockUI = false;
        }; 
    });


    //_________________________________________________________________________________
    //Bluetooth Speakers.............................................Bluetooth Speakers
    //Scan for bluetooth speakers
    socket.on('scan-speakers', async function (data) {
        //console.log(aux.timeStamp(), "[B] Frontend: scan for bt speaker", data );
        if (await mod.bluetoothStatus() == "yes") {            //yes = no block, unblocked, bluetooth is on
            if (blockUI === false) {
                blockUI = true;  //no user interference during scanning, takes a long while
                await ctl.scanForBtSpeakers();
                blockUI = false;
            };
        }
        else {
            renderMessage({ page: "bluetooth", type: "error", missive: "Bluetooth is off... you have to turn it on first!" });
        };
    });
   //Connect a Bluetooth audio sink device (a bt speaker)
   socket.on('connect-speaker', function (data) {
     ctl.connectBtSpeaker(data);
   });

   //Disconnect a Bluetooth audio sink device (a bt speakers)
   socket.on('disconnect-speaker', function (data) {
       //console.log(aux.timeStamp(), "[B] Frontend: disconnect bt speaker", data);
       ctl.disconnectBtSpeaker();
   });
   //---------------------------------------------------------------------------------
   //Any Bluetooth Devices...........................................Bluetooth Devices
   //Remove a disconnected bluetooth audio sink/source from frontend (untrust, unpair)
   socket.on('untrust-device', function (data) {
     //console.log(aux.timeStamp(), "[B] Frontend: untrust bt device", data);
     ctl.untrustDevice(data);
   });
   //_________________________________________________________________________________
   //Bluetooth source (phone).................................Bluetooth Source (phone)
   //Disconnect a Bluetooth audio source device (a smart phone...)
   socket.on('disconnect-device', function (data) {
     //console.log(aux.timeStamp(), "[B] Frontend: disconnect for phone", data);
     ctl.disconnectBtDevice(data);
   });

   //_________________________________________________________________________________
   //Wireless or Bluetooth connection.................Wireless or Bluetooth connection
   //Enable Bluetooth service or start Hotspot (Access Point)
   socket.on('connect-network', function (data) {
     //console.log(aux.timeStamp(), "[B] [N] Frontend: connect request", data);
       if (blockUI === false) {
           blockUI = true;
           ctl.connectNetwork(data);
           aux.sleep(200).then(() => {
               networkUpdate(data.network); //render frame for network
               renderBluetoothPage();       //remove/change frame for bluetooth
               blockUI = false;
           });
       };
   });

   //Disable Bluetooth service or disconnect Wi-Fi or stop Hotspot
   socket.on('disconnect-network', function (data) {
       //console.log(aux.timeStamp(), "[B] [N] Frontend: disconnect request", data);
       if (blockUI === false) {
           blockUI = true;
           ctl.disconnectNetwork(data);
           aux.sleep(300).then(() => {
               //console.log(aux.timeStamp(), "view: wait is over, render:", data.network);
               networkUpdate(data.network); //remove/change frame for network
               renderBluetoothPage();       //remove/change frame for bluetooth
               blockUI = false;
           });
       };
   });
   //Scan for Wi-Fi networks
   socket.on('scan-wifi', function (data) {
       console.log(aux.timeStamp(), "Network Page: Wi-Fi scan request......[N]");
       if (blockUI === false) {
           io.emit('wifi-connecting'); //start spinner
           console.log(aux.timeStamp(), "Network Page: started the spinner......[N]");
           blockUI = true;
           ctl.wirelessScan();
           blockUI = false;
       };
   });
   //Connect to Wi-Fi
   socket.on('wifi-connect', async function (data) {
     console.log(aux.timeStamp(), "Network Page: Wi-Fi connection request", data,"[N]");
       if (blockUI === false) {
           await ctl.connectWireless(data);
       };
   });
};
//======================================================================== End of protocol 2

//============= SIMULATION =================
// Eneby 30: FC:58:FA:B8:F6:14
// Eneby 20: FC:58:FA:ED:57:60
// Hk spkr   FC:58:FA:CC:30:A4
// Galaxy    34:14:5F:48:32:F8

//connectedDevices = [{ bdAddr: "FC:58:FA:1B:06:66", name: "Galaxy S21 Ultra 5G" }, { bdAddr: "CA:38:AB:1C:06:77", name: "My iPhone" }, { bdAddr: "FF:88:FF:FF:01:00", name: "Samsung Galaxy 8" } ];
//pairedDevices = [{ bdAddr: "FC:58:FA:1B:06:66", name: "Galaxy S21 Ultra 5G" }, { bdAddr: "CA:38:AB:1C:06:77", name: "My iPhone" }, { bdAddr: "FF:88:FF:FF:01:00", name: "Samsung Galaxy 8" } ];

