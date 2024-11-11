const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    desc: { type: String },
},{ 
  timestamps: true 
});

module.exports = mongoose.model('room', roomSchema);
