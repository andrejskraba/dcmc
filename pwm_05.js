var http = require ('http');

var firmata = require("firmata");
console.log("Start");

var board = new firmata.Board("/dev/ttyACM1",function(){
    console.log("Connected to Arduino");
	console.log("Firmware: " + board.firmware.name +
            	"-" + board.firmware.version.major +
            	"." + board.firmware.version.minor);
	console.log("Enabling LED on pin 13");
	board.pinMode(13, board.MODES.OUTPUT);
    board.pinMode(9, board.MODES.PWM);
    http.createServer(function(req, res){
        var parts = req.url.split("/"),
        operator = parseInt(parts[1], 10);

        if (operator == 0) {
            console.log("LED OFF");
            board.digitalWrite(13, board.LOW);
            console.log("Operator = 0");
        }
        else if (operator == 1) {
            console.log("LED ON");
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 1");
        }
        else if (operator == 2) {
            console.log("PWM test");
            
            //setInterval(function(){
                var an = 0; // Math.random()*255; // 0 ~ 255
                board.analogWrite(9, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            //}, 100);
            
           // board.analogWrite(3, 100, callback);
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 2");
        }
        else if (operator == 3) {
            console.log("PWM test");
            var an = 65; // Math.random()*255; // 0 ~ 255
            board.analogWrite(9, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 3");
        }
        
        else if (operator == 4) {
            console.log("PWM test");
            var an = 100; // Math.random()*255; // 0 ~ 255
            board.analogWrite(9, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 3");
        }        
        
        else if (operator == 5) {
            console.log("PWM test");
            var an = 150; // Math.random()*255; // 0 ~ 255
            board.analogWrite(6, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 3");
        }
        
        else if (operator == 6) {
            console.log("PWM test");
            var an = 200; // Math.random()*255; // 0 ~ 255
            board.analogWrite(9, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 3");
        }
        
        else if (operator == 7) {
            console.log("PWM test");
            var an = 250; // Math.random()*255; // 0 ~ 255
            board.analogWrite(9, an); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            board.digitalWrite(13, board.HIGH);
            console.log("Operator = 3");
        }        

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write("456 test To test, write in the Web Browser Address Bar:\nhttp://93.103.18.222:8080/1\nand press ENTER \n");
        res.end("Value of the entered operator is:" + operator);
        }).listen(8080, "193.2.123.42");
    console.log("Server running on http://193.2.123.42:8080/ To test write in the Web Browser address: http://193.2.123.106:8080/1 and press ENTER");
});
//Deluje preko request, response mehanizma brez socket.io
//NAVODILO - v brskalnik se vnese /0 -ugasne, /1-prižge
