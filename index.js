const express = require("express");
const mongoose = require("./config/db");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const Room = require("./models/Room");
const cors = require("cors");

const authMiddleware = require('./middlewares/authMiddleware');
const app = express();
const PORT = 5550;
const JWT_SECRET = "your_jwt_secret_key";

app.use(express.json());

// CORS options configuration
const corsOptions = {
  origin: ["http://localhost:3000", "https://webrtc-client-bw3d.onrender.com"],
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));

// Socket.IO server setup
const io = new Server(8000, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  socket.on("room:join", (data) => {

    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });

    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  socket.on("chat:message", (data) => {
    socket.broadcast.emit("chat:message", { message: data.message });
  });

});

// Sign-up route
app.post("/api/auth/signup", async (req, res) => {
  console.log("hello", req.body);

  const { email, password, name } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ email, name, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
});

// Login route
app.post("/api/auth/login", async (req, res) => {
  console.log(req.body);

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log(user, "user");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Password is missing" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      message: "success",
      token,
      userDetails: {
        id: user._id,
        email: user.email,
        name: user.name,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new room
app.post("/api/rooms", authMiddleware, async (req, res) => {
  try {
    const { title, desc } = req.body;
    const room = new Room({ title, desc });
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all rooms
app.get("/api/rooms", authMiddleware,  async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
