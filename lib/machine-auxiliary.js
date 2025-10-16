//Copyright 2025 by Retro Audiophile Designs, all rights reserved.
////GNU General Public License v3.0 see license.txt            [Source code]
//         ~ auxiliary functions to streamer - backend of RAD Player ~

const fs = require('fs');                           //for reading files

//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------

//const os = require('os');                           //for getting system data
const exec = require('child_process').exec;         //for Raspian cmds
const execSync = require('child_process').execSync; //for synched Raspbian cmds
//const btsp = require('/streamer/lib/streamer-bluetoothspeaker.js'); //for unmuting of amp


module.exports.mpdMsgTrim = mpdMsgTrim;
module.exports.stringCleaner = stringCleaner;

module.exports.shuffleFisherYates = shuffleFisherYates;
module.exports.shuffleDurstenfeld = shuffleDurstenfeld;
module.exports.areArraysEqual = areArraysEqual;
module.exports.findElementInArray = findElementInArray;

module.exports.timeStamp = timeStamp;
module.exports.timeMilliseconds = timeMilliseconds;
module.exports.formattedTime = formattedTime;
module.exports.secondsToTimeString = secondsToTimeString;
module.exports.dateStamp = dateStamp;

module.exports.sleep = sleep;
module.exports.getServicePid = getServicePid;

//module.exports.renderMachineStatus = renderMachineStatus;
module.exports.connectedBluetoothDevices = connectedBluetoothDevices;

module.exports.remountSSD = remountSSD;



/**AUX - parser utility; removes whitespace from both sides of a string
 * (since string.trim() doesn't seem to work in node.js)
 * This can be done in linux with:
 *  tr -d '\n'      = remove new line
 *  tr -s ' '       = remove all extra spaces
 * @param  {string}                 string string to be trimmed
 * @return {string}                 trimmed string
 */
function mpdMsgTrim(string) {
  return string.replace(/^\s+|\s+$/gm,'');
};
/**AUX - parser utility; removes extra string markers from both sides of a string
 * (since string.trim() doesn't seem to work in node.js)
 * Incoming: '"BELL367"'
 * @param  {string}                 string string to be trimmed
 * @return {string}                 trimmed string
 */
function stringCleaner(string) {
  return string.replace(/^\s+|\s+$/gm,'"');
};



//................................................................. Fisher-Yates
/**The Fisher–Yates shuffle algorithm for generating a random permutation
 * of a finite sequence. E.g. randomly shuffles an array.
 * The shuffled array can be the same as the input array, check with  function
 * aux.areArraysEqual() to make sure that the array has been shuffled, see below
 * @param  {array}      array The array to shuffle
 * @return {array}      shuffled array
 */
function shuffleFisherYates(array) {
	let currentIndex = array.length;
	var temporaryValue, randomIndex;
	while (0 !== currentIndex) { // While there remain elements to shuffle...
		//...pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1; // and below swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	};//Done!
	return array;
};
//....................................................... Richard Durstenfeld
/**The Dursten shuffle algorithm for generating a random permutation
 * of a finite sequence. E.g. randomly shuffles an array. It is faster then Fisher-Yates.
 * The shuffled array can be the same as the input array, check with  function
 * aux.areArraysEqual() to make sure that the array has been shuffled, see below
 * @param  {array}      array The array to shuffle
 * @return {array}      shuffled array
 */
function shuffleDurstenfeld(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    };
    return array;
};



/**AUX - shuffle helper - returns false as soon two arrays are unequal
 * @param  {array} array1 primary array, shuffled
 * @param  {array} array2 ordered array to compare with
 * @return {boolean}      true if all elements are equal and in the same order
 */
function areArraysEqual(array1, array2) {
   let array1Length = array1.length;
   let compared = true;
   for (let i = 0; i < array1Length; i++) {
     compared = (array1[i] === array2[i]);
       if (compared === false) {
         return false;
         break;
       };
     };
     return compared;
};
/**AUX - array.indexOf(element) substitute for simple integer arrays
 * @param  {integer}     element a value which is an integer
 * @param  {array}       array one dimensional array with integers as values
 * @return {integer}     array index of array or -1 if not found
 */
function findElementInArray(element, array) {
  let arrayLength = array.length;
  for(let index = 0; index < arrayLength; index++) {
    if (array[index] === element ) {
      return index;
      break;
    };
  };
  return -1;
};


//...................................................................... logging
/**AUX - Logging purposes - time stamp hrs:min:sec:msec on format 00:00:00:000
 * @return {string}         time stamp string
 */
function timeStamp() {
  const d = new Date();
  return`${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
};

/**AUX - Logging purposes - time stamp msec on format 000000000
 * @return {integer}           time in milliseconds
 */
function timeMilliseconds() {
  const d = new Date();
  return d.getTime();
};

/**AUX - Logging purposes - time on format hrs:min:sec:msec 00:00:00:000
 * @param {integer}         time, in msec
 * @return {string}         time on a redable format
 */
function formattedTime(time) {
  const d = new Date(time);
  let timeString = `${time}`;
  if (timeString.length < 7) {
    return`${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
  }
  else {
    return`${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
  };
};
/**AUX - Converting purposes - time on format hrs:min:sec:msec 00:00:00:000
 * @param {integer}         time, in seconds
 * @return {string}         time on a readable format
 */
function secondsToTimeString(seconds) {
    let minutes = 0, hours = 0;
    if (seconds / 60 > 0) {
        minutes = parseInt(seconds / 60, 10);
        seconds = seconds % 60;
    }
    if (minutes / 60 > 0) {
        hours = parseInt(minutes / 60, 10);
        minutes = minutes % 60;
    }
    return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
};

/**AUX - Logging purposes - date stamp year-month-day on format 0000-00-00
 * @return {string}         full date stamp + time 00:00:00
 */
function dateStamp() {
  const d = new Date();
  //return `${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(-2)}-${`0${d.getDate()}`.slice(-2)}`;
  return d.toLocaleString("sv-SE");
};
//...................................................................... sleeper
/**AUX - util, stop for a while...
 * Use: sleep(ms).then(() => {  ...code here... });
 * @param {integer}            ms time in msec
 * @return {?}                 ...of no value
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};
/*Alternatively an async sleep:
async function sleepX(ms) {
    await new Promise(r => setTimeout(() => r(), ms));
    return;
}*/
//........................................................................ pider
/**AUX - util, finds the main pid of a systemd service
 * Otherwise use 'sudo ps aux | fgrep <process name>'
 * This is the line:  'Main PID: 504 (bluetoothd)'  ...example bluetooth service
 * @param {string}           service systemd service name
 * @return {string}          process id
 */
function getServicePid(service) {
  let pid = "";
  try {
    pid =
     mpdMsgTrim(
      execSync(`sudo systemctl status ${service} | grep "Main PID:" | cut -d' ' -f6 `,
             {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 2000}));
  }
  catch(err) {
  };
  return pid;
};

/**AUX - util, ensures that the memory storage, the SSD, is read- and writeable.
 * This function will make an accidental read-only filesystem writable again.
 * It might happen that the SSD suddenly flips into write-protected mode. Then it 
 * probably tripped its internal controller into read-only fail-safe mode. 
 * Some SSD's do this when they detect flash wear or write issues, even if the SSD 
 * is brand new. Just to be sure...
 * CLI:     mount -o remount,rw /dev/sda2 /
 *          the option 'remount' is used because the filesystem is already mounted. 
 * Called at boot and when there are file write errors
 * @param  {boolean}           isBoot, if true the console will be written to.
 * @return {string}            process id
 */
function remountSSD(isBoot = false) {
    try {
        execSync(`sudo mount -o remount,rw /dev/sda2 / `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 25000 });
        isBoot & console.log(timeStamp(), "aux: partition /dev/sda2 --> read and write mode");
    }
    catch (err) {
        console.log("aux: FATAL ERROR, cannot set filesystem rw__________\n", err);
    };
    try {
        execSync(`sudo systemctl daemon-reload `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 25000 });
    }
    catch (err) {
        console.log("aux: FATAL ERROR, cannot reload systemctl service files__________\n", err);
    };
};
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: DEPRECEATED
/**Bluetooth streaming - return the actual connection status of bluetooth devices.
* ConnectionStatus array format:
* [ {name: "phone", mac: "34:14:5F:48:32:F8"}... ]
* Used by renderMachineStatus() above, but also by machine-network.js
* The same code is used internally in machine-bluetooth.js
* @return {array}     connection objects as defined  above
*/
function connectedBluetoothDevices() {
    //Get all the devices' BDs and check if they are connected
    //[note: code sequence is the same found in blue.setupBluetoothctl() ]
    let bluetoothData = [];
    let pairedDevicesString = "";
    try {
        pairedDevicesString =
            execSync(`sudo bt-device -l `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        pairedDevicesString = "";
    };
    //any paired devices is now gathered in a string... lets check it out!
    if (pairedDevicesString !== "") {
        let pairedArray = pairedDevicesString.split("\n"); //split string at line breaks
        let numberOfDevices = pairedArray.length - 1;
        for (let i = 1; i < numberOfDevices; i++) {
            //pairedArray string is on format: 'Galaxy S7 (34:14:5F:48:32:F8)'
            //BD is "(34:14:5F:48:32:F8)", 19 chars long from end, hence -19 below
            let deviceBD = pairedArray[i].slice(-19).slice(1, 18);
            //connected or not? --> sudo bt-device -i 34:14:5F:48:32:F8 | grep Connected
            let infoString = "";
            try {
                infoString =
                    execSync(`sudo bt-device -i ${deviceBD} | grep Connected`,
                        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
            }
            catch (err) {
                infoString = "";
            };// Example of returned string: "Connected: 0"
            if (infoString !== "") { //slice out the part after the : [i.e. index + 1]
                let isConnected = mpdMsgTrim(infoString.slice(infoString.indexOf(":") + 1));
                if (isConnected === "1") { //index - 20 means slice out before " "
                    bluetoothData.push({
                        name: pairedArray[i].slice(0, (pairedArray[i].length - 20)),
                        mac: deviceBD
                    });
                };
            };
        }; // --- ends the for loop
    };   // --- ends bluetooth on - check connected or not sequence
    return bluetoothData;
};
