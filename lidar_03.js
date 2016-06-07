var http = require('http').createServer(handler);
var io = require('socket.io').listen(http),
fs = require('fs'),
firmata = require('firmata');

http.listen(8080, "192.168.1.131");
console.log("Listening on http://192.168.1.131:8080...");

// directs page requests to html files

function handler (req, res) {
fs.readFile(__dirname + '/lidar_03.html',
function (err, data) {
if (err) {
res.writeHead(500);
return res.end('Error loading index.html');
}

res.writeHead(200);
res.end(data);
});
}

var com = require("serialport");

var serialPort = new com.SerialPort("/dev/ttyUSB0", {
    baudrate: 115200,
    parser: com.parsers.raw
}, false); // this is the openImmediately flag [default is true]

var index = 0;
var init_level = 0;
var readData = new Array(360);
for (var i=0;i!=360;i++)
{
    readData[i] = new Array(4);
    for (var j=0;j!=4;j++)
    {
        readData[i][j] = 0;
    }
}
var bspeed1,bspeed2;
var bchecksum1,bchecksum2;
var counter=0;
var LastTimer = Date.now();

io.sockets.on('connection', function(socket) {

    serialPort.open(function (error) {
        if (error)
        {
            console.log("Error code is = " + error);
        }
        else
        {
     console.log('open');
     serialPort.on('data', function(data) {
         console.log("NEW  PACKAGE  RECEIVED")
         for (var i=0; i<data.length;i++)
         {
             if (init_level == 0)
             {
                 //console.log('init_level = ' + init_level);
                 if (data[i] == 0xFA)
                     init_level = 1;
                 else
                     init_level = 0;
             }
             else if (init_level == 1)
             {
                 //console.log('init_level = ' + init_level);
                 if (data[i] >= 0xA0 && data[i] <= 0xF9)
                 {
                     index = data[i] - 0xA0;
                     init_level = 2;
                 }
                 else if (data[i] != 0xFA)
                     init_level = 0;
             }
             else if (init_level == 2)
             {
                 //console.log('init_level = ' + init_level);
                 if (counter == 0)
                    bspeed1 = data[i];
                 else if (counter == 1)
                    bspeed2 = data[i];

                 else if (counter == 2)
                    readData[index*4+0][0] = data[i];
                 else if (counter == 3)
                    readData[index*4+0][1] = data[i];
                 else if (counter == 4)
                    readData[index*4+0][2] = data[i];
                 else if (counter == 5)
                    readData[index*4+0][3] = data[i];

                 else if (counter == 6)
                    readData[index*4+1][0] = data[i];
                 else if (counter == 7)
                    readData[index*4+1][1] = data[i];
                 else if (counter == 8)
                    readData[index*4+1][2] = data[i];
                 else if (counter == 9)
                    readData[index*4+1][3] = data[i];

                 else if (counter == 10)
                    readData[index*4+2][0] = data[i];
                 else if (counter == 11)
                    readData[index*4+2][1] = data[i];
                 else if (counter == 12)
                    readData[index*4+2][2] = data[i];
                 else if (counter == 13)
                    readData[index*4+2][3] = data[i];

                 else if (counter == 14)
                    readData[index*4+3][0] = data[i];
                 else if (counter == 15)
                    readData[index*4+3][1] = data[i];
                 else if (counter == 16)
                    readData[index*4+3][2] = data[i];
                 else if (counter == 17)
                    readData[index*4+3][3] = data[i];

                 else if (counter == 18)
                    bchecksum1 = data[i];
                 else if (counter == 19)
                    bchecksum2 = data[i];
                 counter++;
                 if (counter == 20)
                 {
                     counter = 0;
                     init_level = 0;
                     //outputValuesLidar()
                     
                 }
                 //console.log('counter = ' + counter);
             }

             /*if(data[i] == 0xFA)
                console.log(parseInt(data[i]) + "***************************");
             else
                console.log(parseInt(data[i])); */
         }
         //if(LastTimer - Date.now() > 50)
         {
             console.log("sending data");
             socket.emit("klientBeri", readData);
             //LastTimer = Date.now();

         }
     });  
        }
    });
});

var refreshFrequency = 100;

function outputValuesLidar()
{
    for (var i=0;i!=60;i++)
    {
        var Rt = 3;
        var L = i*6;
        //console.log((L+0)+'\t'+readData[L][Rt]+'\t'+(L+1)+'\t'+readData[L+1][Rt]+'\t'+(L+2)+'\t'+readData[L+2][Rt]+'\t'+(L+3)+'\t'+readData[L+3][Rt]+'\t'+(L+4)+'\t'+readData[L+4][Rt]+'\t'+(L+5)+'\t'+readData[L+5][Rt]);
        
        //console.log(readData[i*6][0]+'\t'+readData[i*6+1][0]+'\t'+readData[i*6+2][0]+'\t'+readData[i*6+3][0]+'\t'+readData[i*6+4][0]+'\t'+readData[i*6+5][0]);
    }
}

var timeroutput=setInterval(function(){outputValuesLidar()}, refreshFrequency);
