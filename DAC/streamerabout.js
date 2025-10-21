///Copyright 2025 by Retro Audiophile Designs, license GPL 3.0 or later
//-------------------------------------------------------------------------------
//      ~ Front end code for the About Page of RAD Player ~

//Global variables
var socket = io.connect();
var disconnection = false;

//Render on page show events=====================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log( "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "aboutpage", when: "visible again" });
    };
    /*
    else {
        //hidden or not does not matter...
        //console.log(timeStamp(), "Internal: ==== document is hidden again ====");
    };*/
};
//==============================================================================Page opens
//Open page code =========================================================================
document.addEventListener('DOMContentLoaded', function () {

// console.log("To backend: connect with (page-opens',{ page: settings }), on socket", socket);
    socket.emit('page-opens', { page: "aboutpage" });

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
    socket.on('timestamp-versions', function (data) {
    console.log("From backend: render time, version and lic", data);
        buildTimeAndVersions(data); //<------------entry point for backend
    disconnection = false; /*connection established */
    });
    
    socket.on('internet', function (data) {
        console.log("From backend: Internet access?", data);
        buildInternet(data); //<----------------entry point for backend
        disconnection = false; /*connection established */
    });

    socket.on('diskmemory', function (data) {
    console.log("From backend: render disk memory usage", data);
    buildDiskMemory(data); //<----------------entry point for backend
    disconnection = false; /*connection established */
          });
  socket.on('ram-usage', function (data) {
    console.log("From backend: render available RAM", data);
   buildAvailableRAM(data); //<-------------entry point for backend
    disconnection = false; /*connection established */
          });
  socket.on('streaming', function (data) {
    console.log("From backend: render streaming services running", data);
    buildAvailableStreaming(data); //<---------------entry point for backend
    disconnection = false; /*connection established */
          });
  socket.on('amplifier', function (data) {
    console.log("From backend: render amplifier state", data);
    buildAmplifier(data); //<------------entry point for backend
    disconnection = false; /*connection established */
  });
    socket.on('signal', function (data) {
        console.log("From backend: render signal quality", data);
        buildSignal(data); //<------------entry point for backend
        disconnection = false; /*connection established */
    });
  socket.on('hardware', function (data) {
    console.log("From backend: render info about the hardware", data);
    buildHardware(data); //---------------entry point for backend
    disconnection = false; /*connection established */
  });
      //C. Listener for disconnection from Player
  socket.on('connect_error', (error) => {
    if (error && (disconnection === false)) {
      disconnection = true;   /*disconnected */
      disconnect(); //render disconnect frame once <-----entry point for backend
      // console.log("Internal: disconnected");
      socket.emit('page-opens',{ page: "aboutpage" });
    };
    // else the socket will automatically try to reconnect
    //no action here
  });
      socket.on("disconnect", () => {
          if (disconnection === false) {
              disconnection = true; /*disconnected*/
              disconnect(); /*render disconnected frame */
              //Last desperate call to backend for render... will be buffered
              socket.emit('page-opens', { page: "aboutpage", when: "after disconnect" });
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
//      <ul id="time-stamp" class="list-group no-bullet mb-2">
//      <ul id="memory" class=...
//      <ul id="ram" class=...
//      <ul id="streaming" class=...          ...there are more, check streamerabout.html
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
        frameHTML = liHTMLwifi + wifiHTML;
        document.getElementById("wifi-signal").innerHTML = liHTMLwifi + wifiHTML;

    }
    else {
        document.getElementById("wifi-signal").innerHTML = "";
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
        document.getElementById("bluetooth-signal").innerHTML = liHTMLbt + `<div class="col pl-0">` + bluetoothHTML;
    }
    else {
        document.getElementById("bluetooth-signal").innerHTML = "";

    };
};

//[6]: { computer: "", card: ""  }
//Note: an empty ending li-element is appended last to avoid the frame being blocked by buttons
function buildHardware(data) {
  let frameHTML = `<li id="mpc" class= "list-group-item d-flex justify-content-between align-items-center player-list">
  <div class="col pl-0">
  <p class="settings-text-small pl-1 my-1"> The hardware consists of a single-board computer, <b>${data.computer}</b> and
  a Digital Analogue Converter soundcard - <b>Raspberry Pi DAC+</b>. It uses DC 5 V / 5.0 A.</p>
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

//[7]: "access"" or "" -- originally placed on start page
function buildInternet(data) {
    let li = ` <li class="list-group-item d-flex justify-content-between align-items-center player-list"> `
    let frameHTML = "";
    if (data.length > 0) {
        frameHTML = ` 
         <div class="col pl-0">
             <p class="settings-text-small pl-1 my-1"> There is Internet access. </p>
        </div>
</li >  `
    }
    else {
        frameHTML = ` 
        <div class="col pl-0">
            <p class="settings-text-small pl-1 my-1"> No Internet access! </p>
        </div>
</li >  `
    };
    document.getElementById("internet").innerHTML = li + frameHTML;
};
    
