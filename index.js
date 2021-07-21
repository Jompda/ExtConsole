const childProcess = require('child_process')
const net = require('net')
const { Console } = require('console')
const detectPort = require('detect-port')
const path = require('path')


module.exports = {
    createConsole
}


class ExtConsole extends Console {
    /**
     * @param {net.Socket} socket 
     */
    constructor(socket) {
        super({ stdout: socket, stderr: socket })
        /**@type {net.Socket}*/
        this.socket = socket
        socket.on('data', (data) => this.ondata(data))
    }


    /**
     * @param {Buffer} data 
     */
    ondata(data) { // Default
        const addr = this.socket.address()
        process.stdout.write(`(${addr.address}:${addr.port}): ` + data)
    }


    /**
     * @param {function?} cb 
     */
    close(cb) {
        this.socket.end(cb)
    }
}


/**
 * @param {number} startingPort Lowest desireable port number.
 * @param {string} host 
 * @returns {Promise<ExtConsole>}
 */
function createConsole(startingPort = undefined, host = '127.0.0.1') {
    /**@type {ExtConsole}*/
    let extConsole = undefined
    process.addListener('uncaughtException', errorListener)

    let resolve, reject, port
    return new Promise((res, rej) => {
        resolve = res; reject = rej
        detectPort(startingPort).then((_port) => {
            port = _port
            // Shell specific commands needed in the future
            childProcess.exec(`start node ${path.join(process.cwd(), 'extconsole.js')} ${port}`)
            connect()
        })
    })


    function connect() {
        const socket = net.createConnection(port, host, () => {
            process.removeListener('uncaughtException', errorListener)
            socket.on('end', () =>
                console.log(`External console (${socket.address().address}:${port}) disconnected.`)
            )
            socket.on('error', (err) =>
                console.log(`External console (${socket.address().address}:${port}) disconnected. Error: ${err.message}`)
            )
            extConsole = new ExtConsole(socket)
            resolve(extConsole)
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
}

