///Copyright 2025 by Retro Audiophile Designs, license GPL 3.0 or later
//¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨¨
//      ~ Front end code for Network Page of RAD Streamer ~
//NOTE: this file cannot be minimized. NOT BE MINIMIZED!!

//Global variables
var socket = io.connect();
var disconnection = false;
var wifiList = [];          //an array of wifi networks

//............................for spacing purposes
const threeSpaces = "&nbsp; &nbsp; &nbsp;";
const fourSpaces = "&nbsp; &nbsp; &nbsp; &nbsp;";
const sixSpaces = "&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;";

//Render on page show events=====================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log(timeStamp(), "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "wifipage", when: "visible again" }); 
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
 * When the base set up of the page, streamernetwork.html, is loaded -  start listen on socket!
 * @return {?}          never returns, of no interest
 */
document.addEventListener('DOMContentLoaded', function () {
    //The DOM is loaded, initial HTML document in place
    console.log(timeStamp(), "DOM is ready!");

    //PRESENCE call to backend! -- first (attempt) to render full page
    socket.emit('page-opens', { page: "wifipage", when: "DOM ready" });
    //console.log(timeStamp(), "To backend: Network page-opens first time");

    //.................................................................................iOS
    // iOS web app full screen hacks.
    if (window.navigator.standalone == true) {
        // make all links remain in web app mode.
        $('a').click(function () {
            window.location = $(this).attr('href');
            return false;
        });
    };
    //.................................................................................iOS

    //===========================================================Backend Command Listeners
    ///Listeners for rendering of information frames......................................

    socket.on("wireless", function (dataArray) {
        //Set wireless status - data is an array; ["SSID"", "IP address"]
        //console.log(timeStamp(), "From backend: status array to Wi-Fi:", dataArray);
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

    //A2. Listener for a list of array of ssids to render
    socket.on('wifi-networks', function (data) {
        console.log("From backend: wifi network scan array:", data);
        $('#wifiModal').modal('hide');//<--------------------------entry point for backend
        renderWirelessStatus([]);     //clear out the spinner
        renderWifiNetworks(data);     //render possible ssids
        disconnection = false; /*connection established */
    });

    //C. Listener for showing that a connect attempt is going on - spinner
    socket.on('wifi-connecting', function () {
        console.log("From backend: ...render spinner again!");
        spinWifiSpinner("#connect-wifi"); //<-----entry point for backend
        //Set button so wi-fi can be disconnected again
        $("#disconnect-wifi").on('click', function () {
            // console.log("B1. disconnect Wi-Fi");
            disconnectWifiClicked($(this));
        });
        disconnection = false; /*connection established */
    });

    socket.on('connect_error', (error) => {
        if (error && (disconnection === false)) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "wifipage", when: "after error" });
        };
        //no action here
    });

    //Listeners for rendering pop-up messages.........................................
    socket.on("networkMessage", function (data) {
        //Render a critical pop-up message regarding bluetooth issues, data is an object
        //on format:  {type: "<type of message>", missive: "<message>" }
        console.log(timeStamp(), "From backend: bluetooth message:", data);
        renderNetworkMessage(data);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("disconnect", () => {
        if (disconnection === false) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "wifipage", when: "after disconnect" });
        };
    });
    //=================================================================== this is the TAIL
    //Open page sequence END =============================================================
});

    //===================================================================create HTML frames
    // Building HTML state frames for network =============================DOM-manipulation
    //=====================================================================================
    /**HTML - render Wi-Fi state frame HTML,
     * @param  {dataArray} dataArray, ["ssid", "ipaddr"] or []
     * @param  {id}        id = 'wireless-status'
     * @param  {button}    button, "#disconnect-wifi" "#connect-wifi"
     * @return {html}      frame
     */
    function renderWirelessStatus(dataArray) {
        if (dataArray.length > 0) {
            document.getElementById("wireless-status").innerHTML =
                wirelessConnectedHTML(dataArray[0], dataArray[1]);
            $("#disconnect-wifi").on('click', function () {
                console.log("Button - disconnect Wi-Fi");
                disconnectWifiClicked();
                $("#connect-wifi").off('click');
            });
        }
        else {
            document.getElementById("wireless-status").innerHTML =
                wirelessDisconnectedHTML();
            $("#connect-wifi").on('click', function () {
                console.log("Button - connect Wi-Fi -> scanning clicked!!");
                scanWifiClicked();
                $("#disconnect-wifi").off('click');
            });
        };
    };


    /**HTML - render hotspot (AP) state frame HTML,
     * @param  {ap}       ap = "up" or "down"     
     * @param  {id}       id = 'accesspoint-status'
     * @param {button}    button, "#disconnect-hotspot" "#connect-hotspot"
     * @return {html}     frame
     */
    function renderAccessPointStatus(ap) {
        if (ap == "up") {
            document.getElementById("accesspoint-status").innerHTML =
                apStatusUpHTML();
            $("#disconnect-hotspot").on('click', function () {
                console.log("Button turn-off Hotspot");
                turnoffHotspotClicked();
            });
            $("#connect-hotspot").off('click');
        }
        else {
            document.getElementById("accesspoint-status").innerHTML = 
                apStatusDownHTML();
            $("#connect-hotspot").on('click', function () {
                console.log("Button turn-onf Hotspot");
                turnonHotspotClicked();
            });
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

//...................................................................... spinner
//HTML build for 1st modal with wifi networks scan results, render the modal
//wifiArray format:  [ '<ssid<', '<ssid>', '<ssid>', ...]
function renderWifiModal(wifiArray) {
    //console.log("Internal: Preparing for wifi modal");
    let htmlString = "";
    const numberOfDevices = wifiArray.length;
    for (let i = 0; i < numberOfDevices; i++) {
        htmlString = htmlString +
            ` <a href="#" class="list-group-item list-group-item-action scan-list playback-text mb-1"
                onclick="connectWifi(${i})">
                 ${sixSpaces} ${wifiArray[i]} ${sixSpaces} ${sixSpaces} </a>`;
    };
    document.getElementById("wifi-available").innerHTML = htmlString;
    $('#wifiModal').modal('show');
};
//HTML build for modal with the selected wifi network, ssid
//Rendering the 2nd modal with a form to get the password
function renderSelectedModal(ssid) {
    console.log("Internal: Preparing for wifi modal for picked ssid:", ssid);
    let htmlString = wifiConnectHTML(ssid);  //see above
    document.getElementById("wifi-selected").innerHTML = htmlString;
    $('#wifiConnectModal').modal('show');
};

/*function setListeners(connectionsArray) {        DEPRECATED
    const thisArray = connectionsArray;
};
    //A. Wi-Fi connect/Disconnect
   /* if (thisArray[0].wifi === true) {
        $("#disconnect-wifi").on('click', function () {
            // console.log("B1. disconnect Wi-Fi");
            disconnectWifiClicked($(this));
        });
    }
    else {
        //i) listens for the wifi scan button to be clicked
        $('#connect-wifi').on('click', function () {
            console.log("B2. ask for scan of Wi-Fi networks");
            scanWifiClicked($(this))
        });
        //ii) listens for the pop-up for ssid and pwd on 2nd modal
        $('#wifi-form').submit(function () {
            console.log("B2. connect to Wi-Fi from modal");
            connectWifiClicked($('#wifi-SSID').val(), $('#wifi-password').val());
            //stop submit form default which is: post and reload page (= not wanted)
            return false; //this is the stopper mentioned above
        });
    };
};*/

//_______________________________________________________________________________________________
/**HTML - render modal HTML for the speaker connect pop-up menu.      [display bluetooth message]
 * The object is on format: {type: "<type of message>", missive: "<message>" } where:
 * type:    can be error, done, info, mishap, long
 * missive: is the actual message 
 * @param  {object}  message,  {type: "<type of message>", missive: "<message>" }
 */
function renderNetworkMessage(data) {
    console.log("Incoming network message:", data);
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



//--------------------------------------------------------------HTML builds for frames
//Information generates various HTML builds used in state frames:
//------------------------------------------------------------------------------------
//They have different ids like "wireless-status" or 'accesspoint-status' and they are <ul>
//elements.The ids are used by .innerHTML() function for each <ul>.
//The content of the frame are <li> elements. They might have a button.   
//====================================================================================
/** HTML - create HTML for connected Wi-Fi
 * that shows SSID and IP address + a disconnect button
 * @param  {ssid}     ssid, SSID a string
 * @param  {ipAddr}   ipAddr, IP adress a string
 * @param  {id}       id = 'wireless-status'
 * @return {html}     frame
 */
function wirelessConnectedHTML(ssid, ipAddr) {
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
/** HTML - create HTML for disconnected Wi-Fi
 * that shows a Wi-Fi scan button
 * @param  {id}       id = 'wireless-status'
 * @return {html}     frame
 */
function wirelessDisconnectedHTML() {
    return `
    <li id="wifi" class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1">
        <div class="col-auto">
        <i class="nowifi fas fa-wifi fa-2x mt-3 mb-2 p-0"></i>
    </div>
    <div id="connect-wifi" class="col my-2 p-0">
        <button type="button" class="btn usb-root-btn"title="Scan for Wi-Fi">
         Scan for Wi-Fi networks
        </button>
     </div>
        </div>
    </li>
      `;
};
/** HTML - create HTML for when AP is up
 * that shows a Wi-Fi scan button
 * Note: the IP address for AP is defined here as: 10.0.0.1
 * *  NEEDS SOME THOUGHTS. IP address is "hard wired" and SSID name is not there
 * @param  {id}       id = "accesspoint-status"
 * @return {html}     frame
 */
function apStatusUpHTML() {
    return `
       <li id="hotspot-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
       <div class="col-auto ">
    <i class="wifi-symbol fas fa-wifi fa-2x fa-rotate-180 mt-2 mb-2 p-0"></i>
  </div>
  <div class="col p-0">
    <p class="settings-text hotspot mt-1 mb-0"> Hotspot available: <br> </p>
    <p class="settings-text-small mt-0 mb-2"> connect first to Wi-Fi <strong>Streamer</strong><br>...go to http://streamer.local <br>or use the IP address 10.0.0.1</p>
    
  </div>
  <div id="disconnect-hotspot" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
    <button class="playback-btn" type="button">
      <i class="settings-btn fas fa-times-circle fa-2x" title="Stop hotspot"></i>
    </button>
  </div>
  </div>;  </li>
        `;
};
/** HTML - create frame HTML for when AP is down
 * that shows a Wi-Fi scan button
 * Note: the IP address for AP is defined here as: 10.0.0.1
 * * NEEDS SOME THOUGHTS. IP address is "hard wired" and SSID name is not there
 * @param  {id}       id = "accesspoint-status"
 * @return {html}     frame
 */

function apStatusDownHTML() {
    return `
  <li id="hotspot-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
  <div class="col-auto">
    <i class="nohotspot fas fa-wifi fa-2x fa-rotate-180 mt-2 mb-2 p-0"></i>
  </div>
  <div id="connect-hotspot" class="col my-2 p-0">
      <button type="button" class="btn usb-root-btn"title="Start the hotspot">
        Start Streamer's Hotspot
      </button>
    </div>
  </div> </li>
  `;
};
/**HTML - create HTML for Ethernet LAN cable with IP address
 * @param  {id}       id = 'wired-status'
 * @param  {string}   ipAddr, IP address
 * @return {html}     frame
 */
function wiredStatusHTML(ipAddr) {
    //console.log("Wired status, lenght of data", ipAddr.length > 0);
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
/**HTML and DOM - helper function. Starts the spinner indicating that a connection
     * attempt is going on (Wi-Fi) or start-up of hotspot.
     * spin the spinner! ...until the wifi connection is established, or not!   --UPDATE li string
     * @return {boolean}  true
     */
function spinWifiSpinner(liString) {
    let buttonElement = $(liString)
    let parentElement = buttonElement.parent();
    buttonElement.remove();
    parentElement.append(`
   <div class="col pl-0">
            <p class="settings-text mt-1 mb-2">Scanning... </p>
        </div>
<div id="bluetooth-waiting-spinner" class="col-auto d-flex justify-content-start ml-3 pl-5">
  <div class="spinner-border loading-symbol" role="status">
    <span class="sr-only"></span>
  </div>`);
    return true;
};
/**HTML and DOM - This is the body of the modal #wifiConnectModal
  * pop-up in order to enter ssid + password
  *    Inserted at #wifi-selected;
  *    Removed: autocomplete="current-password" and also type="password"
  * @return {boolean}  true
  */
function wifiConnectHTML(ssid) {   
    return `
        <form id="wifi-form" class="px-4 py-2">
          <div class="form-group  player-headline">
            <label for="exampleDropdownFormEmail1" style="white-space:nowrap"><b>Selected Wi-Fi network (or enter a new one):</b></label>
            <input id="wifi-SSID" type="text" class="form-control text-muted" value="${ssid}">
          </div>
          <div class="form-group  player-headline">
            <label for="exampleDropdownFormPassword1"><b>Password:</b></label>
            <input id="wifi-password" type="text" class="form-control"  placeholder="Enter Password...">
          </div>
          <button type="submit" class="btn connect-wifi-btn">Connect to Wi-Fi</button>
        </div> `
};



    //----------------------------------------------------------
    // A. Wi-Fi button functions -------------------------------
    /**HTML and DOM - user wants to scan for wifi networks
     * Send the request to backend, if there are any wifis, backend will eventually
     * correspond with a "wifi" call on socket (see above).
     * Backend will indireclty call 'renderWifiNetworks(wifiArray)' -- see below
     * STEP 1: This is the main button, the button has been clicked. Wait for backend.
     * @return {boolean}  true
     */
    function scanWifiClicked() {
        console.log("To backend:(scan-wifi, true)");
        $('#wifiModal').modal('hide'); //there might be a modals up, better hide them
        $('#wifiConnectModal').modal('hide');
        socket.emit('scan-wifi', true); //scan request to backend, now wait...
        return true;
    };
    /**HTML and DOM - user has picked a wifi network from the modal to connect to.
     * The attribute 'onclick="connectWifi(index)" gets the right ssid'. It is time
     * to ask for the password. This is an example of a SSID button, it is for BELL462:
     * <a href="#" class="list-group-item list-group-item-action scan-list playback-text mb-1" onclick="connectWifi(0)">
                 &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; BELL462 &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </a>
     * Scan modal still up and the select wifi modal will be shown.
     * STEP 2: a wifi network (ssid) have been choosen from the wifi scan modal.
     *         Show the selected wifi modal. Hide first modal. Now wait...
     * @param  {string}  arrayIndexString used for wiFiList array, convert it first
     * @param  {GV}      wifiList, array of possible ssids displayed at the first step
     * @return {string}  ssid
     */
    function connectWifi(arrayIndexString) {
        let ssid = wifiList[arrayIndexString * 1];
        console.log("Picked ssid ---------------->:", ssid);
        $('#wifiModal').modal('hide');
        //console.log("---------------->   now modal:", ssid);
        renderSelectedWifi(ssid);
        $('#wifi-form').submit(function () {
            console.log("B2. connect to Wi-Fi from modal, ssid:", ssid);
            connectWifiClicked($('#wifi-SSID').val(), $('#wifi-password').val());
            //stop submit form default which is: post and reload page (= not wanted)
            return false; //this is the stopper mentioned above
        });
        return ssid;
    };
    /**HTML and DOM - user choosen to connect to wi-fi - sets up disconnect listener.
     * SSID/password is passed from the listener in 'setListeners()'.
     * Step 3: the ssid and passwords was retrieved from form and now sent to backend.
     *         Ask spinner start spinning, backend does the connection. Now wait...
     *         Eventually backend will call for render with new connection, or not!!
     * @param  {string} SSID SSID from submitted form from 2nd modal.
     * @param  {string} password submitted password in form 2nd modal
     * @return {boolean}  true
     */
    function connectWifiClicked(sSID, password) {
        //Close submit form by removing .show classes: THE OLD WAY DOING HIDE
        //$('#wifi-dropdown-menu').removeClass("show");
        //$('#wifi-dropdown').removeClass("show");
        //Close submit form by hiding 2nd modal, all modal should now bee hidden.
        $('#wifiConnectModal').modal('hide');   //have to be hidden here!
        $('#wifiModal').modal('hide');          //just in case...
        if (sSID !== false) {
            console.log("To back-end --> (wifi-connect, {SSID:", sSID,", password:", password,"} connect clicked)");
            socket.emit('wifi-connect', { ssid: sSID, password: password });
            spinWifiSpinner("#connect-wifi");
            //Set button so wi-fi can be disconnected again, BUT the connection may fail
            $("#disconnect-wifi").on('click', function () {
                console.log("Button 1. disconnect Wi-Fi");
                disconnectWifiClicked($(this));
            });
        }
        else {
            console.log("Internal: no SSID or no password - no action.");
        };
        return true;
    };
    /**HTML and DOM - helper function. Starts the spinner indicating that a connection
     * attempt is going on (Wi-Fi) or start-up of hotspot.
     * STEP 4: spin the spinner! ...until the wifi connection is established, or not
     * @return {boolean}  true  DEPRECATED
     */
    function XspinWifiSpinner(liString) {
        let buttonElement = $(liString)
        let parentElement = buttonElement.parent();
        buttonElement.remove();
        parentElement.append(`
<div id="bluetooth-waiting-spinner" class="col-auto d-flex justify-content-start ml-3 pl-5">
  <div class="spinner-border loading-symbol" role="status">
    <span class="sr-only"></span>
  </div>`);
        return true;
    };
    // - - - - - - - - - - - - - - - -
    /**HTML and DOM - user wants to DISCONNECT wi-fi - calls backend, sets up listeners.
     * Displays scan wi-fi networks button in DOM after disconnect.
     * @param  {DOM jQuery} buttonElement disconnect button DOM jQuery
     * @return {boolean}  true
     */
    function disconnectWifiClicked(buttonElement) {
        // console.log("To backend:(disconnect, [wifi]) - response: confirmed.");
        socket.emit('disconnect-network', { network: "wifi" })
        //set button and submit form event listeners so Wi-fi can be connected again
        //i) listens for the wifi scan button to be clicked
        $('#connect-wifi').on('click', function () {
            // console.log("B2. ask for scan of Wi-Fi networks");
            scanWifiClicked($(this))
        });
        //ii) listens for the pop-up for ssid and pwd on 2nd modal
        $('#wifi-form').submit(function () {
            // console.log("B2. connect to Wi-Fi from modal");
            connectWifiClicked($('#wifi-SSID').val(), $('#wifi-password').val());
            //stop submit form default which is: post and reload page (= not wanted)
            return false; //this is the stopper mentioned above
        });
        return true;
    };

    // C. Hotspot functions ------------------------------------
    /**HTML and DOM user wants to turn OFF Hotspot - calls backend
     * Request backend to turn off the Hotspot.
     * When disconnected displays the connect button in DOM and sets up listener.
     * @param  {element} buttonElement button element in DOM jQuery
     * @return {boolean}  true
     */
    function turnoffHotspotClicked(buttonElement) {
        console.log("To backend:(disconnect-network, {network: hotspot}) - response: confirmed.");
        socket.emit('disconnect-network', { network: "hotspot" })
        //buttonElement.parent().html(hotspotOffHTML());
        $("#connect-hotspot").on('click', function () {
            //console.log("C2. turn-on the Hotspot");
            turnonHotspotClicked($(this));
        });
        return true;
    };
    /**HTML and DOM user wants to turn ON Hotspot - calls backend
     * Request backend to turn on the Hotspot.
     * When connected isplays the disconnect button in DOM and sets up listener.
     * @param  {DOM} element button element in DOM jQuery
     * @return {boolean}  true
     */
    function turnonHotspotClicked(buttonElement) {
        console.log("To backend:(connect-network',{ network: hotspot}) - up and running)");
        socket.emit('connect-network', { network: "hotspot" })
        spinWifiSpinner("#connect-hotspot")
        //Set button again
        $("#disconnect-hotspot").on('click', function () {
            // console.log("C1. turn-off Hotspot");
            turnoffHotspotClicked($(this));
        });
        return true;
    };
    /*
    //=============================================================================
    // Functions called by backend ================================================
    // render settings frames
    //=============================================================================
    /**HTML and DOM - render all the settings - called from backend     entry point
     * Render the settings
     * @param  {JSON} settings status array
     * @return {boolean}  true
     */
    function renderSettings(settings) {
        //fixes after reconnection
        disconnection && $('#connection-text').show() && $('#volume-frame').show() &&
            $('#system-text').show() && $('#restart-list').show();
        if (settings) {
            renderSettingStates(settings);
            XXXsetListeners(settings);
        };
        return true;
    };
    /**HTML and DOM - render available Wi-Fi networks in Modal mode --> entry point
     * Format: ["BELL503", "BELL503x", "BELL267", ... ] or ""
     * @param  {JSON}      wifiArray ssid array
     * @global {array}     wifiList, the status array is saved to DOM
     * @return {boolean}   true
     */
    function renderWifiNetworks(wifiArray) {
        //console.log("Entry point renderWifi networks to select ------------");
        if (wifiArray.length > 0) {
            //wifilist is a GV is the array of wifi ssid strings
            wifiList = wifiArray;  //used for index string at on-click in HTML/DOM
            //console.log("Wifi networks incoming:", wifiArray );
            renderWifiModal(wifiArray);
            //setMenuListeners();
        };
        return true;
    };
    /**HTML and DOM - render selected Wi-Fi network - ssid in Modal mode.
     * In order to get the password open the 2nd modal, the '#wifiConnectModal'.
     * @param  {string}    ssid name of selected wifi
     * @global {array}     wifiList, reset to the empty array, scan is over
     * @return {boolean}   true
     */
    function renderSelectedWifi(ssid) {
        console.log("Now ask for the wifi password ------------");
        if (ssid !== "") {
            console.log("Selected wifi has ssid:", ssid );
            wifiList = [];
            renderSelectedModal(ssid);
        };
        return true;
    };
    /**HTML and DOM - disconnect from backend
     * Render a disconnected message
     * @return {boolean}  true
     */
function disconnect() {
    $('#connection-text').hide(); $('#volume-frame').hide();
    $('#system-text').hide(); $('#restart-list').hide();
    let message = `<li id="disconnected" class="error-list">
   <div class="disconnect-text"> <br> <br>ERROR: disconnected from the Player<br> <br> <br> </div>
   </li>
    `;
};

    function connectionAgain() {
        //nothing here
    };
    //..........................................................
    //Auxiliary help functions .................................
    function timeStamp() {
        const d = new Date();
        return `${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
    };
    function timestamp() {
        timeStamp()
    };

    /**Sleep util, stop for a while...
     * Use: sleep(ms).then(() => {  ...code here... });
     * @param {integer}            ms time in msec
     * @return {?}                 ...of no value
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
};

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