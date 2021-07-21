const net = require('net')


const server = net.createServer((socket) => {
    if (server.connections > 1) {
        console.log('Dropped a connection after the initial client connected.')
        return socket.end()
    }
    server.close() // Stop accepting more connections.
    socket.on('end', () => console.log('Closing'))
    socket.on('error', () => console.log('Closing'))
    socket.pipe(process.stdout)
    process.stdin.pipe(socket)
})
server.listen(process.argv[2])

