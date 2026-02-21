const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

const WSS_PORT = 8080;
const BAUD_RATE = 9600;

// WebSocket Server
const wss = new WebSocket.Server({ port: WSS_PORT });
console.log(`WebSocket server started on port ${WSS_PORT}`);

// Broadcast function
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

async function start() {
    console.log('Scanning for Arduino...');
    const ports = await SerialPort.list();

    // Simple heuristic: Try ports with "Arduino" or "USB" in manufacturer/pnpId for Windows, or ttyACM/ttyUSB for Linux
    let targetPort = ports.find(p =>
        (p.manufacturer && (p.manufacturer.includes('Arduino') || p.manufacturer.includes('wch.cn'))) ||
        (p.path.includes('USB') || p.path.includes('ACM'))
    );

    if (targetPort) {
        console.log(`Connecting to likely Arduino on ${targetPort.path}`);
        connectSerial(targetPort.path);
    } else {
        console.log('No obvious Arduino found. List of available ports:');
        ports.forEach(p => console.log(` - ${p.path} (${p.manufacturer || 'unknown'})`));
        console.log('Please edit server.js to manually specify the correct COM port if needed.');

        // Optional: Manual overrides for testing
        // connectSerial('COM3'); 
    }
}

function connectSerial(path) {
    const port = new SerialPort({ path, baudRate: BAUD_RATE });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    port.on('open', () => console.log(`Serial Port ${path} Opened`));
    port.on('error', err => console.error('Serial Error: ', err.message));

    parser.on('data', line => {
        // console.log(`Raw: ${line}`); // Uncomment for debug

        // Expected format: timestamp,speed,ph,salinity,pressure,turbidity,energy,load,leak,depth,altitude,itemp,etemp,cond,acc,gyro
        const parts = line.split(',');

        // Basic validation
        if (parts.length >= 10) {
            const data = {
                // If timestamp missing in index 0, use current time
                timestamp: parts[0] && parts[0].includes(':') ? parts[0] : new Date().toTimeString().split(' ')[0],
                speed: parts[1],
                ph: parts[2],
                salinity: parts[3],
                pressure: parts[4],
                turbidity: parts[5],
                energy: parts[6],
                load: parts[7],
                leak: parts[8],
                depth: parts[9],
                altitude: parts[10],
                itemp: parts[11],
                etemp: parts[12],
                cond: parts[13],
                acc: parts[14],
                gyro: parts[15]
            };

            // Broadcast via WebSocket
            broadcast(data);
        }
    });
}

start();
