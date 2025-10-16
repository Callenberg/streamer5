//Copyright 2025 by Retro Audiophile Designs, all rights reserved.
////GNU General Public License v3.0 see license.txt            [Source code]
//                        ~ general network handler for backend ~
//NOTE: this file cannot be minimized. NOT BE MINIMIZED!!

const fs = require('fs');                           //for reading files

//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

const aux = require('./machine-auxiliary.js');    //all the utils
const mod = require('/streamer/streamer-model.js');         //model of machine
const view = require('/streamer/streamer-view.js');         //view of machine
//const hot = require('./machine-hotspot.js');      //handle wi-fi hotspot (ap)
const exec = require('child_process').exec;         //for Raspian cmds
const execSync = require('child_process').execSync; //for synced Raspbian cmds


//At boot.......................................................................................
module.exports.prepareBluetooth = prepareBluetooth;
module.exports.prepareWireless = prepareWireless;
//Bluetooth service
module.exports.turnOnBluetooth = turnOnBluetooth;
module.exports.turnOffBluetooth = turnOffBluetooth;
module.exports.showBluetooth = showBluetooth
module.exports.hideBluetooth = hideBluetooth;
//Bluetooth speakers...........................................................................
module.exports.scanforSpeakers = scanforSpeakers;
module.exports.btConnectCtl = btConnectCtl;
module.exports.trustSpeaker = trustSpeaker;
module.exports.removeDevice = removeDevice;
module.exports.enableAsoundConf = enableAsoundConf;
module.exports.btDisconnectCtl = btDisconnectCtl;
module.exports.disableAsoundConf = disableAsoundConf;
module.exports.isFile = isFile;
module.exports.btDisconnectSource = btDisconnectSource
//Wireless....................................................................................
module.exports.accesspointUp = accesspointUp;
module.exports.accesspointDown = accesspointDown;
module.exports.wifiDisconnect = wifiDisconnect;
module.exports.scanForWiFi = scanForWiFi;
module.exports.connectWifi = connectWifi;

//Boot ===================================================================================
//..........................................................................Bluetooth boot
/**Boot preparations for Bluetooth, called by streamer-control.
 * Firstly, remove the asound.conf file (if it exists)
 * If Bluetooth is on: 
 * a) if there is no speaker connected - turn Bluetooth off.
 * All other Bluetooth devices will then be disconnected, sources likes phones. 
 * Then turn the bluetooth system on again.
 * b) If there is a speaker connected - disconnect only the connetcted source, phones.
 * Paired devices (sink and source) and trusted devices (only sink)
 * are not effected. 
 * @param {integer}  wait, pause time in ms, default 200
 * @return {boolean}  true, of no interest
 */
async function prepareBluetooth(wait = 100) {
    disableAsoundConf(); //Note that: /etc/asound.conf file has to be deleted here
    if (await mod.bluetoothStatus() == "yes") {
        let speakerName = await mod.theConnectedBluetoothSink();
            //console.log(aux.timeStamp(), "nwork: name of speaker, or empty", speakerName.length,"[length?]");
        if (speakerName.length == 0) {
            turnOffBluetooth();
            //then wait
            aux.sleep(wait).then(() => {
                turnOnBluetooth();
                showBluetooth();
                console.log(aux.timeStamp(), "nwork: Bluetooth restarted with no connected devices...");
            });
        }
        else {
            let connectedArray = await mod.connectedBluetoothSourcesNames();
            for (let i = 0, arrayLength = connectedArray.length; i < arrayLength; ++i) {
                await btDisconnectSource(connectedArray[i].bdAddr);
            };
            showBluetooth();
            console.log(aux.timeStamp(), "nwork: Bluetooth reset, only the speaker is connected!");
        };
    };
    return true; 
};

//...........................................................................Wireless boot

/**Boot preparations for wireless, called by streamer-control.
 * a) Do basic testing of wireless. Radio should always be on. If radio is off then wlan0
 *    and wlan1 and bluetooth is hard blocked. Which means that rfkill cannot unblock!
 *    'nmcli radio wifi', not only 'nmcli radio' neither use 'nmcli radio all'
 * b) If the Streamer is connected to a Wi-Fi LAN then disconnect the AP (hotspot).
 * d) The AP comes up if wireless was down.
 * @param {integer}   wait, delay in ms
 * @return {boolean}  true, of no interest
 */
async function prepareWireless(wait = 50) {
    let wifiRadioOn = "disabled";
    try {
    // Basic tests of wireless capabilities:
        wifiRadioOn =
            execSync(`sudo nmcli radio wifi  | tr -d '\n' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    // a) check if radio is on for wireless services, wlan0 (= AP) and wlan1 (= Wi-Fi)
        if (wifiRadioOn == "disabled") {
            try {
                //It is disabled, which is a surprise -> turn on radio!
                execSync(`sudo nmcli radio wifi on  | tr -d '\n'  `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
                // here "" is returned if radio was enabled...  no action
            }
            catch (err) {
                console.log("network: ERROR cannot enables Wi-Fi radio", err);
                return false;
            };
        };
    }
    catch (err) {
        console.log("network: ERROR cannot read 'nmcli radio wifi'", err);
        return false;
    };
    //Check status of Wi-Fi on wlan1:
    let wifiStatusArray = await mod.wirelessStatus();
    console.log("network: what is status of wifi?, might be [];\n", wifiStatusArray);
    if (wifiStatusArray.length > 0) {
    // b) Streamer is connected to a Wi-Fi network -> bring DOWN AP
        accesspointDown();
        console.log(aux.timeStamp(), "network: Wireless is UP... AP goes down.");
    }
    else {
    // c) Streamer not connected to any Wi-Fi network -> bring UP AP
        accesspointUp();
        console.log(aux.timeStamp(), "network:Wireless is down... AP goes UP[!]");
    };
    aux.sleep(wait).then(() => {
    });
    return true;
};

//Bluetooth Commands =====================================================================
//...........................................................................Bluetooth CMD
/**Turn off the Bluetooth system using rfkill
 * Bluetooth Hci0 is software blocked - turned off.
 * This will disconnect any connected devices. 
 * Paired devices (sinks and sources) and trusted 
 * devices (only sinks) are not removed.
 * @return {boolean}  true or false, of no interest
 */
async function turnOffBluetooth() {
    try {
        execSync(`sudo rfkill block bluetooth`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        return true;
    }
    catch (err) {
        console.log("bluetoothctl: cannot block bluetooth");
        return false;
    };
};
/**Turn on the Bluetooth system
 * Bluetooth Hci0 is turned on.
 * @return {boolean}  true, of no interest
 */
async function turnOnBluetooth() {
    try {
        execSync(`sudo rfkill unblock bluetooth`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        return true;
    }
    catch (err) {
        console.log("bluetoothctl: cannot unblock bluetooth");
        return false;
    };
};
/**Advertise Streamer Bluetooth capability
 * Bluetoothctl is turned on and Bluetooth is visible again.
 * @return {boolean}  true, of no interest
 */
async function showBluetooth() {
    try {
        execSync(`sudo bluetoothctl power on `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        //console.log("bluetoothctl: cannot turn on power for bluetoothctl", err);
    };
    try {
        execSync(`sudo bluetoothctl pairable on && sudo bluetoothctl discoverable on `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        //console.log("bluetoothctl: cannot make bluetooth visible - no pairing possible", err);
    };
    return true;
};
/**Hide Streamer's Bluetooth
 * Bluetoothctl is turned off and Bluetooth is not visble
 * @return {boolean}  true, of no interest
 */
async function hideBluetooth() {
    try {
        execSync(`sudo bluetoothctl power off`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        console.log("bluetoothctl: cannot turn off power for bluetoothctl");
    };
    try {
        execSync(`sudo bluetoothctl pairable off && sudo bluetoothctl discoverable off `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        console.log("bluetoothctl: cannot stop bluetooth pairing - still visible");
    };
    return true;
};
//________________________________________________________________________________________
//SCAN operations for Bluetooth Speakers ____________________delivers connectable Speakers
/** Returns Bluetooth devices that are audio sinks, i.e. speakers or headphones,
 * and that are connectable (ON and appearantly within range). Takes about 30 s.
 * Calls for scanning using btFindDevices() , calls onece or twice.
 * NOTE: the result of the btctl scan is valid for only about 3 minutes.
 * @return {array} [{bdAddr: "BD-address:...", name: "<Name>"" }, ...] or []
 */
async function scanforSpeakers() {
    //console.log(aux.timeStamp(), "nwork[Sc]: scanning for speakers <|  ___________ [wait]");
    //A. do a bluetoothctl scan to get them discovered so a connect can be done
    let devices = await btFindDevices();//synchronous bluetoothctl scan -> array!!
    //Note: btctl devices can hold items that are off, but paired or trusted
    if (devices.length == 0) {
    //B. if btclt didn't found any - try again...
        //console.log(aux.timeStamp(), "nwork[Sc]: rescanning for sink devices <|  _________ [rescan]");
        await aux.sleep(300).then(async () => {
            //must wait here so the previous sudo scan process is killed
            devices = await btFindDevices(); //once again
        });
    };
    //console.log(aux.timeStamp(), "nwork[Sc]: scan array, it might be empty [] \n", devices);
    return devices;
};
//Scan manager__________________________________________________scans and filter for sinks
/** Manage the scan operations for any Bluetooth devices that can be managed by 
 * bluetoothctl. Returns an array of objects for each unconnected sink device found.
 * In order to get all devices:
 *   CLI: bluetoothctl devices | awk '{print substr($0, index($0,$2))}' 
 * Returns: "FC:58:FA:ED:57:60 ENEBY30\nDevice 8C:DE:E6:25:C5:8C Galaxy S21 Ultra 5G\n"
 * By unconnected means to be both new (never connected) or disconnected speakers.
 * The speakers maybe trusted - trusted is not an guarantee for being connectable...
 * After the bluetoothctl scan is done the array is valid for 3 minutes.
 * When 3 minutes have passed only paired/trusted devices are left, not the new ones.
 * It checks each device if it is of class Audio Sink (0x110b) and connectable.
 *   CLI: bluetoothctl info "<bdAddr>" - and then filter on sink and not connected
 * @param  {integer}    scanTime,should be at last 15 s, e.g. 15000
 * @return {array}      [{bdAddr: "<bd-addr>"", name: "<name>""}, ...] or []
 */
async function btFindDevices(scanTime = 15000) {
    let devicesString = "";
    let speakerArray = [];
    //0. First clean out any uncontrolled scans...
    await cleanOutScanPidsSync(); //be sure that there are no other scans going on
    //1. Scan for discoverable Bluetooth devices, they might be paired/trusted
    startBtSinkScan();    //fire off bluetootctl scan and wait

    aux.sleep(scanTime * 0.4 ).then(() => {
        view.renderMessage({ page: "bluetooth", type: "info", missive: "Still scanning . . ." });
    });

    await aux.sleep(scanTime).then(() => {
        //enough scanning - check if anything got caught
        try {
            devicesString = aux.mpdMsgTrim(
                execSync(`sudo bluetoothctl devices | awk '{print substr($0, index($0,$2))}' `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 }));
            //console.log(aux.timeStamp(), "nwork[Sc]: bluetoothctl found devices - string is:\n", devicesString );
        }
        catch (err) {
            console.log(aux.timeStamp(), "nwork[Sc]: bluetoothctl device ERROR:\n", err);
        };
    //2. stop the bluetoothctl scan process
        cleanOutScanPids(); //no need for a synch here...
    });
    //3. Extract the names of unconnected speakers and their BD-address, put each of them in an object.
    //   All objects are put in the resulting array 'speakerArray' object:{ bdAddr: bdAddr, name: name }
    if (devicesString !== "") {
        let deviceArray = devicesString.split("\n"); //split string at line breaks
        let numberOfDevices = deviceArray.length;  
        for (let i = 0; i < numberOfDevices; i++) {
            //const delimiterIndex = pairedArray[i].indexOf(' '); //it is always 17
            const delimiterIndex = 17;
            let bdAddr = deviceArray[i].substring(0, delimiterIndex);
            let name = deviceArray[i].slice(delimiterIndex + 1);
            try {
                deviceInfo =
                    execSync(`sudo bluetoothctl info ${bdAddr}  `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                //filter out devices that are disconnected sinks
                if ((deviceInfo.length > 1) &&
                    (deviceInfo.indexOf("UUID: Audio Sink  ") > 0) &&
                    (deviceInfo.indexOf("Connected: no") > 0)) {
                    //console.log(aux.timeStamp(), "nwork[Sc]: found unconnected speaker SINK -->", name, "element", i);
                    speakerArray.push({ bdAddr: bdAddr, name: name });
                };
            }
            catch (err) {
                console.log(aux.timeStamp(), "nwork[Sc]: bluetoothctl info error\n", err);
            };
        };
    };
    //console.log("nwork[Sc]: findings unconnected speakers:   ... might be []/n", speakerArray);
    return speakerArray;
};
//Bluetoothctl scan __________________________________________________________start the scan
/** Starts the scanning for Bluetooth devices by calling:
 *  CLI: 'sudo bluetoothctl scan on'  '&'  -- would spawns its own process
 * @return {string}   pid
 */
function startBtSinkScan() {
    pidString = "";
    try {
        exec(`sudo bluetoothctl scan on`,
            { uid: 1000, gid: 5000 });
        //console.log(aux.timeStamp(), "nwork[Sc]: bluetoothctl scan STARTED >>>>>");
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[Sc]: bluetoothctl scan failed  ERROR:\n", err);
    };
};
//Scan process (PID)_________________________________________find the running scan process
/** Finds the PID of the sudo scan going on. There should be just one, but if
 * there are more than one that is really bad - they have to be cleared out.
 * NOTE: ther are two versions, synch or asynch
 * WARNING: if there are scans going on that are not controlled, they will
 * totally screw up the whole image, really bad error! That is why the pid is
 * handled in an array so all 'sudo scans' are cleaned out. The process is killed-
 * In order to find the pid try:
 * 'sudo pgrep -a bluetoothctl | fgrep "bluetoothctl scan on" |cut -d' ' -f1 '
 *    --> returns pid (or pids = bad...)  [option '-a' yields full command line]
 * 'sudo ps aux | fgrep bluetoothctl'  -- look for 'sudo bluetoothctl scan on'
 * Do not use: * 'sudo pidof bluetoothctl' or 'sudo pgrep bluetoothctl'
 * @return {boolean}    true
 */
//***** Sync version: stop of scan processes one at the time
async function cleanOutScanPidsSync() {
    let pid = "";
    try {
        pid =
            execSync(`sudo pgrep -a bluetoothctl | fgrep "bluetoothctl scan on" |cut -d' ' -f1`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        //console.log(aux.timeStamp(), "btsp:  SYNCH clean out pid - scan PID string -->", pid );
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[Sc]: CANNOT find bluetoothctl scan PID ERROR:\n", err);
    };
    if (pid !== "") {
        let pidArray = pid.split("\n"); //split string at line breaks
        //Format: [ '7642', '28426' ] -- Note: this is bad, should be only one here
        if (pidArray.length === 1) {
            await stopBtSinkScan(pidArray[0]);  //case: normal and expected outcome
        }
        else if (pidArray.length > 1)
            //clean up more than one pid - this is essential to do.
            for (var i = 0; i < pidArray.length; i++) {
                await stopBtSinkScan(pidArray[i]); //case: clean up several bad scans
            };
    };
    return true;
};
//***** Asynchronous version: stop of scan processes
function cleanOutScanPids() {
    let pid = "";
    try {
        pid =
            aux.mpdMsgTrim(
                execSync(`sudo pgrep -a bluetoothctl | fgrep "bluetoothctl scan on" |cut -d' ' -f1`,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        //console.log(aux.timeStamp(), "btsp:        clean out pid - scan PID string -->", pid );
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[Sc]: CANNOT find bluetoothctl scan PID ERROR:\n", err);
    };
    if (pid !== "") {
        let pidArray = pid.split("\n"); //split string at line breaks
        //console.log(aux.timeStamp(), "nwork[Sc]:        clean out pids - scan PID array -->", pidArray );
        //Format: [ '7642', '28426' ] -- Note: this is bad, should be only one here...
        if (pidArray.length === 1) {
            stopBtSinkScan(pidArray[0]);  //case: normal and expected outcome, kill it
        }
        else if (pidArray.length > 1)
            //clean up more than one pid - this is essential to do.
            for (var i = 0; i < pidArray.length; i++) {
                stopBtSinkScan(pidArray[i]); //case: clean up several bad ongoing scans
            };
    };
    return true;
};
//Scan stopper_______________________________________________________stop the scan process
/** Stops the scanning for Bluetooth devices by killing the process
 * of the spawned process 'sudo bluetoothctl scan on' in 'startBtSinkScan()' .
 * NOTE: the result of the scan is valid for only about 3 minutes.
 *  i)  'sudo kill -9 <pi>' is a sudden stop with no clean up before terminating
 *  ii) 'sudo kill <pi>'    is used here!
 * @param {string}     pid of invoked bluetoothctl pid
 * @return {boolean}   true if stopped, otherwise false (i.e. error)
 */
function stopBtSinkScan(pid) {
    try {
        if (pid != "") {
            exec(`sudo kill ${pid} `, { uid: 1000, gid: 1000 });
            //console.log(aux.timeStamp(),"nwork[Sc]: STOPPED scanning with bluetootctl - - -   [X]", pid);
            return true;
        }
        else {
            console.log(aux.timeStamp(), "nwork[Sc]: WARNING bluetootctl scan NOT STOPPED      - - -   [!]");
        }
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[Sc]: kill <pid> commands failed  ERROR: \n", err);
        return false;
    };
};
//________________________________________________________________________________________
//CONNECT operations for Bluetooth Speakers ____________________________connects a Speaker
/** Manage the Bluetooth speaker connection process. Things that need to be dealt with:
 * A. Check if the speaker is still registred by bluetoothctl
 * B. Check if the device is still not connected
 * C. Connect
 *    bluetoothctl connect BD-address
 *    "Attempting to connect to FC:58:FA:ED:57:60 \n 
 *     [CHG] Device FC:58:FA:ED:57:60 ServicesResolved: yes \n Connection successful""
 *  or
 *   "Attempting to connect to 8C:DE:E6:25:C5:8C \n
 *    Failed to connect: org.bluez.Error.Failed le-connection-abort-by-local""
 * D. It was already connected - disconnected trusted speaker might reconnect by itself.
 *    This is managed by detect and Streamer-control - nothing is done here.
 * @param  {string}     bdAddr of speaker to be connected
 * @return {boolean}   true if connected or false if it fails
 */
async function btConnectCtl(bdAddr) {
    let outcome = false;
    if (await isDeviceRegistred(bdAddr) == true) {
    //A. The speaker is reachable
        //console.log(aux.timeStamp(), "nwork[conn]: speaker is still registred", bdAddr, "Okay!");
        if (await isDeviceUnConnected(bdAddr) == true) {
            //console.log(aux.timeStamp(), "nwork[conn]: speaker is NOT connected", bdAddr, "Okay!");
    //B. The device is not connected - connect the speaker!
            let connectString = "";
            try {
                connectString =
                    execSync(`sudo bluetoothctl connect ${bdAddr} | grep "Connection successful" `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                if (connectString.length > 1) {
    //C. The device got connected - success
                    //console.log(aux.timeStamp(), "nwork[conn]: speaker CONNECTED, device:", bdAddr, "<| ~~~");
                    outcome = true;
                };
            }
            catch (err) {
                //the speaker could not be connected
                console.log(aux.timeStamp(), "nwork[conn]: bluetoothctl connect", err);
            };
        }
        else {
    //D. Special case: the speaker is already connected
            //console.log(aux.timeStamp(), "nwork[conn]: speaker was already connected:", bdAddr, "<| ~~~   [!]");
            outcome = true;
        };
    };
    return outcome;
};
/**Checks if a Bluetooth device is reachable, i.e. the device is still 
 * registred by bluetoothctl and thereby can be connected for example.
 *  CLI: bluetoothctl devices | cut -d' ' -f2 | grep <bd-addr>
 *  yields: "F8:E5:CE:72:58:35" which is the <bd-addr> above
 * @param  {string}   bdAddr, BD-address
 * @return {boolean}  true or false, of no interest
 */
async function isDeviceRegistred(bdAddr) {
    let outcome = false;
    let devices = "";
    try {
        devices =
            execSync(`sudo bluetoothctl devices | cut -d' ' -f2 | grep ${bdAddr} `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        //console.log(aux.timeStamp(), "nwork[conn]: outcome of registred:\n", devices, bdAddr, "--- BD-addr:");
        if (devices.length > 0) {
            outcome = true;
        };
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[conn]: bluetoothctl devices    fails... ERROR\n", err);
    };
    return outcome;
};
/**Checks if a Bluetooth device is connected. 
 *  CLI: bluetoothctl info BD-address | grep "Connected: yes" 
 *  yields: "Connected: yes" or ""
 * @param  {string}   bdAddr, BD-address
 * @return {boolean}  true = not connected or false = connetected
 */
async function isDeviceUnConnected(bdAddr) {
    //console.log(aux.timeStamp(), "nwork[conn]: Connected? lets check out BD-addr:", bdAddr);
    let outcome = false;
    let infoString = "";
    try {
        infoString =
            execSync(`sudo bluetoothctl info ${bdAddr} | grep "Connected: no"  `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        //console.log(aux.timeStamp(), "nwork[conn]: outcome of info\n", infoString, "might be empty...\nBD-addr:", bdAddr);
        if (infoString.length > 1) {
            outcome = true;
        };
    }
    catch (err) {
        //connected device ends up here... 'err' is not shown
        //console.log(aux.timeStamp(), "nwork[conn]: it is probably connected... \n");
    };
    return outcome;
};
/**Trusts a Bluetooth device (only applied to a connected speaker). 
 *  CLI: bluetoothctl trust BD-address
 * @param  {string}    bdAddr, BD-address
 * @return {boolean}   always true - hopefully it got trusted
 */
async function trustSpeaker(bdAddr) {
    try {
        execSync(`sudo bluetoothctl trust ${bdAddr} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork[conn]: bluetoothctl cannot trust FATAL ERROR", bdAddr, "\n", err);
    };
    return true;
};

//...............................................................................manage the asound.conf file
/** Creates the configuration file for alsa so that the stream is redirected to
 * the Bluetooth speaker. /etc/asound.conf is the global alsa config file as long as
 * it exists. The speaker is set as default instead of the sound card (amplifier).
 * @param  {string}    bdaddr Bluetooth BD-address for the speaker
 * @return {boolean}   true is success and false is failure
 */
async function enableAsoundConf(bdaddr) {
    let allGood = false;
    //Below the alsa config for Bluetooth speaker instead of sound card (i.e. amplifier)
    //The default 'delay' is four times the period time.
    //Shall the 'delay' be default 50000, 10000 or -20000? (microseconds not milliseconds)  dropping of PCM frames occurs
    //Bluealsa-aplay wiki suggest delay 400 ms
    //Bluealsa-aplay suggest 'period_time' 50000 with 'periods 4' (only for dmix config - doesn't work here)
    let asoundContent =
   `
pcm.btspeaker { 
  type plug
  slave.pcm {
      type bluealsa
      device '"${bdaddr}"'
      profile 'a2dp'
  }
  hint {
      show on
      description 'Bluetooth speaker, ${bdaddr}'
  }
}
ctl.btspeaker {
   type bluealsa
}
pcm.!default {
  type plug
  slave.pcm "btspeaker"
  hint {
        show on
        description 'btspeaker'
  }
}
ctl.!default {
type bluealsa
}
`;
    //...but first delete any deprecated asound.conf file that might still exist...
    await disableAsoundConf();

    //a. create the template file and write the config
    try {
        execSync(`sudo echo "${asoundContent}" >  /streamer/data/asound.confNEW`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        allGood = true;
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork: FATAL ERROR writing asound.conf file--------------\n")
        execSync(`sudo rm -f /player/data/asound.confNEW`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        allGood = false;
    };
    //b. move the file to etc directory
    if (allGood === true) {
        try {
            execSync(`sudo mv -f /streamer/data/asound.confNEW /etc/asound.conf &&
                sudo chmod 0777 /etc/asound.conf`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        }
        catch (err) { //file system error of some sort... try again
            //exec(`sudo rm -f /etc/asound.conf`, {uid: 1000, gid: 1000});
            await aux.remountSSD();
            execSync(`sudo touch  /etc/asound.conf &&
                sudo echo "${asoundContent}" >  /etc/asound.conf`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            allGood = false;
        };
    }
    else {
        try { //file system error - try to write directly to /etc
            await aux.remountSSD();
            execSync(`sudo touch  /etc/asound.conf &&
                sudo echo "${asoundContent}" >  /etc/asound.conf &&
                sudo chmod 0777 /etc/asound.conf`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            allGood = true;
        }
        catch (err) {//something is really wrong - no more error handling
            aux.remountSSD();
        };
    };
    return allGood
};
//________________________________________________________________________________________
//DISCONNECT operations for Bluetooth Speakers ______________________disconnects a Speaker
/** Disconnects the connected Bluetooth Speaker
 * @return {boolean}   true is success and false is failure
 */
function btDisconnectCtl(bdaddr) {
    let outcome = false;
    try {
        disconnectString =
            execSync(`sudo bluetoothctl disconnect ${bdaddr} | grep "Successful disconnected" `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        if (disconnectString.length > 1) {
            //the speaker got disconnected - success
            //console.log(aux.timeStamp(), "nwork: speaker DISCONNECTED, device:", bdaddr, "[X]");
            outcome = true;
        };
    }
    catch (err) {
        //the speaker could not be disconnected
        console.log(aux.timeStamp(), "nwork: ERROR    bluetoothctl disconnect\n", err);
    };
    return outcome
};
/** Deletes the global alsa configuration file if it exists (etc/asound.conf).
 * If there is no conf file the sound card will be default (i.e. the amp)
 * @return {boolean}   true is success and false is failure
 */
async function disableAsoundConf() {
    //console.log(aux.timeStamp(),"bt: delete any /etc/asound.conf ");
    let allGood = false;
    if (isFile("/etc/asound.conf") === true) {
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
/** Checks if a file exists. Returns true if that is the case.
 * CLI: sudo find /etc/asound.conf' returns this when there is no file:
 *       "find: ‘/etc/asound.conf’: No such file or directory"
 * Otherwise the path and file name
 *      "/etc/asound.conf"
 * @param  {string}    path path and file name
 * @return {boolean}   true if file exists, otherwise false
 */
function isFile(path = "/etc/asound.conf") {
    let existance = "";
    let result = false;
    try {
        existance =
            execSync(`sudo find ${path}`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        if (existance.indexOf("No such file or directory") == -1) {
            result = true; //there was no error message - file exists
        };
    }
    catch (err) {
        //console.log(aux.timeStamp(),"bt: is there an /etc/asound.conf file?", false);
        //The file was not found - find: ‘/etc/asound.conf’: No such file or directory
    };
    return result;
};
//________________________________________________________________________________________
//REMOVE operations for any Bluetooth Devices ________________________for both sink/source
/**Untrusts, disconencts, unpairs and removes a Bluetooth device from bluetoothctl
 * Only for already disconnected phones or at restart.
 *  CLI: bluetoothctl remove BD-address
 * @param  {string}    bdAddr, BD-address
 * @return {boolean}   true/false - hopefully it got removed
 */
function removeDevice(bdAddr) {
    //console.log(aux.timeStamp(), "nwork: incoming:", bdAddr);
    let outcome = false;
    try {
        outcome = execSync(`sudo bluetoothctl remove ${bdAddr} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        //console.log(aux.timeStamp(), "nwork: remove:", bdAddr, "message:", outcome);
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork: bluetoothctl cannot remove:", bdAddr, "\n", err);
    };
    return outcome;
};

/** Disconnect a source device, it will still be paired.
 * @param  {string} deviceBD, BD address to be disconnected
 * @return {false}            always true, but not of any interest at all...
 */
function btDisconnectSource(deviceBD) {
    try { 
        execSync(`sudo bluetoothctl disconnect ${deviceBD} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork: FATAL ERROR in disconnect of SOURCE \n", err);
    };
    return true;
};

//Wireless Commands ======================================================================
//............................................................................Wireless CMD
/**Turn off the Access PoinworkManager/system-connections
 * @return {boolean}  true or false, of no interest
 */
async function accesspointDown() {
    try {
        execSync(`sudo nmcli connection down Hotspot-1 `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            return true;
    }
    catch (err) {
        //console.log("hotspot: cannot turn off Hotspot");
        return false;
    };
};
/**Turn on the Access Point (Hotspot)
 * The AP can coexist with the connected Wi-Fi connection. 
 * The connection profile is Hotspot-1 and can be found in
 * the directory: /etc/NetworkManager/system-connections
 * @return {boolean}  true or false, of no interest
 */
async function accesspointUp() {
    try {
        execSync(`sudo nmcli connection up Hotspot-1 `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            return true;
    }
    catch (err) {
        console.log("hotspot: cannot turn off Hotspot");
        return false;
    };
 };

/**Disconnect Streamer from the Wi-Fi network - Note: the wireless service is never turned off!
 * In order to get the right connection profile UUID is required for wlan1
 * nmcli -t -f general device show wlan1 | grep GENERAL.CON-UUID: |cut -d':' -f2 | tr -d '\n'
 * ...where -t is terse and -f is field
 * If there is an UUID, then disconnect by deleteing the profile:
 * nmcli connection delete ${wlan1UUID} | deleted
 * The connction profile is found in directory: /etc/NetworkManager/system-connections
 * @return {boolean}  true or false, of no interest
 */
async function wifiDisconnect() {
    let wlan1UUID = "";
    try {
        //A. Get the connected UUID for wlan1
        wlan1UUID =
            execSync(`sudo nmcli -t -f general device show wlan1 | grep GENERAL.CON-UUID: |cut -d':' -f2 | tr -d '\n' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        //console.log(aux.timeStamp(), "nwork: [", wlan1UUID,"]--" );
        if (wlan1UUID.length > 0) {
            try {
        //B. Delete the connection profile for UUID for wlan1 - delete connection
                wlan1UUID =
                    execSync(`sudo nmcli connection delete ${wlan1UUID} | grep deleted | cut -d' ' -f5 | tr -d '\n' `,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            }
            catch (err) {
               //sometimes it ends up here, if delete is applied twice
            };
            //console.log(aux.timeStamp(), "nwork: delete-message:", wlan1UUID);
            if (( wlan1UUID == "deleted.") && (await mod.accesspointStatus() == "down")) {
                await accesspointUp()
                console.log(aux.timeStamp(), "nwork: access point is going up instead!");
            };
            return true;
        }
        else {
            return false;
            //UUID is not there
        };
    }
    catch (err) {
        console.log("nwork: ERROR cannot find UUID for wlan1 - disconnected already?");
        return false;
    };
};
/**Do scans for wifi networks and return an array of reachable ssids 
 * 'nmcli -t dev wifi list --rescan yes' returns two terse forced scans,
 * it takes some time. The first scan is from the wlan0 and the other wlan1.
 * Format:  IN-USE is empty:5 x ':' for BSSI: SSID: MODE: CHAN: RATE: SIGNAL: BARS: SECURITY:
 * Where SSID and CHAN is of interest. wlan1 is the 2.4 GHz band only - which is correct.
 * `nmcli dev wifi list | awk -v RS= 'NR==2'| awk '!/--/ && !/BSSID/ {print $2}' `
 * The above will sort out available ssids for wlan1, -v stands for var and that is
 * why the awk is done in two calls. The result will be a column of ssids (or ""). Also, the ssid
 * for the AP 'Streamer' is removed from the column.
 * Turn the columns into an array using '<string>.split("\n")' 
 *  [ 'BELL462', 'BELL462', 'BELL462', 'BELL549', '' ] remove the last ' '  with aux.mpdMsgTrim 
 * and make sure that each ssid name is unique.This is done with the set constructor 
 * where 'new Set()' turns it into a set, but turns it back into an array again, what a miracle.
 * Like this: [ 'BELL462', 'BELL549' ]
 *  '--rescan yes' -- does not work for hotspot, voltage problems?
 * @return {array}  array of unique ssids available for Streamer
 */
async function scanForWiFi() {
    let scanString = "";
    let scanArray = [];
    let ssidArray = [];
    try {
        console.log("network[Sc]: going to do Wi-Fi scan...");
        scanString = aux.mpdMsgTrim(
            execSync(`sudo nmcli dev wifi list| awk -v RS= 'NR==2'| awk '!/--/ && !/BSSID/ && !/Streamer/ && NF > 0 {print $2}' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 }));
        console.log("network[Sc]: result from scan;\n", scanString);
    }
    catch (err) {
        console.log("network[Sc]: Wi-Fi scan does not work", err);
        return ssidArray;
    };
    if (scanString.length > 0) {
        scanArray = scanString.split("\n");  //split string at line breaks
        ssidArray = [...new Set(scanArray)]; //only unique elements
        //console.log("nwork: scan stringy", scanString);
        //console.log("nwork: scan findings array", scanArray);
        console.log(aux.timeStamp(), "nwork[Sc]: ssid array:\n", ssidArray);
    }
    else {
        console.log("nwork[Sc]: no ssids found!     [X]");
    }
    return ssidArray;
};
/**Connect Streamer to Wi-Fi network - Note: the wireless service is never turned off!
 * Wi-Fi is always connected to wlan1 (2.4 GHz) - Access Point uses wlan0
 *  'nmcli dev wifi connect "BELL462" password "4DFD4EFC155C" ifname wlan1'
 *   Response: 'Device 'wlan1' successfully activated with 'a655707f-7dd0-4596-b816-1290db6590a4' '
 *The connection profile is found in directory:
 *  /etc/NetworkManager/system-connections
 * @param {string}    ssid, 
 * @param {string}    password,
 * @return {boolean}  true if succesful otherwise or false, of no interest
 */

function connectWifi(ssid, password) {
    let outcome = false;
    connectConfirm = "";
    try {
        //console.log("nwork: connecting to ssid:", ssid, "......");
        connectConfirm =
            execSync(`sudo nmcli dev wifi connect "${ssid}" password "${password}" ifname wlan1 `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        if (connectConfirm.search("successfully") != -1) {
            outcome = true;
            console.log("nwork: ......connected to:", ssid, "[!]");
        }
        else {
            console.log("nwork: ...NOT connected to:", ssid, "[FAIL]");
            outcome = false;
        };
    }
    catch (err) {
        console.log("nwork: cannot connect to ssid:", ssid, err);
        outcome = false;
    };
    return outcome;
};



//.....................This is mostly old stuff.............................................
//General: basic low level network detection for lan and wifi
//cat /sys/class/net/<iface>/carrier               "1"    means cable, "0" not.
//cat /sys/class/net/<iface>/operstate             "up", "unknown" and...
//   <iface> = et0 | wlan0                         "down" means not powered up.
//..............................................................................
//Documentation of wifi findings:
//killall wpa_supplicant
//wpa_supplicant -B -c/etc/wpa_supplicant/wpa_supplicant.conf -iwlan0 -Dnl80211,wext
//wpa_cli -i wlan0 status
//'nl80211', 'wext' are drivers
// update_config=1 in conf file enables wpa_cli to save changes.
//Some useful commands of wpa client:
/*
--- connect
sudo wpa_cli -i wlan0 add_network
0
sudo wpa_cli set_network 0 ssid '"BELL503"'
Selected interface 'wlan0'
OK
sudo wpa_cli set_network 0 psk '"F42543AF"'
Selected interface 'wlan0'
OK
sudo wpa_cli enable_network 0
Selected interface 'wlan0'
OK
sudo wpa_cli -i wlan0 save_config
OK
sudo hostname -I
192.168.2.137 192.168.2.147
--- file config empty
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
p2p_disabled=1
country=CA
--- find out ip address
get wifi ip address: (works for inet6 as well, and for eth0)
 ip addr list wlan0 |grep "inet " | cut -d' ' -f6 | cut -d/ -f1
--- disconnect
sudo wpa_cli remove_network 0
Selected interface 'wlan0'
OK
sudo wpa_cli -i wlan0 save_config
OK
sudo hostname -I
192.168.2.137
--- required for 5GHz wifi network
var countryCodes5GHz = ['AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ',
'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG',
'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW',
'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO',
'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM',
'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM',
'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR',
'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE',
'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA',
'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP',
'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE',
'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF',
'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE',
'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ',
'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC',
'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR',
'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE',
'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW']
--- typical status message when Connected to a wifi network, length 13
Selected interface 'wlan0'
bssid=44:e9:dd:50:25:72
freq=2412
ssid=BELL503                          [3]
id=0                                  [4]
mode=station
pairwise_cipher=CCMP
group_cipher=CCMP
key_mgmt=WPA2-PSK
wpa_state=COMPLETED
ip_address=192.168.2.147              [10]
address=dc:a6:32:1d:db:51
uuid=2088c067-9afe-52eb-a584-d4f4cf0c576b

--- typical status message when machine is a wifi hotspot, length 5
Selected interface 'wlan0'
wpa_state=INACTIVE
ip_address=10.0.0.10                  [2]
address=dc:a6:32:1d:db:51
uuid=2088c067-9afe-52eb-a584-d4f4cf0c576b

--- typical status message when no wifi service in use, length 3
wpa_state=DISCONNECTED
address=dc:a6:32:1d:db:51
uuid=2088c067-9afe-52eb-a584-d4f4cf0c576b

--- typical status message when connected to ??? what is this?, length 4
wpa_state=SCANNING                   [0]
ip_address=169.254.143.166           [1]
address=dc:a6:32:1d:db:51
uuid=2088c067-9afe-52eb-a584-d4f4cf0c576b
Note: this is an auto IP in the 169.254.xxx.xx range, it is a bad IP

--- connecting to other kinds of wifi networks:
wep wi-fi network...
i)  connect to wep:   sudo iwconfig wlan0 essid ":ESSID" key :PASSWORD,
ii) connect to wep:   using wpa-supplicant.conf, add:
network={
  ssid=":ESSID"
  key_mgmt=NONE
  wep_key=0123456789abcdef0123456789        #Note:unqouted = hexadecimal password
}
iii) sudo wpa_cli set_network 0 wep_key0 "key"

open wi-fi network...
i)  connect to open:  sudo iwconfig wlan0 essid ":ESSID"
ii) connect to open:  using wpa-supplicant.conf, add:
network={
    ssid=":ESSID"
    key_mgmt=NONE
}
iii) If the SSID does not have password authentication, one must explicitly configure
the network as keyless by:
sudo set_network 0 key_mgmt NONE   --- not sudo set_network 0 psk "passphrase"

--- find a wifi network
Scan all wifi-networks around:
1)
sudo iwlist wlan0 scan -- results in a massive format...
2)
sudo wpa_cli scan
sudo wpa_cli scan_results
---results in this format:
44:e9:dd:50:25:73       5220    -39     [WPA2-PSK-CCMP][WPS][ESS]       BELL503
44:e9:dd:50:25:72       2462    -28     [WPA2-PSK-CCMP][WPS][ESS]       BELL503
00:26:5a:c4:b6:17       2462    -30     [WPA-PSK-CCMP+TKIP][WPA2-PSK-CCMP+TKIP][WPS][ESS]       Bell 305

--- more on disconnect, there might be more than one network!!!
Note: there might be more than one network added, which is not really good.
sudo wpa_cli list_networks
"Selected interface 'wlan0'
network id / ssid / bssid / flags
1       dlink   any
2       BELL503 any     [CURRENT]"

In this case an old wi-fi is still there, dlink.


-- scanning procedures
sudo iwlist wlan0 scan | grep ESSID:
                    ESSID:"BELL211"
                    ESSID:"BELL503"
                    ESSID:"BELL503"
                    ESSID:"Tara "
                    ESSID:"DIRECT-C0-HP OfficeJet 4650"
                    ESSID:"OnyxDove"
                    ESSID:"BELL123"
Note that scanning has to be done at least twice in order to get as many wifi
networks as possible.

sudo cat /etc/wpa_supplicant/wpa_supplicant.conf | grep ssid=
        ssid="BELL503"
*/
//.............................................................................
//Documentation of Bluetooth findings,
/*
sudo hcitool dev     -- when bluetooth is up, (otherwise just " Devices:")
Devices:
        hci0    DC:A6:32:1D:DB:52

-- get mac address of bluetooth
hciconfig -a | grep BD | cut -d' ' -f3

Below deals with bluetooth streaming - not network...
-- btdevice and bt-adapter
bt-device -l
Added devices:
Galaxy S7 (34:14:5F:48:32:F8)

bt-device -i 34:14:5F:48:32:F8
[34:14:5F:48:32:F8]
  Name: Galaxy S7
  Alias: Galaxy S7 [rw]
  Address: 34:14:5F:48:32:F8
  Icon: phone
  Class: 0x5a020c
  Paired: 1
  Trusted: 0 [rw]
  Blocked: 0 [rw]
  Connected: 1
  UUIDs: [OBEXObjectPush, AudioSource, AVRemoteControlTarget, AdvancedAudioDistribution, AVRemoteControl, HeadsetAudioGateway, PANU, HandsfreeAudioGateway, PhoneBookAccess, 00001132-0000-1000-8000-00805f9b34fb, PnPInformation, 00001800-0000-1000-8000-00805f9b34fb, 00001801-0000-1000-8000-00805f9b34fb, a23d00bc-217c-123b-9c00-fc44577136ee]

sudo bt-device -i 34:14:5F:48:32:F8 | grep Connected
Connected: 1

sudo bt-device -l | grep "("
Galaxy S7 (34:14:5F:48:32:F8)

sudo bt-adapter -l
Available adapters:
Player (DC:A6:32:00:32:B2)

-- bluetoothctl is not only interactive...
sudo echo "show" | bluetoothctl
Agent registered
[bluetooth]# show
Controller DC:A6:32:1D:DB:52 (public)
       Name: Player
       Alias: Player
       Class: 0x0004041c
       Powered: yes
       Discoverable: yes
       Pairable: yes
       UUID: Audio Sink                (0000110b-0000-1000-8000-00805f9b34fb)
       UUID: Generic Attribute Profile (00001801-0000-1000-8000-00805f9b34fb)
       UUID: A/V Remote Control        (0000110e-0000-1000-8000-00805f9b34fb)
       UUID: PnP Information           (00001200-0000-1000-8000-00805f9b34fb)
       UUID: A/V Remote Control Target (0000110c-0000-1000-8000-00805f9b34fb)
       UUID: Generic Access Profile    (00001800-0000-1000-8000-00805f9b34fb)
       Modalias: usb:v1D6Bp0246d0532
       Discovering: no

Maybe a more correct way ...
sudo echo -e "connect FC:8F:90:21:12:0C \nquit" | bluetoothctl
-e	enable interpretation of for example the following backslash escapes:
    \n	new line
    \r	carriage return

*/
//.............................................................................
//Documentation of Hotspot findings
/*
--- create hotspot command sequence, with sudo...
systemctl unmask hostapd
ip link set dev wlan0 down
ip a add 10.0.0.10/24 brd + dev wlan0
ip link set dev wlan0 up
dhcpcd -k wlan0 > /dev/null 2>&1
systemctl start dnsmasq
systemctl start hostapd

--- shut down hotspot command, with sudo...
ip link set dev wlan0 down
systemctl stop hostapd
systemctl stop dnsmasq
systemctl mask hostapd
ip addr flush dev wlan0
ip link set dev wlan0 up
dhcpcd  -n wlan0 > /dev/null 2>&1

--- check if ip is set for wireless service
wpa_cli -i wlan0 status | grep 'ip_address'

-- show all connected devices to hotspot (two options)
sudo iw wlan0 station dump
ip neigh show dev wlan0



*/