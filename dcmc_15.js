/*********************************************************************        
University of Maribor ************************************************
Faculty of Organizational Sciences ***********************************
Cybernetics & Decision Support Systems Laboratory ********************
@author Andrej Škraba ************************************************
@author Andrej Koložvari**********************************************
@author Davorin Kofjač ***********************************************
@author Radovan Stojanović *******************************************
@author Vladimir Stanovov ********************************************
*********************************************************************/

var firmata = require("firmata");
var fs  = require("fs");

//var boardACM0 = new firmata.Board("/dev/ttyACM0",function(){
//    console.log("Firmware ACM0: " + board.firmware.name + "-" + board.firmware.version.major + "." + board.firmware.version.minor); // izpišemo verzijo Firmware
//});

var LeftEncPin1 = 8;
var LeftEncPin2 = 9;
var LeftEncPin3 = 10;

var RightEncPin1 = 11;
var RightEncPin2 = 12;
var RightEncPin3 = 13;

var LeftPWMPin = 6;
var RightPWMPin = 5;

var LeftDirectionPin = 2;
var RightDirectionPin = 4;

var SolenoidPin = 3;
var FrequencyAveInterval = 5;

var Speed = 50;

var ArduinoStarted = false;

var AvgDistL = Array(36);

var arraySound = new Array();
arraySound = [];
var flushSoundArray = false;

var USSensor = new Array();
    USSensor[0] = 0;
    USSensor[1] = 0;
    USSensor[2] = 0;
    USSensor[3] = 0;
    USSensor[4] = 0;
    USSensor[5] = 0;
    USSensor[6] = 0;
    USSensor[7] = 0;
    USSensor[8] = 0;
    USSensor[9] = 0;
    USSensor[10] = 0;
    USSensor[11] = 0;
    USSensor[12] = 0;
    
var SmoothingWeightUS = 0.33;

var InfRedSen1Pin = "A5";
var InfRedSen2Pin = "A4";

var InfRedSen1;
var InfRedSen2;

var StopBySoundActive = false;

var BA_Active = true;
var Step_CTRL = false;

var DistanceToMake = 50;
var DistanceMadeLeft = 0;
var DistanceMadeRight = 0;

var CurrentSensorValue=0;
var VoltageSensorValue=0;
var CurrentValue = 0;
var VoltageValue = 0;
var PowerValue = 0;
var EnergyConsumed = 0;

var matrix;

var CurrentDate=Date();
var CurrentDateMs = Date.now();
console.log(CurrentDate);

var util = require('util');
var log_stdout = process.stdout;

var log_file_latency = fs.createWriteStream(__dirname + "/logs/LatencySignals " + CurrentDate + ".log", {flags : 'w'});
function writelog_latency(d) { //
  log_file_latency.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}
writelog_latency(CurrentDateMs);

var log_file_sensors = fs.createWriteStream(__dirname + "/logs/SensorValues " + CurrentDate + ".log", {flags : 'w'});
function writelog_sensors(d) { //
  log_file_sensors.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}
writelog_sensors(CurrentDateMs);

var log_file_pwm = fs.createWriteStream(__dirname + "/logs/PWMAndFrequency " + CurrentDate + ".log", {flags : 'w'});
function writelog_pwm(d) { //
  log_file_pwm.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}
writelog_pwm(CurrentDateMs);

var log_file_other = fs.createWriteStream(__dirname + "/logs/OtherMessages " + CurrentDate + ".log", {flags : 'w'});
function writelog_other(d) { //
  log_file_other.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}
writelog_other(CurrentDateMs);

var log_file_heart = fs.createWriteStream(__dirname + "/logs/HeartBeat " + CurrentDate + ".log", {flags : 'w'});
function writelog_heart(d) { //
  log_file_heart.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}
writelog_heart(CurrentDateMs);

////////////////////////////////////////////////LIDAR

var SerialPort = require("serialport").SerialPort;
var serialPortL = new SerialPort("/dev/ttyUSB0", {
  baudRate: 115200, 
  dataBits: 8, 
  parity: 'none',
  stopBits: 1, 
  flowControl: false
}, false); // this is the openImmediately flag [default is true]

var index = 0;
var init_level = 0;
var LidarDist = new Array(360);
for (var i=0;i!=360;i++)
{
    LidarDist[i] = 200;
}
var readDataL = new Array(360);
for (var i=0;i!=360;i++)
{
    readDataL[i] = new Array(4);
    for (var j=0;j!=4;j++)
    {
        readDataL[i][j] = 0;
    }
}
var bspeed1,bspeed2;
var bchecksum1,bchecksum2;
var counter=0;
var LastTimer = Date.now();

var LatencyTimerStart = Date.now();
var LatencyTimerStop = Date.now();
var LatencyPeriod = Date.now();
var LatencyFlag = false;

var StartTime = Date.now();

serialPortL.open(function () {
    console.log('open LIDAR');
    serialPortL.on('data', function(data) 
        {
            //console.log("NEW  PACKAGE  RECEIVED")
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
                    readDataL[index*4+0][0] = data[i];
                 else if (counter == 3)
                    readDataL[index*4+0][1] = data[i];
                 else if (counter == 4)
                    readDataL[index*4+0][2] = data[i];
                 else if (counter == 5)
                    readDataL[index*4+0][3] = data[i];
            
                 else if (counter == 6)
                    readDataL[index*4+1][0] = data[i];
                 else if (counter == 7)
                    readDataL[index*4+1][1] = data[i];
                 else if (counter == 8)
                    readDataL[index*4+1][2] = data[i];
                 else if (counter == 9)
                    readDataL[index*4+1][3] = data[i];
            
                 else if (counter == 10)
                    readDataL[index*4+2][0] = data[i];
                 else if (counter == 11)
                    readDataL[index*4+2][1] = data[i];
                 else if (counter == 12)
                    readDataL[index*4+2][2] = data[i];
                 else if (counter == 13)
                    readDataL[index*4+2][3] = data[i];
            
                 else if (counter == 14)
                    readDataL[index*4+3][0] = data[i];
                 else if (counter == 15)
                    readDataL[index*4+3][1] = data[i];
                 else if (counter == 16)
                    readDataL[index*4+3][2] = data[i];
                 else if (counter == 17)
                    readDataL[index*4+3][3] = data[i];
            
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
            //console.log(LastTimer - Date.now());
            //if (Date.now() - LastTimer > 100)
            {
             //onsole.log("sending data");
             //socket.emit("klientBeri", readData);
             //LastTimer = Date.now();
            }
        });  
    });
////////////////////////////////////////////////LIDAR

//var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyACM0", {
  baudRate: 115200, 
  dataBits: 8, 
  parity: 'none',
  stopBits: 1, 
  flowControl: false
}, false); // this is the openImmediately flag [default is true]

var cleanData = ''; // var for storing the clean data (without 'A' and 'B')
var readData = '';  // buffer storage

serialPort.open(function (error) {
  if (error) {
    console.log('failed to open: '+error);
  } else {
    console.log('open US');
    serialPort.on('data', function(data) { // call back when data is received
      readData += data.toString(); // append data to buffer
      // if the letters 'A' and 'B' are found on the buffer then isolate what's in the middle
      // as clean data. Then clear the buffer.
      if (readData.indexOf('\n') >= 0) {
        //cleanData = readData.substring(1, readData.indexOf('\n'));
        var SensCounter = 0;
        var SensorBuffer = '';
        for (var i=0;i!=readData.length;i++)
        {
            if (readData[i] == '=')
            {
                i++;
                while (i < readData.length)
                {
                    if (readData[i] == 'c' && readData[i+1] == 'm')
                    {
                        i=i+3;
                        break;
                    }
                    else
                    {
                        SensorBuffer += readData[i];
                        i++;
                    }
                }
                var tempvalue = parseFloat(SensorBuffer);
                if (tempvalue.isNaN)
                    tempvalue = 0;
                if (tempvalue == 0)
                    tempvalue = 200;
                USSensor[SensCounter] = USSensor[SensCounter]*(1.0-SmoothingWeightUS) + tempvalue*SmoothingWeightUS;
                if (USSensor[SensCounter].isNaN)
                    USSensor[SensCounter].isNaN = 200;
                //USSensor[SensCounter] = SensorBuffer;
                //console.log(SensCounter + ' ' + USSensor[SensCounter]);
                SensCounter++;
                SensorBuffer = '';
            }
        }
        //if (ArduinoStarted)
          //  ReadDistanceSensors();
        readData = readData.substring(0,readData.length-1);
        //console.log(readData);
        readData = '';
      }
    });
    serialPort.write("ls\n", function(err, results) {
      console.log('err ' + err);
      console.log('results ' + results);
    });
  }
});

var five = require("johnny-five");
var board = new five.Board({ id: "M", port: "/dev/ttyACM1" });

board.on("ready", function() {
    console.log("Priključitev na Arduino");
    console.log("Omogočimo pine");
    this.pinMode(LeftEncPin1, five.Pin.INPUT);  // LEFT digital pin from encoder 1
    this.pinMode(LeftEncPin2, five.Pin.INPUT);  // LEFT digital pin from encoder 2
    this.pinMode(LeftEncPin3, five.Pin.INPUT);  // LEFT digital pin from encoder 3
    this.pinMode(RightEncPin1, five.Pin.INPUT); // RIGHT digital pin from encoder 1
    this.pinMode(RightEncPin2, five.Pin.INPUT); // RIGHT digital pin from encoder 2
    this.pinMode(RightEncPin3, five.Pin.INPUT); // RIGHT digital pin from encoder 3
    this.pinMode(SolenoidPin, five.Pin.OUTPUT);
    this.pinMode(LeftDirectionPin, five.Pin.OUTPUT);    // LEFT digital pin to change direction
    this.pinMode(RightDirectionPin, five.Pin.OUTPUT);   // RIGHT digital pin to change direction
    this.pinMode(LeftPWMPin, five.Pin.PWM);             // LEFT PWM pin
    this.pinMode(RightPWMPin, five.Pin.PWM);            // RIGHT PWM pin    
    this.digitalWrite(LeftEncPin1, 1);          // LEFT digital pin from encoder 1
    this.digitalWrite(LeftEncPin2, 1);          // LEFT digital pin from encoder 2
    this.digitalWrite(LeftEncPin3, 1);          // LEFT digital pin from encoder 3
    this.digitalWrite(RightEncPin1, 1);         // RIGHT digital pin from encoder 1
    this.digitalWrite(RightEncPin2, 1);         // RIGHT digital pin from encoder 2
    this.digitalWrite(RightEncPin3, 1);         // RIGHT digital pin from encoder 3
    this.digitalWrite(SolenoidPin, 0);          // Solenoid must be DOWN
    
    matrix = new five.Led.Matrix({
    pins: {
      data: 22,
      clock: 24,
      cs: 23
    }
    });
    //matrix.on();
    
    InfRedSen1 = new five.Pin(InfRedSen1Pin);
    InfRedSen2 = new five.Pin(InfRedSen2Pin);
    
    this.pinMode(7,five.Pin.INPUT);
    this.digitalRead(7, function(value) 
    { 
        if (LatencyFlag == false)
        {
            LatencyTimerStart = Date.now();
            LatencyFlag = true;
            var temptimer = (Date.now()-StartTime);
            writelog_latency(Date.now() + "\t" + temptimer + "\t-1");
            console.log("LatencyTimerStart set to NOW which is: " + temptimer);
        }
        LatencyTimerStop = Date.now();
    });
    
    var SoundPin = new five.Pin("A1");
	five.Pin.read(SoundPin, function(error, value) {
		if (!flushSoundArray)
			arraySound.push(value);
		else
		{
			arraySound = [];
			arraySound.push(value);
			flushSoundArray = false;
		}
	});
	
	var CurrentSensorPin = new five.Pin("A0");
	five.Pin.read(CurrentSensorPin, function(error, value) {
		CurrentSensorValue = value;
	});
	
	var VoltageSensorPin = new five.Pin("A2");
	five.Pin.read(VoltageSensorPin, function(error, value) {
		VoltageSensorValue = value;
	});

    five.Pin.read(InfRedSen1, function(error, value) {
    	var volts = value*0.0048828125; ;
    	var distance = 13*Math.pow(volts,-1.10);
    	if (distance > 40)
    		distance = 40;
    	InfRedDistanceLeft = (1.0-SmoothingWeightUS)*InfRedDistanceLeft + SmoothingWeightUS*distance;
      	//console.log(distance);
    });
    five.Pin.read(InfRedSen2, function(error, value) {
    	var volts = value*0.0048828125; ;
    	var distance = 13*Math.pow(volts,-1.10);
    	if (distance > 40)
    		distance = 40;
      	//console.log(distance);
    	InfRedDistanceRight = (1.0-SmoothingWeightUS)*InfRedDistanceRight + SmoothingWeightUS*distance;
    });
    
    this.digitalRead(LeftEncPin1, function(value) 
    { // LEFT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftFlag1 != value)
        {
            //console.log("   Pin LeftEncPin1 active " + Date.now() + " " + value + " " + secondLeftFlag1);
            secondLeftFlag1 = value;
            LeftLastMeasures.push(1);
            timesArrayLeft.push(Date.now());
            //console.log(LeftLastMeasures.length);
            if (timesArrayLeft.length > FrequencyAveInterval)
            {
                LeftLastMeasures.shift();
                timesArrayLeft.shift();
            }
        }
    });
    
    this.digitalRead(LeftEncPin2, function(value) 
    { // LEFT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftFlag2 != value)
        {
            //console.log("           Pin LeftEncPin2 active " + Date.now() + " " + value + " " + secondLeftFlag2);
            secondLeftFlag2 = value;
            LeftLastMeasures.push(2);
            timesArrayLeft.push(Date.now());
            //console.log(LeftLastMeasures.length);
            if (timesArrayLeft.length > FrequencyAveInterval)
            {
                LeftLastMeasures.shift();
                timesArrayLeft.shift();
            }
        }
    });
    
    this.digitalRead(LeftEncPin3, function(value) 
    { // LEFT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftFlag3 != value)
        {
            //console.log("                   Pin LeftEncPin3 active " + Date.now() + " " + value + " " + secondLeftFlag3);
            secondLeftFlag3 = value;
            LeftLastMeasures.push(3);
            timesArrayLeft.push(Date.now());
            //console.log(LeftLastMeasures.length);
            if (timesArrayLeft.length > FrequencyAveInterval)
            {
                LeftLastMeasures.shift();
                timesArrayLeft.shift();
            }
        }
    });
    
    
    this.digitalRead(RightEncPin1, function(value) 
    { // RIGHT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondRightFlag1 != value) 
        {
            //console.log("Pin RightEncPin1 active " + Date.now() + " " + value + " " + secondRightFlag1);
            secondRightFlag1 = value;
            RightLastMeasures.push(1);
            timesArrayRight.push(Date.now());
            if (timesArrayRight.length > FrequencyAveInterval)
            {
                RightLastMeasures.shift();
                timesArrayRight.shift();
            }
        }
    });
    
    this.digitalRead(RightEncPin2, function(value) 
    { // RIGHT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondRightFlag2 != value) 
        {
            //console.log("   Pin RightEncPin2 active " + Date.now() + " " + value + " " + secondRightFlag2);
            secondRightFlag2 = value;
            RightLastMeasures.push(2);
            timesArrayRight.push(Date.now());
            if (timesArrayRight.length > FrequencyAveInterval)
            {
                RightLastMeasures.shift();
                timesArrayRight.shift();
            }
        }
    });
    
    this.digitalRead(RightEncPin3, function(value) 
    { // Right funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondRightFlag3 != value) 
        {
            //console.log("       Pin RightEncPin3 active " + Date.now() + " " + value + " " + secondRightFlag3);
            secondRightFlag3 = value;
            RightLastMeasures.push(3);
            timesArrayRight.push(Date.now());
            if (timesArrayRight.length > FrequencyAveInterval)
            {
                RightLastMeasures.shift();
                timesArrayRight.shift();
            }
        }
    });

    ArduinoStarted = true;
	//SetPWMLeft(30);
	//SetPWMRight(30);
});

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

var https = require("https").createServer(options, handler) // tu je pomemben argument "handler", ki je kasneje uporabljen -> "function handler (req, res); v tej vrstici kreiramo server! (http predstavlja napo aplikacijo - app)
  , io  = require("socket.io").listen(https, { log: false })
  , url = require("url");

var send404 = function(res) {
    res.writeHead(404);
    res.write("404");
    res.end();
}

//process.setMaxListeners(0); 

//********************************************************************************************************
// Simple routing ****************************************************************************************
//********************************************************************************************************
function handler (req, res) { // handler za "response"; ta handler "handla" le datoteko index.html
    var path = url.parse(req.url).pathname; // parsamo pot iz url-ja
    
    switch (path) {
    
    case ('/') : // v primeru default strani

    fs.readFile(__dirname + "/dcmc_03.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani pwmbutton...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
     
    case ('/admin') :
               
    fs.readFile(__dirname + "/dcmc_admin_02.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
            
    case ('/adminspeech') : // v primeru, da je v web naslovu na koncu napisano /zahvala
               
    fs.readFile(__dirname + "/dcmc_admin_speech_02.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });    
    
    case ('/lidar') : // v primeru, da je v web naslovu na koncu napisano /zahvala
               
    fs.readFile(__dirname + "/lidar_03.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
    });  
        
    case ('/heartrate') : // v primeru, da je v web naslovu na koncu napisano /zahvala
               
    fs.readFile(__dirname + "/heartrate2.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });   
            
    break;    
            
    default: send404(res);
            
    }
}
//********************************************************************************************************
//********************************************************************************************************
//********************************************************************************************************

https.listen(8080); // določimo na katerih vratih bomo poslušali | vrata 80 sicer uporablja LAMP | lahko določimo na "router-ju" (http je glavna spremenljivka, t.j. aplikacija oz. app)

console.log("Uporabite (S) httpS! - Zagon sistema - Uporabite (S) httpS!"); // na konzolo zapišemo sporočilo (v terminal)

var sendDataToClient = 1; // flag to send data to the client

var refreshFrequency = 50; // frequency of control algorithm refresh in ms

var STARTctrl = 0;

var upperLimitPWM = 75; // zgornja meja vrednosti PWM - le ta določa koliko lahko največ kontrolni algoritem pošlje na PWM    

var zelenaVrednostNaprej = 0;    
var zelenaVrednostNazaj = 0;

var zelenaVrednostSpinLevo = 0;    
var zelenaVrednostSpinDesno = 0;         

var zelenaVrednostHzLevo = 0;    
var zelenaVrednostHzDesno = 0;

var zelenaVrednostLevo = 0;    
var zelenaVrednostDesno = 0;

var PWMfw = 0; // value for pin forward (pin 5)
var PWMbk = 0; // falue for pin backward (pin 6)
var PWMleft = 0; // value for pin left (pin 9)
var PWMright = 0; // value for pin right (pin 10)

var FuzzyPWMleft = 0;
var FuzzyPWMright = 0;

var refreshClientGui = 1; // flag for refreshing values in client GUI

var arraySensor = new Array();
    arraySensor[0] = 0;
    arraySensor[1] = 0;
    arraySensor[2] = 0;
    arraySensor[3] = 0;
    arraySensor[4] = 0;
    arraySensor[5] = 0;
    arraySensor[6] = 0;
    arraySensor[7] = 0;
    arraySensor[8] = 0;
    arraySensor[9] = 0;

var ErrorLeft = new Array();
var IntegralCounterLeft = 0;
var ErrorRight = new Array();
var IntegralCounterRight = 0;
var SummInterval = 3;
var KpLeft = 0.08;
var KiLeft = 0.08;
var KdLeft = 0.08;
var KpRight = 0.08;
var KiRight = 0.08;
var KdRight = 0.08;
var LeftLastMeasures = new Array();
var LeftLastIntervals = new Array();
var RightLastMeasures = new Array();
var RightLastIntervals = new Array();
var StateNotChanged = 1;
var LeftStoppedFlag = 1;
var RightStoppedFlag = 1;

var secondLeftFlag1 = 0;  // zastavica, da vemo, da sta iz LEVEGA enkoderja prišli vsaj dve vrednosti    
var secondLeftFlag2 = 0;  // zastavica, da vemo, da sta iz LEVEGA enkoderja prišli vsaj dve vrednosti    
var secondLeftFlag3 = 0;  // zastavica, da vemo, da sta iz LEVEGA enkoderja prišli vsaj dve vrednosti    
var secondRightFlag1 = 0; // zastavica, da vemo, da sta iz DESNEGA enkoderja prišli vsaj dve vrednosti    
var secondRightFlag2 = 0; // zastavica, da vemo, da sta iz DESNEGA enkoderja prišli vsaj dve vrednosti  
var secondRightFlag3 = 0; // zastavica, da vemo, da sta iz DESNEGA enkoderja prišli vsaj dve vrednosti  
 
var timePreviousLeft = Date.now(); // inicializiramo čas ob povezavi klienta
var timePreviousRight = timePreviousLeft;

var timesArrayLeft = new Array();
var timesArrayRight = new Array();

var frequencyLeft;
var frequencyRight;
var AvgFrequencyLeft = 0;
var AvgFrequencyRight = 0;

var numberOfCountsLeft;
var numberOfCountsRight;

var timeIntervalLeft;
var timeIntervalRight;

var InfRedDistanceLeft=0;
var InfRedDistanceRight=0;

////////////////////////////////////////// Fuzzy controller for frequency control begin
var NFuzzyVars = 4;
var NFuzzyOutputs = 2;
var NFuzzySets = new Array(NFuzzyVars);
NFuzzySets[0] = 9; // var 0 = output from controller for left wheel
NFuzzySets[1] = 9; // var 1 = output from controller for right wheel
NFuzzySets[2] = 9; // var 2 = error = actual frequency - desired frequency left
NFuzzySets[3] = 9; // var 3 = error = actual frequency - desired frequency right

var FSvalues = new Array(NFuzzyVars);
for (var i=0;i!=NFuzzyVars;i++)
{
    FSvalues[i] = new Array(NFuzzySets[i]);
    for (var j=0;j!=NFuzzySets[i];j++)
    {
        FSvalues[i][j] = new Array(3);
    }
}

var NRules = 18;
var NLeftRules = 9;
var NRightRules = 9;
var RBase = new Array(NRules);
for (var i=0;i!=NRules;i++)
{
    RBase[i] = new Array(NFuzzyVars);
}

var ValuesForFuzzy = new Array(NFuzzyVars);
ValuesForFuzzy[0] = 0;
ValuesForFuzzy[1] = 0;
ValuesForFuzzy[2] = 0;
ValuesForFuzzy[3] = 0;

var AlphaCutLeft = new Array(NFuzzySets[0]); // use number of output fuzzy sets
var AlphaCutRight = new Array(NFuzzySets[1]); // use number of output fuzzy sets
{
RBase[0][0] = 0;        RBase[0][1] = -1;       RBase[0][2] = 0;        RBase[0][3] = -1; 
RBase[1][0] = 1;        RBase[1][1] = -1;       RBase[1][2] = 1;        RBase[1][3] = -1; 
RBase[2][0] = 2;        RBase[2][1] = -1;       RBase[2][2] = 2;        RBase[2][3] = -1; 
RBase[3][0] = 3;        RBase[3][1] = -1;       RBase[3][2] = 3;        RBase[3][3] = -1; 
RBase[4][0] = 4;        RBase[4][1] = -1;       RBase[4][2] = 4;        RBase[4][3] = -1; 
RBase[5][0] = 5;        RBase[5][1] = -1;       RBase[5][2] = 5;        RBase[5][3] = -1; 
RBase[6][0] = 6;        RBase[6][1] = -1;       RBase[6][2] = 6;        RBase[6][3] = -1; 
RBase[7][0] = 7;        RBase[7][1] = -1;       RBase[7][2] = 7;        RBase[7][3] = -1; 
RBase[8][0] = 8;        RBase[8][1] = -1;       RBase[8][2] = 8;        RBase[8][3] = -1; 

RBase[9][0] = -1;       RBase[9][1] = 0;        RBase[9][2] = -1;       RBase[9][3] = 0;  
RBase[10][0] = -1;      RBase[10][1] = 1;       RBase[10][2] = -1;      RBase[10][3] = 1;
RBase[11][0] = -1;      RBase[11][1] = 2;       RBase[11][2] = -1;      RBase[11][3] = 2;
RBase[12][0] = -1;      RBase[12][1] = 3;       RBase[12][2] = -1;      RBase[12][3] = 3;
RBase[13][0] = -1;      RBase[13][1] = 4;       RBase[13][2] = -1;      RBase[13][3] = 4;
RBase[14][0] = -1;      RBase[14][1] = 5;       RBase[14][2] = -1;      RBase[14][3] = 5;
RBase[15][0] = -1;      RBase[15][1] = 6;       RBase[15][2] = -1;      RBase[15][3] = 6;
RBase[16][0] = -1;      RBase[16][1] = 7;       RBase[16][2] = -1;      RBase[16][3] = 7;
RBase[17][0] = -1;      RBase[17][1] = 8;       RBase[17][2] = -1;      RBase[17][3] = 8;
}
{
var FS0val1 = 4;
var FS0val2 = 2;
var FS0val3 = 1;
var FS0val4 = 0.5;
///////////////////////////////////// LEFT WHEEL CONTROL
FSvalues[0][0][0] = -FS0val1;
FSvalues[0][0][1] = -FS0val1;
FSvalues[0][0][2] = -FS0val2;    

FSvalues[0][1][0] = -FS0val1;
FSvalues[0][1][1] = -FS0val2;
FSvalues[0][1][2] = -FS0val3;

FSvalues[0][2][0] = -FS0val2;
FSvalues[0][2][1] = -FS0val3;
FSvalues[0][2][2] = -FS0val4;

FSvalues[0][3][0] = -FS0val3;
FSvalues[0][3][1] = -FS0val4;
FSvalues[0][3][2] = 0;

FSvalues[0][4][0] = -FS0val4;
FSvalues[0][4][1] = 0;
FSvalues[0][4][2] = FS0val4;

FSvalues[0][5][0] = 0;
FSvalues[0][5][1] = FS0val4;
FSvalues[0][5][2] = FS0val3;

FSvalues[0][6][0] = FS0val4;
FSvalues[0][6][1] = FS0val3;
FSvalues[0][6][2] = FS0val2;

FSvalues[0][7][0] = FS0val3;
FSvalues[0][7][1] = FS0val2;
FSvalues[0][7][2] = FS0val1;

FSvalues[0][8][0] = FS0val2;
FSvalues[0][8][1] = FS0val1;
FSvalues[0][8][2] = FS0val1;
///////////////////////////////////// RIGHT WHEEL CONTROL
FSvalues[1][0][0] = -FS0val1;
FSvalues[1][0][1] = -FS0val1;
FSvalues[1][0][2] = -FS0val2;    

FSvalues[1][1][0] = -FS0val1;
FSvalues[1][1][1] = -FS0val2;
FSvalues[1][1][2] = -FS0val3;

FSvalues[1][2][0] = -FS0val2;
FSvalues[1][2][1] = -FS0val3;
FSvalues[1][2][2] = -FS0val4;

FSvalues[1][3][0] = -FS0val3;
FSvalues[1][3][1] = -FS0val4;
FSvalues[1][3][2] = 0;

FSvalues[1][4][0] = -FS0val4;
FSvalues[1][4][1] = 0;
FSvalues[1][4][2] = FS0val4;

FSvalues[1][5][0] = 0;
FSvalues[1][5][1] = FS0val4;
FSvalues[1][5][2] = FS0val3;

FSvalues[1][6][0] = FS0val4;
FSvalues[1][6][1] = FS0val3;
FSvalues[1][6][2] = FS0val2;

FSvalues[1][7][0] = FS0val3;
FSvalues[1][7][1] = FS0val2;
FSvalues[1][7][2] = FS0val1;

FSvalues[1][8][0] = FS0val2;
FSvalues[1][8][1] = FS0val1;
FSvalues[1][8][2] = FS0val1;
/////////////////////////////////////

var FS1val1 = 84;
var FS1val2 = 42;
var FS1val3 = 24;
var FS1val4 = 12;
///////////////////////////////////// LEFT WHEEL ERROR
FSvalues[2][0][0] = -FS1val1;
FSvalues[2][0][1] = -FS1val1;
FSvalues[2][0][2] = -FS1val2;

FSvalues[2][1][0] = -FS1val1;
FSvalues[2][1][1] = -FS1val2;
FSvalues[2][1][2] = -FS1val3;

FSvalues[2][2][0] = -FS1val2;
FSvalues[2][2][1] = -FS1val3;
FSvalues[2][2][2] = -FS1val4;

FSvalues[2][3][0] = -FS1val3;
FSvalues[2][3][1] = -FS1val4;
FSvalues[2][3][2] = 0;

FSvalues[2][4][0] = -FS1val4;
FSvalues[2][4][1] = 0;
FSvalues[2][4][2] = FS1val4;

FSvalues[2][5][0] = 0;
FSvalues[2][5][1] = FS1val4;
FSvalues[2][5][2] = FS1val3;

FSvalues[2][6][0] = FS1val4;
FSvalues[2][6][1] = FS1val3;
FSvalues[2][6][2] = FS1val2;

FSvalues[2][7][0] = FS1val3;
FSvalues[2][7][1] = FS1val2;
FSvalues[2][7][2] = FS1val1;

FSvalues[2][8][0] = FS1val2;
FSvalues[2][8][1] = FS1val1;
FSvalues[2][8][2] = FS1val1;
///////////////////////////////////// RIGHT WHEEL ERROR
FSvalues[3][0][0] = -FS1val1;
FSvalues[3][0][1] = -FS1val1;
FSvalues[3][0][2] = -FS1val2;

FSvalues[3][1][0] = -FS1val1;
FSvalues[3][1][1] = -FS1val2;
FSvalues[3][1][2] = -FS1val3;

FSvalues[3][2][0] = -FS1val2;
FSvalues[3][2][1] = -FS1val3;
FSvalues[3][2][2] = -FS1val4;

FSvalues[3][3][0] = -FS1val3;
FSvalues[3][3][1] = -FS1val4;
FSvalues[3][3][2] = 0;

FSvalues[3][4][0] = -FS1val4;
FSvalues[3][4][1] = 0;
FSvalues[3][4][2] = FS1val4;

FSvalues[3][5][0] = 0;
FSvalues[3][5][1] = FS1val4;
FSvalues[3][5][2] = FS1val3;

FSvalues[3][6][0] = FS1val4;
FSvalues[3][6][1] = FS1val3;
FSvalues[3][6][2] = FS1val2;

FSvalues[3][7][0] = FS1val3;
FSvalues[3][7][1] = FS1val2;
FSvalues[3][7][2] = FS1val1;

FSvalues[3][8][0] = FS1val2;
FSvalues[3][8][1] = FS1val1;
FSvalues[3][8][2] = FS1val1;
}

function getMRfromFSvalues(value, NumOfVar, NumOfSet)
{
    if (NumOfSet == -1)
    {
        return 1;
    }
    if (NumOfSet == 0)
    {
        if (value < FSvalues[NumOfVar][NumOfSet][0])
        {
            return 1;
        }
        else if (value > FSvalues[NumOfVar][NumOfSet][2])
        {
            return 0;
        }
        else
        {
            return (FSvalues[NumOfVar][NumOfSet][2] - value) / (FSvalues[NumOfVar][NumOfSet][2] - FSvalues[NumOfVar][NumOfSet][1]);
        }
    }
    else if (NumOfSet == NFuzzySets[NumOfVar] - 1)
    {
        if (value < FSvalues[NumOfVar][NumOfSet][0])
        {
            return 0;
        }
        else if (value > FSvalues[NumOfVar][NumOfSet][2])
        {
            return 1;
        }
        else if (value < FSvalues[NumOfVar][NumOfSet][1])
        {
            return (value - FSvalues[NumOfVar][NumOfSet][0]) / (FSvalues[NumOfVar][NumOfSet][1] - FSvalues[NumOfVar][NumOfSet][0]);
        }
    }
    else 
    {
        if (value < FSvalues[NumOfVar][NumOfSet][0])
        {
            return 0;
        }
        else if (value > FSvalues[NumOfVar][NumOfSet][2])
        {
            return 0;
        }
        else if (value < FSvalues[NumOfVar][NumOfSet][1])
        {
            return (value - FSvalues[NumOfVar][NumOfSet][0]) / (FSvalues[NumOfVar][NumOfSet][1] - FSvalues[NumOfVar][NumOfSet][0]);
        }
        else
        {
            return (FSvalues[NumOfVar][NumOfSet][2] - value) / (FSvalues[NumOfVar][NumOfSet][2] - FSvalues[NumOfVar][NumOfSet][1]);
        }
    }
}

function getPWMfromFuzzyLeft(zelenaVrednostLevo,frequencyLeft)
{
    AlphaCutLeft[0] = 0;
    AlphaCutLeft[1] = 0;
    AlphaCutLeft[2] = 0;
    AlphaCutLeft[3] = 0;
    AlphaCutLeft[4] = 0;
    AlphaCutLeft[5] = 0;
    AlphaCutLeft[6] = 0;
    AlphaCutLeft[7] = 0;
    AlphaCutLeft[8] = 0;
    if (IntegralCounterLeft < SummInterval)
    {
        ErrorLeft.unshift(zelenaVrednostLevo - frequencyLeft);
        IntegralCounterLeft++;
    }
    else
    {
        ErrorLeft.pop();
        ErrorLeft.unshift(zelenaVrednostLevo - frequencyLeft);
    }
    ValuesForFuzzy[2] = ErrorLeft[0];
    ValuesForFuzzy[3] = ErrorRight[0];
    var ControlValue = 0;
    for (var L=0;L!=1;L++)
    {
        //console.log('ErrorLeft[0] = ' + ErrorLeft[0]);
        for (var i=0;i!=NLeftRules;i++)
        {
            var tempMR = 0;
            var tempMinMR = 1;
            var NumOfDC = 0;
            for (var CurrentVar = NFuzzyOutputs;CurrentVar!=NFuzzyVars;CurrentVar++)
            {
                if (RBase[i][CurrentVar] != -1)
                {
                    tempMR = getMRfromFSvalues(ValuesForFuzzy[CurrentVar],CurrentVar,RBase[i][CurrentVar]);
                    //console.log('ValuesForFuzzy[CurrentVar] = ' + ValuesForFuzzy[CurrentVar] + 'CurrentVar = ' + CurrentVar);
                    if (tempMR < tempMinMR)
                        tempMinMR = tempMR;
                }
                else
                    NumOfDC++;
            }
            if (NumOfDC != NFuzzyVars - NFuzzyOutputs)
                AlphaCutLeft[RBase[i][0]] = tempMinMR;
            //console.log('AlphaCutLeft[RBase[i][0]] = ' + AlphaCutLeft[RBase[i][0]]);
        }
        var FuzzyRange = FSvalues[0][NFuzzySets[0]-1][2] - FSvalues[0][0][0];
        //console.log('FuzzyRange = ' + FuzzyRange);
        var NIntervals = 100;
        var CoordinateMassSumm = 0;
        var MassSumm = 0;
        for (var i=0;i!=NIntervals;i++)
        {
            var TempCoordinate = FSvalues[0][0][0] + FuzzyRange/NIntervals*i;
            //console.log('TempCoordinate = ' + TempCoordinate);
            var TempMass1 = 0;
            var TempMass2 = 0;
            for (var j=0;j!=NFuzzySets[0];j++)
            {
                TempMass2 = getMRfromFSvalues(TempCoordinate,0,j);
                //console.log('TempMass2 = ' + TempMass2);
                if (TempMass2 > AlphaCutLeft[j])
                    TempMass2 = AlphaCutLeft[j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
            //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        }
        if (MassSumm != 0) 
            ControlValue = CoordinateMassSumm / MassSumm;
    }
    FuzzyPWMleft = FuzzyPWMleft + ControlValue;
    
    if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
      frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0)
    {
        FuzzyPWMleft = 0;
        LeftStoppedFlag = 1;
        if (RightStoppedFlag == 1 && STARTctrl != 0)
        {
            STARTctrl = 0;
            SetNewCommandProbabilities(0);
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }            
    }    
    if (FuzzyPWMleft.isNaN)
        FuzzyPWMleft = 0;
    return FuzzyPWMleft;
}

function getPWMfromFuzzyRight(zelenaVrednostDesno,frequencyRight)
{
    AlphaCutRight[0] = 0;
    AlphaCutRight[1] = 0;
    AlphaCutRight[2] = 0;
    AlphaCutRight[3] = 0;
    AlphaCutRight[4] = 0;
    AlphaCutRight[5] = 0;
    AlphaCutRight[6] = 0;
    AlphaCutRight[7] = 0;
    AlphaCutRight[8] = 0;
    if (IntegralCounterRight < SummInterval)
    {
        ErrorRight.unshift(zelenaVrednostDesno - frequencyRight);
        IntegralCounterRight++;
    }
    else
    {
        ErrorRight.pop();
        ErrorRight.unshift(zelenaVrednostDesno - frequencyRight);
    }
    ValuesForFuzzy[2] = ErrorLeft[0];
    ValuesForFuzzy[3] = ErrorRight[0];
    var ControlValue = 0;
    for (var L=0;L!=1;L++)
    {
        //console.log('ErrorRight[0] = ' + ErrorRight[0]);
        for (var i=NLeftRules;i!=NRightRules + NLeftRules;i++)
        {
            var tempMR = 0;
            var tempMinMR = 1;
            var NumOfDC = 0;
            for (var CurrentVar = NFuzzyOutputs;CurrentVar!=NFuzzyVars;CurrentVar++)
            {
                if (RBase[i][CurrentVar] != -1)
                {
                    tempMR = getMRfromFSvalues(ValuesForFuzzy[CurrentVar],CurrentVar,RBase[i][CurrentVar]);
                    //console.log('ValuesForFuzzy[CurrentVar] = ' + ValuesForFuzzy[CurrentVar] + ' CurrentVar = ' + CurrentVar + ' tempMR = ' + tempMR);
                    if (tempMR < tempMinMR)
                        tempMinMR = tempMR;
                }
                else
                    NumOfDC++;
                //console.log('RBase[i][CurrentVar] = ' + RBase[i][CurrentVar] + 'NumOfDC = ' + NumOfDC + 'ErrorRight[L] = ' + ErrorRight[L] + 'tempMR = ' + tempMR + 'tempMinMR = ' + tempMinMR);
            }
            if (NumOfDC != NFuzzyVars - NFuzzyOutputs)
                AlphaCutRight[RBase[i][1]] = tempMinMR;
            //console.log('AlphaCutRight[RBase[i][1]] = ' + AlphaCutRight[RBase[i][1]]);
        }
        var FuzzyRange = FSvalues[1][NFuzzySets[1]-1][2] - FSvalues[1][0][0];
        //console.log('FuzzyRange = ' + FuzzyRange);
        var NIntervals = 100;
        var CoordinateMassSumm = 0;
        var MassSumm = 0;
        for (var i=0;i!=NIntervals;i++)
        {
            var TempCoordinate = FSvalues[1][0][0] + FuzzyRange/NIntervals*i;
            //console.log('TempCoordinate = ' + TempCoordinate);
            var TempMass1 = 0;
            var TempMass2 = 0;
            for (var j=0;j!=NFuzzySets[1];j++)
            {
                //console.log('AlphaCutRight[j] = ' + AlphaCutRight[j]);
                TempMass2 = getMRfromFSvalues(TempCoordinate,1,j);
                //console.log('TempMass2 = ' + TempMass2);
                if (TempMass2 > AlphaCutRight[j])
                    TempMass2 = AlphaCutRight[j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
            //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        }
        if (MassSumm != 0) 
            ControlValue = CoordinateMassSumm / MassSumm;
    }
    //console.log('ControlValue[0] = ' + ControlValue);
    FuzzyPWMright = FuzzyPWMright + ControlValue;
    
    if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
      frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0)
    {
        FuzzyPWMright = 0;
        RightStoppedFlag = 1;
        if (LeftStoppedFlag == 1 && STARTctrl != 0)
        {
            STARTctrl = 0;
            SetNewCommandProbabilities(0);
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }
    }
    if (FuzzyPWMright.isNaN)
        FuzzyPWMright = 0;
    return FuzzyPWMright;
}
////////////////////////////////////////// Fuzzy controller for frequency control end

////////////////////////////////////////// Fuzzy controller for desired frequency change (brake assist) begin

var NFuzzyVarsBA = 55;
var NFuzzyOutputsBA = 4;
var NFuzzySetsBA = new Array(NFuzzyVarsBA);
NFuzzySetsBA[0] = 4;
NFuzzySetsBA[1] = 4;
NFuzzySetsBA[2] = 4;
NFuzzySetsBA[3] = 4;

NFuzzySetsBA[4] = 9;
NFuzzySetsBA[5] = 4;
NFuzzySetsBA[6] = 4;
NFuzzySetsBA[7] = 4;
NFuzzySetsBA[8] = 4;
NFuzzySetsBA[9] = 4;
NFuzzySetsBA[10] = 4;
NFuzzySetsBA[11] = 4;
NFuzzySetsBA[12] = 4;
NFuzzySetsBA[13] = 4;
NFuzzySetsBA[14] = 4;
NFuzzySetsBA[15] = 4;
NFuzzySetsBA[16] = 4;
NFuzzySetsBA[17] = 4;
NFuzzySetsBA[18] = 4;

for (var i=19;i!=55;i++)
{
    NFuzzySetsBA[i] = 4;
}

var AlphaCutBA = new Array(NFuzzyOutputsBA);
for (var i=0;i!=NFuzzyOutputsBA;i++)
{
    AlphaCutBA[i] = new Array(NFuzzySetsBA[i]);
}

var NRulesBA = 264;
var RBaseBA = new Array(NRulesBA);
for (var i=0;i!=NRulesBA;i++)
{
    RBaseBA[i] = new Array(NFuzzyVarsBA);
}

var ValuesForFuzzyBA = new Array(NFuzzyVars);
for (var i=0;i!=55;i++)
{
    ValuesForFuzzyBA[i] = 0;
}

var FSvaluesBA = new Array(NFuzzyVarsBA);
for (var i=0;i!=NFuzzyVarsBA;i++)
{
    FSvaluesBA[i] = new Array(NFuzzySetsBA[i]);
    for (var j=0;j!=NFuzzySetsBA[i];j++)
    {
        FSvaluesBA[i][j] = new Array(3);
    }
}

{
    
for (var i=0;i!=NRulesBA;i++)
{
    for (var j=0;j!=NFuzzyVarsBA;j++)
    {
        RBaseBA[i][j] = -1;
        //console.log(i + ' ' + j);
    }
}

var RN = 0;
//bkwd
RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 2;       RBaseBA[RN][11] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 2;       RBaseBA[RN][11] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 2;       RBaseBA[RN][11] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 2;       RBaseBA[RN][11] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 2;       RBaseBA[RN][12] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 2;       RBaseBA[RN][12] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 2;       RBaseBA[RN][12] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 2;       RBaseBA[RN][12] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 2;       RBaseBA[RN][14] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 2;       RBaseBA[RN][14] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 2;       RBaseBA[RN][14] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 2;       RBaseBA[RN][14] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 2;       RBaseBA[RN][15] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 2;       RBaseBA[RN][15] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 2;       RBaseBA[RN][15] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 2;       RBaseBA[RN][15] = 0; RN++;
//fwd
RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][5] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][5] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][5] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][5] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][8] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][8] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][8] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][8] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][54] = 3; RN++; //350:360
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][54] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][54] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][54] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][53] = 3; RN++; //340:350
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][53] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][53] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][53] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][52] = 3; RN++; //330:340
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][52] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][52] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][52] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][51] = 3; RN++; //320:330
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][51] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][51] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][51] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][50] = 3; RN++; //310:320
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][50] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][50] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][50] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][49] = 3; RN++; //300:310
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][49] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][49] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][49] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][19] = 3; RN++; //0:10
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][19] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][19] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][19] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][20] = 3; RN++; //10:20
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][20] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][20] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][20] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][21] = 3; RN++; //20:30
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][21] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][21] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][21] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][22] = 3; RN++; //30:40
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][22] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][22] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][22] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][23] = 3; RN++; //40:50
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][23] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][23] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][23] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][24] = 3; RN++; //50:60
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][24] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][24] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][24] = 0; RN++;
//spinL
RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][6] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][6] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][6] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][6] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][7] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][7] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][7] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][7] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][16] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][16] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][16] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][16] = 0; RN++;
/*
RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][54] = 3; RN++; //350:360
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][54] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][54] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][54] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][53] = 3; RN++; //340:350
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][53] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][53] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][53] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][52] = 3; RN++; //330:340
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][52] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][52] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][52] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][51] = 3; RN++; //320:330
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][51] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][51] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][51] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][50] = 3; RN++; //310:320
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][50] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][50] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][50] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][49] = 3; RN++; //300:310
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][49] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][49] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][49] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][48] = 3; RN++; //290:300
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][48] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][48] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][48] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][47] = 3; RN++; //280:290
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][47] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][47] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][47] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][46] = 3; RN++; //270:280
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][46] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][46] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][46] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][45] = 3; RN++; //260:270
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][45] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][45] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][45] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][44] = 3; RN++; //250:260
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][44] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][44] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][44] = 0; RN++;
/*
RBaseBA[RN][0] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 3;       RBaseBA[RN][43] = 3; RN++; //240:250
RBaseBA[RN][0] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 3;       RBaseBA[RN][43] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 3;       RBaseBA[RN][43] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 3;       RBaseBA[RN][43] = 0; RN++;*/
//spinR
RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][9] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][9] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][9] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][9] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][10] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][10] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][10] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][10] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][13] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][13] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][13] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][13] = 0; RN++;
/*
RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][19] = 3; RN++; //0:10
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][19] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][19] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][19] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][20] = 3; RN++; //10:20
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][20] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][20] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][20] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][21] = 3; RN++; //20:30
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][21] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][21] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][21] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][22] = 3; RN++; //30:40
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][22] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][22] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][22] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][23] = 3; RN++; //40:50
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][23] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][23] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][23] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][24] = 3; RN++; //50:60
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][24] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][24] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][24] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][25] = 3; RN++; //60:70
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][25] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][25] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][25] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][26] = 3; RN++; //70:80
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][26] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][26] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][26] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][27] = 3; RN++; //80:90
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][27] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][27] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][27] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][28] = 3; RN++; //90:100
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][28] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][28] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][28] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][29] = 3; RN++; //100:110
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][29] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][29] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][29] = 0; RN++;
/*
RBaseBA[RN][1] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 4;       RBaseBA[RN][30] = 3; RN++; //110:120
RBaseBA[RN][1] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 4;       RBaseBA[RN][30] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 4;       RBaseBA[RN][30] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 4;       RBaseBA[RN][30] = 0; RN++;*/
//BkLeftL5R10
RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 7;       RBaseBA[RN][11] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 7;       RBaseBA[RN][11] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 7;       RBaseBA[RN][11] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 7;       RBaseBA[RN][11] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 7;       RBaseBA[RN][12] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 7;       RBaseBA[RN][12] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 7;       RBaseBA[RN][12] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 7;       RBaseBA[RN][12] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 7;       RBaseBA[RN][14] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 7;       RBaseBA[RN][14] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 7;       RBaseBA[RN][14] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 7;       RBaseBA[RN][14] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 7;       RBaseBA[RN][15] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 7;       RBaseBA[RN][15] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 7;       RBaseBA[RN][15] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 7;       RBaseBA[RN][15] = 0; RN++;
//BkRightL10R5
RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 8;       RBaseBA[RN][11] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 8;       RBaseBA[RN][11] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 8;       RBaseBA[RN][11] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 8;       RBaseBA[RN][11] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 8;       RBaseBA[RN][12] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 8;       RBaseBA[RN][12] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 8;       RBaseBA[RN][12] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 8;       RBaseBA[RN][12] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 8;       RBaseBA[RN][14] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 8;       RBaseBA[RN][14] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 8;       RBaseBA[RN][14] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 8;       RBaseBA[RN][14] = 0; RN++;

RBaseBA[RN][0] = 0;        RBaseBA[RN][2] = 0;        RBaseBA[RN][4] = 8;       RBaseBA[RN][15] = 3; RN++;
RBaseBA[RN][0] = 1;        RBaseBA[RN][2] = 1;        RBaseBA[RN][4] = 8;       RBaseBA[RN][15] = 2; RN++;
RBaseBA[RN][0] = 2;        RBaseBA[RN][2] = 2;        RBaseBA[RN][4] = 8;       RBaseBA[RN][15] = 1; RN++;
RBaseBA[RN][0] = 3;        RBaseBA[RN][2] = 3;        RBaseBA[RN][4] = 8;       RBaseBA[RN][15] = 0; RN++;
//FwLeftL5R10
RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][5] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][5] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][5] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][5] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][8] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][8] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][8] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][8] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][17] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][17] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][17] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][17] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][18] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][18] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][18] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][18] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][46] = 3; RN++; //270:280
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][46] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][46] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][46] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][47] = 3; RN++; //280:290
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][47] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][47] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][47] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][48] = 3; RN++; //290:300
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][48] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][48] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][48] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][49] = 3; RN++; //300:310
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][49] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][49] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][49] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][50] = 3; RN++; //310:320
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][50] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][50] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][50] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][51] = 3; RN++; //320:330
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][51] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][51] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][51] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][52] = 3; RN++; //330:340
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][52] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][52] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][52] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][53] = 3; RN++; //340:350
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][53] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][53] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][53] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][54] = 3; RN++; //350:360
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][54] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][54] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][54] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][19] = 3; RN++; //0:10
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][19] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][19] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][19] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][20] = 3; RN++; //10:20
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][20] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][20] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][20] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 5;       RBaseBA[RN][21] = 3; RN++; //20:30
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 5;       RBaseBA[RN][21] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 5;       RBaseBA[RN][21] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 5;       RBaseBA[RN][21] = 0; RN++;
//FwRightL10R5
RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][17] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][17] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][17] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][17] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][18] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][18] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][18] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][18] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][19] = 3; RN++; //0:10
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][19] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][19] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][19] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][20] = 3; RN++; //10:20
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][20] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][20] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][20] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][21] = 3; RN++; //20:30
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][21] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][21] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][21] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][22] = 3; RN++; //30:40
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][22] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][22] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][22] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][23] = 3; RN++; //40:50
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][23] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][23] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][23] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][24] = 3; RN++; //50:60
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][24] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][24] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][24] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][25] = 3; RN++; //60:70
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][25] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][25] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][25] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][26] = 3; RN++; //70:80
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][26] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][26] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][26] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][27] = 3; RN++; //80:90
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][27] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][27] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][27] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][54] = 3; RN++; //350:360
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][54] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][54] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][54] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][53] = 3; RN++; //340:350
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][53] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][53] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][53] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][52] = 3; RN++; //330:340
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][52] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][52] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][52] = 0; RN++;
//fwd
console.log("NUMBER OF RULES IS = " + RN);
}   //rules

{
var FSOutBAval1 = 0;
var FSOutBAval2 = 0.1;
var FSOutBAval3 = 0.7;
var FSOutBAval4 = 2;

///////////////////////////////////// LEFT BACK BA CONTROL
FSvaluesBA[0][0][0] =  FSOutBAval1;
FSvaluesBA[0][0][1] =  FSOutBAval1;
FSvaluesBA[0][0][2] =  FSOutBAval2;    

FSvaluesBA[0][1][0] =  FSOutBAval1;
FSvaluesBA[0][1][1] =  FSOutBAval2;
FSvaluesBA[0][1][2] =  FSOutBAval3;

FSvaluesBA[0][2][0] =  FSOutBAval2;
FSvaluesBA[0][2][1] =  FSOutBAval3;
FSvaluesBA[0][2][2] =  FSOutBAval4;

FSvaluesBA[0][3][0] =  FSOutBAval3;
FSvaluesBA[0][3][1] =  FSOutBAval4;
FSvaluesBA[0][3][2] =  FSOutBAval4;

///////////////////////////////////// LEFT FORWARD BA CONTROL
FSvaluesBA[1][0][0] =  FSOutBAval1;
FSvaluesBA[1][0][1] =  FSOutBAval1;
FSvaluesBA[1][0][2] =  FSOutBAval2;    

FSvaluesBA[1][1][0] =  FSOutBAval1;
FSvaluesBA[1][1][1] =  FSOutBAval2;
FSvaluesBA[1][1][2] =  FSOutBAval3;

FSvaluesBA[1][2][0] =  FSOutBAval2;
FSvaluesBA[1][2][1] =  FSOutBAval3;
FSvaluesBA[1][2][2] =  FSOutBAval4;

FSvaluesBA[1][3][0] =  FSOutBAval3;
FSvaluesBA[1][3][1] =  FSOutBAval4;
FSvaluesBA[1][3][2] =  FSOutBAval4;

///////////////////////////////////// RIGHT BACK BA CONTROL
FSvaluesBA[2][0][0] =  FSOutBAval1;
FSvaluesBA[2][0][1] =  FSOutBAval1;
FSvaluesBA[2][0][2] =  FSOutBAval2;    

FSvaluesBA[2][1][0] =  FSOutBAval1;
FSvaluesBA[2][1][1] =  FSOutBAval2;
FSvaluesBA[2][1][2] =  FSOutBAval3;

FSvaluesBA[2][2][0] =  FSOutBAval2;
FSvaluesBA[2][2][1] =  FSOutBAval3;
FSvaluesBA[2][2][2] =  FSOutBAval4;

FSvaluesBA[2][3][0] =  FSOutBAval3;
FSvaluesBA[2][3][1] =  FSOutBAval4;
FSvaluesBA[2][3][2] =  FSOutBAval4;

///////////////////////////////////// RIGHT FORWARD BA CONTROL
FSvaluesBA[3][0][0] =  FSOutBAval1;
FSvaluesBA[3][0][1] =  FSOutBAval1;
FSvaluesBA[3][0][2] =  FSOutBAval2;    

FSvaluesBA[3][1][0] =  FSOutBAval1;
FSvaluesBA[3][1][1] =  FSOutBAval2;
FSvaluesBA[3][1][2] =  FSOutBAval3;

FSvaluesBA[3][2][0] =  FSOutBAval2;
FSvaluesBA[3][2][1] =  FSOutBAval3;
FSvaluesBA[3][2][2] =  FSOutBAval4;

FSvaluesBA[3][3][0] =  FSOutBAval3;
FSvaluesBA[3][3][1] =  FSOutBAval4;
FSvaluesBA[3][3][2] =  FSOutBAval4;
/////////////////////////////////////


///////////////////////////////////// INPUT CONTROL SIGNAL
FSvaluesBA[4][0][0] = -0.1;
FSvaluesBA[4][0][1] = 0;
FSvaluesBA[4][0][2] = 0.1;

FSvaluesBA[4][1][0] = 0.9;
FSvaluesBA[4][1][1] = 1;
FSvaluesBA[4][1][2] = 1.1;

FSvaluesBA[4][2][0] = 1.9;
FSvaluesBA[4][2][1] = 2;
FSvaluesBA[4][2][2] = 2.1;

FSvaluesBA[4][3][0] = 2.9;
FSvaluesBA[4][3][1] = 3;
FSvaluesBA[4][3][2] = 3.1;

FSvaluesBA[4][4][0] = 3.9;
FSvaluesBA[4][4][1] = 4;
FSvaluesBA[4][4][2] = 4.1;

FSvaluesBA[4][5][0] = 4.9;
FSvaluesBA[4][5][1] = 5;
FSvaluesBA[4][5][2] = 5.1;

FSvaluesBA[4][6][0] = 5.9;
FSvaluesBA[4][6][1] = 6;
FSvaluesBA[4][6][2] = 6.1;

FSvaluesBA[4][7][0] = 6.9;
FSvaluesBA[4][7][1] = 7;
FSvaluesBA[4][7][2] = 7.1;

FSvaluesBA[4][8][0] = 7.9;
FSvaluesBA[4][8][1] = 8;
FSvaluesBA[4][8][2] = 8.1;
/////////////////////////////////////
var FSSenBAval1 = 0;
var FSSenBAval2 = 20;
var FSSenBAval3 = 40;
var FSSenBAval4 = 60;

var FSSenBAvalLR1 = 5;
var FSSenBAvalLR2 = 25;
var FSSenBAvalLR3 = 45;
var FSSenBAvalLR4 = 65;
///////////////////////////////////// SENSORS
for (var i=5;i!=17;i++)
{
    FSvaluesBA[i][0][0] = FSSenBAval1;
    FSvaluesBA[i][0][1] = FSSenBAval1;
    FSvaluesBA[i][0][2] = FSSenBAval2;
    
    FSvaluesBA[i][1][0] = FSSenBAval1;
    FSvaluesBA[i][1][1] = FSSenBAval2;
    FSvaluesBA[i][1][2] = FSSenBAval3;
    
    FSvaluesBA[i][2][0] = FSSenBAval2;
    FSvaluesBA[i][2][1] = FSSenBAval3;
    FSvaluesBA[i][2][2] = FSSenBAval4;
    
    FSvaluesBA[i][3][0] = FSSenBAval3;
    FSvaluesBA[i][3][1] = FSSenBAval4;
    FSvaluesBA[i][3][2] = FSSenBAval4;
    
    if (i == 6 || i == 7 || i == 16 || i == 9 || i == 10 || i == 13)
    {
        FSvaluesBA[i][0][0] = FSSenBAvalLR1;
        FSvaluesBA[i][0][1] = FSSenBAvalLR1;
        FSvaluesBA[i][0][2] = FSSenBAvalLR2;
        
        FSvaluesBA[i][1][0] = FSSenBAvalLR1;
        FSvaluesBA[i][1][1] = FSSenBAvalLR2;
        FSvaluesBA[i][1][2] = FSSenBAvalLR3;
        
        FSvaluesBA[i][2][0] = FSSenBAvalLR2;
        FSvaluesBA[i][2][1] = FSSenBAvalLR3;
        FSvaluesBA[i][2][2] = FSSenBAvalLR4;
        
        FSvaluesBA[i][3][0] = FSSenBAvalLR3;
        FSvaluesBA[i][3][1] = FSSenBAvalLR4;
        FSvaluesBA[i][3][2] = FSSenBAvalLR4;
    }
}


FSvaluesBA[17][0][0] = 10;
FSvaluesBA[17][0][1] = 10;
FSvaluesBA[17][0][2] = 15;

FSvaluesBA[17][1][0] = 10;
FSvaluesBA[17][1][1] = 15;
FSvaluesBA[17][1][2] = 25;

FSvaluesBA[17][2][0] = 15;
FSvaluesBA[17][2][1] = 25;
FSvaluesBA[17][2][2] = 35;

FSvaluesBA[17][3][0] = 25;
FSvaluesBA[17][3][1] = 35;
FSvaluesBA[17][3][2] = 35;

FSvaluesBA[18][0][0] = 10;
FSvaluesBA[18][0][1] = 10;
FSvaluesBA[18][0][2] = 15;

FSvaluesBA[18][1][0] = 10;
FSvaluesBA[18][1][1] = 15;
FSvaluesBA[18][1][2] = 25;

FSvaluesBA[18][2][0] = 15;
FSvaluesBA[18][2][1] = 25;
FSvaluesBA[18][2][2] = 35;

FSvaluesBA[18][3][0] = 25;
FSvaluesBA[18][3][1] = 35;
FSvaluesBA[18][3][2] = 35;
// LIDAR
for (var i=19;i!=55;i++)
{
    FSvaluesBA[i][0][0] = 25;
    FSvaluesBA[i][0][1] = 25;
    FSvaluesBA[i][0][2] = 28;
    
    FSvaluesBA[i][1][0] = 25;
    FSvaluesBA[i][1][1] = 28;
    FSvaluesBA[i][1][2] = 31;
    
    FSvaluesBA[i][2][0] = 28;
    FSvaluesBA[i][2][1] = 31;
    FSvaluesBA[i][2][2] = 35;
    
    FSvaluesBA[i][3][0] = 31;
    FSvaluesBA[i][3][1] = 35;
    FSvaluesBA[i][3][2] = 35;
}

}   //Fuzzy sets

function getMRFromFSvaluesBA(value,NumOfVar,NumOfSet)
{
    if (NumOfSet == -1)
    {
        return 1;
    }
    if (NumOfSet == 0)
    {
        if (value < FSvaluesBA[NumOfVar][NumOfSet][0])
        {
            return 1;
        }
        else if (value > FSvaluesBA[NumOfVar][NumOfSet][2])
        {
            return 0;
        }
        else
        {
            return (FSvaluesBA[NumOfVar][NumOfSet][2] - value) / (FSvaluesBA[NumOfVar][NumOfSet][2] - FSvaluesBA[NumOfVar][NumOfSet][1]);
        }
    }
    else if (NumOfSet == NFuzzySetsBA[NumOfVar] - 1)
    {
        if (value < FSvaluesBA[NumOfVar][NumOfSet][0])
        {
            return 0;
        }
        else if (value > FSvaluesBA[NumOfVar][NumOfSet][2])
        {
            return 1;
        }
        else if (value < FSvaluesBA[NumOfVar][NumOfSet][1])
        {
            return (value - FSvaluesBA[NumOfVar][NumOfSet][0]) / (FSvaluesBA[NumOfVar][NumOfSet][1] - FSvaluesBA[NumOfVar][NumOfSet][0]);
        }
    }
    else 
    {
        if (value < FSvaluesBA[NumOfVar][NumOfSet][0])
        {
            return 0;
        }
        else if (value > FSvaluesBA[NumOfVar][NumOfSet][2])
        {
            return 0;
        }
        else if (value < FSvaluesBA[NumOfVar][NumOfSet][1])
        {
            return (value - FSvaluesBA[NumOfVar][NumOfSet][0]) / (FSvaluesBA[NumOfVar][NumOfSet][1] - FSvaluesBA[NumOfVar][NumOfSet][0]);
        }
        else
        {
            return (FSvaluesBA[NumOfVar][NumOfSet][2] - value) / (FSvaluesBA[NumOfVar][NumOfSet][2] - FSvaluesBA[NumOfVar][NumOfSet][1]);
        }
    }
}

function getDesiredValuesFuzzyBA()
{
    for (var i=0;i!=NFuzzyOutputsBA;i++)
    {
        for (var j=0;j!=NFuzzySetsBA[i];j++)
        {
            AlphaCutBA[i][j] = 0;
        }
    }
    
    for (var i=0;i!=NRulesBA;i++)
    {
        var tempMR = 0;
        var tempMinMR = 1;
        var NumOfDC = 0;
        for (var CurrentVar = NFuzzyOutputsBA;CurrentVar!=NFuzzyVarsBA;CurrentVar++)
        {
            if (RBaseBA[i][CurrentVar] != -1)
            {
                //console.log('ValuesForFuzzyBA[CurrentVar] = ' + ValuesForFuzzyBA[CurrentVar] + ' CurrentVar = ' + CurrentVar + ' tempMR = ' + tempMR);
                //console.log('NofRule = ' + i + ' RBaseBA[i][CurrentVar] = ' + RBaseBA[i][CurrentVar]);
                tempMR = getMRFromFSvaluesBA(ValuesForFuzzyBA[CurrentVar],CurrentVar,RBaseBA[i][CurrentVar]);
                if (tempMR < tempMinMR)
                    tempMinMR = tempMR;
            }
            else
                NumOfDC++;
            //console.log('RBase[i][CurrentVar] = ' + RBase[i][CurrentVar] + 'NumOfDC = ' + NumOfDC + 'ErrorRight[L] = ' + ErrorRight[L] + 'tempMR = ' + tempMR + 'tempMinMR = ' + tempMinMR);
        }
        //console.log('tempMinMR = ' + tempMinMR);
        for (var CurrentVar = 0;CurrentVar!=NFuzzyOutputsBA;CurrentVar++)
        {
            //console.log('RBaseBA['+i+']['+CurrentVar+'] = ' + RBaseBA[i][CurrentVar]);
            if ((NumOfDC != NFuzzyVarsBA - NFuzzyOutputsBA) && (RBaseBA[i][CurrentVar] != -1))
            {
                if (tempMinMR > AlphaCutBA[CurrentVar][RBaseBA[i][CurrentVar]])
                    AlphaCutBA[CurrentVar][RBaseBA[i][CurrentVar]] = tempMinMR;
            }
            //if (RBaseBA[i][CurrentVar] != -1)
            //console.log('AlphaCutBA['+CurrentVar+']['+RBaseBA[i][CurrentVar]+'] = ' + AlphaCutBA[CurrentVar][RBaseBA[i][CurrentVar]]);
        }
    }
    for (var i=0;i!=NFuzzyOutputsBA;i++)
    {
        for (var j=0;j!=NFuzzySetsBA[i];j++)
        {
            //console.log('AlphaCutBA['+i+']['+j+'] = ' + AlphaCutBA[i][j]);
        }
    }
    for (var CurrentVar = 0;CurrentVar!=NFuzzyOutputsBA;CurrentVar++)
    {
        var FuzzyRange = FSvaluesBA[CurrentVar][NFuzzySetsBA[CurrentVar]-1][2] - FSvaluesBA[CurrentVar][0][0];
        //console.log('CurrentVar = ' + CurrentVar);
        //console.log('NFuzzySetsBA[CurrentVar]-1 = ' + (NFuzzySetsBA[CurrentVar]-1));
        //console.log('FSvaluesBA['+CurrentVar+']['+(NFuzzySetsBA[CurrentVar]-1)+'][2] = ' + FSvaluesBA[CurrentVar][NFuzzySetsBA[CurrentVar]-1][2]);
        //console.log('FSvaluesBA['+CurrentVar+'][0][0] = ' + FSvaluesBA[CurrentVar][0][0]);
        //console.log('FuzzyRange = ' + FuzzyRange);
        var NIntervals = 100;
        var CoordinateMassSumm = 0;
        var MassSumm = 0;
        for (var i=0;i!=NIntervals;i++)
        {
            var TempCoordinate = FSvaluesBA[CurrentVar][0][0] + FuzzyRange/NIntervals*i;
            //console.log('TempCoordinate = ' + TempCoordinate);
            var TempMass1 = 0;
            var TempMass2 = 0;
            for (var j=0;j!=NFuzzySetsBA[CurrentVar];j++)
            {
                //console.log('AlphaCutRight[j] = ' + AlphaCutRight[j]);
                TempMass2 = getMRFromFSvaluesBA(TempCoordinate,CurrentVar,j);
                //console.log('TempMass2 = ' + TempMass2);
                if (TempMass2 > AlphaCutBA[CurrentVar][j])
                    TempMass2 = AlphaCutBA[CurrentVar][j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
            //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        }
        //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        if (MassSumm != 0) 
            ValuesForFuzzyBA[CurrentVar] = CoordinateMassSumm / MassSumm;
        if (ValuesForFuzzyBA[CurrentVar].isNaN)
            ValuesForFuzzyBA[CurrentVar] = 0;
        if (ValuesForFuzzyBA[CurrentVar] > 1)
            ValuesForFuzzyBA[CurrentVar] = 1;
    }
}

//value = value*(1.0-weight) + tempvalue*weight;
var DecayWeight = 0.2;

function setDesiredDecay()
{
    if (ValuesForFuzzyBA[4] == 0)   //STOP
    {
        zelenaVrednostLevo = 0;
        zelenaVrednostDesno = 0;
    } else
    if (ValuesForFuzzyBA[4] == 1)   //FORWARD
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[1]);     // 1 - left fwd
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[3]);    // 3 - right fwd
    } else
    if (ValuesForFuzzyBA[4] == 2)   //BACKWARD
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[0]);    // 0 - left bkwd
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[2]);   // 2 - right bkwd
    } else
    if (ValuesForFuzzyBA[4] == 3)   //SPIN LEFT
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) - DecayWeight*(Speed/2)*(1-ValuesForFuzzyBA[0]);
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) + DecayWeight*(Speed/2)*(1-ValuesForFuzzyBA[3]);
    } else
    if (ValuesForFuzzyBA[4] == 4)   //SPIN RIGHT
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) + DecayWeight*(Speed/2)*(1-ValuesForFuzzyBA[1]);
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) - DecayWeight*(Speed/2)*(1-ValuesForFuzzyBA[2]);
    } else
    if (ValuesForFuzzyBA[4] == 5)   //FwLeftL5R10
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[1])/2;
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[3]);
    } else
    if (ValuesForFuzzyBA[4] == 6)   //FwLeftL10R5
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[1]);
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) + DecayWeight*Speed*(1-ValuesForFuzzyBA[3])/2
    } else
    if (ValuesForFuzzyBA[4] == 7)   //BkLeftL5R10
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[0])/2;
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[2]);
    } else
    if (ValuesForFuzzyBA[4] == 8)   //BkLeftL10R5
    {
        zelenaVrednostLevo = zelenaVrednostLevo*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[0]);
        zelenaVrednostDesno = zelenaVrednostDesno*(1-DecayWeight) - DecayWeight*Speed*(1-ValuesForFuzzyBA[2])/2;
    } else                          // WHAT WE HAVE TO DO??? STOP!
    {
        zelenaVrednostLevo = 0;
        zelenaVrednostDesno = 0;
    }
    if (Math.abs(zelenaVrednostLevo) < 0.2)
        zelenaVrednostLevo = 0;
    if (Math.abs(zelenaVrednostDesno) < 0.2)
        zelenaVrednostDesno = 0;
}

////////////////////////////////////////// Fuzzy controller for desired frequency change (brake assist) end

function countValuesAndChopArrayLeft (timesArrayLeft, timeValue, LeftLastIntervals) 
{
// function counts the values in the timesArrayLeft that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayLeft must be defined as global variable should not lose time in between    
var Weight2 = 0.4;
var NumIntervals = timesArrayLeft.length;
if (NumIntervals > FrequencyAveInterval)
    NumIntervals = FrequencyAveInterval;
//console.log('NumIntervalsL = ' + NumIntervals);
if (NumIntervals - 3 < 0)
{
    //timesArrayLeft.splice(0, 1);
    //LeftLastMeasures.splice(0, 1);
    AvgFrequencyLeft = AvgFrequencyLeft*(1.0-Weight2) + 0*Weight2;
    return 0;
}

for (var i=NumIntervals-1;i >=0; i--)
{
    //console.log(i+'\t'+LeftLastMeasures[i]);
}

for (var i=NumIntervals-3;i >= 0;i--)
{
    if ((LeftLastMeasures[i] == 1 && LeftLastMeasures[i+1] == 2 && LeftLastMeasures[i+2] == 3) ||
        (LeftLastMeasures[i] == 2 && LeftLastMeasures[i+1] == 3 && LeftLastMeasures[i+2] == 1) ||
        (LeftLastMeasures[i] == 3 && LeftLastMeasures[i+1] == 1 && LeftLastMeasures[i+2] == 2))
        {
            if (i == NumIntervals-3)
                LeftLastIntervals[i+1] = timesArrayLeft[i+2] - timesArrayLeft[i+1];
            LeftLastIntervals[i] = timesArrayLeft[i+1] - timesArrayLeft[i];
        }
    else 
    if ((LeftLastMeasures[i] == 3 && LeftLastMeasures[i+1] == 2 && LeftLastMeasures[i+2] == 1) ||
        (LeftLastMeasures[i] == 2 && LeftLastMeasures[i+1] == 1 && LeftLastMeasures[i+2] == 3) ||
        (LeftLastMeasures[i] == 1 && LeftLastMeasures[i+1] == 3 && LeftLastMeasures[i+2] == 2))
        {
            if (i == NumIntervals-3)
                LeftLastIntervals[i+1] = timesArrayLeft[i+1] - timesArrayLeft[i+2];
            LeftLastIntervals[i] = timesArrayLeft[i] - timesArrayLeft[i+1];
        }
    else
        {
            if (i == NumIntervals-3)
                LeftLastIntervals[i+1] = 0;
            LeftLastIntervals[i] = 0;
        }
}

timesArrayLeft.shift();
LeftLastMeasures.shift();

var Weight = 0.2;
var AvgInterval = LeftLastIntervals[NumIntervals-2];
for (var i = NumIntervals-3; i >= 0; i--) 
{
    AvgInterval = AvgInterval*(1.0-Weight) + LeftLastIntervals[i]*Weight;
    //console.log('LeftLastIntervals[' + i + '] = ' + LeftLastIntervals[i] + '\t' + AvgFrequencyLeft + '\t' + tempFrequency);
}

if (AvgInterval != 0)
    AvgFrequencyLeft = AvgFrequencyLeft*(1.0-Weight2) + 1000/AvgInterval*Weight2;
else
    AvgFrequencyLeft = AvgFrequencyLeft*(1.0-Weight2) + 0*Weight2;
//console.log('AvgInterval = ' + AvgInterval);
if (AvgFrequencyLeft.isNaN)
    AvgFrequencyLeft = 0;
return AvgFrequencyLeft;
    
}

function countValuesAndChopArrayRight (timesArrayRight, timeValue, RightLastIntervals) 
{
// function counts the values in the timesArrayRight that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayRight must be defined as global variable should not lose time in between    
var Weight2 = 0.4;
var NumIntervals = timesArrayRight.length;
if (NumIntervals > FrequencyAveInterval)
    NumIntervals = FrequencyAveInterval;
//console.log('NumIntervalsR = ' + NumIntervals);
if (NumIntervals - 3 < 0)
{
    //timesArrayRight.splice(0, 1);
    //RightLastMeasures.splice(0, 1);
    AvgFrequencyRight = AvgFrequencyRight*(1.0-Weight2) + 0*Weight2;
    return 0;
}

for (var i=NumIntervals-3;i >= 0;i--)
{
    if ((RightLastMeasures[i] == 1 && RightLastMeasures[i+1] == 2 && RightLastMeasures[i+2] == 3) ||
        (RightLastMeasures[i] == 2 && RightLastMeasures[i+1] == 3 && RightLastMeasures[i+2] == 1) ||
        (RightLastMeasures[i] == 3 && RightLastMeasures[i+1] == 1 && RightLastMeasures[i+2] == 2))
        {
            if (i == NumIntervals-3)
                RightLastIntervals[i+1] = timesArrayRight[i+2] - timesArrayRight[i+1];
            RightLastIntervals[i] = timesArrayRight[i+1] - timesArrayRight[i];
        }
    else 
    if ((RightLastMeasures[i] == 3 && RightLastMeasures[i+1] == 2 && RightLastMeasures[i+2] == 1) ||
        (RightLastMeasures[i] == 2 && RightLastMeasures[i+1] == 1 && RightLastMeasures[i+2] == 3) ||
        (RightLastMeasures[i] == 1 && RightLastMeasures[i+1] == 3 && RightLastMeasures[i+2] == 2))
        {
            if (i == NumIntervals-3)
                RightLastIntervals[i+1] = timesArrayRight[i+1] - timesArrayRight[i+2];
            RightLastIntervals[i] = timesArrayRight[i] - timesArrayRight[i+1];
        }
    else
        {
            if (i == NumIntervals-3)
                RightLastIntervals[i+1] = 0;
            RightLastIntervals[i] = 0;
        }
}

timesArrayRight.shift();
RightLastMeasures.shift();

var Weight = 0.2;
var AvgInterval = RightLastIntervals[NumIntervals-2];
for (var i = NumIntervals-3; i >= 0; i--) 
{
    AvgInterval = AvgInterval*(1.0-Weight) + RightLastIntervals[i]*Weight;
    //console.log('RightLastIntervals[' + i + '] = ' + RightLastIntervals[i] + '\t' + AvgFrequencyRight + '\t' + tempFrequency);
}

if (AvgInterval != 0)
    AvgFrequencyRight = AvgFrequencyRight*(1.0-Weight2) + 1000/AvgInterval*Weight2;
else
    AvgFrequencyRight = AvgFrequencyRight*(1.0-Weight2) + 0*Weight2;
//console.log('AvgInterval = ' + AvgInterval);
if (AvgFrequencyRight.isNaN)
    AvgFrequencyRight = 0;
return -AvgFrequencyRight;

}

var PreviousDirPinValueLeft = -1;
var PreviousDirPinValueRight = -1;

function SetPWMLeft(PWMtoSet)   // Change DIR pin depending on PWM sign + use upperLimitPWM
{
    if (PWMtoSet > upperLimitPWM)
        PWMtoSet = upperLimitPWM;
    if (PWMtoSet < -upperLimitPWM)
        PWMtoSet = -upperLimitPWM;
    //console.log("PWMleft = " + PWMleft);
    if (PWMtoSet < 0)
    {
	if (PreviousDirPinValueLeft == -1)
	{
		PreviousDirPinValueLeft = 0;
		board.digitalWrite(LeftDirectionPin, 0);
	}
	else if (PreviousDirPinValueLeft == 1)
	{
		PreviousDirPinValueLeft = 0;
		board.digitalWrite(LeftDirectionPin, 0);
	}    
//	board.digitalWrite(LeftDirectionPin, 0);    
        board.analogWrite(LeftPWMPin, -PWMtoSet);
    }
    else
    {
	if (PreviousDirPinValueLeft == -1)
	{
		PreviousDirPinValueLeft = 1;
		board.digitalWrite(LeftDirectionPin, 1);
	}
	else if (PreviousDirPinValueLeft == 0)
	{
		PreviousDirPinValueLeft = 1;
		board.digitalWrite(LeftDirectionPin, 1);
	}   
//	board.digitalWrite(LeftDirectionPin, 1);
        board.analogWrite(LeftPWMPin, PWMtoSet);
    }
}

function SetPWMRight(PWMtoSet) // Change DIR pin depending on PWM sign + use upperLimitPWM
{
    if (PWMtoSet > upperLimitPWM)
        PWMtoSet = upperLimitPWM;
    if (PWMtoSet < -upperLimitPWM)
        PWMtoSet = -upperLimitPWM;
    //console.log("PWMright = " + PWMright);
    if (PWMtoSet < 0)
    {
	if (PreviousDirPinValueRight == -1)
	{
		PreviousDirPinValueRight = 0;
		board.digitalWrite(RightDirectionPin, 0);
	}
	else if (PreviousDirPinValueRight == 1)
	{
		PreviousDirPinValueRight = 0;
		board.digitalWrite(RightDirectionPin, 0);
	}  
//        board.digitalWrite(RightDirectionPin, 0);
        board.analogWrite(RightPWMPin, -PWMtoSet);
    }
    else
    {
	if (PreviousDirPinValueRight == -1)
	{
		PreviousDirPinValueRight = 1;
		board.digitalWrite(RightDirectionPin, 1);
	}
	else if (PreviousDirPinValueRight == 0)
	{
		PreviousDirPinValueRight = 1;
		board.digitalWrite(RightDirectionPin, 1);
	}  
//        board.digitalWrite(RightDirectionPin, 1);
        board.analogWrite(RightPWMPin, PWMtoSet);
    }
}

function SolenoidDown()
{
    if (StateNotChanged)                         // If we did not decide to drive in the previous 1 sec
    {
        board.digitalWrite(SolenoidPin, 0);     // Than trigger solenoid DOWN
        writelog_other(Date.now() + "\t" + "SOLENOID DOWN!");
        //console.log("SOLENOID DOWN!");
        ValuesForFuzzyBA[4] = 0;
    }
}

function SolenoidCheck()
{
    if (zelenaVrednostDesno != 0 || zelenaVrednostLevo != 0) // If ANY of the wheels MUST go...
    {
        if (StateNotChanged == 1)
        {
            LeftStoppedFlag = 0;
            RightStoppedFlag = 0;
            StateNotChanged = 0;                    // We know that we want to drive! No we need to pull solenoid DOWN even if the timer is set        
            board.digitalWrite(SolenoidPin, 1);     // If we want to go, it MUST be switched ON
            writelog_other(Date.now() + "\t" + "SOLENOID UP!");
            //console.log("SOLENOID UP!");
        }
    }
    else
    {
        if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
           frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0 && 
           StateNotChanged == 0) // If we are on a stop and drived before
        {
            StopBySoundActive = false;
            StateNotChanged = 1;                // Remember that we stopped
            writelog_other(Date.now() + "\t" + "SOLENOID TIMER SET!");
            //console.log("SOLENOID TIMER SET!");
            var TimeoutSolenoid = setTimeout(SolenoidDown, 1000);    // And check again in 1 sec if something changed
        }        
    }
}

function GetPWMfromPIDLeft(zelenaVrednostLevo,frequencyLeft)
{
    var temperror = 0;
    if (Math.abs(zelenaVrednostLevo) > Math.abs(frequencyLeft))
    {
        temperror = zelenaVrednostLevo - frequencyLeft;
    }
    else
    {
        temperror = 2*(zelenaVrednostLevo - frequencyLeft);
    }
    if (IntegralCounterLeft < SummInterval)
    {
        ErrorLeft.unshift(temperror);
        IntegralCounterLeft++;
    }
    else
    {
        ErrorLeft.pop();
        ErrorLeft.unshift(temperror);
    }
    if (IntegralCounterLeft == 1)
    {
        PWMleft += KiLeft*ErrorLeft[0];
    }
    else if (IntegralCounterLeft == 2)
    {
        PWMleft += KpLeft*(ErrorLeft[0] - ErrorLeft[1]) + KiLeft*ErrorLeft[0];
    }
    else
    {
        PWMleft += KpLeft*(ErrorLeft[0] - ErrorLeft[1]) + KiLeft*ErrorLeft[0] + KdLeft*(ErrorLeft[0] - 2*ErrorLeft[1] + ErrorLeft[2]);
    }
    if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
      frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0)
    {
        PWMleft = 0;
        LeftStoppedFlag = 1;
        if (RightStoppedFlag == 1 && STARTctrl != 0)
        {
            STARTctrl = 0;
            SetNewCommandProbabilities(0);
            writelog_other(Date.now() + "\t" + "Control algorithm STOPPED");
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }            
    }    
    return PWMleft;
}

function GetPWMfromPIDRight(zelenaVrednostDesno,frequencyRight)
{
    var temperror = 0;
    if (Math.abs(zelenaVrednostDesno) > Math.abs(frequencyLeft))
    {
        temperror = zelenaVrednostDesno - frequencyLeft;
    }
    else
    {
        temperror = 2*(zelenaVrednostDesno - frequencyLeft);
    }
    if (IntegralCounterRight < SummInterval)
    {
        ErrorRight.unshift(temperror);
        IntegralCounterRight++;
    }
    else
    {
        ErrorRight.pop();
        ErrorRight.unshift(temperror);
    }
    //console.log("ErrorRight[0] = " + ErrorRight[0]);        
    if (IntegralCounterRight == 1)
    {
        PWMright += KiRight*ErrorRight[0];
    }
    else if (IntegralCounterRight == 2)
    {
        PWMright += KpRight*(ErrorRight[0] - ErrorRight[1]) + KiRight*ErrorRight[0];
    }
    else
    {
        PWMright += KpRight*(ErrorRight[0] - ErrorRight[1]) + KiRight*ErrorRight[0] + KdRight*(ErrorRight[0] - 2*ErrorRight[1] + ErrorRight[2]);
    }
    if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
      frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0)
    {
        PWMright = 0;
        RightStoppedFlag = 1;
        if (LeftStoppedFlag == 1 && STARTctrl != 0)
        {
            STARTctrl = 0;
            SetNewCommandProbabilities(0);
            writelog_other(Date.now() + "\t" + "Control algorithm STOPPED");
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }
    }
    return PWMright;
}

function getSound()
{
    var volts = 0;
    if (ArduinoStarted)
    {
    	var peakToPeak = 0;
    	var signalMin = 0;
    	var signalMax = 0;
    	var arrayLength = arraySound.length;
    	for (var i=0; i<arrayLength;i++)
    	{
    		if (i == 0)
    		{
    			signalMin = arraySound[i];
    			signalMax = arraySound[i];
    		}
    		if (arraySound[i] < signalMin)
    		{
    			signalMin = arraySound[i];
    		}
    		else if (arraySound[i] > signalMax)
    		{
    			signalMax = arraySound[i];
    		}
    	}
    	flushSoundArray = true;
    	peakToPeak = signalMax - signalMin;  // max - min = peak-peak amplitude
    	volts = (peakToPeak * 5.0) / 1024;  // convert to volts
    	//console.log(volts);
    }
    return volts;
}

function SwitchPIDParameters()
{
    if (zelenaVrednostDesno == 0 || zelenaVrednostLevo == 0)
    {
        //writelog_other(Date.now() + "\t" + "PID parameters increased!");
        //console.log("PID parameters increased!");
        KpLeft = 5;
        KiLeft = 0.05;
        KdLeft = 0.1;
        KpRight = 5;
        KiRight = 0.05;
        KdRight = 0.1;
    }
    else
    {
        //writelog_other(Date.now() + "\t" + "PID parameters normal!");
        //console.log("PID parameters normal!");
        KpLeft = 2.5;
        KiLeft = 0.025;
        KdLeft = 0.05;
        KpRight = 2.5;
        KiRight = 0.025;
        KdRight = 0.05;
    }
}

//Matrix images (left is front)
{
    var STOP_M = [
    "10000001",
    "01000010",
    "00100100",
    "00011000",
    "00011000",
    "00100100",
    "01000010",
    "10000001"
    ];
    var FWD_M = [
    "00011000",
    "00110000",
    "01100000",
    "11111111",
    "11111111",
    "01100000",
    "00110000",
    "00011000"
    ];
    var BKW_M = [
    "00011000",
    "00001100",
    "00000110",
    "11111111",
    "11111111",
    "00000110",
    "00001100",
    "00011000"
    ];
    var SPINL_M = [
    "00000100",
    "00001000",
    "00010000",
    "00010000",
    "00001001",
    "00000101",
    "00000011",
    "00001111"
    ];
    var SPINR_M = [
    "00001111",
    "00000011",
    "00000101",
    "00001001",
    "00010000",
    "00010000",
    "00001000",
    "00000100"
    ];
    var FWDL_M = [
    "00000001",
    "00000010",
    "00000100",
    "10001000",
    "10010000",
    "10100000",
    "11000000",
    "11111000"
    ];
    var FWDR_M = [
    "11111000",
    "11000000",
    "10100000",
    "10010000",
    "10001000",
    "00000100",
    "00000010",
    "00000001"
    ];
    var BKWL_M = [
    "10000000",
    "01000000",
    "00100000",
    "00010001",
    "00001001",
    "00000101",
    "00000011",
    "00011111"
    ];
    var BKWR_M = [
    "00011111",
    "00000011",
    "00000101",
    "00001001",
    "00010001",
    "00100000",
    "01000000",
    "10000000"
    ];
}
var previousSignal = -1;
function DrawMatrix()
{
    //console.log("CONTROL SIGNAL IS = CONTROL SIGNAL IS = CONTROL SIGNAL IS = " + ValuesForFuzzyBA[4]);
    if (ValuesForFuzzyBA[4] != previousSignal)
    {
        previousSignal = ValuesForFuzzyBA[4];
        switch (ValuesForFuzzyBA[4])
        {
            case 0:
            {
                matrix.draw(STOP_M);
                break;
            }
            case 1:
            {
                matrix.draw(FWD_M);
                break;
            }
            case 2:
            {
                matrix.draw(BKW_M);
                break;
            }
            case 3:
            {
                matrix.draw(SPINL_M);
                break;
            }
            case 4:
            {
                matrix.draw(SPINR_M);
                break;
            }
            case 5:
            {
                matrix.draw(FWDL_M);
                break;
            }
            case 6:
            {
                matrix.draw(FWDR_M);
                break;
            }
            case 7:
            {
                matrix.draw(BKWL_M);
                break;
            }
            case 8:
            {
                matrix.draw(BKWR_M);
                break;
            }
        }
    }
}

function frequencyMeasureAndControlLeftRight() {

    var timeNextLeft = Date.now();
    var timeNextRight = timeNextLeft;    
    frequencyLeft = countValuesAndChopArrayLeft(timesArrayLeft, timeNextLeft, LeftLastIntervals); // number of counts up to current time within last second
    frequencyRight = countValuesAndChopArrayRight(timesArrayRight, timeNextRight, RightLastIntervals); // number of counts up to current time within last second
    timeIntervalLeft = timeNextLeft - timePreviousLeft;
    timePreviousLeft = timeNextLeft;
    timeIntervalRight = timeNextRight - timePreviousRight;
    timePreviousRight = timeNextRight;
    
    if (ArduinoStarted)
        DrawMatrix();

    USSensor[6] = 200.00;
    var USSbuffer = '';
    for (var i=0;i!=12;i++)
    {
        USSbuffer += 'S' + (i+1) + '\t' + parseFloat(USSensor[i]).toFixed(2) + '\t'
    }
    //console.log(USSbuffer);
    //console.log(InfRedDistanceLeft + '\t' + InfRedDistanceRight);
    
    ValuesForFuzzyBA[5] = parseFloat(USSensor[0]);
    ValuesForFuzzyBA[6] = parseFloat(USSensor[1]);
    ValuesForFuzzyBA[7] = parseFloat(USSensor[2]);
    ValuesForFuzzyBA[8] = parseFloat(USSensor[3]);
    ValuesForFuzzyBA[9] = parseFloat(USSensor[4]);
    ValuesForFuzzyBA[10] = parseFloat(USSensor[5]);
    ValuesForFuzzyBA[11] = parseFloat(USSensor[6]);
    ValuesForFuzzyBA[12] = parseFloat(USSensor[7]);
    ValuesForFuzzyBA[13] = parseFloat(USSensor[8]);
    ValuesForFuzzyBA[14] = parseFloat(USSensor[9]);
    ValuesForFuzzyBA[15] = parseFloat(USSensor[10]);
    ValuesForFuzzyBA[16] = parseFloat(USSensor[11]);
    ValuesForFuzzyBA[17] = parseFloat(InfRedDistanceLeft);
    ValuesForFuzzyBA[18] = parseFloat(InfRedDistanceRight);
    
    var AvgDistL = Array(36);
    /*for (var i=0;i!=36;i++)
    {
        AvgDistL[i] = 0;
        for (var j=0;j!=360;j++)
        {
            var readDataL_i = (j+180)%360;
            var dist_mm = 0;
            for (var k=0;k!=readDataL[j][1];k++)
            {
                dist_mm += 256;
            }
            dist_mm += readDataL[j][0];
            dist_mm = dist_mm/10;
            if (dist_mm > 3000)
                dist_mm = 3000;
            var tempweight = 1.0-Math.abs(readDataL_i - (i*10+5))/10;
            if (tempweight > 0)
            {
                AvgDistL[i] += dist_mm*tempweight/40;
            }
        }
    }*/
    var tempArray = Array(20);
    for (var i=0;i!=36;i++)
    {
        AvgDistL[i] = 0;
        var start_i = (i*20-10*i + 180)%360;
        var stop_i = ((i+1)*20-10*i + 180)%360;
        //console.log(start_i + "\t" + stop_i);
        var counter_temp = 0;
        for (var j=start_i;j!=stop_i;j++)
        {
            j=j%360;
            //console.log(j);
            var dist_mm = 0;
            for (var k=0;k!=readDataL[j][1];k++)
            {
                dist_mm += 256;
            }
            dist_mm += readDataL[j][0];
            dist_mm = dist_mm/10;
            if (dist_mm > 3000)
                dist_mm = 3000;
            tempArray[counter_temp] = dist_mm;
            counter_temp++;
            if (counter_temp == 20)
                break;
        }
        tempArray.sort(function(a, b){return a-b});
        AvgDistL[i] = tempArray[6];
    }
    console.log("END");
    console.log(AvgDistL[0].toFixed(2) + '\t' + AvgDistL[1].toFixed(2) + '\t' + AvgDistL[2].toFixed(2) + '\t' + AvgDistL[3].toFixed(2) + '\t' + AvgDistL[4].toFixed(2) + '\t' + AvgDistL[5].toFixed(2) + '\t' + AvgDistL[6].toFixed(2) + '\t' + AvgDistL[7].toFixed(2) + '\t' + AvgDistL[8].toFixed(2) + '\t' + AvgDistL[9].toFixed(2) + '\t' + AvgDistL[10].toFixed(2) + '\t' + AvgDistL[11].toFixed(2));
    console.log(AvgDistL[12].toFixed(2) + '\t' + AvgDistL[13].toFixed(2) + '\t' + AvgDistL[14].toFixed(2) + '\t' + AvgDistL[15].toFixed(2) + '\t' + AvgDistL[16].toFixed(2) + '\t' + AvgDistL[17].toFixed(2) + '\t' + AvgDistL[18].toFixed(2) + '\t' + AvgDistL[19].toFixed(2) + '\t' + AvgDistL[20].toFixed(2) + '\t' + AvgDistL[21].toFixed(2) + '\t' + AvgDistL[22].toFixed(2) + '\t' + AvgDistL[23].toFixed(2));
    console.log(AvgDistL[24].toFixed(2) + '\t' + AvgDistL[25].toFixed(2) + '\t' + AvgDistL[26].toFixed(2) + '\t' + AvgDistL[27].toFixed(2) + '\t' + AvgDistL[28].toFixed(2) + '\t' + AvgDistL[29].toFixed(2) + '\t' + AvgDistL[30].toFixed(2) + '\t' + AvgDistL[31].toFixed(2) + '\t' + AvgDistL[32].toFixed(2) + '\t' + AvgDistL[33].toFixed(2) + '\t' + AvgDistL[34].toFixed(2) + '\t' + AvgDistL[35].toFixed(2));
    console.log(" ");    
    //console.log(AvgDistL[0].toFixed(2) + '\t' + AvgDistL[1].toFixed(2) + '\t' + AvgDistL[2].toFixed(2) + '\t' + AvgDistL[3].toFixed(2) + '\t' + AvgDistL[4].toFixed(2) + '\t' + AvgDistL[5].toFixed(2) + '\t' + AvgDistL[6].toFixed(2) + '\t' + AvgDistL[7].toFixed(2) + '\t' + AvgDistL[8].toFixed(2) + '\t' + AvgDistL[9].toFixed(2) + '\t' + AvgDistL[10].toFixed(2) + '\t' + AvgDistL[11].toFixed(2));
    for (var i=19;i!=55;i++)
    {
        ValuesForFuzzyBA[i] = parseFloat(AvgDistL[i-19]);
    }
    // **************************************************************************************
    // Kontrolni algoritem ZAČETEK
    // **************************************************************************************
    
    var tempstring_s = Date.now() + "\t";
    for (var i=0;i!=55;i++)
    {
        tempstring_s += ValuesForFuzzyBA[i] + "\t";
    }
    writelog_sensors(tempstring_s)
    
    VoltageValue = VoltageSensorValue/1024*5/0.105;
    CurrentValue = (CurrentSensorValue-511)/13.5;
    if (CurrentValue < 0)
        CurrentValue = 0;
    PowerValue = VoltageValue*CurrentValue;
    EnergyConsumed = EnergyConsumed +  PowerValue*refreshFrequency/1000;
    //console.log("CURRENT VALUE IS " + CurrentValue.toFixed(3) + "A\t VOLTAGE VALUE IS " + VoltageValue.toFixed(3) + "V\t POWER VALUE IS " + PowerValue.toFixed(3) + "W\t ENERGY CONSUMED IS " + EnergyConsumed.toFixed(3) + "J");
    
    
    SolenoidCheck(); // Trigger solenoid ON or OFF automatically if we are not driving

    if (STARTctrl == 1) { // le v primeru, da želene vrednosti v smeri nazaj nismo podali izvedemo algoritem za naprej

        //socket.emit("ukazArduinu", {"stevilkaUkaza": stevilkaUkaza, "pinNo": 5, "valuePWM": 1}); // za vsak primer pin naprej postavimo na 0
        //console.log(USSbuffer);
        //console.log(InfRedDistanceLeft + '\t' + InfRedDistanceRight);
        //console.log('ValuesForFuzzyBA[0] = ' + ValuesForFuzzyBA[0] + ' ValuesForFuzzyBA[1] = ' + ValuesForFuzzyBA[1] + ' ValuesForFuzzyBA[2] = ' + ValuesForFuzzyBA[2] + ' ValuesForFuzzyBA[3] = ' + ValuesForFuzzyBA[3] + ' ValuesForFuzzyBA[4] = ' + ValuesForFuzzyBA[4]);
        /*console.log(AvgDistL[0].toFixed(2) + '\t' + AvgDistL[1].toFixed(2) + '\t' + AvgDistL[2].toFixed(2) + '\t' + AvgDistL[3].toFixed(2) + '\t' + AvgDistL[4].toFixed(2) + '\t' + AvgDistL[5].toFixed(2) + '\t' + AvgDistL[6].toFixed(2) + '\t' + AvgDistL[7].toFixed(2) + '\t' + AvgDistL[8].toFixed(2) + '\t' + AvgDistL[9].toFixed(2) + '\t' + AvgDistL[10].toFixed(2) + '\t' + AvgDistL[11].toFixed(2));
        console.log(AvgDistL[12].toFixed(2) + '\t' + AvgDistL[13].toFixed(2) + '\t' + AvgDistL[14].toFixed(2) + '\t' + AvgDistL[15].toFixed(2) + '\t' + AvgDistL[16].toFixed(2) + '\t' + AvgDistL[17].toFixed(2) + '\t' + AvgDistL[18].toFixed(2) + '\t' + AvgDistL[19].toFixed(2) + '\t' + AvgDistL[20].toFixed(2) + '\t' + AvgDistL[21].toFixed(2) + '\t' + AvgDistL[22].toFixed(2) + '\t' + AvgDistL[23].toFixed(2));
        console.log(AvgDistL[24].toFixed(2) + '\t' + AvgDistL[25].toFixed(2) + '\t' + AvgDistL[26].toFixed(2) + '\t' + AvgDistL[27].toFixed(2) + '\t' + AvgDistL[28].toFixed(2) + '\t' + AvgDistL[29].toFixed(2) + '\t' + AvgDistL[30].toFixed(2) + '\t' + AvgDistL[31].toFixed(2) + '\t' + AvgDistL[32].toFixed(2) + '\t' + AvgDistL[33].toFixed(2) + '\t' + AvgDistL[34].toFixed(2) + '\t' + AvgDistL[35].toFixed(2));
        
        console.log(" ");*/
        SwitchPIDParameters();
        
        if (BA_Active)
        {
            getDesiredValuesFuzzyBA();
            setDesiredDecay();
        }
        else if (Step_CTRL)
        {
            DistanceMadeLeft += Math.abs(frequencyLeft);
            DistanceMadeRight += Math.abs(frequencyRight);
            console.log(DistanceMadeLeft + '\t' + DistanceMadeRight);
            if (DistanceMadeLeft > DistanceToMake || DistanceMadeRight > DistanceToMake)
            {
                zelenaVrednostLevo = 0;
                zelenaVrednostDesno = 0;
            }
        }
        
        var SoundLevel = getSound();
        if (SoundLevel > 0.25)
        {
            StopBySoundActive = true;
            writelog_other(Date.now() + "\t" + "STOP BY SOUND, LEVEL IS\t" + SoundLevel);
            //console.log("STOP BY SOUND, LEVEL IS " + SoundLevel);
        }
        if (StopBySoundActive)
        {
            //console.log("DESIRED SET TO 0 BY SOUND LEVEL " + SoundLevel);
            zelenaVrednostLevo = 0;
            zelenaVrednostDesno = 0;
            ValuesForFuzzyBA[4] = 0;
        }
        
        //console.log("želena Levo " + zelenaVrednostLevo);
        //console.log("želena Desno " + zelenaVrednostDesno);
        //console.log("frequencyLeft " + frequencyLeft);
        //console.log("frequencyRight " + frequencyRight);

        //PWMleft = GetPWMfromPIDLeft(zelenaVrednostLevo,frequencyLeft);
        //PWMright = GetPWMfromPIDRight(zelenaVrednostDesno,frequencyRight);
        //console.log("PWM for LEFT from PID is " + PWMleft);
        //console.log("PWM for RIGHT from PID is " + PWMright);

        FuzzyPWMleft = getPWMfromFuzzyLeft(zelenaVrednostLevo,frequencyLeft);
        FuzzyPWMright = getPWMfromFuzzyRight(zelenaVrednostDesno,frequencyRight);
        //console.log("       PWM for LEFT from Fuzzy is " + FuzzyPWMleft);
        //console.log("               PWM for RIGHT from Fuzzy is " + FuzzyPWMright);
        
        

        /*if (PWMleft > upperLimitPWM)
            PWMleft = upperLimitPWM;
        if (PWMleft < -upperLimitPWM)
            PWMleft = -upperLimitPWM;
        if (PWMright > upperLimitPWM)
            PWMright = upperLimitPWM;
        if (PWMright < -upperLimitPWM)
            PWMright = -upperLimitPWM;*/
        if (FuzzyPWMleft > upperLimitPWM)
            FuzzyPWMleft = upperLimitPWM;
        if (FuzzyPWMleft < -upperLimitPWM)
            FuzzyPWMleft = -upperLimitPWM;
        if (FuzzyPWMright > upperLimitPWM)
            FuzzyPWMright = upperLimitPWM;
        if (FuzzyPWMright < -upperLimitPWM)
            FuzzyPWMright = -upperLimitPWM;
            
        PWMleft = FuzzyPWMleft;
        PWMright = FuzzyPWMright;
            
        SetPWMLeft(FuzzyPWMleft);
        SetPWMRight(FuzzyPWMright);    
    }
    else
    {
        DistanceMadeLeft = 0;
        DistanceMadeRight = 0;
    }
    
    var tempstring_pwm = Date.now() + "\t";
    tempstring_pwm += FuzzyPWMleft + "\t" + FuzzyPWMright + "\t" + frequencyLeft + "\t" + frequencyRight + "\t" + zelenaVrednostLevo + "\t" + zelenaVrednostDesno + "\t";
    tempstring_pwm += CurrentValue.toFixed(3) + "\t" + VoltageValue.toFixed(3) + "\t" + PowerValue.toFixed(3) + "\t" + EnergyConsumed.toFixed(3);
    writelog_pwm(tempstring_pwm);
    
    // **************************************************************************************
    // Kontrolni algoritem KONEC
    // **************************************************************************************      
}

function getLatency(Command,Origin,transcript)
{    
    writelog_other(Date.now() + "\tThe command number is:\t" + Command);
    var temptimer = (Date.now()-StartTime);
    LatencyPeriod = Date.now();
    var TimeFromStart = LatencyPeriod - LatencyTimerStart;
    var TimeFromStop = LatencyPeriod - LatencyTimerStop; 
    writelog_latency(Date.now() + "\t" + temptimer + "\t" + Command + "\t" + TimeFromStart + "\t" + TimeFromStop + "\t" + Origin + "\t" + transcript);
    console.log("TimeFromStart: " + TimeFromStart + "\tTimeFromStop: " + TimeFromStop + "\tCurrent time: " + temptimer + "\t" + transcript);
    LatencyFlag = false;
}
    
var frequencyMeasureAndControlLeftRightTimer=setInterval(function(){frequencyMeasureAndControlLeftRight()}, refreshFrequency); 

var NCommands = 9;
var CommandProbabilities = Array(NCommands);
for (i=0;i!=NCommands;i++)
{
    CommandProbabilities[i] = 0;
}
CommandProbabilities[8] = 100;
var StepLastTriggering = Date.now();

function SetNewCommandProbabilities(CommandNumber)
{
    var CurrentCommand = GetNewCommand();
    if (CommandNumber == 0) // stop
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 100;  //stop
    }
    if (CommandNumber == 1) // go
    {
        CommandProbabilities[0] = 100;  //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 2) // left
    {
        if (CurrentCommand == 0) // go -> go left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 100;  //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 1) // back -> back left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 100;  //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 2) // spin left -> spin left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 100;  //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 3) // spin right -> spin left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 100;  //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 4) // go left -> go left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 100;  //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 5) // go right -> go left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 100;  //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 6) // back left -> back left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 100;  //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 7) // back right -> back left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 100;  //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 8) // stop -> spin left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 100;  //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
    }
    if (CommandNumber == 3) // right
    {
        if (CurrentCommand == 0) // go -> go right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 100;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 1) // back -> back right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 100;  //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 2) // spin left -> spin right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 100;  //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 3) // spin right -> spin right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 100;  //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 4) // go left -> go right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 100;  //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 5) // go right -> go right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 100;  //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 6) // back left -> back right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 100;  //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 7) // back right -> back right
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 0;    //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 100;  //back right
            CommandProbabilities[8] = 0;    //stop
        }
        if (CurrentCommand == 8) // stop -> spin left
        {
            CommandProbabilities[0] = 0;    //go
            CommandProbabilities[1] = 0;    //back
            CommandProbabilities[2] = 0;    //spin left
            CommandProbabilities[3] = 100;  //spin right
            CommandProbabilities[4] = 0;    //go left
            CommandProbabilities[5] = 0;    //go right
            CommandProbabilities[6] = 0;    //back left
            CommandProbabilities[7] = 0;    //back right
            CommandProbabilities[8] = 0;    //stop
        }
    }
    if (CommandNumber == 4) // back
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 100;  //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 5) // spin left
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 100;  //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 6) // spin right
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 100;  //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 7) // go left
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 100;  //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 8) // go right
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 100;  //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 9) // back left
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 100;  //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 10) // back right
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 100;  //back right
        CommandProbabilities[8] = 0;    //stop
    }
    if (CommandNumber == 11) // manual / stop
    {
        CommandProbabilities[0] = 0;    //go
        CommandProbabilities[1] = 0;    //back
        CommandProbabilities[2] = 0;    //spin left
        CommandProbabilities[3] = 0;    //spin right
        CommandProbabilities[4] = 0;    //go left
        CommandProbabilities[5] = 0;    //go right
        CommandProbabilities[6] = 0;    //back left
        CommandProbabilities[7] = 0;    //back right
        CommandProbabilities[8] = 100;  //stop
    }
}

function GetNewCommand()
{
    var LargestProb = 0;
    var LargestProbPos = 0;
    for (var i=0;i!=NCommands;i++)
    {
        if (CommandProbabilities[i] > LargestProb)
        {
            LargestProb = CommandProbabilities[i];
            LargestProbPos = i;
        }
    }
    return LargestProbPos;
}

function SetDesired(Command)
{
    if (Command == 1)
    {
        zelenaVrednostLevo = Speed; 
        zelenaVrednostDesno = Speed;
    }
    if (Command == 2)
    {
        zelenaVrednostLevo = -Speed; 
        zelenaVrednostDesno = -Speed;
    }
    if (Command == 3)
    {
        zelenaVrednostLevo = -Speed/2; 
        zelenaVrednostDesno = Speed/2;
    }
    if (Command == 4)
    {
        zelenaVrednostLevo = Speed/2; 
        zelenaVrednostDesno = -Speed/2;
    }
    if (Command == 5)
    {
        zelenaVrednostLevo = Speed/2; 
        zelenaVrednostDesno = Speed;
    }
    if (Command == 6)
    {
        zelenaVrednostLevo = Speed; 
        zelenaVrednostDesno = Speed/2;
    }
    if (Command == 7)
    {
        zelenaVrednostLevo = -Speed/2; 
        zelenaVrednostDesno = -Speed;
    }
    if (Command == 8)
    {
        zelenaVrednostLevo = -Speed; 
        zelenaVrednostDesno = -Speed/2;
    }
    if (Command == 0)
    {
        zelenaVrednostLevo = 0; 
        zelenaVrednostDesno = 0;
    }
}

io.sockets.on("connection", function(socket) {  // od oklepaja ( dalje imamo argument funkcije on -> ob 'connection' se prenese argument t.j. funkcija(socket) 
                                                // ko nekdo pokliče IP preko "browser-ja" ("browser" pošlje nekaj node.js-u) se vzpostavi povezava = "connection" oz.
                                                // je to povezava = "connection" oz. to smatramo kot "connection"
                                                // v tem primeru torej želi client nekaj poslati (ko nekdo z browserjem dostopi na naš ip in port)
                                                // ko imamo povezavo moramo torej izvesti funkcijo: function (socket)
                                                // pri tem so argument podatki "socket-a" t.j. argument = socket
                                                // ustvari se socket_id

    socket.emit("sporociloKlientu", Date.now()); // izvedemo funkcijo = "hello" na klientu, z argumentom, t.j. podatki="Strežnik povezan."

	socket.on("ukazArduinu", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        if (data.stevilkaUkaza == "1") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 1
            //board.digitalWrite(12, 0); // na pinu 12 zapišemo vrednost HIGH
            //board.analogWrite(6, 150); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("ana6=" + "150");
            //board.analogWrite(6, pwmValue2); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            
            socket.emit("sporociloKlientu", "LED prižgana."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED prižgana."
        }
        else if (data.stevilkaUkaza == "0") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            board.digitalWrite(3, 0); // na pinu 12 zapišemo vrednost LOW
            //board.analogWrite(6, 0); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            socket.emit("sporociloKlientu", "LED ugasnjena."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }
        else if (data.stevilkaUkaza == "2") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 2
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, 1); // na pinu 3 zapišemo vrednost HIGH
                //board.digitalWrite(12, 0); // na pinu 3 zapišemo vrednost HIGH
            }
            //else { // če je PWM vrednost enaka 0 izklopimo rele
            //    board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //}
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }
        
        else if (data.stevilkaUkaza == "3") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, 1); // na pinu 3 zapišemo vrednost HIGH
            }
            //else { // če je PWM vrednost enaka 0 izklopimo rele
            //    board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //    board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //}
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }        
        
	});
	
	socket.on("CommandToArduinoMove", function(data) {
	    getLatency(data.CommandNumber,data.Origin,data.interim_transcript);
	    SetNewCommandProbabilities(data.CommandNumber);
	    ValuesForFuzzyBA[4] = GetNewCommand()+1;
	    ValuesForFuzzyBA[4] = ValuesForFuzzyBA[4]%9;
        SetDesired(ValuesForFuzzyBA[4]);
        console.log("COMMAND NUMBER IS\t" + ValuesForFuzzyBA[4]);
        if (data.CommandNumber == 11 && (Date.now() - StepLastTriggering) > 3000)
        {
            Step_CTRL = 1-Step_CTRL;
            StepLastTriggering = Date.now();
        }
        
        if (refreshClientGui == 1) {
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }
        STARTctrl = 1;

	});
	
	socket.on("ukazArduinuUNKNOWN", function(data) {
        
        getLatency(-3,data.Origin + "_BAD",data.interim_transcript);
    });
    
   
    function ControlAndDisplayLeftRight() {
        
    
        socket.emit("sporociloKlientu", "No->" + numberOfCountsLeft);
        socket.emit("sporociloKlientu", "Time interval->" + timeIntervalLeft + "Freq->" + frequencyLeft);
    
        socket.emit("sporociloKlientu", "No->" + numberOfCountsRight);
        socket.emit("sporociloKlientu", "Time interval->" + timeIntervalRight + "Freq->" + frequencyRight);
        
        socket.emit("readOutFrequencyLeftRight", {"leftCount": numberOfCountsLeft, "frequencyLeft": frequencyLeft, "rightCount": numberOfCountsRight, "frequencyRight": frequencyRight});
        
            
        //console.log("Sending LIDAR data");
        socket.emit("LidarData", readDataL);
        LastTimer = Date.now();
    
        socket.emit("HeartBeat", {"BeatSignal" : BeatSignal, "BPM": BPM, "IBI" : IBI});
        
        socket.emit("readOutControlLeftRight", {"PWMleft": PWMleft, "PWMright": PWMright});
     
        if (refreshClientGui == 1) {
        socket.emit("refreshClientGUInumValues", {
                "zelenaVrednostNaprej": zelenaVrednostNaprej,
                "zelenaVrednostNazaj": zelenaVrednostNazaj,
                "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
                "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
                "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
                "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
                "PWMfw": PWMfw,
                "PWMbk": PWMbk,
                "PWMleft": PWMleft,
                "PWMright": PWMright,
        });
        }
        
    }
    
var ControlAndDisplayLeftRightTimer=setInterval(function(){ControlAndDisplayLeftRight()}, refreshFrequency);        
    
});

var tempval = 0;
var messageReceived = true;
    
var BPM = 60;                    // used to hold the pulse rate
var BeatSignal;                 // holds the incoming raw data
var IBI = 600;              // holds the time between beats, the Inter-Beat Interval
var Pulse = false;          // true when pulse wave is high, false when it's low
var QS = false;             // becomes true when finds a beat.

var rate = Array(10);
var sampleCounter = 0;
var lastBeatTime = 0;
var P = 512;                     // used to find peak in pulse wave
var T = 512;                     // used to find trough in pulse wave
var thresh = 512;                // used to find instant moment of heart beat
var amp = 100;                   // used to hold amplitude of pulse waveform
var firstBeat = true;            // used to seed rate array so we startup with reasonable BPM
var secondBeat = true;           // used to seed rate array so we startup with reasonable BPM

var WebSocketClient = require('websocket').client;
 
var client = new WebSocketClient();
 
client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
 
client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        /*if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }*/
        
        messageReceived = true;
    	//console.log('Server: ', message.utf8Data);
    	//connection.send('Time: ' + new Date()); 
        var potVrednost = parseInt(message.utf8Data);
        BeatSignal = potVrednost;
        //console.log(Signal);    
        //console.log(Date.now());
        
        sampleCounter = Date.now();
        var N = sampleCounter - lastBeatTime;
        if (BeatSignal < thresh && N > (IBI/5)*3)
        {       // avoid dichrotic noise by waiting 3/5 of last IBI
            if (BeatSignal < T)
            {                        // T is the trough
                T = BeatSignal;                         // keep track of lowest point in pulse wave 
            }
        }
          
        if (BeatSignal > thresh && BeatSignal > P)
        {          // thresh condition helps avoid noise
            P = BeatSignal;                             // P is the peak
        } 
        //  NOW IT'S TIME TO LOOK FOR THE HEART BEAT
        // signal surges up in value every time there is a pulse
        if (N > 250)
        {                                   // avoid high frequency noise
            //console.log(N + ' ' + Signal + ' ' + IBI + ' ' + thresh);
            if ((BeatSignal > thresh) && (Pulse == false) && (N > (IBI/5)*3))
            {       
                Pulse = true;                               // set the Pulse flag when we think there is a pulse
                //digitalWrite(blinkPin,HIGH);                // turn on pin 13 LED
                IBI = sampleCounter - lastBeatTime;         // measure time between beats in mS
                lastBeatTime = sampleCounter;               // keep track of time for next pulse
    
                if (firstBeat)
                {                         // if it's the first time we found a beat, if firstBeat == TRUE
                    firstBeat = false;                 // clear firstBeat flag
                    return;                            // IBI value is unreliable so discard it
                    //console.log("RETURN???");
                }   
                if (secondBeat)
                {                        // if this is the second beat, if secondBeat == TRUE
                    secondBeat = false;                 // clear secondBeat flag
                    for (var i=0; i<=9; i++)
                    {         // seed the running total to get a realisitic BPM at startup
                        rate[i] = IBI;                      
                    }
                }
    
                // keep a running total of the last 10 IBI values
                var runningTotal = 0;                   // clear the runningTotal variable    
    
                for (var i=0; i<=8; i++)
                {                // shift data in the rate array
                    rate[i] = rate[i+1];              // and drop the oldest IBI value 
                    runningTotal += rate[i];          // add up the 9 oldest IBI values
                }
    
                rate[9] = IBI;                          // add the latest IBI to the rate array
                runningTotal += rate[9];                // add the latest IBI to runningTotal
                runningTotal /= 10;                     // average the last 10 IBI values 
                BPM = 60000/runningTotal;               // how many beats can fit into a minute? that's BPM!
                QS = true;                              // set Quantified Self flag 
                // QS FLAG IS NOT CLEARED INSIDE THIS ISR
                //log('BPM = ' + parseInt(BPM) + ' IBI = ' + IBI);
                //console.log('BPM = ' + parseInt(BPM) + ' IBI = ' + IBI);
            }                       
        }
    
        if (BeatSignal < thresh && Pulse == true)
        {     // when the values are going down, the beat is over
          //digitalWrite(blinkPin,LOW);            // turn off pin 13 LED
          Pulse = false;                         // reset the Pulse flag so we can do it again
          amp = P - T;                           // get amplitude of the pulse wave
          thresh = amp/2 + T;                    // set thresh at 50% of the amplitude
          P = thresh;                            // reset these for next time
          T = thresh;
        }
      
        if (N > 2500)
        {                                        // if 2.5 seconds go by without a beat
          thresh = 512;                          // set thresh default
          P = 512;                               // set P default
          T = 512;                               // set T default
          lastBeatTime = sampleCounter;          // bring the lastBeatTime up to date        
          firstBeat = true;                      // set these to avoid noise
          secondBeat = true;                     // when we get the heartbeat back
          IBI = 600;
        }
    
    });
    
    setInterval(function() {
        //console.log("messageReceived = " + messageReceived);
        if (connection.connected) {
            if (messageReceived)
            {
                //console.log("Sending message to NodeMCU");
                tempval++
    			connection.sendUTF('tempval: ' + tempval); 
                messageReceived = false;
            }
        }
        writelog_heart(Date.now() + "\tSignal =\t" + BeatSignal + "\tBPM =\t" + parseInt(BPM) + "\tIBI =\t" + IBI);
    }, 50);

});

client.connect('ws://192.168.1.114:81/', ['arduino']);
