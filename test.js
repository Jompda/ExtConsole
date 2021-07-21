const extConsole = require('./index.js')


extConsole.then(() =>
    process.stdin.on('data', (data) =>
        extConsole.createConsole().then((c) => {
            console.log(`Started external console (${c.socket.remoteAddress}:${c.socket.remotePort}).`)
            c.log(data.toString('utf8', 0, data.length - 2)) // Remove 2x newline
            c.ondata = (data) => console.log(data.toString('utf8', 0, data.length - 2))
        })
    )
)

