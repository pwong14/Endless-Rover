//
//  Paul Wong
//  Endless Lunar Rover
//
//  Created by Paul Wong in 36 hours, or more.
//
// Creative Tilt
// Starting with technical tilt, one thing I am most proud of is the terrain generation. The terrain is created as a continuous polyline of evenly spaced points. Starting from a random height, each new point shifts right by a fixed amount while its height is adjusted randomly within bounds. Occasionally, the code inserts a flat segment to serve as a landing pad. As the game scrolls, points off-screen are removed and new ones added to extend the terrain indefinitely. For the visual tilt, while not ground breaking, I decided to mimic the poly line art style of the early Lunar Lander games, and I think this style still holds up to this day for a space game. The visual element that I really like and had fun implementing was the thrust trails, where they are indicative of which thrusters are activated, and it also shows which way the Rover is travelling as well. (If you are falling down, the thrust trail actually fall upwards!)

let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },

    scene: [ Menu, Play ]
};

let game = new Phaser.Game(config);
