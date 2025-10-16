//Copyright 2025 by Retro Audiophile Designs, all rights reserved.
////GNU General Public License v3.0 see license.txt            [Source code]
//             ~ airplay listener for backend ~

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
const exec = require('child_process').exec;         //for Raspian cmds
const execSync = require('child_process').execSync; //for synced Raspbian cmds

const mod = require('/streamer/streamer-model.js');  //model of machine
const btsp = require('/streamer/lib/streamer-bluetoothspeaker.js'); //for unmuting of amp
//const events = require('events');                   //for creating events
//const signal = new events.EventEmitter();

module.exports.soundBootPreparation = soundBootPreparation;
module.exports.startupSound = startupSound;

module.exports.setVolume = setVolume;
module.exports.readStartVolume = readStartVolume;
module.exports.writeStartVolume = writeStartVolume;

module.exports.isAmpMuted = isAmpMuted;
module.exports.muteUnmuteAmp = muteUnmuteAmp;

//=============================================================================== BOOT
/**BOOT - reset sound, called at start of boot. Unmute amp and set 
 * the start volume to the value storedon file, where alsa.readStartVolume() 
 * does the actually reading of the file in /streamer/data (see below). 
 * Always use -M option for linear volume
 * @return {integer}          volume in %
 */
async function soundBootPreparation() {
    let startSound = await readStartVolume(); //read from file
    // A.set volume to saved volume on file
    try {
        //console.log(aux.timeStamp(), "alsa: [amixer set boot volume to", startSound, "]");
        execSync(`sudo amixer -Mc 0 set Digital ${startSound}%`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        await mod.getVolume("bootprep set value");
    }
    catch (e) {
        console.log(aux.timeStamp(), "alsa: [volume reset ERROR at boot prep]\n", e);
    };
    //B. unmute amplifier
    await muteUnmuteAmp(true);
    //console.log(aux.timeStamp(), "alsa: exiting boot preparations for amplifier  - - - - -", startSound, "- Volume");
    return startSound;
};

/**BOOT - generate a sound, used after boot, this is the start-up sound...
 * Linear voluem is 0 - 100%, scale volume is 0-207, use -M option for linear
 * @param  {integer}                 volume, current linear volume in %
 * @return {?}                       of no interest
 */
async function startupSound(volume = 25) {
    //console.log(aux.timeStamp(), "alsa: just entered startup sound - volume:", volume, "[+]");
    if (volume < 41) {
        try {   //sourced from https://freesound.org/people/plasterbrain/sounds/273159/
            execSync('sudo aplay -q /streamer/audio/startup.wav',
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        }      //credited: plasterbrain - "Podcast Jingle" licensed under the Creative Commons 0 License
        catch (e) {
            console.log(aux.timeStamp(), "alsa: [silence]\n", e);
        };
    }
    else if (volume < 51) {
        try {  //sourced from https://freesound.org/people/sandib/sounds/476135/
            execSync('sudo aplay -q /streamer/audio/startuphighvol.wav ',
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        }     //credited sandib - "c minor piano 4" licensed under the Creative Commons 0 License
        catch (e) {
            console.log(aux.timeStamp(), "alsa: [silence]\n", e);
        };
    }
    else {
        //If the volume is over 60% - it is "high volume" and the start-up sound level has to be lowered
        //console.log(aux.timeStamp(), "alsa: [try to play a lower sound since volume is high:", volume, "%  - -  LOWER SOUND");
        // -M option below uses mapped volume for % otherwise it will not be linear
        try {
            //console.log(aux.timeStamp(), "alsa: [25% will now be temporary volume]");
            execSync(`sudo amixer -Mqc 0 set Digital 25%`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
            //console.log(aux.timeStamp(), "alsa: read actual volume value...    mod?");
            //await mod.getVolume("start sound 1");
        }
        catch (e) {
            console.log(aux.timeStamp(), "alsa: [volume lowered...]\n", e);
        };
        try {
            //sourced from https://freesound.org/people/newagesoup/sounds/339343/
            execSync('sudo /usr/bin/aplay -q -c2 -Ddefault /streamer/audio/startupfullvol.wav ',
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        }     //credited newagesoup - "soft-blip-E Major" licensed under the Creative Commons Attribution License ver. 3.0;
        //(see document /player/license creative commons attribution.txt)
        catch (e) {
            console.log(aux.timeStamp(), "alsa: [silence]\n", e);
        };
        try { //bring the volume level back again, must wait (execSync) for sound to finish here
            //console.log(aux.timeStamp(), "alsa: read volume value before resetting . . .    mod?");
            //await mod.getVolume("start sound 2");
            //console.log(aux.timeStamp(), "alsa: [execute original volume reset] =", volume);
            execSync(`sudo amixer -Mqc 0 set Digital ${volume}%`,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
            await mod.getVolume("amp sound reset");
        }
        catch (e) {
            console.log(aux.timeStamp(), "alsa: [volume back]\n", e);
        };
    };
};
//======================================================================= sound settings
/**Volume - set the volume of the alsamixer
 * The mapped volume for evaluating the percentage representation in alsamixer 
 * is used to be more natural for human ear.
 * Linear volume is 0 - 100%, scale volume is 0-207, option -M is linear
 * @param {integer]}    volume, linear value in %
 * @return{integer}      volume %
 */
async function setVolume(volume = 0) {
    try {
        console.log(aux.timeStamp(), "alsa: [amixer set volume to", volume, "]");
        execSync(`sudo amixer -Mc 0 set Digital ${volume}%`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        
    }
    catch (e) {
        console.log(aux.timeStamp(), "alsa: [volume set ERROR:]\n", e);
    };
    //await mod.getVolume("Volume was set");
    return volume;
};

/**Volume - read start up value for volume from file /streamer/data/volume_setting
 * @return{integer}      volume %
 */
function readStartVolume() {
    let volume = 25;
    let startVolString = "";
    try { //Confirm that start up volume file is in place...
        execSync(`sudo touch  /streamer/data/volume_setting`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log("alsa: [Volume start up error]\n", err);
    };
    try { //...and just to be sure - set the right permissions
        execSync(`sudo chmod 0777 /streamer/data/volume_setting`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log("alsa: [Volume start up error]\n", err);
    };
    try {
        startVolString = aux.mpdMsgTrim(fs.readFileSync('/streamer/data/volume_setting', 'utf8'));
    }
    catch (err) {
        console.log("alsa: [Volume start up error]\n", err);
    };
    if (startVolString != "") {
        let numVol = startVolString * 1;
        if ((typeof (numVol) === "number") && (numVol > -1) && (numVol < 101)) {
            volume = numVol;
            console.log(aux.timeStamp(), "alsa: Read file, start up value returned is", volume);
        };
    };
    return volume;    //returns 25% volume if error
};
/**Volume - sets new value for volume in the file /streamer/data/volume_setting
 * @param {integer}       volume, volume in percent, defaults to 100%
 * @return{integer}       volume %
 */
function writeStartVolume(volume = 100) {
    try { //Confirm that start up volume file is in place...
        execSync(`sudo touch  /streamer/data/volume_setting`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log("alsa: [Volume write error]\n", err);
    };
    try { //...and just to be sure - set the right permissions
        execSync(`sudo chmod 0777 /streamer/data/volume_setting`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log("alsa: [Volume write error]\n", err);
    };
    try {
        execSync(`sudo echo ${volume} > /streamer/data/volume_setting && sync -d /streamer/data/volume_setting `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log("alsa: [Volume write error]\n", err);
    };
    return volume;
};
//============================================================================= amplifier
/** Mutes or unmutes the alsamixer which is the analogue output. If a bt speaker
 * is connected the analogue output must be muted.
 * Well, `sudo amixer -c 0 set Digital mute ` screw things up pretty badly...
 * Use toggle instead. '[off]' or '[on]' indicates what happend.
 * This doesn't affect Spotify, Spotify is always amp muted, strange?
 * 'sudo amixer -c 0 set Digital' is the way to check mute
 *      'true' as an arg  ->  means that the amplifier gets UNMUTED.
 *      'false' as an arg ->  means that the amplifier gets MUTED.
 * @param  {string}    unmute true means unmute is requested, false means mute
 * @return {boolean}   true
 */
async function muteUnmuteAmp(unmute) {
    //Solution: use 'sudo amixer -c 0 get  Digital' - to see if it is muted or not
    //let amixerString = "";
    //let isItAlreadyMuted = await isAmpMuted();
    //A. unmuting is requested since unmute is true... [UNMUTE]
    if (unmute === true) {
        if (await isAmpMuted() === false) {
            //A1: it was already UNMUTED - no action.
            //console.log(aux.timeStamp(),"bt: amp already unmuted - status is still UNMUTED");
            //console.log(aux.timeStamp(),"    [check with   amixer -c 0 get Digital ]")
            return true;
        }
        else {
            //A2: it is in MUTED state - UNMUTE the amplifier!
            try {
                //amixerString =
                execSync(`sudo amixer -c 0 set Digital toggle `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                //console.log(aux.timeStamp(),"bt: toggled to be unmuted - status now: UNMUTED");
                //console.log(aux.timeStamp(),"    [check with  amixer -c 0 get Digital ]");
            }
            catch (err) {
                console.log(aux.timeStamp(), "bt: ERROR doing unmute", err);
            };
        };
    }
    //B: mute is requested since unmute is false...  [MUTE]
    else {
        if (await isAmpMuted() === true) {
            //B1: it was already muted, amplifier is NOT ON - no action.
            //console.log(aux.timeStamp(),"bt: amp already muted - status is still MUTED");
            //console.log(aux.timeStamp(),"    [check with amixer -c 0 get Digital]");
            return true;
        }
        else {
            //B2: it is in a UNMUTED state - MUTE the amplifier!
            try {
                //amixerString =
                execSync(`sudo amixer -c 0 set Digital toggle `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
                //console.log(aux.timeStamp(),"bt: toggled to be muted    - status now: MUTED");
                //console.log(aux.timeStamp(),"    [check with  amixer -c 0 get Digital]");
            }
            catch (err) {
                console.log(aux.timeStamp(), "bt: ERROR doing mute", err);
            };
        };
    };
    return true;
};
/** Checks if the amp is muted or not. Returns true even if in error state.
 * 'sudo amixer -c 0 set Digital' is the way to check mute
 * @return {boolean}   true if muted else false
 */
function isAmpMuted() {
    let outcome = false;
    let amixerString = "";
    try {
        amixerString =
            execSync(`sudo amixer -c 0 get Digital `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        console.log(aux.timeStamp(), "bt: ERROR reading mute status", err);
        outcome = true; //definitely returns true when something went wrong
    };
    if (amixerString.lastIndexOf("[on]") !== -1) {
        //console.log(aux.timeStamp(),"bt: amplifier is NOT muted;  - unmute status");
        outcome = false;
    }
    else {
        //console.log(aux.timeStamp(),"bt: amplifier is MUTED; - muted status");
        outcome = true; //returns true even if something went wrong
    };
    return outcome;
};



