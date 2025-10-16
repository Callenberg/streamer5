///Copyright 2025 by Retro Audiophile Designs, license GPL 3.0 or later
//-------------------------------------------------------------------------------
//      ~ Frontend code for Bluetooth Page of RAD Streamer ~
//Global variables
var socket = io.connect();
var disconnection = false;
var btSpkrList = [];        //temporary storage for connectable bt speakers - modal
var Speaker = "";           //speaker name or "", used to render trusted speaker correctly
var notyf = new Notyf();


//Render on page show events==============================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log(timeStamp(), "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "bluetoothpage", when: "visible again" });
    };
    /*
    else {
        //hidden or not does not matter...
        //console.log(timeStamp(), "Internal: ==== document is hidden again ====");
    };*/
};
//==============================================================================Page opens
//Open page code =========================================================================
/**This is the main part of listeners for page events (not buttons)
 * "document.addEventListener('DOMContentLoaded', function () { ..." is the head
 *          ...the tail is further down. Do not delete the tail!
 * (all backend listeners for commands have to be enclosured by this listener)
 * When the base set up of the page, streamerbluetooth.html, is loaded -  start listen on socket!
 * @return {?}          never returns, of no interest
 */
document.addEventListener('DOMContentLoaded', function () { //------------------DOM is ready
    //The DOM is loaded, initial HTML document in place
    console.log(timeStamp(), "DOM is ready!");
    //PRESENCE call to backend! -- first (attempt) to render full page
    socket.emit('page-opens', { page: "bluetoothpage", when: "DOM ready" });  //presence call to backend!

    //.................................................................................iOS
    // iOS web app full screen hacks for all pages; Progressive Web App (PWA) looks
    if (window.navigator.standalone == true) {
        // make all links remain in web app mode. NOTE: jQuery
        $('a').click(function () {
            window.location = $(this).attr('href');
            return false;
        });
    };
    //.................................................................................iOS

    //===========================================================Backend Command Listeners
    ///Listeners for rendering of information frames......................................

    socket.on("bluetooth", function (dataString) {
        //Set bluetooth status - data is a string "on" or "off"
        console.log(timeStamp(), "From backend: bluetooth is", dataString);
        renderBluetoothStatus(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("bluetoothSpeaker", function (dataString) {
        //Show the connected bluetooth speaker - data is a string "name" or ""
        console.log(timeStamp(), "From backend: the connected bluetooth speaker is", dataString);
        renderSpeaker(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("trustedSpeakers", function (dataArray) {
        //Show the other available speakers that are trusted - dataArray is an array
        //of device object: [{bdAddr: <BD-address>, name: <name>},...] 
        console.log(timeStamp(), "From backend: bluetooth TRUSTED speakers are", dataArray);
        renderTrustedSpeakers(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("connectedDevices", function (dataArray) {
        //Render connected source devices (often phones) - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...] 
        console.log(timeStamp(), "From backend: bluetooth connected SOURCES are:", dataArray);
        renderConnectedSources(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("pairedDevices", function (dataArray) {
        //Render paired source devices that are not connected anymore - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...] 
        console.log(timeStamp(), "From backend: bluetooth disconnected pairedSOURCES are:", dataArray);
        renderPairedSources(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("speakers", function (dataArray) {
        //Render found speakers that can be connected - dataArray is an array
        //of device objects: [{bdAddr: "<BD-address"">, name: "<name>"},...] or []
        console.log(timeStamp(), "From backend: bluetooth speakers that can be connected:", dataArray);
        renderSpeakers(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });
    //Listeners for rendering pop-up messages.........................................
    socket.on("bluetoothMessage", function (data) {
        //Render a critical pop-up message regarding bluetooth issues, data is an object
        //on format:  {type: "<type of message>", missive: "<message>" }
        console.log(timeStamp(), "From backend: bluetooth message:", data);
        renderBluetoothMessage(data);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    //___________________________________________________________________ this is the TAIL
    //Open page sequence END =============================================================
    });                                                                    //Do not touch!

    //==================================================================create state frames
    // Create state frames for Bluetooth ==================================DOM-manipulation
    //=====================================================================================
    //Unordered List <ul> identifiers used where each type of frame is put:
    //      <ul id="bluetooth-list" class=...
    //      <ul id="bluetooth-speaker" class=...
    //      <ul id="bluetooth-speaker-list" class=...
    //      <ul id="bluetooth-connected-devices" class=...
    //      <ul id="bluetooth-paired-devices" class=...
    //The ids are used by the DOM function .innerHTML() for each <ul>, i.e. each state frame.
    //Buttons are managed by these functions.
    //____________________________________________________________________________________
    /**HTML - render state frame HTML for Bluetooth status,             [Bluetoth Service]
     * * 'yes' means no block - it is unblocked, bluetooth is on.
     * @param  {bluetooth}bluetooth, yes or no as a string
     * @param  {id}       id = 'bluetooth-list' for HTML
     * @param  {button}   button = "#disconnect-bluetooth" for off-button
     * @return {?}     
     */
    function renderBluetoothStatus(bluetooth) {
        if (bluetooth == "yes") {
            document.getElementById("bluetooth-list").innerHTML =
                bluetoothOnHTML();
            $("#disconnect-bluetooth").on('click', function () {
                console.log("Button; turn-off Bluetooth - all and everything");
                turnoffBluetoothClicked();
            });
            $("#connect-bluetooth").off('click');
        }
        else {
            document.getElementById("bluetooth-list").innerHTML =
                bluetoothOffHTML();
            $("#connect-bluetooth").on('click', function () {
                console.log("Button; turn-On Bluetooth");
                turnonBluetoothClicked();
            });
            $("#disconnect-bluetooth").off('click');
        };
    };
    //__________________________________________________________________________________
    /**HTML - render state frame HTML for the one connected Bluetooth speaker. [Speaker]
     * @param  {bluetooth}nameString, speaker name or ""
     * @global {string}   Speaker, speaker name or "", used to render trusted speaker
     * @param  {id}       id = 'bluetooth-speaker' for HTML
     * @param  {button}   button = "#disconnect-speaker" for disconnect-button
     * @param  {button}   button = "#scan-speaker" to bring up available speakers
     * @return {?} 
     */
function renderSpeaker(nameString) {
    Speaker = nameString;
        if (nameString == "") {
            document.getElementById("bluetooth-speaker").innerHTML =
                bluetoothNoSpeakerHTML();
            $("#scan-speaker").on('click', function () {
                console.log("Button; scan for speakers <|");
                scanSpeakerClicked($(this));
            });
            $("#disconnect-speaker").off('click');
        }
        else {
            document.getElementById("bluetooth-speaker").innerHTML =
                bluetoothSpeakerHTML(nameString);
            $("#disconnect-speaker").on('click', function () {
                console.log("Button; disconnect Bluetooth Speaker");
                disconnectSpeakerClicked();
            });
            $("#scan-speaker").off('click');
        };
    };
    /**HTML - render state frame HTML for the trusted Bluetooth speakers. [Trusted Speakers]
     * A speaker that has been connected is also trusted. Trusted speakers
     * are available for reconnect and will auto reconnect if they get a chance.
     * There are two buttons in each frame: reconnect and remove
     * @param  {bluetooth} speakerArray, [{bdAddr: <BD-address>, name: <name>},...]  or []
     * @param  {id}        id = "bluetooth-speaker-list"
     * @param  {button}    button = ".list-remove-btn" for remove button
     * @param  {button}    button = 
     * @return {?} 
     */
    function renderTrustedSpeakers(speakerArray) {
        if (speakerArray.length == 0) {
            document.getElementById("bluetooth-speaker-list").innerHTML = "";
            $(".list-remove-btn").off('click');
            $(".reconnect-spkr-btn").off('click');
        }
        else if (Speaker.length === 0) {
            //No speaker connected - render a connect button too
            document.getElementById("bluetooth-speaker-list").innerHTML =
                bluetoothTrustedSpeakersHTML(speakerArray);
            //Button B3 - reconnect
            //might be one or more buttons - use class .playback-btn
            $(".reconnect-spkr-btn").on('click', function () {
                console.log("B3. reconnect trusted speaker");
                connectSpeakerAgainClicked($(this));
            });
            //Button B2 - remove trusted speaker
            //might be one or more buttons - use class .list-remove-btn
            $(".list-remove-btn").on('click', function () {
                console.log("B2. remove the speaker");
                removeSpeakerClicked($(this));
            });
        }
        else {
            //Speaker connected - do not render connect button
            document.getElementById("bluetooth-speaker-list").innerHTML =
                bluetoothTrustedSpeakersHTML(speakerArray);
            //Only Button B2 - remove trusted speaker
            //might be one or more buttons - use class .list-remove-btn
            $(".list-remove-btn").on('click', function () {
                console.log("B2. remove the speaker");
                removeSpeakerClicked($(this));
            });
        };
    };
    //_______________________________________________________________________________________________
    /**HTML - render state frame HTML for connected sources devices.               [Connected Phones]
     * @param  {bluetooth} deviceArray, [{bdAddr: <BD-address>, name: <name>},...] or []
     * @param  {id}        id = "bluetooth-connected-devices"
     * @param  {button}    button = ".sourcedevice-btn" to disconnect phone
     * @return {?} 
     */
    function renderConnectedSources(deviceArray) {
        if (deviceArray.length == 0) {
            document.getElementById("bluetooth-connected-devices").innerHTML =
                bluetoothNoSourcesHTML();
            $(".sourcedevice-btn").off('click');
        }
        else {
            document.getElementById("bluetooth-connected-devices").innerHTML =
                bluetoothConnectedSourcesHTML(deviceArray);
            //might be one or more buttons - use class .playback-btn
            $(".sourcedevice-btn").on('click', function () {
                console.log("C. disconnect a phone");
                disconnectDeviceClicked($(this));
            });
        };
    };
    /**HTML - render state frame HTML for the disconnected paired sources devices.    [Paired Phones]
     * @param  {bluetooth} deviceArray, [{bdAddr: <BD-address>, name: <name>},...] or []
     * @param  {id}        id = "bluetooth-paired-devices"
     * @param  {button}    button = ".list-remove-phone-btn" to remove phone
     * @return {?} 
     */
    function renderPairedSources(deviceArray) {
        if (deviceArray.length == 0) {
            document.getElementById("bluetooth-paired-devices").innerHTML = "";
            $(".list-remove-phone-btn").off('click');
        }
        else {
            document.getElementById("bluetooth-paired-devices").innerHTML =
                bluetoothPairedSourcesHTML(deviceArray);
            //might be one or more buttons - use class .playback-btn
            $(".list-remove-phone-btn").on('click', function () {
                console.log("C2. remove the PHONE");
                removePhoneClicked($(this));
            });
        };
    };
    //___________________________________________________________________________________________
    /**HTML - render modal HTML for the speaker connect pop-up menu.    [scanned speaker pop-up menu]
     * Prepares the model mode with format ["Eneby30", "JVC HA-S22W", ... ] or ""
     * @param  {bluetooth}  speakerArray, [{bdAddr: <BD-address>, name: <name>},...] or []
     * @global {array}      btSpkrList, the speakerArray
     */
    function renderSpeakers(speakerArray) {
        console.log("Incoming speakers are:", speakerArray);
        //btSpkrList is a GV and holds the array of speakers
        btSpkrList = speakerArray;  //used for index at on-click in HTML/DOM
        console.log("Speakers saved in:", btSpkrList);
        renderSpeakerModal(speakerArray);   //this renders the modal
        /*
        if (speakerArray.length > 0) {
            //btSpkrList is a GV and holds the array of speakers
            btSpkrList = speakerArray;  //used for index at on-click in HTML/DOM
            console.log("Speakers saved in:",btSpkrList );
            renderSpeakerModal(speakerArray);   //this renders the modal
        };
        */
    };
    //_______________________________________________________________________________________________
    /**HTML - render modal HTML for the speaker connect pop-up menu.      [display bluetooth message]
     * The object is on format: {type: "<type of message>", missive: "<message>" } where:
     * type:    can be error, done, info, mishap, long
     * missive: is the actual message 
     * @param  {object}  message,  {type: "<type of message>", missive: "<message>" }
     */
    function renderBluetoothMessage(data) {
        console.log("Incoming bluetooth message:", data);
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
    //------------------------------------------------------------------HTML builds for frames
    //Information generates various HTML builds used in different state frames:
    //---------------------------------------------------------------------------------------
    //The top-level of the HTML builds are list elements, <li>. They are put under ul ids like
    //"bluetooth-list" or 'bluetooth-speakers' and those are <ul> elements holding the state
    //frame. Each frames may consist of subframes forming a list.
    //The content of the frame and subframes are <li> elements. In addition, the BD-address 
    //is stored if needed in the li-element. Frames and subframes often have buttons.
    //======================================================================================
    //Unordered List <ul> identifiers where the li-elements build here is put:
    //      <ul id="bluetooth-list" class=...
    //      <ul id="bluetooth-speaker" class=...
    //      <ul id="bluetooth-speaker-list" class=...
    //      <ul id="bluetooth-connected-devices" class=...
    //      <ul id="bluetooth-paired-devices" class=...

    //HTML build for bluetooth status.......................................................
    /**HTML - create frame HTML for Bluetooth on
     * @param  {id}       ulid = 'bluetooth-list' is used above
     * @return {html}    frame
     */
    function bluetoothOnHTML() {
        //<li class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1 mb-3">
        return `
    <li id="btservice" class="list-group-item d-flex justify-content-between align-items-center player-list">
        <div class="col-auto pl-2 pr-0">
            <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
        </div>
        <div class="col-auto pl-0 pr-3">
            <i class="symbol-on fas fa-circle"></i>
        </div>
        <div class="col pl-0">
             <p class="settings-text my-3">Bluetooth is <strong>ON</strong> </p>
        </div>
        <div id="disconnect-bluetooth" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="playback-btn" type="button">
                <i class="settings-btn fas fa-times-circle fa-2x" title="Turn-off Bluetooth"></i>
            </button>
        </div>
    </li>
    `;
    };
    /**HTML - create frame HTML for Bluetooth off
     * @param  {id}       ulid = 'bluetooth-list' is used above
     * @return {html}    frame
     */
    function bluetoothOffHTML() {
        //<li class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1 mb-3">
        return `
    <li id="btservice" class="list-group-item d-flex justify-content-between align-items-center player-list">
        <div class="col-auto pl-2 pr-0">
         <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
        </div>
         <div class="col-auto pl-0 pr-3">
         <i class="symbol-off fas fa-circle"></i>
        </div>
        <div id="connect-bluetooth" class="col my-2 ml-0 pl-1">
            <button type="button" class="btn usb-root-btn"title="Turn on Bluetooth">
                Turn On Bluetooth
             </button>
        </div>
    </li>
    `;
    };
    //HTML build for bluetooth speaker......................................................
    /**HTML - create frame HTML for when there is no speaker connected
     * @param  {id}       ulid = "bluetooth-speaker" is used above
     * @return {html}    frame
     */
    function bluetoothNoSpeakerHTML() {
        //<li class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1">
        return `
  <li id="btspeaker" class="list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col-auto pl-2 pr-0">
    <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
  </div>
  <div class="col-auto pl-0 pr-3">
    <i class="nobluetooth fas fa-volume-off fa-2x"></i>
  </div>
  <div id="scan-speaker" class="col my-3 ml-0 pl-1">
      <button type="button" class="btn usb-root-btn"title="Scan for Bluetooth Speaker">
        Scan for Bluetooth Speaker
      </button>
    </div>
  </li> `;
    };
    /**HTML - create frame HTML for when the speaker is connected!
     * @param  {id}       ulid = "bluetooth-speaker" is used above
     * @return {html}    frame
     */
    function bluetoothSpeakerHTML(nameString) {
        //<li id="bluetooth" class="list-group-item d-flex justify-content-between align-items-center player-list mt-n1" >
        return `
    <li id="btspeaker" class="list-group-item d-flex justify-content-between align-items-center player-list">
        <div class="col-auto pl-2 pr-0">
            <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
          </div>
          <div class="col-auto pl-0 pr-3">
            <i class="bluetooth-symbol fas fa-volume-off fa-2x"></i>
          </div>
          <div class="col pl-0">
            <p class="settings-text my-3">
              <strong> ${nameString} </strong></p>
          </div>
          <div id="disconnect-speaker" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="playback-btn" type="button">
              <i class="settings-btn fas fa-times-circle fa-2x" title="Disconnect speaker for now"></i>
            </button>
          </div>
        </li >
        `;
    };
    /**HTML - create frame HTML for the list of trusted speakers
     * @param  {array}    deviceArray, [{bdAddr: <BD-address>, name: <name>},...] 
     * @global {string}   Speaker, speaker name or "" of the connectedd speaker
     * @param  {id}       ulid = "bluetooth-speaker-list" is used above
     * @return {html}     frame
     */
    function bluetoothTrustedSpeakersHTML(deviceArray) {
        //There are trusted speakers to render, check them out...
        const numberOfDevices = deviceArray.length;
        let liString = "";
        let subFrameString = "";
        let frameStrings = "";
        if (Speaker.length === 0) {
        //No speaker connected - generate trusted speakers with two buttons
            for (let i = 0; i < numberOfDevices; i++) {
                liString = `
            <li id="bluetooth-trusted-speaker" class="list-group-item d-flex justify-content-between
                align-items-center player-list mt-n1"
                data-mac="${deviceArray[i].bdAddr}" data-connected="${false}">
                   `;
                subFrameString = `
            <div class="col-auto pl-2 pr-0">
             <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
            </div>
            <div class="col-auto pl-0 pr-3">
             <i class="nobluetooth fas fa-volume-off fa-2x"></i>
            </div>
            <div id="trusted-speaker" class="col my-3 ml-0 pl-1">
            <button type="button" class="btn reconnect-spkr-btn" title="Reconnect Bluetooth Speaker">
              <span class="settings-text-small-black"> Connect:
              <strong> ${deviceArray[i].name} </strong> </span>
            </button>
            </div>
            <div id="remove-speaker" class="col-auto d-flex justify-content-end align-top p-1">
                <button class="list-remove-btn" type="button">
                    <i class="settings-btn fas fa-minus-circle fa-2x" title="Remove speaker"></i>
                </button>
            </div>
            </li>`;
                frameStrings = frameStrings + liString + subFrameString;
            };
        }
        else {
        //One speaker is connected - generate trusted speakers with one button
            for (let i = 0; i < numberOfDevices; i++) {
                liString = `
            <li id="bluetooth-trusted-speaker" class="list-group-item d-flex justify-content-between
                align-items-center player-list mt-n1"
                data-mac="${deviceArray[i].bdAddr}" data-connected="${false}">
                   `;
                subFrameString = `
            <div class="col-auto pl-2 pr-0">
             <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
            </div>
            <div class="col-auto pl-0 pr-3">
             <i class="nobluetooth fas fa-volume-off fa-2x"></i>
            </div>
            <div class="col pl-0">
            <p class="my-3">
              <strong> ${deviceArray[i].name} </strong></p>
          </div>
            </div>
            <div id="remove-speaker" class="col-auto d-flex justify-content-end align-top p-1">
                <button class="list-remove-btn" type="button">
                    <i class="settings-btn fas fa-minus-circle fa-2x" title="Remove speaker"></i>
                </button>
            </div>
            </li>`;
                frameStrings = frameStrings + liString + subFrameString;
            };
        };
    return frameStrings;
};


    //HTML build for bluetooth source devices..................................................
    /**HTML - create frame HTML for the list of connected sources (phones...)
     * @param  {array}    deviceArray, [{bdAddr: <BD-address>, name: <name>},...] 
     * @param  {id}       ulid = "bluetooth-connected-devices" is used above
     * @return {html}     frame
     */
    function bluetoothConnectedSourcesHTML(deviceArray) {
        const numberOfDevices = deviceArray.length;
        let listring = "";
        let subFrameString = "";
        let frameStrings = "";
        for (let i = 0; i < numberOfDevices; i++) {
            liString = `
        <li id="bluetooth" class="list-group-item d-flex justify-content-between
            align-items-center player-list mt-n1"
            data-mac="${deviceArray[i].bdAddr}">
                   `;
            subFrameString = `
        <div class="col-auto pl-2 pr-0">
            <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
          </div>
          <div class="col-auto pl-0 pr-3">
            <i class="bluetooth-symbol fas fa-mobile-alt fa-2x"></i>
          </div>
          <div class="col pl-0">
            <p class="settings-text my-3">
              <strong> ${deviceArray[i].name} </strong></p>
          </div>
          <div id="disconnect-device" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="sourcedevice-btn" type="button">
              <i class="settings-btn fas fa-times-circle fa-2x" title="Disconnect"></i>
            </button>
          </div>
        </li> 
        `;
            frameStrings = frameStrings + liString + subFrameString;
        };
        return frameStrings
    };
    /**HTML - create frame HTML for when there is NO connected sources (phones...)
     * @param  {id}       ulid = "bluetooth-connected-devices" is used above
     * @return {html}     frame
     */
    function bluetoothNoSourcesHTML() {
        return `
    <li class="list-group-item d-flex justify-content-between
                                      align-items-center player-list mt-n1 ">
    <div class="col-auto pl-2 pr-0">
      <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
    </div>
    <div class="col-auto pl-0 pr-3">
      <i class="nobluetooth fas fa-mobile-alt fa-2x"></i>
    </div>
    <div class="col pl-0">
      <p class="settings-text my-3">No devices connected</p>
    </div>
    </li>
    `;
    };
    /**HTML - create frame HTML for when there are paired disconnected sources (phones...)
     * @param  {id}       ulid = "bluetooth-paired-devices" is used above
     * @return {html}     frame
     */
    function bluetoothPairedSourcesHTML(deviceArray) {
        const numberOfDevices = deviceArray.length;
        let listring = "";
        let subFrameString = "";
        let frameStrings = "";
        for (let i = 0; i < numberOfDevices; i++) {
            liString = `
        <li id="bluetooth" class="list-group-item d-flex justify-content-between
            align-items-center player-list mt-n1"
            data-mac="${deviceArray[i].bdAddr}">
                   `;
            subFrameString = `
           
          <div class="col-auto pl-2 pr-0">
            <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
          </div>
          <div class="col-auto pl-0 pr-3">
            <i class="nobluetooth fas fa-mobile-alt fa-2x"></i>
          </div>
          <div class="col pl-0">
            <p class="my-3">
              <strong> ${deviceArray[i].name} </strong></p>
          </div>
          <div id="remove-speaker" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="list-remove-phone-btn" type="button">
              <i class="settings-btn fas fa-minus-circle fa-2x" title="Unpair Device"></i>
            </button>
          </div>
        </li>
        `;
            frameStrings = frameStrings + liString + subFrameString;
        };
        return frameStrings;
    };
    /**HTML - create modal HTML for when there speakers to connect to.
     * Note: it also render the HTML - because it is a 'pop-up' menu
     * @param  {id}       divid = "btSpkrModal" is the modal part to show
     * @param  {id}       divid = "btspkr-available" is the list of speakers
     * @return {?}     
     */
    function renderSpeakerModal(speakerArray) {
        let htmlString = "";
        const numberOfDevices = speakerArray.length;
        console.log("Speakers are:", speakerArray);
        for (let i = 0; i < numberOfDevices; i++) {
            htmlString = htmlString +
                ` <a href="#" class="list-group-item list-group-item-action scan-list playback-text mb-1"
                onclick="connectSpeaker(${i})">
                 ${sixSpaces} ${speakerArray[i].name} ${sixSpaces} </a>`;
        };
        document.getElementById("btspkr-available").innerHTML = htmlString;
        console.log("Model show is called with HTML:", htmlString);
        $('#btSpkrModal').modal('show');
    };

    /*
    <div class="col-auto pl-2 pr-0">
        <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
        */

    //====================================================================User Button functions
    // USER COMMANDS:  Bluetooth button functions ---------------------------------------------
    //-----------------------------------------------------------------------------------------
    //................................................................Bluetooth Service Buttons
    /**HTML and DOM - turns OFF Bluetooth 
     * @param   {DOM jQuery}  buttonElement clicked button element DOM jQuery
     * @return {boolean}      true
     */
    function turnoffBluetoothClicked(buttonElement) {
        console.log("To backend:(disconnect-bluetooth',{network: true }");
        socket.emit('disconnect-network', { network: "bluetooth" });
        return true;
    };
    /**HTML and DOM - turns ON Bluetooth
     * @param   {DOM jQuery}  buttonElement clicked button element DOM jQuery
     * @return {boolean}      true
     */
    function turnonBluetoothClicked(buttonElement) {
        console.log("To backend:(connect-network,{network: bluetooth })");
        socket.emit('connect-network', { network: "bluetooth" });
        return true;
    };
    //...............................................................Bluetooth Speakers Buttons
    /**HTML and DOM - user wants to scan for Bluetooth speakers
     * Send the request to backend, if there are any backend will eventually
     * correspond with a "speakers" call on socket (see A2. above)
     * @param  {DOM jQuery} buttonElement connect button DOM jQuery
     * @return {boolean}  true
     */
    function scanSpeakerClicked(buttonElement) {
        //console.log("To backend:(scan-speakers, true)");
        $('#btSpkrModal').modal('hide'); //there might be a modal up, better hide
        /*
        if (buttonElement === false) {
          $('#btSpkrModal').modal('hide');
        };*/
        console.log("To backend:(scan-speakers,true)");
        socket.emit('scan-speakers', true);
        return true;
    };
    /**Called from HTML/DOM - user has choosen a bt speaker and it is time to connect.
     * Used by the modal element showing bt speakers when a speaker is clicked.
     * This function executes the 'onclick' attribute of HTML in modal, 'arrayIndex'
     * is the argument stored in the onclick attribute created by renderSpeakerModal(),
     * the connection continues with waiting for backend to emit a "speakers"
     * call on socket (see A2. above).
     * Also the modal is hidden and the page is rerendered.
     * @param  {integer}    arrayIndex, index for the global variable btSpkrList
     * @global {btSpkrList} read the speaker object, reset btSpkrList to []
     * @return {boolean}    true
     */
    function connectSpeaker(arrayIndex) {
        console.log("To backend:(connect-speaker,", btSpkrList[arrayIndex], ") -- onclick call");
        socket.emit('connect-speaker', btSpkrList[arrayIndex]);
        $('#btSpkrModal').modal('hide');
        btSpkrList = [];
        return true;
    };
    /**Called from HTML/DOM - user has choosen to disconnect a bt speaker.
     * Either it can be a connected speaker and it will be disconnected, but still
     * trusted by the machine and shown on frontend.
     * @param  {DOM jQuery} buttonElement disconnect button DOM jQuery
     * @return {?}    of no interest
     */
    function disconnectSpeakerClicked(buttonElement) {
        let parentElement = $(buttonElement).parent();
        let mac = parentElement.attr("data-mac");
        console.log('To backend: (disconnect-speaker, true');
        socket.emit('disconnect-speaker',true);
    };
    /**Called from HTML/DOM - user has choosen to reconnect a trusted bt speaker.
     * The name has to be locked up at backend, 'name: false'.
     * @param  {DOM jQuery} buttonElement reconnect button DOM jQuery
     * @return {?}    of no interest
     */
    function connectSpeakerAgainClicked(buttonElement) {
        let parentElement = $(buttonElement).parent();
        let grandParentElement = $(parentElement).parent();
        let mac = grandParentElement.attr("data-mac");
        console.log('To backend: (connect-speaker, {bdAddr:', mac, 'name: false})');
        socket.emit('connect-speaker', { bdAddr: mac, name: false });
    };
    /**Called from HTML/DOM - user has choosen to remove an already disconnected
     * bt speaker that is still trusted and thus rendered at frontend. Untrust!
     * @param  {DOM jQuery} buttonElement remove button DOM jQuery
     * @return {?}    of no interest
     */
    function removeSpeakerClicked(buttonElement) {
        let parentElement = $(buttonElement).parent();
        let grandParentElement = $(parentElement).parent();
        let mac = grandParentElement.attr("data-mac");
        console.log('To backend: (untrust-speaker, {bdAddr:', mac, 'type:', 'speaker })');
        socket.emit('untrust-device', { bdAddr: mac, type: "speaker" });
    };
    //...................................................................Bluetooth Source Buttons
    /**Called from HTML/DOM - user has choosen to remove an already disconnected
     * bt phone that is still trusted and thus rendered at frontend. Untrust!
     * @param  {DOM jQuery} buttonElement remove button DOM jQuery
     * @return {?}    of no interest
     */
    function removePhoneClicked(buttonElement) {
        let parentElement = $(buttonElement).parent();
        let grandParentElement = $(parentElement).parent();
        let mac = grandParentElement.attr("data-mac");
        console.log('To backend: (untrust-speaker, {bdAddr:', mac, ", type: phone})");
        socket.emit('untrust-device', { bdAddr: mac, type: "phone" });
    };
    /**Called from HTML/DOM - user has choosen to disconnect a source, a phone.
     * @param  {DOM jQuery} buttonElement remove button DOM jQuery
     * @return {?}    of no interest
     */
    function disconnectDeviceClicked(buttonElement) {
        let parentElement = $(buttonElement).parent();
        let grandParentElement = $(parentElement).parent();
        let mac = grandParentElement.attr("data-mac");
        console.log('To backend: (disconnect-device, {bdAddr:', mac,"})");
        socket.emit('disconnect-device', { bdAddr: mac });
};

//=============================================================================
// Functions at errors and disconnect =========================================
//-----------------------------------------------------------------------------
    /**HTML and DOM - disconnect from backend. Render a disconnected message.
     * @return {boolean}  true
     */
    function disconnect() {
        //$("#bluetooth-list").hide();
        //document.getElementById("bluetooth-list").hidden = true;
        let message = `<ul class="list-group no-bullet">
    <li class="list-group-item d-flex error-list ">
      <div class="disconnect-text"> <br> <br> &nbsp; ERROR: disconnected from the Streamer<br> <br> <br> </div>
      </li>
   </ul> `;
        document.getElementById("bluetooth-list").innerHTML = message;
        return true;
    };
//..........................................................
//Auxiliary help functions .................................
    function timeStamp() {
        const d = new Date();
        return `${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
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


    //DEPRECATEDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    //********************************************************************** Buttons
    //Buttons **********************************************************************
    //Set up listeners for buttons****************************************DEPRECATED
    /* HEAVILY DEPRECATED - but still a good references...
    function setListeners(connectionsArray) {
    const thisArray = connectionsArray;
    //A. Bluetooth turn-off/turn-on
      if(thisArray[0].bluetooth === true) {
        $("#disconnect-bluetooth").on('click', function() {
          //console.log("A1. turn-off the Bluetooth");
          turnoffBluetoothClicked($(this));
        });
      }
      else {
        $("#connect-bluetooth").on('click', function() {
          //console.log("A2. turn-on the Bluetooth");
          turnonBluetoothClicked($(this));
        });
      };
    //B. Bluetooth Speaker scan for/disconnect (audio sink device)
    if(thisArray[2].speakers.length !== 0 ) {
      //only one disconnect button - use element id
      $("#disconnect-speaker").on('click', function() {
        //console.log("B1. disconnect the speaker");
        disconnectSpeakerClicked($(this));
      });
      //might be one or more - use class .list-remove-btn
      $(".list-remove-btn").on('click', function() {
        //console.log("B2. remove the speaker");
        removeSpeakerClicked($(this));
      });
      //might be one or more - use class .playback-btn
      $(".reconnect-spkr-btn").on('click', function() {
        //console.log("B3. reconnect trusted speaker");
        connectSpeakerAgainClicked($(this));
      });
      //only one scan button - use element id
      $("#scan-speaker").on('click', function() {
        //console.log("B4. scan for speakers");
        scanSpeakerClicked($(this));
      });
    }
    else {//only scan for bt speakers button needed here
      $("#scan-speaker").on('click', function() {
        //console.log("B4. scan for speakers");
        scanSpeakerClicked($(this));
      });
    };
    //C. Bluetooth device disconnect (audio source device = phone)
    if(thisArray[1].devices.length !== 0) {
      //console.log("Going to set a listener for disconnect a phone");
      $(".sourcedevice-btn").on('click', function() {
        //console.log("C. disconnect a phone"); ight be one or more
        disconnectDeviceClicked($(this));
        });
      };
      //for disconnected sources, might be one or more - use class .list-remove-btn
      $(".list-remove-phone-btn").on('click', function() {
        //console.log("C2. remove the PHONE");
        removePhoneClicked($(this));
      });
    };
    */
