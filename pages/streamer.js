//Copyright 2025 by Retro Audiophile Designs
//GNU General Public License v3.0 or later                 [Source code]
//             ~ Frontend code for Streamer Start Page by RAD  ~
//NOTE: this file cannot be minimized. NOT BE MINIMIZED!!

//Global variables
var socket = io.connect();  //socket connects for communication to backend
var disconnection = false;  //true if there has been a disconnect

//Render on page show events==========================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log(timeStamp(), "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "startpage", when: "visible again" }); 
    };
    /*
    else {
        //hidden or not does not matter...
        //console.log(timeStamp(), "Internal: ==== document is hidden again ====");
    };*/
};

//========================================================================================
//Open page code =========================================================================
/**This is the main part of listeners for page events (not buttons)
 * "document.addEventListener('DOMContentLoaded', function () { ..." is the head
 *          ...the tail is further down. Do not delete the tail!
 * (all backend listeners for commands have to be enclosured by this listener)
 * When the base set up of the page, streamer.html, is loaded -  start listen on socket!
 * @return {?}          never returns, of no interest
 */
document.addEventListener('DOMContentLoaded', function () {
    //The DOM is loaded, initial HTML document rendered
    console.log(timeStamp(), "DOM is ready!");
    //socket.data.startpage = true; //I WONDER IF THIS WORKS?
    //PRESENCE call to backend! -- first (attempt) to render full page
    socket.emit('page-opens', { page: "startpage", when: "DOM ready" });  

    //Volume slider set up
    var slider2HTML = document.getElementById('volume-slider');
    //First create volume slider...
    noUiSlider.create(slider2HTML, {
        start: 100,
        animate: true,
        connect: "lower",
        step: 5,
        behaviour: 'tap-drag',
        range: {
            'min': 0,
            'max': 100
        }
    });
    // ...and then call to set volume listener
    slider2HTML.noUiSlider.on('change', function () {
        console.log("Volume handle moved", this);
        volumeTouched(this);
});
//.................................................................................iOS
   // iOS web app full screen hacks for all pages; Progressive Web App (PWA) looks
  if(window.navigator.standalone == true) {
    // make all links remain in web app mode. NOTE: jQuery
    $('a').click(function() { window.location = $(this).attr('href');
                return false;
                    });
                  };
//.................................................................................iOS

//===========================================================Backend Command Listeners
///Listeners for rendering of information frames......................................
    socket.on('streamerStatus', function (dataString) {
      //data is a string, e.g. "Idle...", "Spotify", 
      //console.log(timeStamp(),"From backend: new status frame", dataString);
      renderPlayerStatus(dataString);
      disconnection && connectionAgain();
      disconnection = false; /*connection established*/
    });
    
socket.on("volume", function (dataInteger) {
    //Set volume - data is volume as an integer, 0-100
    //console.log(timeStamp(),"From backend: set volume...", dataInteger);
    document.getElementById('volume-slider').noUiSlider.setHandle(0, dataInteger, true);
    disconnection && connectionAgain();
    disconnection = false; /*connection established*/
});

socket.on("bluetooth", function (dataString) {
    //Set bluetooth status - data is a string "on" or "off"
    //console.log(timeStamp(),"From backend: bluetooth is", dataString);
    renderBluetoothStatus(dataString);
    disconnection && connectionAgain();
    disconnection = false; /*connection established*/
});

    socket.on("bluetoothSpeaker", function (dataString) {
      //Set bluetooth status - data is a string "name" or ""
      //console.log(timeStamp(), "From backend: bluetooth speaker is", dataString);
      renderBluetoothSpeaker(dataString);
      disconnection && connectionAgain();
      disconnection = false; /*connection established*/
    });

    socket.on("wireless", function (dataArray) {
        //Set wireless status - data is an array; ["SSID"", "IP address"]
        //console.log(timeStamp(), "From backend: connected to Wi-Fi:", dataArray);
        renderWirelessStatus(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("accesspoint", function (dataString) {
        //Set AP status - data is a string "up or "down"
        //console.log(timeStamp(), "From backend: Hotspot status:", dataString);
        renderAccessPointStatus(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("wired", function (dataString) {
        //Set cable attached status - data is a string "ip adress" or ""
        //console.log(timeStamp(), "From backend: LAN cable status:", dataString);
        renderWiredStatus(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("internet", function (dataString) {
        //Set internet connection status - data is a string "access" or ""
        //console.log(timeStamp(), "From backend: Internet:", dataString);
        renderInternetStatus(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    //Listeners for rendering pop-up messages.........................................
    socket.on("startMessage", function (data) {
        //Render a critical pop-up message regarding Streamer issues, data is an object
        //on format:  {type: "<type of message>", missive: "<message>" }
        console.log(timeStamp(), "From backend: start page message:", data);
        renderPageMessage(data);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on('connect_error', (error) => {
        if (error && (disconnection === false)) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "startpage", when: "after error" });
        };
        //no action here
    });
    socket.on("disconnect", () => {
        if (disconnection === false) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "startpage", when: "after disconnect" });
        };
        //no action here
    });

//=================================================================== this is the TAIL
//Open page sequence END =============================================================
});


//================================================================ generate HTML======
// Building HTML dynamically for Streamer page =======================================
//====================================================================================
//Streamer frames                                                 DOM-manipulation
//------------------------------------------------------------------------------------
//Status frames are created by HTML builds:      A to J
//Information frames are created by HTML builds: K to P

/**HTML - render Streaming status - called by backend.
 * The status frame has the id player-status and it is an <ul> element. The
 * content of the frame is a <li> element. It might have a button/listener.
 * Status string can be: "idle", "bluetooth", "spotify", "airplay",
 *                       "restart", "reboot", "disconnected"
 * @param  {string}     status, current status to render
 * @param  {DOM}        id, 'player-status'
 * @return {html}       of no interest
 */
function renderPlayerStatus(status) {
  //console.log("Making HTML for:", status);
  switch(status) {
    case "idle":
    document.getElementById("player-status").innerHTML = idleStatusHTML();
    break;
      case "bluetooth":
    //Triggers: busyStreaming() + whatIsStreaming()
    document.getElementById("player-status").innerHTML = bluetoothStatusHTML();
    //button setting onclick="functionName()" or one-time listeners?
    break;
    case "spotify":
    //Triggers: busyStreaming() + whatIsStreaming()
    document.getElementById("player-status").innerHTML = spotifyStatusHTML();
    //button setting onclick="functionName()"
    break;
    case "playback":    //DEPRECATED
    //Follow: 'machine.playing = true;' in machine to find the right triggers.
    //Trigger: playback is detected renderPlayCurrent()
    document.getElementById("player-status").innerHTML = playbackStatusHTML();
    //button setting onclick="functionName()"
    break;
    //Triggers: busyStreaming() + whatIsStreaming()
    case "airplay":
    document.getElementById("player-status").innerHTML = airplayStatusHTML();
    //button setting onclick="functionName()"
    break;
    case "disconnected":
    //Called from disconnect() below . . .
    document.getElementById("player-status").innerHTML = disconnectedStatusHTML();
    break;
    case "upnp":        //DEPRECATED
    //Triggers: busyStreaming() + whatIsStreaming()
    document.getElementById("player-status").innerHTML = upnpStatusHTML();
    //button setting onclick="functionName()"
    break;
    case "restart":
    //Triggers: restartStreamingServices()
    document.getElementById("player-status").innerHTML = restartStreamingStatusHTML();
    break;
    case "reboot":
    //Triggers: restartPlayer()
    document.getElementById("player-status").innerHTML = restartPlayerStatusHTML();
    break;
    default:
    document.getElementById("player-status").innerHTML = unknownStatusHTML();
    return false;
  };
};
//_______________________________________________________________________________________________
/**HTML - render modal HTML for Streamer pop-up message      [display bluetooth message]
 * The object is on format: {type: "<type of message>", missive: "<message>" } where:
 * type: can be error, done, info, mishap, long
 * missive: is the actual message 
 * @param  {object}  message,  {type: "<type of message>", missive: "<message>" }
 */
function renderPageMessage(data) {
    console.log("Incoming Page message:", data);
    switch (data.type) {
        case "error":
            errorDispatch(data.missive);
            break;
        case "done":
            doneDispatch(data.missive);
            break;
        case "info":
            infoDispatch(data.missive);
            break;
        case "mishap":
            mishapDispatch(data.missive, data.duration);
            break;
        case "long":
            infoDispatch(data.missive, data.duration);
            break;
        default:
            infoDispatch(data.missive);
            return true;
    };

};
 //_____________________________________________________________HTML builds___________
    // Build status frames for streamer - status frame is persistent  A - J
 //-----------------------------------------------------------------------------------
 //A. HTML build for idle status [no button]....................................
function idleStatusHTML() {
     return `
     <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fas fa-record-vinyl fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Idle... </p>
     </div> </li>
     `;
};
//B. HTML build for USB Playback status.........................................DEPRECATED
function playbackStatusHTML() {
     return `
     <li id="playback-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fas fa-play-circle fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">USB Playback... </p>
     </div>
     <div id="stop-playback" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Playback" onclick="playbackStopClicked()"></i>
       </button>
     </div> </li>
     `;
};
//C. HTML build for Bluetooth streaming status..................................bluetoothStopClicked()
function bluetoothStatusHTML() {
     return `
     <li id="bluetooth-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Streaming Bluetooth... </p>
     </div>
     <div id="stop-bluetooth" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="bluetoothStopClicked()"></i>
       </button>
     </div> </li>
     `;
};
//D. HTML build for Spotify streaming status....................................spotifyStopClicked()
function spotifyStatusHTML() {
     return `
     <li id="spotify-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fab fa-spotify fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Streaming Spotify... </p>
     </div>
     <div id="stop-spotify" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="spotifyStopClicked()"></i>
       </button>
     </div>  </li>
     `;
};
//E. HTML build for Airplay streaming status....................................airplayStopClicked()
//NOTE: Cannot use fontawesome icons, instead a css web-mask is used [line 93]
//<div class="bg-secondary airplay-symbol"> </div> and .css airplay-symbol
function airplayStatusHTML() {
     return `
     <li id="airplay-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
      <div class="col-auto">
        <div class="bg-secondary airplay-symbol">
        </div>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Streaming AirPlay... </p>
     </div>
     <div id="stop-airplay" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="airplayStopClicked()" ></i>
       </button>
     </div>  </li>
     `;
};
//F. HTML build for UPnP streaming status.................................... DEPRECATED
//NOTE: Cannot use fontawesome icons, instead a plain svg file is used
//Found icon here: https://iconape.com/upnp-logo-icon-svg-png.html
//Found <img> tips here: vgontheweb.com/#implementation
//<img src="upnp.svg" alt="Breaking Borders Logo" height="45" width="45">
//Changes to upnp.svg file: <path fill="#373D45"... and <path fill="#73777C"...
function upnpStatusHTML() {
     return `
     <li id="upnp-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto pl-2 pr-2">
          <img src="upnp.svg" alt="Breaking Borders Logo" height="45" width="45">
        </div>
        <div class="col pl-0">
        <p class="settings-text pl-0 my-3">Streaming UPnP... </p>
        </div>
        <div id="stop-UPnP" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
        <button class="playback-btn" type="button">
          <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="upnpStopClicked()" ></i>
          </button>
        </div> </li>
     `;
};
//G. HTML build for restarting status [no button]...............................
// originally fas fa-power-off
function restartPlayerStatusHTML() {
     return `
     <li id="restart-player-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Restarting Player... </p>
     </div> </li>
     `;
};
//H. HTML build for restarting status [no button]...............................
//originally fs fa-circle-notch
function restartStreamingStatusHTML() {
     return `
     <li id="restart-streaming-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Restarting all streaming... </p>
     </div> </li>
     `;
};
//I. HTML build for diconnect status [no button]................................
function disconnectedStatusHTML() {
     return `
     <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">ERROR: Disconnected </p>
     </div> </li>
     `;
};
//J. HTML build for empty status [unknown status]................................
function unknownStatusHTML() {
     return `
     <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
     <div class="col pl-0">
       <p class="settings-text py-2"></p>
     </div> </li>
     `;
};
//____________________________________________________________________________________
//Streamer Information frames                                         DOM-manipulation
//------------------------------------------------------------------------------------
/**HTML - if Bluetooth is on then render frame HTML for Bluetooth status,
 * or if it is off remove the frame with an empty string (does this really work?)
 * @param  {bluetooth}bluetooth, yes or no as a string
 * @param  {id}       id = 'bluetooth-list' for HTML
 * @param  {button}   button = "#disconnect-bluetooth" for off-button
 * @return {html}    frame
 */
function renderBluetoothStatus(bluetooth) {
    if (bluetooth == "yes") {
        document.getElementById("bluetooth-list").innerHTML =
            btStatusHTML();
        $("#disconnect-bluetooth").on('click', function () {
            console.log("Button; turn-off Bluetooth - all and everything");
            turnoffBluetoothClicked();
        });
    }
    else {
        document.getElementById("bluetooth-list").innerHTML = "";
        $("#disconnect-bluetooth").off('click');
    };
};
/**HTML - if Bluetooth speaker is connected render frame HTML,
 * or if it is disconnected remove the frame with an empty string
 * @param {speakerName} speakerName, name string 
 * @param  {id}         id = 'bluetooth-speaker-connected'
 * @param  {button}     button, "#disconnect-speaker" for off-button
 * @return {html}       frame
 */
function renderBluetoothSpeaker(speakerName) {
    if (speakerName !== "") {
        document.getElementById("bluetooth-speaker-connected").innerHTML =
            btSpeakerHTML(speakerName);
        $("#disconnect-speaker").on('click', function () {
            console.log("Button; disconnect bt speaker");
            disconnectSpeakerClicked();
        });
    }
    else {
        document.getElementById("bluetooth-speaker-connected").innerHTML = "";
        $("#disconnect-speaker").off('click');
    };
};
/**HTML - if the Streamer is connected to Wi-Fi render frame HTML,
 * @param  {dataArray} dataArray, ["ssid", "ipaddr"] or []
 * @param  {id}        id = 'wireless-status'
 * @param  {button}    button, "#disconnect-wifi"
 * @return {html}      frame
 */
function renderWirelessStatus(dataArray) {
    if (dataArray.length > 0) {
        document.getElementById("wireless-status").innerHTML =
            wirelessHTML(dataArray[0], dataArray[1]);
        $("#disconnect-wifi").on('click', function () {
            console.log("Button; disconnect Wi-Fi");
            disconnectWifiClicked();
        });
    }
    else {
        document.getElementById("wireless-status").innerHTML = "";
        $("#disconnect-wifi").off('click');
    };
};
/**HTML - if the Streamer's hotspot (AP) is up render frame HTML,
 * @param  {ap}       ap = "up" or "down"     
 * @param  {id}       id = 'accesspoint-status'
 * @param {button}    button, "#disconnect-hotspot"
 * @return {html}     frame
 */
function renderAccessPointStatus(ap) {
    if (ap == "up") {
        document.getElementById("accesspoint-status").innerHTML =
            apStatusHTML();
        $("#disconnect-hotspot").on('click', function () {
            console.log("Button turn-off Hotspot");
            turnoffHotspotClicked();
        });
    }
    else {
        document.getElementById("accesspoint-status").innerHTML = "";
        $("#disconnect-hotspot").off('click');
   };
};
/**HTML - if the Streamer is connect to LAN with a cable, render frame
 * No button.
 * @param  {ipAddr}   ipAddr = "nnn.nnn.n.nnn" or ""     
 * @param  {id}       id = 'wired-status'
 * @return {html}     frame
 */
function renderWiredStatus(ipAddr) {
    document.getElementById("wired-status").innerHTML =
        wiredStatusHTML(ipAddr);
};

/**HTML - show Internet status, always render frame and no button
 * @param  {internet}   internet = "access" or ""     
 * @param  {id}         id = 'wired-status'
 * @return {html}       frame
 */
function renderInternetStatus(internet) {
    document.getElementById("internet-status").innerHTML =
            internetStatusHTML(internet);
};

//--------------------------------------------------------HTML builds for state frames
//Information generates various HTML builds: K to P
//------------------------------------------------------------------------------------
//They have different ids like 'bluetooth-list' or 'wired-status' and they are <ul>
//elements.The ids are used by .innerHTML() function for each <ul>.
//The content of the frame are <li> elements. They might each have a button.
/**K. HTML - create frame HTML for Bluetooth on
 * @param  {id}       id = 'bluetooth-list'.
 * @return {html}    frame
 */
function btStatusHTML() {
    return  `
    <li id="btservice" class="list-group-item d-flex justify-content-between align-items-center player-list">
      <div class="col-auto pr-2">
        <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
      </div>
      <div class="col pl-1">
        <p class="settings-text my-3">Bluetooth is <strong>ON</strong></p>
      </div>
      <div id="disconnect-bluetooth" class="col-auto d-flex justify-content-end align-top p-1">
        <button class="playback-btn" type="button">
          <i class="settings-btn fas fa-times-circle fa-2x" title="Turn-off Bluetooth"></i>
        </button>
      </div> </li>
    `;
};
/**L. HTML - create frame HTML for connected bluetooth speaker
 * and also make a note that the amplifier is muted.
 * @param  {name}     name, speaker name as a string
 * @param  {id}       id = 'bluetooth-speaker-connected'
 * @return {html}     frame
 */
function btSpeakerHTML(name) {
    return  `
      <li id="bluetooth-speaker" class="list-group-item d-flex justify-content-between
                             align-items-center player-list mt-n1" data-mac="0">
        <div class="col-auto pr-2">
          <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
        </div>
        <div class="col pl-0">
          <p class="settings-text my-3">
            <span class="settings-text-small"> Speaker: </span> <strong>${name}</strong></p>
        </div>
        <div id="disconnect-speaker" class="col-auto d-flex justify-content-end align-top p-1">
          <button class="playback-btn" type="button">
            <i class="settings-btn fas fa-times-circle fa-2x" title="Disconnect speaker for now"></i>
          </button>
        </div>
      </li>
      <li id="analogue-speaker" class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1">
        <div class="col-auto pr-1">
        <i class="wifi-symbol fas fa-volume-mute fa-2x px-2 my-2"></i>
        <!-- <i class="fas fa-volume-off  <i class="fas fa-volume-mute"></i> -->
      </div>
      <div class="col pl-0 m-0">
        <p class="settings-text-small pl-0 my-3">Note: analogue speaker output is muted <br> </p>
      </div>
      </li>`;
};
/**M. HTML - create frame HTML for connected Wi-Fi
 * that shows SSID and IP address
 * @param  {ssid}     ssid, SSID a string
 * @param  {ipAddr}   ipAddr, IP adress a string
 * @param  {id}       id = 'wireless-status'
 * @return {html}     frame
 */
function wirelessHTML(ssid, ipAddr) {
    return `
      <li id="wifi-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
      <div class="col-auto">
        <i class="wifi-symbol fas fa-wifi fa-2x my-2 p-0"></i>
      </div>
      <div class="col p-0">
        <p id="wifi-text" class="settings-text mt-1 mb-2 pl-0">Wi-Fi: <strong>${ssid}</strong><br> IP-address is ${ipAddr}</p>
      </div>
      <div id="disconnect-wifi" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
        <button class="playback-btn" type="button">
          <i class="settings-btn fas fa-times-circle fa-2x" title="Disconnect Wi-Fi"></i>
        </button>
      </div>  </li>
      `;
};
/**N. HTML - create frame HTML for accesspoint up
 * @param  {id}       id = 'accesspoint-status'
 * @return {html}     frame
 */
function apStatusHTML() {
    return `
        <li id="hotspot-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
        <div class="col-auto ">
          <i class="wifi-symbol fas fa-wifi fa-2x fa-rotate-180 mt-2 mb-2 p-0"></i>
        </div>
        <div class="col p-0">
          <p class="settings-text hotspot mt-1 mb-0">Hotspot available: <br> Connect to IP-address 10.0.0.1 </p>
          <p class="settings-text-small mt-0 mb-2">[Note: Hotspot can be disconnected] </p>
        </div>
        <div id="disconnect-hotspot" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
          <button class="playback-btn" type="button">
            <i class="settings-btn fas fa-times-circle fa-2x" title="Stop hotspot"></i>
          </button>
        </div>  </li>
        `;
};
/**O. HTML - create frame HTML for Ethernet LAN cable with IP address
 * @param  {id}       id = 'wired-status'
 * @return {html}     frame
 */
function wiredStatusHTML(ipAddr) {
    //console.log("Wired status, lenght of data", ipAddr.length > 0 );
    if (ipAddr.length > 0) {
        return `
         <li id="lan-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
        <div class="col-auto">
            <i class="lan-symbol fas fa-ethernet fa-2x mt-1 mb-2"></i>
        </div>
        <div class="col pl-0">
            <p class="settings-text mt-1 mb-2">LAN cable connected <br> IP-address is ${ipAddr}</p>
        </div>  </li>
        `;
    }
    else {
        return `
        <li id="lan-is-off" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
            <div class="col-auto">
            <i class="nolan fas fa-ethernet fa-2x mt-1 mb-2"></i>
            </div>
            <div class="col pl-0">
                <p class="settings-text mt-1 mb-2">No LAN cable attached </p>
            </div>  </li>
            `;
    }; 
};
/**P. HTML - always create frame HTML for Internet access status
 * @param {internet}  internet, "access" or ""
 * @param  {id}       id = 'internet-status'
 * @return {html}     frame
 */
function internetStatusHTML(internet) {
    if (internet.length > 0) {
        return `
      <li id="internet" class="list-group-item d-flex justify-content-between align-items-center player-list">
      <div class="col-auto pl-2">
        <i class="wifi-symbol fas fa-globe fa-2x ml-2 my-2"></i>
      </div>
      <div class="col pl-1">
        <p class="settings-text my-2">Connected to Internet </p>
      </div> </li>
      `;
    }
    else {
        return `
      <li id="no-internet" class="list-group-item d-flex justify-content-between align-items-center player-list">
      <div class="col-auto pl-2">
        <i class="no-lan  fas fa-globe fa-2x ml-2 my-2"></i>
      </div>
      <div class="col pl-1">
        <p class="settings-text my-2">No Internet access! </p>
      </div> </li>
      `;
    };
};

//_____________________________________________________________________________
// FRONTEND requests invoked by user ------------------------------------------
//-----------------------------------------------------------------------------
//A. delete/stop buttons of status subframes:
//No listners for these buttons. They are called in HTML, like this:
//          "...click="airplayStopClicked()..."
//================================================================= STOP BUTTONS
/**HTML and DOM - user has clicked on stop playback in the status subframe.
 * The function calls comes from DOM ' onclick="playbackStopClicked() " ' attribute
 * @return {boolean}      true
 */
function playbackStopClicked() {  //DEPRECATED - not used anymore
  //console.log("Request to backend: (pause, { page: startpage })");
  socket.emit('pause', { page: "startpage" });
  return true;
};
/**HTML and DOM - user has clicked on stop bluetooth in the status subframe.
 * The function calls comes from DOM ' onclick="bluetoothStopClicked() " ' attribute
 * @return {boolean}      true
 */
 function bluetoothStopClicked() {
     console.log("Request to backend: (stop-streaming-now, bluetooth)");
     socket.emit('stop-streaming-now', "bluetooth");
   return true;
 };
 /**HTML and DOM - user has clicked on stop spotify in the status subframe.
  * The function calls comes from DOM ' onclick="spotifyStopClicked() " ' attribute
  * @return {boolean}      true
  */
  function spotifyStopClicked() {
    console.log("Request to backend: (stop-streaming-now, spotify)");
      socket.emit('stop-streaming-now', "spotify");
    return true;
 };
 /**HTML and DOM - user has clicked on stop airplay in the status subframe.
  * The function calls comes from DOM ' onclick="airplayStopClicked() " ' attribute
  * @return {boolean}      true
  */
  function airplayStopClicked() {
    console.log("Request to backend: (stop-streaming-now, airplay)");
      socket.emit('stop-streaming-now', "airplay");
    return true;
 };
 /**HTML and DOM - user has clicked on stop playback in the status subframe.
  * The function calls comes from DOM ' onclick="airplayStopClicked() " ' attribute
  * @return {boolean}      true
  */
  function upnpStopClicked() {  //DEPRECATED - not used
    //console.log("Request to backend: (stop-streaming-now, upnp)");
    socket.emit('stop-streaming-now', "upnp");
    return true;
 };
//B. Volume slider function
//======================================================================= VOLUME
/**HTML and DOM - set the volume by user  - calls backend
 * The VOLUME slider bar has been moved and released.
 * @param   {DOM}           slider element
 * @return  {number}        new volume
 */
function volumeTouched(slider) {
  const newVolume = slider.get() * 1; /*faster conversion from string*/
  console.log("Request to backend: (volume, { volume: newVolume })  new volume=", newVolume);
  socket.emit('volume', { volume: newVolume });
  newVolume;
};
//C. Main control button
//======================================================================= RESET
/**HTML and DOM - reset Streamer software - calls backend
 * @return  {boolean}       always true
 */
function resetClicked() {
    console.log("Request to backend: (reset, true");
    socket.emit('reset', true);
    return true;
};

//D. stop buttons of information subframes
//========================================================================= INFO
/**HTML and DOM - user has clicked on turn off bluetooth services in the
 * information subfram, invoked by static listener.
 * @return {?}      true?
 */
 function turnoffBluetoothClicked() {
   console.log("Request to backend: (disconnect-network, { network: bluetooth })");
   socket.emit('disconnect-network',{ network: "bluetooth" });
   return true;
 };
 /**HTML and DOM - user has choosen to disconnect a bt speaker.
  * The speaker will vanish from Player page, but still be shown as trusted
  * on Bluetooth page.
  * @return {?}      true?
  */
 function disconnectSpeakerClicked(buttonElement) {
   //let parentElement = $(buttonElement).parent();
   //LIMITATION - there can only be one bt speaker, just use element id
   let mac = $("#bluetooth-speaker").attr("data-mac");
   //console.log('To backend: (disconnect-speaker, {mac:', mac, "mode: false})");
   socket.emit('disconnect-speaker', {mac: mac, mode: false});
 };
 /**HTML and DOM - user wants to disconnect wi-fi - calls backend.
  * @param  {DOM jQuery} buttonElement disconnect -- NOT USED
  * @return {?}  true?
  */
 function disconnectWifiClicked(){
   //console.log("To backend:(disconnect, [wifi]) ");
   socket.emit('disconnect-network',{ network: "wifi" })
 };
 /**HTML and DOM user wants to turn OFF Hotspot - calls backend
  * @return {?}  true?
  */
 function turnoffHotspotClicked(){
   //console.log("To backend:(disconnect-network, {network: hotspot}) ");
   socket.emit('disconnect-network',{ network: "hotspot" })
 };

// Functions for managing BACKEND disconnect and connected again ---------------
//------------------------------------------------------------------------------
/**HTML and DOM - disconnected by backend
 * Lost the connection - render a disconnected message............. disconnected
 * @return {Boolean}  true
 */
function disconnect() {
  renderPlayerStatus("disconnected");
  $('#volume-slider').hide();
  //$('#upper-nav-bar').hide();
  //$('#lower-nav-bar').hide();
  $('#bluetooth-list').hide();
  $('#connection-list').hide();
  //$(window).resize();
  return true;
};
/**HTML and DOM - connected by backend
 * The connection came back  - unhide all elements.....................connected
 * @return {Boolean}  true
 */
function connectionAgain() {
  $('#volume-slider').show();
  //$('#upper-nav-bar').show();
  //$('#lower-nav-bar').show();
  $('#bluetooth-list').show();
  $('#connection-list').show();
};

//older position for end of main eventlistner=====================================TAIL
//Open page sequence END =============================================================
//}); 

//Auxiliary help functions+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

/**No HTML or DOM  - time stamp hrs:min:sec:msec on format 00:00:00:000
 * @return {string}           time stamp
 */
function timeStamp() {
    const d = new Date();
    return `${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
};
//______________________________________________________________________ Notyf helpers
//the npm package notyf is used: https://www.npmjs.com/package/notyf
//In 2025 the notyf.js needed some patching to work. 

//The most important global variable - the notyf object
var notyf = new Notyf();

//Other global variables
const infoColor = "#AF5828";  //player-orange
const errorColor = "#4C1C1A"; //player-red
const okayColor = "#1B3E33";  //player-green
const oopsColor = "#5578A0";  //player-blue

const quickDuration = 8000;
const normalDuration = 10000;
const longDuration = 30000;
const lastingDuration = (60000 * 5);

const threeSpaces = "&nbsp; &nbsp; &nbsp;";
const fourSpaces = "&nbsp; &nbsp; &nbsp; &nbsp;";
const sixSpaces = "&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;";

//---------------------------------------------ERROR
function errorDispatch(missive, duration) {
    duration = duration || longDuration;
    notyf.error({
        message: missive,
        duration: duration,
        background: errorColor,
        position: { x: 'center', y: 'top' },
        dismissible: true
    });
};
//----------------------------------------------INFO
function infoDispatch(missive, duration) {
    duration = duration || normalDuration;
    notyf.success({
        message: missive,
        duration: duration,
        background: infoColor,
        position: { x: 'center', y: 'top' },
        dismissible: true,
        icon: false

    });
};
//----------------------------------------------DONE
function doneDispatch(missive, duration) {
    duration = duration || normalDuration;
    notyf.success({
        message: missive,
        duration: normalDuration,
        background: okayColor,
        position: { x: 'center', y: 'top' },
        dismissible: true
    });
};
//------------------------------------------MISHAP
function mishapDispatch(missive, duration) {
    duration = duration || longDuration;
    notyf.success({
        message: missive,
        duration: duration,
        background: oopsColor,
        position: { x: 'center', y: 'top' },
        dismissible: true,
        icon: false
    });
};


