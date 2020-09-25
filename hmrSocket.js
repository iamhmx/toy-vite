const WebSocket = require('ws')

const wss = new WebSocket.Server({
	port: 4000,
})

wss.on('connection', function (ws) {
	console.log('接收到hmr连接')
	ws.send(JSON.stringify({ type: 'connected' }))
})
