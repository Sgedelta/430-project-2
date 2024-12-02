const mongoose = require('mongoose');
const _ = require('underscore');

const GameSchema = new mongoose.Schema({

    roomCode: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },

    player1: {
        type: mongoose.Schema.ObjectId,
        required: true, //player one is the person who made the room, p2 is whoever joins
        ref: 'Account',

    },
    player2: {
        type: mongoose.Schema.ObjectId,
        ref: 'Account',

    },

    gameOver: {
        type: Boolean,
        default: false,
    },
    winner: {
        type: String,
        default: "No Winner Yet!",
        trim: true,
    },

    p1Points: {
        type: Number,
        default: 0,

    },
    p1Uses: {
        type: Object,
        default: {
            exp_gain: 1,
            reset: 1,
            sacrifice: 2,
            steal: 2,
        },

    },
    p2Points: {
        type: Number,
        default: 0,

    },
    p2Uses: {
        type: Object,
        default: {
            exp_gain: 1,
            reset: 1,
            sacrifice: 2,
            steal: 2,
        },
    },

    startTime: {
        type: Date,
        default: Date.now,
    },

});

GameSchema.statics.toAPI = (doc) => ({
    roomCode: doc.roomCode,
    _id: doc._id,

});

const GameModel = mongoose.model('Game', GameSchema);
module.exports = GameModel;
