const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
});

app.use(express.static(path.join(__dirname, "public")));

// 📌 Tarayıcıdaki "favicon.ico" hatasını önler
app.get('/favicon.ico', (req, res) => res.status(204));

let rooms = {}; // Odalar ve kullanıcılar

io.on("connection", (socket) => {
    console.log(`✅ Yeni kullanıcı bağlandı: ${socket.id}`);

    // 📌 Odaya katılma
    socket.on("joinRoom", ({ odaAdi, kullaniciAdi }) => {
        socket.join(odaAdi);

        if (!rooms[odaAdi]) {
            rooms[odaAdi] = [];
        }
        rooms[odaAdi].push({ id: socket.id, name: kullaniciAdi });

        io.to(odaAdi).emit("roomUsers", rooms[odaAdi]);
        io.to(odaAdi).emit("chatMessage", { kullaniciAdi: "Sistem", mesaj: `${kullaniciAdi} odaya katıldı!` });

        console.log(`📌 ${kullaniciAdi} "${odaAdi}" odasına katıldı.`);
    });

    // 📌 Sohbet mesajlarını yönetme
    socket.on("chatMessage", ({ odaAdi, kullaniciAdi, mesaj }) => {
        io.to(odaAdi).emit("chatMessage", { kullaniciAdi, mesaj });
    });

    // 📌 Sesli iletişim için WebRTC bağlantıları
    socket.on("voiceOffer", ({ odaAdi, offer }) => {
        socket.to(odaAdi).emit("voiceOffer", { senderId: socket.id, offer });
    });

    socket.on("voiceAnswer", ({ senderId, answer }) => {
        io.to(senderId).emit("voiceAnswer", { answer });
    });

    socket.on("newIceCandidate", ({ senderId, candidate }) => {
        io.to(senderId).emit("newIceCandidate", { candidate });
    });

    // 📌 Odadan çıkma
    socket.on("leaveRoom", ({ odaAdi, kullaniciAdi }) => {
        socket.leave(odaAdi);
        if (rooms[odaAdi]) {
            rooms[odaAdi] = rooms[odaAdi].filter(user => user.id !== socket.id);
        }
        io.to(odaAdi).emit("roomUsers", rooms[odaAdi]);
        io.to(odaAdi).emit("chatMessage", { kullaniciAdi: "Sistem", mesaj: `${kullaniciAdi} odadan ayrıldı!` });

        console.log(`🚪 ${kullaniciAdi} "${odaAdi}" odasından ayrıldı.`);
    });

    // 📌 Kullanıcı bağlantıyı kapattığında
    socket.on("disconnect", () => {
        console.log(`❌ Kullanıcı ayrıldı: ${socket.id}`);
    });
});


server.listen(3000, () => {
    console.log("🚀 Sunucu 3000 portunda çalışıyor...");
});


