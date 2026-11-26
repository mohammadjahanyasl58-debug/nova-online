const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3000;
const history = new Map();
const MAX_HISTORY = 100;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "NOVA server" }));

io.on("connection", socket => {
  socket.on("join-room", payload => {
    const name = String(payload?.name || "کاربر").trim().slice(0, 24);
    const room = String(payload?.room || "nova-room").trim().slice(0, 32);
    if (!name || !room) return;

    // Leave any previous room before joining another.
    for (const oldRoom of socket.rooms) {
      if (oldRoom !== socket.id) socket.leave(oldRoom);
    }
    socket.data.name = name;
    socket.data.room = room;
    socket.join(room);
    socket.emit("room-history", history.get(room) || []);
    socket.to(room).emit("chat-message", {
      name: "نُوا",
      text: `${name} وارد اتاق شد.`,
      time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      id: "system"
    });
  });

  socket.on("chat-message", payload => {
    const room = socket.data.room;
    const text = String(payload?.text || "").trim().slice(0, 1500);
    if (!room || !text) return;
    const item = {
      name: socket.data.name || "کاربر",
      text,
      time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      id: socket.id
    };
    const list = history.get(room) || [];
    list.push(item);
    if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
    history.set(room, list);
    io.to(room).emit("chat-message", item);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NOVA server listening on ${PORT}`);
});
