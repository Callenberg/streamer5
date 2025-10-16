//Copyright 2025 by Retro Audiophile Designs
//GNU General Public License v3.0 or later see license.txt            [Source code]
//        ~ backend control of RAD Network Music Streamer ~

//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';

const fs = require('fs');
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

const aux = require('/streamer/lib/machine-auxiliary.js'); //auxiliary functions
const mod = require('./streamer-model.js');          //model of streamer
//BOOT sequence starts ======================================================= bootctl
console.log("\n");
console.log("\nStreamer is now booting:  . . . . . . . . . . . . . . . . . . . . .");
const RAD_SYSTEM_VERSION = mod.getVersion();//official version
console.log("Version:", RAD_SYSTEM_VERSION);
console.log("Copyright 2025 by Retro Audiophile Designs,  license GPL 3.0 or later");
console.log(aux.timeStamp(), "====================================================");
//Required modules . . .
const exec = require('child_process').exec;         //for OS CLI cmds
const execSync = require('child_process').execSync; //for synced OS CLI cmds
//const loop = require('./lib/streamer-loop.js');      //loop ctl
const detect = require('./lib/streamer-detect.js');  //detect loops

const view = require('/streamer/streamer-view.js');  //view of streamer
const nwork = require('./lib/streamer-network.js');  //network & bluetooth mngt
const alsa = require('./lib/streamer-alsa.js');      //sound mngt
//const blut = require('./lib/machine-bluetooth.js'); //bluetooth for smart phone
const btsp = require('./lib/streamer-bluetoothspeaker.js'); //bluetooth for speakers
//const res = require('./lib/machine-restart.js');    //restart streaming
const spot = require('./lib/streamer-spotify.js');    //spotify - librespot
const air = require('./lib/streamer-airplay.js');     //airplay - shairport
//const stat = require('./lib/machine-state.js');     //show states and status


module.exports.setVolume = setVolume;
module.exports.scanForBtSpeakers = scanForBtSpeakers;
module.exports.connectBtSpeaker = connectBtSpeaker;
module.exports.speakerGotDisconnected = speakerGotDisconnected;
module.exports.speakerGotReconnected = speakerGotReconnected
module.exports.disconnectBtSpeaker = disconnectBtSpeaker

module.exports.untrustDevice = untrustDevice;
module.exports.disconnectBtDevice = disconnectBtDevice;

module.exports.connectNetwork = connectNetwork;
module.exports.disconnectNetwork = disconnectNetwork;
module.exports.wirelessScan = wirelessScan;
module.exports.connectWireless = connectWireless;

module.exports.restartAllStreaming = restartAllStreaming;
module.exports.startedStreaming = startedStreaming;
module.exports.stoppedStreaming = stoppedStreaming;
module.exports.userStopStreaming = userStopStreaming;
module.exports.restartStreamer = restartStreamer;

//[C] Control - Immediately-Invoked Function Expression (IIFE) for boot sequence
(() => {
    
    //start boot commands
    bootPhaseOne();
})()

/**Boot function calls starts...
 * with starting and resetting time critical subsystems of streamer
 * @param               wait, delay before next phase
 * @return {?}    of no interest
 */
async function bootPhaseOne(wait = 50) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: time critical------------[1] started");
    await aux.remountSSD(true);                      //true writes a message, be sure the SSD is r/w
    await view.bootWebServer();                      //start web server and io.socket
    await detect.loopCtlBootPreparations();    //reset the two log files
    await alsa.soundBootPreparation();         //reset volume and unmutes amplifier
    //...wait
    aux.sleep(wait).then(() => {               
        bootPhaseTwo();
    });             
};
/**Boot continues with starting:
 *  reset less time critical subsystems of streamer
 * @param {integer}     wait, delay before next time,needs to be in the 100s
 * @return {?}    of no interest
 */
async function bootPhaseTwo(wait = 300) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: resets-------------------[2] started");
    spot.stopSpotifyService();
    air.stopAirplayService();
    stopBluealsaService();
    nwork.prepareBluetooth();  //disconnects all Bluetooth devices
    nwork.prepareWireless();   //AP or Wi-Fi connections are set

    //...wait
    aux.sleep(wait).then(() => {               
        bootPhaseThree();
    });
};
/**Boot continues with:  
 *  start stream and detect subsystems, configure bluetooth speaker
 * @param {integer}     wait, delay in ms
 * @return {?}          of no interest
 */
async function bootPhaseThree(wait = 200) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: controls-----------------[3] started");
    await reconnectIfSpeaker(true);//true, means no restart of streaming, happens in phase 4
    await detect.beginStreamDetect();    //streamer service watchers starts, always running
    await detect.beginPagesDetect();     //frame updates loops starts, runs when a page is open.     
    
    //...wait
    aux.sleep(wait).then(() => {                
        bootPhaseFour();
    });
};
/**Boot ends with:  
 * start services and play a start sound
 * @param {integer}     wait, delay in ms
 * @return {boolean}    of no interest
 */
async function bootPhaseFour() {
    let startVolume = 0;
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: last part----------------[4] started");
    air.startAirplayService();
    spot.startSpotifyService();
    startBluealsaService();
    console.log(aux.timeStamp(), "Boot Phase: all streaming service started...");
    if (await alsa.isAmpMuted() === false) {
        console.log(aux.timeStamp(), "Boot Phase: analogue speaker is in use...");
    }
    else {
        console.log(aux.timeStamp(), "Boot Phase: Bluetooth speaker is in use:", await mod.bluetoothSpeakerName());
    };
    startVolume = await mod.getVolume("streamer ctl start sound");
    await alsa.startupSound(startVolume); //play start sound
    //console.log(aux.timeStamp(), "Boot Phase: NO alsa.startupSound()        [!]");
    console.log(aux.timeStamp(), "============================================|");
    console.log(aux.timeStamp(), "Streamer Boot Completed in:");
    console.log(execSync(`sudo systemd-analyze time`,
        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 }));
    console.log("Boot residue  . . . . . . . . . . . . . . . . . . . . . . . |")
    if (await mod.areOpenPages() === true) {
        view.renderAllPages()
    };
};
//BOOT ends =================================================================================== boot ends
//=======================================================================================================


//[C] control - response for frontend user request=======================================================
//------------------------------------------------------------------------------------------User Requests
//_______________________________________________________________________________________________________
//Volume management..............................................................................[Volume]
//=======================================================================================================
/**Set volume, the volume is written to a file in streamer/data and used as the start up volume after boot. 
 * No render required here since the user is using the slider and the Start Page must be open.
 * @param  {data}    data, Key word object from frontend with the new volume
 * @return {integer} volume 0-100, linear scale
 */
async function setVolume(data) {
    //console.log(aux.timeStamp(), "ctl: recieved volume:", data);
    let newVolume = data.volume;
    if (typeof newVolume === "number") {
        await alsa.setVolume(newVolume);
        alsa.writeStartVolume(newVolume);
        return newVolume;
    }
    else {
        return 0;
    };
};
//_______________________________________________________________________________________________________
//Bluetooth Speaker management........................................................[Bluetooth Speaker]
//=================================it is assumed that Bluetooth Page is open=============================

/**Scan for reachable Bluetooth audio sink devices. This will take a long time.
  * Starts the scan for speakers and sends the resulting array to the 
  * view.renderScannedSpeakers() on the format:
  *  [{bdAddr: "<bd-addr>"", name: "<name>""}, ...] or []
  * While waiting a message is sent as an object to view.renderMessage() on format:
  *  {page: "<page>", type: "<type of message>", missive: "<message>" }
  * @return{boolean}       true  ....of no interest
  */
 //....................................................................................[Scan for Speakers]
async function scanForBtSpeakers() {
    view.renderMessage({ page: "bluetooth", type: "info", missive: "Scanning started. . .       this will take a looong while." });
    //Request a scan . . .
    let speakerArray = await nwork.scanforSpeakers();
    view.renderScannedSpeakers(speakerArray);
    if (speakerArray.length == 0) {
        view.renderMessage({ page: "bluetooth", type: "mishap", missive: "No speakers found!" });
    };
    return true;
};
//..................................................................................[Connect the Speaker]
//-------------------------------------------------------------------------------------------------------
/**Connect the by the user choosen Bluetooth audio sink device - the speaker.
 * Recieved socket.io event at view: 'socket.on('connect-speaker', function (data) . . .'
 * Calls the nwork.btConnectCtl() and if that went well - done...
 * ... then mute the amplifier and trust the speaker. Enable asound.conf and restart Bluealsa.
 * These are critical key criterias that are used to confirm speaker activities:
 *          a. muted amplifier
 *          b. there is a connected speaker
 *          c. trusted speakers
 *          d. the asound.conf file
 * QUESTION: should the bluetoothctl turn discovery to no? otherwise more than one speaker may connect?
 *           this could be done to check if a speaker is alreay disconnect - reject and send a message
 * QUESTION: bluealsa needs a restart, so do librespot and shairport-sync most likely in order to redirect from the alsa.
 * @param  {object}   data, {bdAddr: "<BD address", name: "<name>"}
 * @return {boolean}  true  ....of no interest
 */
async function connectBtSpeaker(data) {
    let outcome = false;
    let bdaddr = data.bdAddr;
    //request a connect . . .
    outcome = await nwork.btConnectCtl(bdaddr);
    //console.log(aux.timeStamp(), "ctl[bt]: connection?", outcome, "for", bdaddr);
    if (outcome === true) {
        //Outcome: a speaker is connected
        await nwork.enableAsoundConf(bdaddr);
        await alsa.muteUnmuteAmp(false);
        await nwork.trustSpeaker(bdaddr);
        restartAllStreaming();
        view.renderMessage({ page: "bluetooth", type: "done", missive: "Speaker connected!" });
    }
    else {
        //Outcome: most likely the speaker was not available and the connection failed
        await alsa.muteUnmuteAmp(true);         //be sure that the amplifier is unmuted
        //console.log(aux.timeStamp(), "ctl: no connection [FAIL] -- does /etc/asound.conf file exist?", (nwork.isFile() == false), " [*]");
        view.renderMessage({ page: "bluetooth", type: "error", missive: "ERROR:\nUnable to connect!" });
        restartAllStreaming();                  //just in case...
    };
    mod.newSpeakerStatus(bdaddr);              //eventually update frontend
    return true;
};

//............................................................................[external speaker reconnect]
//                                                                      There might be no pages open here]

/**A trusted bluetooth speaker connected itself (often when turned on).
 * Trusted speakers always tries very hard to reconnect - this function is called by detect.
 * If there is no /etc/asound.conf in place this was definitely an autoconnect,
 * there cannot be with an extra update if it was a user connect that got caught.
 * Check if there is at least one page open.
 * @param  {object}   bdAddr, bdAddr as a string
 * @return {boolean}  true  ....of no interest
 */
async function speakerGotReconnected(bdAddr) {
    if (nwork.isFile() == false) {
        //console.log(aux.timeStamp(), "ctl: incoming external connect of", bdAddr);
        await alsa.muteUnmuteAmp(false);  //mutes the amplifier
        await nwork.enableAsoundConf(bdAddr);
        restartAllStreaming();
        await mod.areOpenPages() && mod.newSpeakerStatus(bdAddr);
    };
    return true;
};
//BOOT..........................................................................[speaker reconnect at boot]
//                                                                       There might be no pages open here]
/**If a trusted bluetooth speaker has reconnected itself at boot since it was already on.
 * Very similar to speakerGotReconnected(bdAddr) above - but here we do not have the BD-address and
 * the streaming service cannot be started at boot. Check if there are at least one page open.
 * @param  {boolean}  isBoot, if true do not restart streaming or update model
 * @return {boolean}  true  ....of no interest
 */
async function reconnectIfSpeaker(isBoot = false) {
    let bdAddr = await mod.theConnectedBluetoothSink();
    if (bdAddr.length > 0) {
        console.log(aux.timeStamp(), "ctl: a speaker is already connected:", bdAddr); 
        await alsa.muteUnmuteAmp(false);                 //mutes the amplifier
        await nwork.enableAsoundConf(bdAddr);
        //if not in boot phase  restart streaming   ...and given at least on open page, update the model
        (isBoot === false) && restartAllStreaming();      
        (isBoot === false) && await mod.areOpenPages() && mod.newSpeakerStatus(bdAddr);
    }
    else {
        console.log(aux.timeStamp(), "ctl: there is no speaker connected...");
    };
    return true;
};
//....................................................................................[Disconnect the Speaker]
//------------------------------------------------------------------------------------------------------------
/**The connected Bluetooth speaker will be disconnected - there can only be one...
 * After disconnection unmute amplifier, delete the asound.conf file and restart all streaming.
 * When all that is done call view.bluetoothSpeakerUpdate("") directly - empty string is important
 * Unlike connect there is no need to call mod.newSpeakerStatus() and figure out the name first.
 * @param  {boolean}  data, an object; {name: <name>, bdAddr: <bd-addr>}
 * @return {boolean}  true  ....of no interest
 */
async function disconnectBtSpeaker() {
    let outcome = false;
    let bdaddr = await mod.theConnectedBluetoothSink();
    //order a disconnect . . .
    outcome = await nwork.btDisconnectCtl(bdaddr);
    //console.log(aux.timeStamp(), "ctl: DISCONNECT?", outcome, "of:", bdaddr, "[X]" );
    await alsa.muteUnmuteAmp(true);   //unmutes the amplifier
    //console.log(aux.timeStamp(), "ctl: delete /etc/asound.conf file?", (nwork.isFile() == true), " [X]");
    await disableAsoundConf();
    restartAllStreaming();
    view.bluetoothSpeakerUpdate("");
    view.trustedSpeakersUpdate();       //this frame needs an update as well
    return true;
};
//................................................................................[external speaker disconnect]
//                                                                           There might be no pages open here]
/**The connected bluetooth speaker got disconencted by an external event. Called by detect - not user.
 * This happens when the speaker is turned off or it looses the connection.
 * Be aware that a user disconnect is also triggered here - check amplifier first!
 * Finally call view.bluetoothSpeakerUpdate("") directly - empty string is important = no speaker
 * Unlike connect there is no need to call mod.newSpeakerStatus() and figure out the name first.
 * @param  {object}   bdAddr, bdAddr as a string
 * @return {boolean}  true  ....of no interest
 */
async function speakerGotDisconnected() {
    //there might be a synchronization matter here,between user disconnect
    //and external disconnect, better be sure and check the amplifier first...
    if (await alsa.isAmpMuted() == true) {
        //console.log(aux.timeStamp(), "ctl: external DISCONNECT of speaker [X]");
        await alsa.muteUnmuteAmp(true);   //unmutes the amplifier
        //console.log(aux.timeStamp(), "ctl: delete /etc/asound.conf file?", (nwork.isFile() == true), " [X]");
        await nwork.disableAsoundConf();
        restartAllStreaming();
        await mod.areOpenPages() && view.bluetoothSpeakerUpdate("");
    };
    return true;
};
//...................................................................................[untrust Bluetooth device]
/** Remove a Bluetooth device (source or sink) by user. It is already disconnected.
 * The device is removed, otherwise it stays trusted and will reconnect. Just
 * doing a disconnect is not enough. Update the right frame.
 * @param  {string}    data, an object with BD address and type of Bluetooth device
 * @param  {string}    isSource, true if the device is a phone
 * @return {boolean}   true, always
 */
async function untrustDevice(data, isSource = false) {
    let bdaddr = data.bdAddr;
    let typeOfDevice = data.type;
    await nwork.removeDevice(bdaddr);
    if (typeOfDevice == "speaker") {
        view.trustedSpeakersUpdate();
    }
    else {
        view.pairedDevicesUpdate();
    };
    return true;
};
//................................................................................[Disconnect a source device]
//------------------------------------------------------------------------------------------------------------
/** Disconnect one of the Bluetooth source devices (often a phone) by user.
 * The device is still paired after this. Update both source frames.
 * @param  {string}    data, an object with the BD address
 * @return {boolean}   true, always
 */
async function disconnectBtDevice(data) {
    let bdaddr = data.bdAddr;
    let typeOfDevice = data.type;
    await nwork.btDisconnectSource(bdaddr);
    view.connectedDevicesUpdate();
    view.pairedDevicesUpdate();
    return true;
};
//_______________________________________________________________________________________________________
//Network services and connections management......................................... [Network Services]
//===========================================it is assumed that Network Page is open=====================

/**Disconnector - Start Bluetooth service or start Hotspot depending on the incoming 
 * user request from front end.
 * Wi-Fi is a separate case and dealt with below.
 * Streamer-View.js will rerender using view.networkUpdate(networkType)
 * @param     {data}          data, { network: <network type> }
 * @return    {?}             of no interest
 * */
function connectNetwork(data) {
    switch (data.network) {
        //Bluetooth - turns on the bluetooth network service
        case "bluetooth":
            //console.log(aux.timeStamp(), "ctl: request to START Bluetooth service...");
            nwork.turnOnBluetooth();
            break;
        //Hotspot on
        case "hotspot":
            //console.log(aux.timeStamp(), "ctl: request to START Hotspot...");
            nwork.accesspointUp();
            break;
        default:
            //What is going on?... abnormal
            aux.sleep(2000).then(() => { //hold it for 2 secs...
                view.bluetoothUpdate();
                view.accesspointUpdate();
                view.wiredUpdate();
                return false;
            });
    };
};
/**Disconnector - Disable Bluetooth service or disconnect Wi-Fi or stop Hotspot 
 * depending on theincoming user request from front end.
 * Streamer-View.js will rerender using view.networkUpdate(networkType)
 * @param     {data}          data, { network: <network type> }
 * @return    {?}             of no interest
 * */
async function disconnectNetwork(data) {
    //console.log(aux.timeStamp(), "Ctl: request to STOP network service =", data.network);
    switch (data.network) {
        //Bluetooth off - turns off the bluetooth network service
        case "bluetooth":
            //console.log(aux.timeStamp(), "ctl: request to STOP Bluetooth service...");
            let streamingString = await detect.whatStreaming();
            await nwork.turnOffBluetooth();
            if (streamingString.indexOf("bluetooth") > -1) {
                detect.stopStreamsensor(); //writes 'idle:stop" to /var/log/streamsensorlog'
            };
            break;
        //Hotspot off
        case "hotspot":
            //console.log(aux.timeStamp(), "ctl: request to take DOWN Hotspot...");
            let wifiArray = await mod.wirelessStatus();
            let wired = await mod.wiredStatus();
            if((wifiArray.length > 0) || (wired.length > 0)){
                nwork.accesspointDown();
            }
            else {
                view.renderMessage({ page: "network", type: "mishap", missive: "Cannot take down Hotspot!" });
            };
            break;
        //Wi-Fi off
        case "wifi":
            //console.log(aux.timeStamp(), "ctl: ...start to DISCONNECT from Wi-Fi network!");
            nwork.wifiDisconnect();
            break;
        default:
            //What is going on?... abnormal
            aux.sleep(2000).then(() => { //hold it for 2 secs...
                view.bluetoothUpdate();
                view.accesspointUpdate();
                view.wiredUpdate();
                return false;
            });
    };
};


/** Wi-Fi - scan for reachable wifi networks.
 * Return the list as an array to the frontend WiFi page on the format:
 * [ ssid ssid ...]
 * @return{boolean}      true  ....of no interest
 */
async function wirelessScan() {
    console.log(aux.timeStamp(), "ctl: wi-fi scan will start now");
    let wifiArray = await nwork.scanForWiFi();
    console.log(aux.timeStamp(), "ctl: wi-fi scan yielded this array:\n", wifiArray);
    //the assumption is that Network Page is open
    view.renderScannedSSIDs(wifiArray);
    return true;
};
/** Wi-Fi - connects to Wi-Fi, given the ssid and the password
 * If the connect is successful all the streaming services are restarted. If there
 * is streaming going on there is a need to write idle:stop to the streamsensor.log
 * [ ssid ssid ...]
 * @param  {object}        data, {ssid: <ssid>, password: <password> }
 * @return {boolean}       false or true  ...depending of the outcome
 */
async function connectWireless(data) {
    console.log(aux.timeStamp(), "ctl:user choose this ssid:", data.ssid);
    let isConnected = await nwork.connectWifi(data.ssid, data.password);
    //the assumption is that Network Page is open
    view.wirelessUpdate();
    if (false) {
    //if (isConnected == true) {    //this did not help to reconnect
        let isStreaming = await detect.whatIsStreaming();
        //console.log(aux.timeStamp(), "ctl:write to streamsensor.log???...", isStreaming);
        (isStreaming !== false) &&  await detect.stopStreamsensor(isStreaming); //write idle to streamsensor.log
        restartAllStreaming();                            //restart services and hope they could be found by Wi-Fi too
    };
    return isConnected;
   
};
//_______________________________________________________________________________________________________
//Restart Streamer........................................................................ [soft restart]
//===========================================it is assumed that Start Page is open=======================
/**Restart Streamer, a soft restart - not reboot.
 * Stop streaming services and reset them. Disconnect Bluetooth devices, if Bluetooth is on.
 * Restart all critical timers.
 * Return to the state with amplifier unmuted, no bluetooth devices and
 * state is idle. However, all connnctions are kept.
 * @return {boolean}      true
 */
async function restartStreamer(wait = 1500) {
    let isBluetooth = await mod.bluetoothStatus();
    view.renderMessage({ page: "start", type: "info", missive: "Restarting Streamer system..." });
    await detect.stopPagesDetect();
    await detect.stopStreamDetect();
    await detect.stopStreamsensor();
    view.renderMessage({ page: "start", type: "info", missive: "Audio streaming is reset." });
    spot.stopSpotifyService();
    air.stopAirplayService();
    stopBluealsaService();
    if (true) {    //All devices disconnect always, before: (isBluetooth === "yes")    
        //remove all bluetooth devices
        let theSpeaker = await mod.theConnectedBluetoothSink();                 //"<bd-aStopped audio streamingddr>" or ""
        let connectedArray = await mod.connectedBluetoothSourcesNames();        //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        let trustedArray = await mod.trustedOnlyBluetoothSpeakers();            //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        let pairedArray = await mod.pairedOnlyBluetoothSources();               //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        isBluetooth.indexOf("no") > -1 && await nwork.turnOnBluetooth();
    //wait for bluetooth which has to be on in order to remove
        aux.sleep(wait * 0.5).then(async function () {
            if (theSpeaker.length > 1) {
                await nwork.removeDevice(theSpeaker);
            };
            removeAllDevices(connectedArray);
            removeAllDevices(trustedArray);
            removeAllDevices(pairedArray);
            view.renderMessage({ page: "start", type: "info", missive: "Resetting Bluetooth. Any Bluetooth devices are disconnected" });
            //now Bluetooth has to be turned off - bluetooth is always on here - turn it off
            nwork.turnOffBluetooth();
            await disableAsoundConf();
        });
    };  
    //...wait
    aux.sleep(wait * 2).then(async function () {
        await detect.beginPagesDetect();
        await detect.beginStreamDetect();
        (isBluetooth.indexOf("yes") > -1) && nwork.turnOnBluetooth();
        restartAllStreaming();
        aux.sleep(wait).then(() => {
            //render pages
            view.renderAllPages();
            aux.sleep(wait * 0.25).then(() => {
                view.renderMessage({ page: "start", type: "done", missive: "Streamer system restarted!" });
            });
        });
    });     
};
/**Helper to restart Streamer - removes all bluetooth devices from bluetoothctl register.
 * All the devices will be disconnected, untrusted and unpaired.
 * Could be moved to streamer-network.js
 * @param   {array}       array, an array of objects [{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
 * @return {boolean}      true
 */
async function removeAllDevices(array) {
    for (let i = 0, arrayLength = array.length; i < arrayLength; ++i) {
        await nwork.removeDevice(array[i].bdAddr)
    };
    return true;
};


//[C] control - streaming service management==========================================
//------------------------------------------------------------------Streaming Services

//Restart of of all streaming services......................................... [restart of all streaming]
/**Restart all streaming services. Required when a Bluetooth speaker is connected or disconnected.
 * The systemctl 'restart' command is a two-step operation: it first stops each service and 
 * then immediately starts it again. This is a must since configuration changes are made,
 * and a complete reinitialization is needed for alsa changes (asound.conf in this case). 
 * No more need to restart the bt detetect loop - file descriptor loop with timer: [2]
 * @return {boolean}      true
 */
function restartAllStreaming() {
    spot.restartSpotify();
    air.restartAirplay();
    restartBluealsaAplay();
   // console.log(aux.timeStamp(), "ctl: all streaming services restarted :::::");
    return true;
};
//When a streaming service start - STOP the other ones................. [stop the other streaming services]
/** Stop all service except the one that is streaming. Used when a streaming starts 
 * and then all the other services needs to be blocked. Otherwise there will be  
 * stuttering and chaos when the current streaming stops.
 * @param {string} streamingStarted, the service that is now streaming
 * @return {?}     of no interest
 */
async function startedStreaming(streamingStarted) {
//console.log(aux.timeStamp(),"ctl: incomming STARTED =", streamingStarted, "[>]");
    switch (streamingStarted) {
        case "spotify":
            air.stopAirplayService();              
            //stopBluealsaService();                      
            break;
        case "airplay":
            spot.stopSpotifyService();
            //stopBluealsaService();
            break;
        case "bluetooth":
            spot.stopSpotifyService();
            air.stopAirplayService();  
            break;
        default://this should not happen...
            //stopAllStreaming();       //is an option here
            return false
    };
};
//When a streaming service stops - START the other ones............... [start the other streaming services]
/** Stop all service except the one that is streaming. Used when a streaming starts 
 * and then all the other services needs to be blocked. Otherwise there will be  
 * stuttering and chaos when the current streaming stops.
 * @param {string} streamingStarted, the service that is now streaming
 * @return {?}     of no interest
 */
async function stoppedStreaming(streamingStopped) {
    //console.log(aux.timeStamp(),"ctl: incomming STOPPED =", streamingStopped, "[X]")
    switch (streamingStopped) {
        case "spotify":
            air.startAirplayService();
            //startBluealsaService();
            break;
        case "airplay":
            spot.startSpotifyService();

           //startBluealsaService();
            break;
        case "bluetooth":
            spot.startSpotifyService();
            air.startAirplayService();
            break;
        default://this should not happen...
            detect.stopStreamsensor(streamingStopped); //write stop to streamsensor.log
            restartAllStreaming();                     //is an option here
            return false
    };
};
//When a user stops a streaming service - START the other ones........................ [user stops a services]
/** Stop the streaming by writing stop to the /var/log/streamsensor.log
 * ... then stop the service itself except that the bluetooth audio stream has to
 * be stopped. It is brutally done by turning bluetooth off.
 * @param {string} streamingStarted, the service that the user stopped
 * @return {?}     of no interest
 */
async function userStopStreaming(streamingStopped) {
    console.log(aux.timeStamp(), "ctl: user STOPPED =", streamingStopped, "[!]")
    detect.stopStreamsensor(streamingStopped); //write stop to streamsensor.log
    switch (streamingStopped) {
        case "spotify":
            spot.stopSpotifyService();
            break;
        case "airplay":
            air.stopAirplayService();
            break;
        case "bluetooth":
             await nwork.turnOffBluetooth();    //have to stop the bluetooth service
             await aux.sleep(500).then(() => {
                 nwork.turnOnBluetooth();       //must start bluetooth service again
             });
            break;
        default://this should not happen...
            //stopAllStreaming();       //is an option here
            return false
    };
    await aux.sleep(500).then(() => {
        restartAllStreaming() //must start up the services again
    });
};



//========================================================================================================
//Bluealsa-aplay function - should be in a file of its own----------------------------------Bluealsa-aplay
//========================================================================================================

//Restart of bluealsa-aplay.service.................................. [required restart of bluealsa-aplay]
/**Restart the bluealsa aplay service, the function that plays bluetooth streams.
 * No more need to restart the bt detetect loop - file descriptor loop with timer: [2]
 * This is used when there has been a connect/disconnect of a Bluetooth speaker.
 * @return {boolean}      true
 */
function restartBluealsaAplay() {
    try {
        execSync(`sudo systemctl restart bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
       
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    return true;
};
//Start of bluealsa-aplay.service............................................. [start bluealsa-aplay again]
/**Start the bluealsa aplay service, the function that plays bluetooth streams.
 * This is used when another service has stopped streaming.
 * Also checks if blue-alsa is really up and running, if not try again...
 * @return {boolean}      true
 */
async function startBluealsaService() {
    try {
        execSync(`sudo systemctl start bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
        console.log(aux.timeStamp(), "ctl: start of bluealsa-aplay service was required -> ->");
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    let pid = await mod.readServicePid("bluealsa-aplay");
    if (pid !== "") {
        //Good to go; bluealsa-aplay is up - no action here
        //console.log(aux.timeStamp(),"ctl: system service started for bluealsa ----- #", pid);
        return true;
    }
    else {
        //bluealsa-aplay is not running, try again, no sync this time.
        await aux.sleep(1000).then(() => {
            try {
                exec('sudo systemctl restart bluealsa-aplay.service',
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
                return true;
            }
            catch (err) {
                consolelog(aux.timeStamp(),"air: ERROR couldn't start bluealsa-aplay\n", err);
                return false;
            };
        });
    };
    return true;
};
//Stop bluealsa-aplay.service....................................................... [stop bluealsa-aplay]
/**Stop the bluealsa aplay service, the function that plays bluetooth streams.
 * This is used when another service has stopped streaming.
 * @return {boolean}      true
 */
function stopBluealsaService() {
    try {
        execSync(`sudo systemctl stop bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
        console.log(aux.timeStamp(), "ctl: stop of bluealsa-aplay service was required -> ->");
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    return true;
};
/** This function belongs to streamer-network.js, but the export did not work.
 * I got fed up and moved it here - now it works... why?
 * Deletes the global alsa configuration file if it exists (etc/asound.conf).
 * If there is no conf file the sound card will be default (i.e. the amp)
 * @return {boolean}   true is success and false is failure
 */
async function disableAsoundConf() {
    //console.log(aux.timeStamp(),"ctl: delete any /etc/asound.conf ");
    let allGood = false;
    if (nwork.isFile("/etc/asound.conf") === true) {
        try {
            execSync(`sudo rm -f /etc/asound.conf  `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            allGood = true;
        }
        catch (err) {  //this is bad - must be file system error
            allGood = false;
            console.log(aux.timeStamp(), "nwork: asound.conf file error !!!!", err);
            await aux.remountSSD();
            execSync(`sudo rm -f /etc/asound.conf  `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        };
    }
    else { //the file asound.conf was not in place, no worries...
        allGood = true;
    };
    return allGood;
};
