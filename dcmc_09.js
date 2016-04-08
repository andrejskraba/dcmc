/*********************************************************************        
University of Maribor ************************************************
Faculty of Organizational Sciences ***********************************
Cybernetics & Decision Support Systems Laboratory ********************
@author Andrej Škraba ************************************************
@author Andrej Koložvari**********************************************
@author Davorin Kofjač ***********************************************
@author Radovan Stojanović *******************************************
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
var FrequencyAveInterval = 4;

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
                USSensor[SensCounter] = SensorBuffer;
                //console.log(SensCounter + ' ' + USSensor[SensCounter]);
                SensCounter++;
                SensorBuffer = '';
            }
        }
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

    
    this.digitalRead(LeftEncPin1, function(value) 
    { // LEFT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftFlag1 != value)
        {
            //console.log("   Pin LeftEncPin1 active " + Date.now() + " " + value + " " + secondLeftFlag1);
            secondLeftFlag1 = value;
            LeftLastMeasures.push(1);
            timesArrayLeft.push(Date.now());
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

var STARTctrlFW = 0; // zastavica za zagon kontrolnega algortma za Naprej
var STARTctrlBK = 0; // zastavica za zagon kontrolnega algortma za Nazaj
var STARTctrlSpinL = 0; // zastavica za vklop kontrolnega algoritma SpinL
var STARTctrlSpinR = 0; // zastavica za izklop kontrolnega algoritma SpinR
var STARTctrlHzLRfw = 0; // zastavica za rotacijo koles naprej z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz 
var STARTctrlHzLRbk = 0; // zastavica za rotacijo koles nazaj z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz  

var STARTctrl = 0;

var upperLimitPWM = 125; // zgornja meja vrednosti PWM - le ta določa koliko lahko največ kontrolni algoritem pošlje na PWM    
var lowerLimitPWM = 0; // spodnja meja vrednosti PWM - le ta določa koliko lahko najmanj kontrolni algoritem pošlje na PWM    

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
var LeftLastTimes = new Array();
var LeftLastIntervals = new Array();
var NumLastMeasuresLeft = 0;
var RightLastMeasures = new Array();
var RightLastTimes = new Array();
var RightLastIntervals = new Array();
var NumLastMeasuresRight = 0;
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

var numberOfCountsLeft;
var numberOfCountsRight;

var timeIntervalLeft;
var timeIntervalRight;

var NFuzzyVars = 2;
var NFuzzySets = new Array(NFuzzyVars);
NFuzzySets[0] = 9; // var 1 = output from controller
NFuzzySets[1] = 9; // var 0 = error = actual frequency - desired frequency

var FSvalues = new Array(NFuzzyVars);
for (var i=0;i!=NFuzzyVars;i++)
{
    FSvalues[i] = new Array(NFuzzySets[i]);
    for (var j=0;j!=NFuzzySets[i];j++)
    {
        FSvalues[i][j] = new Array(3);
    }
}

var NRules = 9;
var RBase = new Array(NRules);
for (var i=0;i!=NRules;i++)
{
    RBase[i] = new Array(NFuzzyVars);
}

var AlphaCut = new Array(NFuzzySets[1]); // use number of output fuzzy sets

RBase[0][0] = 0;    RBase[0][1] = 0;    
RBase[1][0] = 1;    RBase[1][1] = 1;    
RBase[2][0] = 2;    RBase[2][1] = 2;    
RBase[3][0] = 3;    RBase[3][1] = 3;    
RBase[4][0] = 4;    RBase[4][1] = 4;    
RBase[5][0] = 5;    RBase[5][1] = 5;    
RBase[6][0] = 6;    RBase[6][1] = 6;    
RBase[7][0] = 7;    RBase[7][1] = 7;    
RBase[8][0] = 8;    RBase[8][1] = 8;    

FSvalues[0][0][0] = -5;
FSvalues[0][0][1] = -5;
FSvalues[0][0][2] = -1.5;    

FSvalues[0][1][0] = -5;
FSvalues[0][1][1] = -1.5;
FSvalues[0][1][2] = -0.875;

FSvalues[0][2][0] = -1.5;
FSvalues[0][2][1] = -0.875;
FSvalues[0][2][2] = -0.25;

FSvalues[0][3][0] = -0.875;
FSvalues[0][3][1] = -0.25;
FSvalues[0][3][2] = 0;

FSvalues[0][4][0] = -0.25;
FSvalues[0][4][1] = 0;
FSvalues[0][4][2] = 0.25;

FSvalues[0][5][0] = 0;
FSvalues[0][5][1] = 0.25;
FSvalues[0][5][2] = 0.875;

FSvalues[0][6][0] = 0.25;
FSvalues[0][6][1] = 0.875;
FSvalues[0][6][2] = 1.5;

FSvalues[0][7][0] = 0.875;
FSvalues[0][7][1] = 1.5;
FSvalues[0][7][2] = 5;

FSvalues[0][8][0] = 1.5;
FSvalues[0][8][1] = 5;
FSvalues[0][8][2] = 5;


FSvalues[1][0][0] = -25;
FSvalues[1][0][1] = -25;
FSvalues[1][0][2] = -18;

FSvalues[1][1][0] = -25;
FSvalues[1][1][1] = -18;
FSvalues[1][1][2] = -10;

FSvalues[1][2][0] = -18;
FSvalues[1][2][1] = -10;
FSvalues[1][2][2] = -3;

FSvalues[1][3][0] = -10;
FSvalues[1][3][1] = -3;
FSvalues[1][3][2] = 0;

FSvalues[1][4][0] = -3;
FSvalues[1][4][1] = 0;
FSvalues[1][4][2] = 3;

FSvalues[1][5][0] = 0;
FSvalues[1][5][1] = 3;
FSvalues[1][5][2] = 10;

FSvalues[1][6][0] = 3;
FSvalues[1][6][1] = 10;
FSvalues[1][6][2] = 18;

FSvalues[1][7][0] = 10;
FSvalues[1][7][1] = 18;
FSvalues[1][7][2] = 25;

FSvalues[1][8][0] = 18;
FSvalues[1][8][1] = 25;
FSvalues[1][8][2] = 25;


function getMRfromFSvalues(value, NumOfVar, NumOfSet)
{
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
    AlphaCut[0] = 0;
    AlphaCut[1] = 0;
    AlphaCut[2] = 0;
    AlphaCut[3] = 0;
    AlphaCut[4] = 0;
    AlphaCut[5] = 0;
    AlphaCut[6] = 0;
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
    var ControlValue = Array(SummInterval);
    for (var L=0;L!=SummInterval;L++)
    {
        //console.log('ErrorLeft[0] = ' + ErrorLeft[0]);
        for (var i=0;i!=NRules;i++)
        {
            var tempMR = 0;
            var tempMinMR = 1;
            for (var CurrentVar = 1;CurrentVar!=NFuzzyVars;CurrentVar++)
            {
                tempMR = getMRfromFSvalues(ErrorLeft[L],CurrentVar,RBase[i][CurrentVar]);
                if (tempMR < tempMinMR)
                    tempMinMR = tempMR;
            }
            AlphaCut[RBase[i][0]] = tempMinMR;
            //console.log('AlphaCut[RBase[i][0]] = ' + AlphaCut[RBase[i][0]]);
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
                if (TempMass2 > AlphaCut[j])
                    TempMass2 = AlphaCut[j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
            //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        }
        if (MassSumm != 0) 
            ControlValue[L] = CoordinateMassSumm / MassSumm / 1.5;
    }
    FuzzyPWMleft = FuzzyPWMleft + ControlValue[0]*0.66 + ControlValue[1]*0.22 + ControlValue[2]*0.12;
    
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
    return FuzzyPWMleft;
}

function getPWMfromFuzzyRight(zelenaVrednostDesno,frequencyRight)
{
    AlphaCut[0] = 0;
    AlphaCut[1] = 0;
    AlphaCut[2] = 0;
    AlphaCut[3] = 0;
    AlphaCut[4] = 0;
    AlphaCut[5] = 0;
    AlphaCut[6] = 0;
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
    var ControlValue = Array(SummInterval);
    for (var L=0;L!=SummInterval;L++)
    {
        //console.log('ErrorRight[0] = ' + ErrorRight[0]);
        for (var i=0;i!=NRules;i++)
        {
            var tempMR = 0;
            var tempMinMR = 1;
            for (var CurrentVar = 1;CurrentVar!=NFuzzyVars;CurrentVar++)
            {
                tempMR = getMRfromFSvalues(ErrorRight[L],CurrentVar,RBase[i][CurrentVar]);
                if (tempMR < tempMinMR)
                    tempMinMR = tempMR;
            }
            AlphaCut[RBase[i][0]] = tempMinMR;
            //console.log('AlphaCut[RBase[i][0]] = ' + AlphaCut[RBase[i][0]]);
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
                if (TempMass2 > AlphaCut[j])
                    TempMass2 = AlphaCut[j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
            //console.log('CoordinateMassSumm = ' + CoordinateMassSumm + ' ' + 'MassSumm = ' + MassSumm);
        }
        if (MassSumm != 0) 
            ControlValue[L] = CoordinateMassSumm / MassSumm / 1.5;
    }
    FuzzyPWMright = FuzzyPWMright + ControlValue[0]*0.66 + ControlValue[1]*0.22 + ControlValue[2]*0.12;
    
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
    return FuzzyPWMright;
}

// var timersound=setInterval(function(){getSound()}, 100); 

function countValuesAndChopArrayLeft (timesArrayLeft, timeValue, LeftLastIntervals) {
// function counts the values in the timesArrayLeft that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayLeft must be defined as global variable should not lose time in between    

var NumIntervals = timesArrayLeft.length;
//console.log('NumIntervalsL = ' + NumIntervals);
if (NumIntervals - 3 < 0)
{
    //timesArrayLeft.splice(0, 1);
    //LeftLastMeasures.splice(0, 1);
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

timesArrayLeft.splice(0, 1);
LeftLastMeasures.splice(0, 1);

var Weight = 0.12;
var AvgInterval = LeftLastIntervals[NumIntervals-2];
for (var i = NumIntervals-3; i >= 0; i--) 
{
    AvgInterval = AvgInterval*(1.0-Weight) + LeftLastIntervals[i]*Weight;
    //console.log('LeftLastIntervals[' + i + '] = ' + LeftLastIntervals[i] + '\t' + AvgInterval);
}
return -AvgInterval;

    
}

function countValuesAndChopArrayRight (timesArrayRight, timeValue, RightLastIntervals) {
// function counts the values in the timesArrayRight that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayRight must be defined as global variable should not lose time in between    
var NumIntervals = timesArrayRight.length;
//console.log('NumIntervalsR = ' + NumIntervals);
if (NumIntervals - 3 < 0)
{
    //timesArrayRight.splice(0, 1);
    //RightLastMeasures.splice(0, 1);
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

timesArrayRight.splice(0, 1);
RightLastMeasures.splice(0, 1);

var Weight = 0.12;
var AvgInterval = RightLastIntervals[NumIntervals-2];
for (var i = NumIntervals-3; i >= 0; i--) 
{
    AvgInterval = AvgInterval*(1.0-Weight) + RightLastIntervals[i]*Weight;
    //console.log('RightLastIntervals[' + i + '] = ' + RightLastIntervals[i] + '\t' + AvgInterval);
}
return -AvgInterval;

    
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
    numberOfCountsLeft = countValuesAndChopArrayLeft(timesArrayLeft, timeNextLeft, LeftLastIntervals); // number of counts up to current time within last second
    numberOfCountsRight = countValuesAndChopArrayRight(timesArrayRight, timeNextRight, RightLastIntervals); // number of counts up to current time within last second
    timeIntervalLeft = timeNextLeft - timePreviousLeft;
    timePreviousLeft = timeNextLeft;
    if (numberOfCountsLeft != 0)
        frequencyLeft = -1000/numberOfCountsLeft;
    else
        frequencyLeft = 0;
    timeIntervalRight = timeNextRight - timePreviousRight;
    timePreviousRight = timeNextRight;
    if (numberOfCountsRight != 0)
        frequencyRight = 1000/numberOfCountsRight;
    else
        frequencyRight = 0;

    var USSbuffer = '';
    for (var i=0;i!=12;i++)
    {
        USSbuffer += 'S' + (i+1) + '\t' + USSensor[i] + '\t'
        
    }
    console.log(USSbuffer);
  
    // **************************************************************************************
    // Kontrolni algoritem ZAČETEK
    // **************************************************************************************
    
    SolenoidCheck(); // Trigger solenoid ON or OFF automatically if we are not driving

    if (STARTctrl == 1) { // le v primeru, da želene vrednosti v smeri nazaj nismo podali izvedemo algoritem za naprej

        //socket.emit("ukazArduinu", {"stevilkaUkaza": stevilkaUkaza, "pinNo": 5, "valuePWM": 1}); // za vsak primer pin naprej postavimo na 0
        //console.log("želena Levo " + zelenaVrednostLevo);
        //console.log("želena Desno " + zelenaVrednostDesno);
        console.log("frequencyLeft " + frequencyLeft);
        console.log("frequencyRight " + frequencyRight);

        //PWMleft = GetPWMfromPIDLeft(zelenaVrednostLevo,frequencyLeft);
        //PWMright = GetPWMfromPIDRight(zelenaVrednostDesno,frequencyRight);
        //console.log("PWM for LEFT from PID is " + PWMleft);
        //console.log("PWM for RIGHT from PID is " + PWMright);
        
        FuzzyPWMleft = getPWMfromFuzzyLeft(zelenaVrednostLevo,frequencyLeft);
        FuzzyPWMright = getPWMfromFuzzyRight(zelenaVrednostDesno,frequencyRight);
        console.log("       PWM for LEFT from Fuzzy is " + FuzzyPWMleft);
        console.log("               PWM for RIGHT from Fuzzy is " + FuzzyPWMright);

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
        
        zelenaVrednostLevo = -Speed; 
        zelenaVrednostDesno = Speed;
        console.log("Command SpinL");

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
        
        zelenaVrednostLevo = Speed; 
        zelenaVrednostDesno = -Speed;
        console.log("Command SpinR");

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
