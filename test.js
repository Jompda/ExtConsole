const extConsole = require('./index.js')


extConsole(false).then((consoles) => {
    console.log('ExtConsole server address:', consoles.server.address())
    process.stdin.on('data', (data) =>
        consoles.createConsole().then((c) => {
            c.log(data.toString('utf8', 0, data.length - 2)) // Remove 2x newline
            c.ondata = (data) => console.log(data.toString('utf8', 0, data.length - 1))
        })
    )


    let exiting = false
    process.on('SIGINT', () => {
        if (exiting++) return process.exit(1)
        consoles.stop((err, gracefully) => {
            console.log({ err, gracefully })
            process.exit(gracefully ? 0 : 1)
        })
    })
})