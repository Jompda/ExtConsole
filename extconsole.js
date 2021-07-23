const tls = require('tls')
const crypto = require('crypto')


if (process.argv.length < 4) return console.log('Arguments: <port> <uuid> [host]')
const port = parseInt(process.argv[2])
const uuid = process.argv[3]
const host = process.argv[4] || '127.0.0.1'
console.log(port, uuid, host)


/**@type {tls.TLSSocket}*/
let socket = undefined
process.addListener('uncaughtException', connectionErrorListener)
process.on('SIGINT', (signal) => {
    if (!socket || socket.writableEnded) return process.exit()
    socket.write(`${uuid}: RECEIVED SIGNAL "${signal}". EXITING ..\n`)
    socket.end()
})


/**@type {string}*/
let key = undefined
crypto.generateKeyPair('rsa', {
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
    socket = tls.connect(port, host, {
        key, rejectUnauthorized: false // Remove if the certificate is legitimate.
    }, () => {
        process.removeListener('uncaughtException', connectionErrorListener)
        socket.on('error', exitOnError)
        socket.pipe(process.stdout)
        process.stdin.pipe(socket)
        socket.write('ExtConsole:' + uuid + '\n\n')
    })
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
    console.error(err)
    console.log('Press ENTER to exit..')
    process.stdin.once('data', () => process.exit())
}