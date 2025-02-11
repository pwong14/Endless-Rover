// main.js
let config = {
    type: Phaser.AUTO,
    width: 640,
    height: 480,

    // THIS PART IS IMPORTANT, ARCADE PHYSICS!:
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
