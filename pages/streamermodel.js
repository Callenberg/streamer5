///Copyright 2025 by Retro Audiophile Designs, license GPL 3.0 or later
//-------------------------------------------------------------------------------
//      ~ Front end code for the hidden Model Page of RAD Player ~

//Global variables
var socket = io.connect();
var disconnection = false;

//Render on page show events=====================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log(timeStamp(), "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "modelpage", when: "visible again" });
    };
    /*
    else {
        //hidden or not does not matter...
        //console.log(timeStamp(), "Internal: ==== document is hidden again ====");
    };*/
};

document.getElementById("internet").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">h) Internet: &nbsp; ...of no interest</p>
            </div>
        </li> 
        `;

//==============================================================================Page opens
//Open page code =========================================================================
document.addEventListener('DOMContentLoaded', function () {

// console.log("To backend: connect with (page-opens',{ page: settings }), on socket", socket);
    socket.emit('page-opens', { page: "modelpage", when: "DOM ready" });

//.................................................................................iOS
// iOS web app full screen hacks for all pages; Progressive Web App (PWA) looks
  if(window.navigator.standalone == true) {
   // make all links remain in web app mode.
   $('a').click(function() { window.location = $(this).attr('href');
               return false;
                   });
                 };
//.................................................................................iOS
//===========================================================Backend Command Listeners
///Listeners for rendering of information frames......................................
    //A. Main listener for rerendering of page
    // { date: "day...", time: "hh:mm...", version: "5.xxxx", os: "...", license: "GNU .." }
    socket.on('timestamp-versions', function (data) {
        //console.log("From backend: render time, version and lic", data);
        document.getElementById("timestamp").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">Model states at <b>${data.date}</b></p> 
            </div>
        </li> 
        `
        disconnection = false; /*connection established */
    });

    socket.on('streamerStatus', function (dataString) {
        //data is a string, e.g. "Idle...", "Spotify", 
        //console.log(timeStamp(),"From backend: new status frame", dataString);
        document.getElementById("streaming").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">a) Streaming services: <b>${dataString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("volume", function (dataInteger) {
        //Set volume - data is volume as an integer, 0-100
        //console.log(timeStamp(),"From backend: set volume...", dataInteger);
        document.getElementById("volume").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">b) Amplifier volume: <b>${dataInteger}</b> &nbsp;(0-100%)</p>
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("bluetooth", function (dataString) {
        //Set bluetooth status - data is a string "on" or "off"
        //console.log(timeStamp(),"From backend: bluetooth is", dataString);
        document.getElementById("bluetooth").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">c) Bluetooth service: <b>${dataString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("bluetoothSpeaker", function (dataString) {
        //Set bluetooth status - data is a string "name" or ""
        //console.log(timeStamp(), "From backend: bluetooth speaker is", dataString);
        if (dataString.length > 0) {
            document.getElementById("bluetooth-speaker").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">d) Connected Bluetooth speaker: <br><b>${dataString}</b></p> 
            </div>
        </li> 
        `
        }
        else {
            document.getElementById("bluetooth-speaker").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">d) Connected Bluetooth speaker:&nbsp;<b>--</b></p>
            </div>
        </li> 
        `
        }
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("wireless", function (dataArray) {
        //Set wireless status - data is an array; ["SSID"", "IP address"]
        //console.log(timeStamp(), "From backend: connected to Wi-Fi:", dataArray);
        if (dataArray.length > 0) {
            document.getElementById("wireless").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">e) Wi-Fi: <b>${dataArray[0]}, ${dataArray[1]}</b></p> 
            </div>
        </li> 
        `
        }
        else {
            document.getElementById("wireless").innerHTML =
            `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">e) Wi-Fi: &nbsp;<b>--</b></p>
            </div>
        </li> 
        `
        };
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("accesspoint", function (dataString) {
        //Set AP status - data is a string "up or "down"
        //console.log(timeStamp(), "From backend: Hotspot status:", dataString);
        document.getElementById("hotspot").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">f) AP: <b>${dataString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("wired", function (dataString) {
        //Set cable attached status - data is a string "ip adress" or ""
        //console.log(timeStamp(), "From backend: LAN cable status:", dataString);
        if (dataString.length > 0) {
            document.getElementById("wired").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">g) LAN connection: <b>${dataString}</b></p> 
            </div>
        </li> 
        `
        }
        else {
            document.getElementById("wired").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">g) LAN connection: &nbsp; <b>--</b></p>
            </div>
        </li> 
        `
        };
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("internet", function (dataString) {
        //Set internet connection status - data is a string "access" or ""
        //console.log(timeStamp(), "From backend: Internet:", dataString);
        //if (dataString.length > 0) {
        if (false) {
            document.getElementById("internet").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">h) Internet: <b>${dataString}</b></p> 
            </div>
        </li> 
        `
        }
        else {
            document.getElementById("internet").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">h) Internet: &nbsp; ...of no interest</p>
            </div>
        </li> 
        `
        };
        
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });
    socket.on("trustedSpeakers", function (dataArray) {
        //Show the other available speakers that are trusted - dataArray is an array
        //of device object: [{bdAddr: <BD-address>, name: <name>},...]
        //console.log(timeStamp(), "From backend: bluetooth TRUSTED speakers are", dataArray);
        let arrayLength = dataArray.length;
        let objectString = "";
        for (let i = 0; i < arrayLength; i++) {
            objectString = objectString + dataArray[i].bdAddr + ", " + dataArray[i].name + "<br>"

        };
        document.getElementById("trustedSpeakers").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">i) Trusted Bluetooth sinks:<br> <b>${objectString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("connectedDevices", function (dataArray) {
        //Render connected source devices (often phones) - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...]
        //console.log(timeStamp(), "From backend: bluetooth connected SOURCES are:", dataArray);
        let arrayLength = dataArray.length;
        let objectString = "";
        for (let i = 0; i < arrayLength; i++) {
            objectString = objectString + dataArray[i].bdAddr + ", " + dataArray[i].name + "<br>"

        };
        document.getElementById("connectedDevices").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">j) Connected Bluetooth sources:<br> <b>${objectString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("pairedDevices", function (dataArray) {
        //Render paired source devices that are not connected anymore - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...]
        //console.log(timeStamp(), "From backend: bluetooth disconnected pairedSOURCES are:", dataArray);
        let arrayLength = dataArray.length;
        let objectString = "";
        for (let i = 0; i < arrayLength; i++) {
            objectString = objectString + dataArray[i].bdAddr + ", " + dataArray[i].name + "<br>"

        };
        document.getElementById("pairedDevices").innerHTML = `
         <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">k) Paired Bluetooth sources:<br> <b>${objectString}</b></p> 
            </div>
        </li> 
        `
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("internal", function (data) {
        //{ muted: boolean, isOpenPage: boolean, isStartPage: boolean, isFile: boolean }
        console.log("From backend: internals:", data);
        let liHTML = ` <li class="list-group-item d-flex justify-content-between align-items-center player-list"> `;
        let ampString = "";
        let fileString = "";
        let openPageString = "";
        let startPageString = "";
        if (data.muted === true) {
            ampString = `
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">~ Amplifier is muted!</p>
        `
        }
        else {
            ampString = `
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">~ Amplifier is unmuted.</p>
        `
        };
        if (data.isFile === true) {
            fileString = `
             <p class="settings-text-small pl-1 my-1">~ File /etc/asound.conf exists!</p> 
        `
        }
        else {
            fileString = `
             <p class="settings-text-small pl-1 my-1">~ /etc/asound.conf does not exist.</p>
        `
        };
        if (data.isOpenPage === true) {
            openPageString = `
             <p class="settings-text-small pl-1 my-1">~ At least one page is open.</p>
        `
        }
        else {
            openPageString = `
             <p class="settings-text-small pl-1 my-1">~ WARNING: no page open....</p>
        `
        };
        if (data.isStartPage === true) {
            startPageString = `
             <p class="settings-text-small pl-1 my-1">~ A start page is open.</p>
            </div>
        </li >
        `
        }
        else {
            startPageString = `
             <p class="settings-text-small pl-1 my-1">~ No start pages are open.</p>
             </div>
        </li >
        `
        };
        document.getElementById("internal").innerHTML = liHTML + ampString + fileString + openPageString + startPageString;
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });
    socket.on("critical", function (data) {
        //{ throttle: false, power: false, hot: false, temp: string, volt: string }
        console.log("From backend: critical:", data);
        let liHTML = ` <li class="list-group-item d-flex justify-content-between align-items-center player-list"> 
                        <div class="col pl-1">`;
        let throttleString = "";
        let powerString = "";
        let hotString = "";
        let tempString = `<p class="settings-text-small pl-1 my-1">- Temperature is <b>${data.temp} C.</b></p>`;
        let voltString = `<p class="settings-text-small pl-1 my-1">- Voltage is <b>${data.volt} V.</b></p>`
        if (data.throttle === true) {
           throttleString = `
             <p class="settings-text-small pl-1 my-1">- Throttling has occured!</p>
        `
        }
        else {
            throttleString = `
             <p class="settings-text-small pl-1 my-1">- No throttling so far.</p>
        `
        };
        if (data.power === true) {
            powerString = `
             <p class="settings-text-small pl-1 my-1">- Undervoltage has occured!</p> 
        `
        }
        else {
            powerString = `
             <p class="settings-text-small pl-1 my-1">- No undervoltage.</p>
        `
        };
        if (data.hot === true) {
            hotString = `
             <p class="settings-text-small pl-1 my-1">- Overheating has occured!</p>
        `
        }
        else {
            hotString = `
             <p class="settings-text-small pl-1 my-1">- No overheating so far.</p>
        `
        };
        
        //document.getElementById("critical").innerHTML = liHTML + throttleString  ; + 
        document.getElementById("critical").innerHTML = liHTML + throttleString  + voltString  + tempString + '</div > </li >';
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });


      //C. Listener for disconnection from Streamer
  socket.on('connect_error', (error) => {
    if (error && (disconnection === false)) {
      disconnection = true;   /*disconnected */
      disconnect(); //render disconnect frame once <-----entry point for backend
      // console.log("Internal: disconnected");
        socket.emit('page-opens', { page: "modelpage", when: "after disconnect" });
    };
    // else the socket will automatically try to reconnect
    //no action here
  });
      socket.on("disconnect", () => {
          if (disconnection === false) {
              disconnection = true; /*disconnected*/
              disconnect(); /*render disconnected frame */
              //Last desperate call to backend for render... will be buffered
              socket.emit('page-opens', { page: "modelpage", when: "after disconnect" });
          };
      });
 //___________________________________________________________________ this is the TAIL
//Open page sequence END =============================================================
  }); /* ready function done */                                         //Do not touch



 /**HTML and DOM - disconnect from backend
  * Render a disconnected message
  * @return {boolean}  true
  */
 function disconnect() {
   $('#connection-text').hide(); //$('#volume-frame').hide();
   //$('#system-text').hide(); $('#restart-list').hide();
   let message = `<li id="disconnected" class="error-list">
   <div class="disconnect-text"> <br> <br>ERROR: disconnected from the Streamer<br> <br> <br> </div>
   </li>
    `;
   $("#connection-list").html(message);
   return true;
};
//-------------------------------------------------------HTML builds and render for frames
//Information generates various HTML builds rendered here in different about frames:
//---------------------------------------------------------------------------------------
//=======================================================================================
//Unordered List <ul> identifiers where the li-elements build here is put:

//................................................................[build and render HTML}
 //[0]: { time: "date hh:mm...", version: "5.xxxx", os: "...", license: "GNU .." }
    function buildTimeAndVersions(data) {
        let frameHTML = ` 
        <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
             <p class="settings-text-small pl-1 my-1">Streamer status at <b>${data.date}&ensp;. . . </b></p> 
            </div>
        </li> `;
        let frameHTMLrest = `
        <li class="list-group-item d-flex justify-content-between align-items-center player-list">
            <div class="col pl-1">
                <p class="settings-text-small pl-1 my-1">Streamer has been up since <b> ${data.time}</b></p>
                <p class="settings-text-small pl-1 my-1">Software version:<br> <b> ${data.version}</b></p>
                <p class="settings-text-small pl-1 my-1">Operating system:<br> <b>${data.os} </b> </p>
                <p class="settings-text-small pl-1 my-1">License:<br> <b> ${data.license}</b></p>
            </div>
        </li>`;
        document.getElementById("timestamp").innerHTML = frameHTML;
        document.getElementById("versions").innerHTML = frameHTMLrest;
};
    //[1]: { size: "nnn GB", used: "nn%" }
    function buildDiskMemory(data) {
  let frameHTML = `<li class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
    <p class="settings-text-small pl-1 my-1">Disk usage is <b> ${data.used} </b> of available <b> ${data.size}.</b>
  </div>
 </li>`
 document.getElementById("disk").innerHTML = frameHTML;
};
    //[2]:  { ram: "n GB", inUse: "nn%" }
    function buildAvailableRAM(data) {
  let frameHTML = `<li class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
    <p class="settings-text-small pl-1 my-1">RAM usage is <b> ${data.inUse}</b> of total <b>${data.ram}. </b> </p>
  </div>
 </li>`
  document.getElementById("ram").innerHTML = frameHTML;
};
    //[3]:{ spotify: boolean, airplay: boolean, bluealsa: boolean }
    function buildAvailableStreaming(data) {
        aboutSpotify = "";
        aboutAirplay = "";
        aboutBluetooth = "";

        if (data.spotify === true) {
            aboutSpotify = "<b>Spotify</b> is available."
        }
        else {
            aboutSpotify = "Spotify cannot be used now."
        };
        if (data.airplay === true) {
            aboutAirplay = "<b>Airplay</b> is available."
        }
        else {
            aboutAirplay = "Airplay cannot be used now."
        };
        if  ((data.bluealsa === true) &&
             (data.airplay === false) &&
             (data.spotify === false)) {
            aboutBluetooth = "<b>Bluetooth</b> streaming is available.";
        }
        else if ((data.bluealsa === true) &&
                ((data.airplay === false) ||
                (data.spotify === false)))
        {
            aboutBluetooth = "Bluetooth streaming is blocked now";
        }
        else {
            aboutBluetooth = "<b>Bluetooth</b> streaming is available.";
        };
  let frameHTML = `<li id="bluetooth" class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
    <p class="settings-text-small pl-1 my-1">Status of streaming services:</p>
    <p class="settings-text-small pl-1 my-1"> ${aboutAirplay}</p>
    <p class="settings-text-small pl-1 my-1"> ${aboutBluetooth}</p>
     <p class="settings-text-small pl-1 my-1"> ${aboutSpotify}</p>
  </div>
 </li>`
 document.getElementById("streaming").innerHTML = frameHTML;
};
//[4]: { muted: boolean, usingAlsa: "", speaker: "", sampling: "", format: "" }
function buildAmplifier(data) {
    let aboutMuted = "";
    if (data.muted === true) {
        aboutMuted = `Bluetooth speaker <b> ${data.speaker}</b> is used instead of the amplifier.`
    }
    else {
        if (data.usingAlsa !== "idle") {
            aboutMuted = `<b> ${data.usingAlsa} </b> is streaming audio to the amplifier. <br>
                            Sample rate: <b>${data.sampling}</b> &ensp; Audio format: <b>${data.format} </b>`
        }
        else {
            aboutMuted = "Amplifier is idle - no streaming is going on."
        };
    };
    let frameHTML = `<li id="bluetooth" class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
    <p class="settings-text-small pl-1 my-1">${aboutMuted} </p>
  </div>
 </li>`
  document.getElementById("amplifier").innerHTML = frameHTML;
};

//[5]: { wifi: false/"Link Quality...", ssid: "<ssid>", 
//     bluetooth: boolean, speaker: false / name: <name>, link: "Good..."},
//     sources: false/[ {name: <name>, link: "Good..."}, ...], version:"" }
function buildSignal(data) {
    let isWifi = data.wifi
    let isBluetooth = data.bluetooth
    let frameHTML = ""
    let liHTMLwifi = `<li id="wifi-signal" class= "list-group-item d-flex justify-content-between align-items-center player-list"> `
    let liHTMLbt = `<li id="bluetooth-signal" class= "list-group-item d-flex justify-content-between align-items-center player-list"> `
    let wifiHTML = "";
    let bluetoothHTML = "";
    let speaker = data.speaker;
    let sources = data.sources;
    let speakerHTML = "";
    let sourcesHTML = "";
    let versionHTML = "";
 //first the WiFi frame
    if (isWifi != false) {
        wifiHTML = ` 
            <div class="col pl-0">
             <p class="settings-text-small pl-1 my-1">  Wi-Fi <b>${data.ssid}</b> signal data:<br> 
             ${data.wifi}</p>
            </div> 
           </li>
           `;
    };
 // ...then the bluetooth frame
    if (isBluetooth === true) {  
        
        if (speaker != false) {     //(speaker != false)
            speakerHTML = ` 
             <p class="settings-text-small pl-1 my-1"> Bluetooth speaker <b>${speaker.name}</b><br> 
             Signal quality: ${speaker.link}</p>
        
            `;
        };
        if (sources != false) {
            let arrayLength = sources.length;
            for (let i = 0; i < arrayLength; i++) {
                sourcesHTML = sourcesHTML + `<div class="col pl-0">
                <p class="settings-text-small pl-1 my-1"> Bluetooth device <b>${sources[i].name}</b><br>
                    Signal quality: ${sources[i].link}</p>
    
           `;
            };
        };
        //versionHTML has the </li> and ends the bluetooth frame
        versionHTML =
            ` 
         
             <p class="settings-text-small pl-1 my-1"> Bluetooth version is <b>${data.version}</b><br> 
            </div>   
           </li> `;
        bluetoothHTML = speakerHTML + sourcesHTML + versionHTML;
    };
    frameHTML = liHTMLwifi + wifiHTML;
    document.getElementById("wifi-signal").innerHTML = liHTMLwifi + wifiHTML;
    frameHTML = liHTMLwifi + wifiHTML;
    document.getElementById("bluetooth-signal").innerHTML = liHTMLbt +  `<div class="col pl-0">`+ bluetoothHTML;
};

//[6]: { computer: "", card: ""  }
//Note: an empty ending li-element is appended last to avoid the frame being blocked by buttons
function buildHardware(data) {
  let frameHTML = `<li id="mpc" class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
  <p class="settings-text-small pl-1 my-1"> The hardware consist of a single-board computer, <b>${data.computer}</b> and
  a soundcard, <b>${data.card}</b> which is capable of 2 x 35 W output. It uses DC 24 V / 3.0 A.</p>
  </div>
</li>
<li id="the-end" class="end-element bg-inner list-group-item">
      <div class="end-text">
          <p end-text> <br>&nbsp<br>&nbsp;&nbsp;<br>&nbsp;</p> 
      </div>
</li>
       `;
  document.getElementById("hardware").innerHTML = frameHTML;
};
