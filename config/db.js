const mongoose = require("mongoose");

mongoose
  .connect('mongodb+srv://xxx:xxxzzzccc@cluster0.k9deo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

module.exports = mongoose;
