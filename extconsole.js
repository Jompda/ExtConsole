const tls = require('tls')
const fs = require('fs')


const port = parseInt(process.argv[2])
const uuid = process.argv[3]
const host = '127.0.0.1'
console.log(port, uuid, host)


process.addListener('uncaughtException', errorListener)
/**@type {tls.TLSSocket}*/
let socket = undefined
connect()


function connect() {
    socket = tls.connect(port, host, {
        key: fs.readFileSync('cert/key.pem'),
        rejectUnauthorized: false // Remove if the certificate is legitimate.
    }, () => {
        process.removeListener('uncaughtException', errorListener)
        socket.on('end', () => console.log('Closing'))
        socket.on('error', () => console.log('Closing'))
        socket.pipe(process.stdout)
        process.stdin.pipe(socket)
        socket.write('ExtConsole:' + uuid + '\n\n')
    })
}

/**
 * @param {Error} err 
 */
function errorListener(err) {
    if (err.message !== `connect ECONNREFUSED ${host}:${port}`) return;
    const retryPeriod = 1000
    //console.log(`Connection failed, retrying in ${retryPeriod} ms ..`)
    setTimeout(connect, retryPeriod)
}


process.on('SIGINT', () => {
    socket.write('RECEIVED SIGNAL "SIGINT". EXITING ..\n')
    socket.end()
})

