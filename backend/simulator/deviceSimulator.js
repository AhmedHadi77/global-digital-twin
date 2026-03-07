const axios = require("axios");

setInterval(()=>{

    const device = {
        deviceId: "device-" + Math.floor(Math.random()*10000),
        temperature: 20 + Math.random()*10,
        humidity: 40 + Math.random()*20
    }

    console.log(device)

},1000)