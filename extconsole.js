const net = require('net'), tls = require('tls')
const { generateKeyPair } = require('crypto')


process.argv.splice(0, 2)
if (process.argv.length < 3) return exitOnError(console.log('Arguments: <uuid> <port> <useTLS>'))
const uuid = process.argv[0]
const port = parseInt(process.argv[1])
const useTLS = process.argv[2].toLowerCase() === 'true'
const host = '127.0.0.1'
console.log({ uuid, port, useTLS, host })


/**@type {net.Socket|tls.TLSSocket}*/
let socket = undefined
process.addListener('uncaughtException', connectionErrorListener)
process.on('SIGINT', (signal) => {
    if (!socket || socket.writableEnded) return process.exit()
    socket.write(`${uuid}: RECEIVED SIGNAL "${signal}". EXITING ..\n`)
    socket.end()
})


/**@type {string}*/
let key = undefined
if (!useTLS) connect()
else generateKeyPair('rsa', {
    modulusLength: 4096,
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
}, (err, publicKey, privateKey) => {
    if (err) return exitOnError(err)
    key = privateKey
    connect()
})


function connect() {
    socket = useTLS ?
        tls.connect(port, host, {
            key, rejectUnauthorized: false // Remove if the certificate is legitimate.
        }, onConnected)
        : net.connect(port, host, onConnected)

    function onConnected() {
        process.removeListener('uncaughtException', connectionErrorListener)
        socket.on('error', exitOnError)
        socket.pipe(process.stdout)
        process.stdin.pipe(socket)
        socket.write('ExtConsole:' + uuid + '\n\n')
    }
}

/**
 * @param {Error} err 
 */
function connectionErrorListener(err) {
    if (err.message !== `connect ECONNREFUSED ${host}:${port}`) return;
    socket = undefined
    const retryPeriod = 1000
    console.log(`Connection failed, retrying in ${retryPeriod} ms ..`)
    setTimeout(connect, retryPeriod)
}


/**
 * @param {Error} err 
 */
function exitOnError(err) {
    if (err) console.error(err)
    console.log('Press ENTER to exit..')
    process.stdin.once('data', () => process.exit())
}