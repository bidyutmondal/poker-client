const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8080/ws/game/YARVSJ");
ws.on("open", () => {
    console.log("Connected");
    ws.send(JSON.stringify({ action: "FOLD", playerId: "0730b69b-2517-4614-8bd6-286467ef7a7a", amount: 0 }));
    console.log("Sent FOLD");
});
ws.on("message", (data) => {
    const msg = JSON.parse(data);
    console.log("MSG:", msg.action, JSON.stringify(msg.payload || {}).substring(0, 300));
});
ws.on("error", (e) => console.error("Error:", e.message));
setTimeout(() => { ws.close(); process.exit(0); }, 15000);
