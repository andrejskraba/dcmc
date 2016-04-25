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


var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyACM1", {
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
    console.log('open');
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
        if (ArduinoStarted)
            ReadDistanceSensors();
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
var board = new five.Board();

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
    
    InfRedSen1 = new five.Pin(InfRedSen1Pin);
    InfRedSen2 = new five.Pin(InfRedSen2Pin);

    
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

var fs  = require("fs");

var options = {
  key: fs.readFileSync('agent2-key.pem'),
  cert: fs.readFileSync('agent2-cert.pem')
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

    fs.readFile(__dirname + "/dcmc_01.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani pwmbutton...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
     
    case ('/admin') :
               
    fs.readFile(__dirname + "/dcmc_admin_01.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
            
    case ('/adminspeech') : // v primeru, da je v web naslovu na koncu napisano /zahvala
               
    fs.readFile(__dirname + "/dcmc_admin_speech_01.html",
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

var upperLimitPWM = 125; // zgornja meja vrednosti PWM - le ta določa koliko lahko največ kontrolni algoritem pošlje na PWM    

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
var KpLeft = 0.03;
var KiLeft = 0.03;
var KdLeft = 0.02;
var KpRight = 0.03;
var KiRight = 0.03;
var KdRight = 0.02;
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
function ReadDistanceSensors()
{
    
    five.Pin.read(InfRedSen1, function(error, value) {
	var volts = value*0.0048828125; ;
	var distance = 65*Math.pow(volts,-1.10);
	if (distance > 200)
		distance = 200;
	InfRedDistanceLeft = (1.0-SmoothingWeightUS)*InfRedDistanceLeft + SmoothingWeightUS*distance;
  	//console.log(distance);
    });
    five.Pin.read(InfRedSen2, function(error, value) {
	var volts = value*0.0048828125; ;
	var distance = 65*Math.pow(volts,-1.10);
	if (distance > 200)
		distance = 200;
  	//console.log(distance);
	InfRedDistanceRight = (1.0-SmoothingWeightUS)*InfRedDistanceRight + SmoothingWeightUS*distance;
    });
}

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

var NFuzzyVarsBA = 19;
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

var AlphaCutBA = new Array(NFuzzyOutputsBA);
for (var i=0;i!=NFuzzyOutputsBA;i++)
{
    AlphaCutBA[i] = new Array(NFuzzySetsBA[i]);
}

var NRulesBA = 120;
var RBaseBA = new Array(NRulesBA);
for (var i=0;i!=NRulesBA;i++)
{
    RBaseBA[i] = new Array(NFuzzyVarsBA);
}

var ValuesForFuzzyBA = new Array(NFuzzyVars);
ValuesForFuzzyBA[0] = 0;
ValuesForFuzzyBA[1] = 0;
ValuesForFuzzyBA[2] = 0;
ValuesForFuzzyBA[3] = 0;
ValuesForFuzzyBA[4] = 0;
ValuesForFuzzyBA[5] = 0;
ValuesForFuzzyBA[6] = 0;
ValuesForFuzzyBA[7] = 0;
ValuesForFuzzyBA[8] = 0;
ValuesForFuzzyBA[9] = 0;
ValuesForFuzzyBA[10] = 0;
ValuesForFuzzyBA[11] = 0;
ValuesForFuzzyBA[12] = 0;
ValuesForFuzzyBA[13] = 0;
ValuesForFuzzyBA[14] = 0;
ValuesForFuzzyBA[15] = 0;
ValuesForFuzzyBA[16] = 0;
ValuesForFuzzyBA[17] = 0;
ValuesForFuzzyBA[18] = 0;

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

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 0; RN++;
//FwRightL10R5
RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][5] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 6;       RBaseBA[RN][8] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][17] = 0; RN++;

RBaseBA[RN][1] = 0;        RBaseBA[RN][3] = 0;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 3; RN++;
RBaseBA[RN][1] = 1;        RBaseBA[RN][3] = 1;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 2; RN++;
RBaseBA[RN][1] = 2;        RBaseBA[RN][3] = 2;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 1; RN++;
RBaseBA[RN][1] = 3;        RBaseBA[RN][3] = 3;        RBaseBA[RN][4] = 1;       RBaseBA[RN][18] = 0; RN++;
//fwd
console.log(RN);
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
var FSSenBAval4 = 100;
///////////////////////////////////// SENSOR 1
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
}

FSvaluesBA[17][0][0] = 20;
FSvaluesBA[17][0][1] = 20;
FSvaluesBA[17][0][2] = 30;

FSvaluesBA[17][1][0] = 20;
FSvaluesBA[17][1][1] = 30;
FSvaluesBA[17][1][2] = 40;

FSvaluesBA[17][2][0] = 30;
FSvaluesBA[17][2][1] = 40;
FSvaluesBA[17][2][2] = 100;

FSvaluesBA[17][3][0] = 40;
FSvaluesBA[17][3][1] = 100;
FSvaluesBA[17][3][2] = 100;

FSvaluesBA[18][0][0] = 20;
FSvaluesBA[18][0][1] = 20;
FSvaluesBA[18][0][2] = 30;

FSvaluesBA[18][1][0] = 20;
FSvaluesBA[18][1][1] = 30;
FSvaluesBA[18][1][2] = 40;

FSvaluesBA[18][2][0] = 30;
FSvaluesBA[18][2][1] = 40;
FSvaluesBA[18][2][2] = 100;

FSvaluesBA[18][3][0] = 40;
FSvaluesBA[18][3][1] = 100;
FSvaluesBA[18][3][2] = 100;

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

function setDesiredDecay()
{
    if (ValuesForFuzzyBA[4] == 0)   //STOP
    {
        zelenaVrednostLevo = 0;
        zelenaVrednostDesno = 0;
    } else
    if (ValuesForFuzzyBA[4] == 1)   //FORWARD
    {
        zelenaVrednostLevo = Speed*(1-ValuesForFuzzyBA[1]);     // 1 - left fwd
        zelenaVrednostDesno = Speed*(1-ValuesForFuzzyBA[3]);    // 3 - right fwd
    } else
    if (ValuesForFuzzyBA[4] == 2)   //BACKWARD
    {
        zelenaVrednostLevo = -Speed*(1-ValuesForFuzzyBA[0]);    // 0 - left bkwd
        zelenaVrednostDesno = -Speed*(1-ValuesForFuzzyBA[2]);   // 2 - right bkwd
    } else
    if (ValuesForFuzzyBA[4] == 3)   //SPIN LEFT
    {
        zelenaVrednostLevo = -(Speed/2)*(1-ValuesForFuzzyBA[0]);
        zelenaVrednostDesno = (Speed/2)*(1-ValuesForFuzzyBA[3]);
    } else
    if (ValuesForFuzzyBA[4] == 4)   //SPIN RIGHT
    {
        zelenaVrednostLevo = (Speed/2)*(1-ValuesForFuzzyBA[1]);
        zelenaVrednostDesno = -(Speed/2)*(1-ValuesForFuzzyBA[2]);
    } else
    if (ValuesForFuzzyBA[4] == 5)   //FwLeftL5R10
    {
        zelenaVrednostLevo = Speed*(1-ValuesForFuzzyBA[1])/2;
        zelenaVrednostDesno = Speed*(1-ValuesForFuzzyBA[3]);
    } else
    if (ValuesForFuzzyBA[4] == 6)   //FwLeftL10R5
    {
        zelenaVrednostLevo = Speed*(1-ValuesForFuzzyBA[1]);
        zelenaVrednostDesno = Speed*(1-ValuesForFuzzyBA[3])/2
    } else
    if (ValuesForFuzzyBA[4] == 7)   //BkLeftL5R10
    {
        zelenaVrednostLevo = -Speed*(1-ValuesForFuzzyBA[0])/2;
        zelenaVrednostDesno = -Speed*(1-ValuesForFuzzyBA[2]);
    } else
    if (ValuesForFuzzyBA[4] == 8)   //BkLeftL10R5
    {
        zelenaVrednostLevo = -Speed*(1-ValuesForFuzzyBA[0]);
        zelenaVrednostDesno = -Speed*(1-ValuesForFuzzyBA[2])/2;
    } else                          // WHAT WE HAVE TO DO??? STOP!
    {
        zelenaVrednostLevo = 0;
        zelenaVrednostDesno = 0;
    }
}

////////////////////////////////////////// Fuzzy controller for desired frequency change (brake assist) end


// var timersound=setInterval(function(){getSound()}, 100); 

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
        console.log("SOLENOID DOWN!");
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
            console.log("SOLENOID UP!");
        }
    }
    else
    {
        if (frequencyLeft == 0 && zelenaVrednostLevo == 0 && ErrorLeft[0] == 0 && ErrorLeft[1] == 0 && ErrorLeft[2] == 0 &&
           frequencyRight == 0 && zelenaVrednostDesno == 0 && ErrorRight[0] == 0 && ErrorRight[1] == 0 && ErrorRight[2] == 0 && 
           StateNotChanged == 0) // If we are on a stop and drived before
        {
            StateNotChanged = 1;                // Remember that we stopped
            console.log("SOLENOID TIMER SET!");
            var TimeoutSolenoid = setTimeout(SolenoidDown, 1000);    // And check again in 1 sec if something changed
        }        
    }
}

function GetPWMfromPIDLeft(zelenaVrednostLevo,frequencyLeft)
{
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
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }            
    }    
    return PWMleft;
}

function GetPWMfromPIDRight(zelenaVrednostDesno,frequencyRight)
{
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
            console.log("Control algorithm STOPPED");
            SolenoidCheck();
        }
    }
    return PWMright;
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

    var USSbuffer = '';
    for (var i=0;i!=12;i++)
    {
        USSbuffer += 'S' + (i+1) + '\t' + parseFloat(USSensor[i]).toFixed(2) + '\t'
    }
    console.log(USSbuffer);
    console.log(InfRedDistanceLeft + '\t' + InfRedDistanceRight);
    
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
  
    // **************************************************************************************
    // Kontrolni algoritem ZAČETEK
    // **************************************************************************************
    
    SolenoidCheck(); // Trigger solenoid ON or OFF automatically if we are not driving

    if (STARTctrl == 1) { // le v primeru, da želene vrednosti v smeri nazaj nismo podali izvedemo algoritem za naprej

        //socket.emit("ukazArduinu", {"stevilkaUkaza": stevilkaUkaza, "pinNo": 5, "valuePWM": 1}); // za vsak primer pin naprej postavimo na 0
        console.log('ValuesForFuzzyBA[0] = ' + ValuesForFuzzyBA[0] + ' ValuesForFuzzyBA[1] = ' + ValuesForFuzzyBA[1] + ' ValuesForFuzzyBA[2] = ' + ValuesForFuzzyBA[2] + ' ValuesForFuzzyBA[3] = ' + ValuesForFuzzyBA[3] + ' ValuesForFuzzyBA[4] = ' + ValuesForFuzzyBA[4]);
        getDesiredValuesFuzzyBA();
        setDesiredDecay();
        console.log("želena Levo " + zelenaVrednostLevo);
        console.log("želena Desno " + zelenaVrednostDesno);
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
    
    // **************************************************************************************
    // Kontrolni algoritem KONEC
    // **************************************************************************************      
}
    
var frequencyMeasureAndControlLeftRightTimer=setInterval(function(){frequencyMeasureAndControlLeftRight()}, refreshFrequency); 



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
    
    
    socket.on("commandToArduinoFW", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)

        zelenaVrednostLevo = Speed; 
        zelenaVrednostDesno = Speed;
        console.log("Command FW");
        ValuesForFuzzyBA[4] = 1;

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

        STARTctrl = 1; // zastavico za STARTctrl dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });
    
    socket.on("commandToArduinoBK", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = -Speed; 
        zelenaVrednostDesno = -Speed;
        console.log("Command BK");
        ValuesForFuzzyBA[4] = 2;

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
    
    socket.on("commandToArduinoSpinL", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = -Speed/2; 
        zelenaVrednostDesno = Speed/2;
        console.log("Command SpinL");
        ValuesForFuzzyBA[4] = 3;

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
    
socket.on("commandToArduinoSpinR", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = Speed/2; 
        zelenaVrednostDesno = -Speed/2;
        console.log("Command SpinR");
        ValuesForFuzzyBA[4] = 4;

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
    
    socket.on("commandToArduinoTurnFwLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = Speed/2; 
        zelenaVrednostDesno = Speed;
        console.log("Command FwLeftL5R10");
        ValuesForFuzzyBA[4] = 5;

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
    
     socket.on("commandToArduinoTurnFwRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = Speed; 
        zelenaVrednostDesno = Speed/2;
        console.log("Command FwRightL10R5");
        ValuesForFuzzyBA[4] = 6;

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
    
     socket.on("commandToArduinoTurnBkLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = -Speed/2; 
        zelenaVrednostDesno = -Speed;
        console.log("Command BkLeftL5R10");
        ValuesForFuzzyBA[4] = 7;

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
    
     socket.on("commandToArduinoTurnBkRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        
        zelenaVrednostLevo = -Speed; 
        zelenaVrednostDesno = -Speed/2;
        console.log("Command BkRightL10R5");
        ValuesForFuzzyBA[4] = 8;

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
        
	socket.on("ukazArduinuSTOP", function() {
        
        zelenaVrednostLevo = 0; 
        zelenaVrednostDesno = 0;
        console.log("Command STOP");
        ValuesForFuzzyBA[4] = 0;

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
    
    
                      
    
    

    //},1);
    
//}, 500); // digitalno branje poženemo šele čez pol sekunde zaradi pr        
        
    //analog read RIGHT:
    

    
//    board.analogRead(2, function(value) {
//        socket.emit("klientBeri2", value);
//    });
   
function ControlAndDisplayLeftRight() {
    

    socket.emit("sporociloKlientu", "No->" + numberOfCountsLeft);
    socket.emit("sporociloKlientu", "Time interval->" + timeIntervalLeft + "Freq->" + frequencyLeft);

    socket.emit("sporociloKlientu", "No->" + numberOfCountsRight);
    socket.emit("sporociloKlientu", "Time interval->" + timeIntervalRight + "Freq->" + frequencyRight);
    
    socket.emit("readOutFrequencyLeftRight", {"leftCount": numberOfCountsLeft, "frequencyLeft": frequencyLeft, "rightCount": numberOfCountsRight, "frequencyRight": frequencyRight});
    
        
    
    
    
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
