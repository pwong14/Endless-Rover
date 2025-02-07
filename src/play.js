// A global (or window) variable to track the highest distance so far.
let gameHighScore = 0;

class Play extends Phaser.Scene {
    constructor() {
        super("playScene");

        // TERRAIN PARAMETERS
        this.terrainPoints = [];
        this.terrainSpacing = 20;
        this.terrainMinY = 300;
        this.terrainMaxY = 420;

        // ROVER & MOVEMENT
        this.roverRotationSpeed = 1.5;  
        this.roverThrust = 0.1;       
        this.maxForwardSpeed = 0.39;  
        this.scrollSpeed = 0;
        this.landed = false;           // Are we currently landed on a refuel pad?

        // "Gravity" & friction
        this.friction = 1;            // 1 = no horizontal friction
        this.gravity = 0.01;          // how fast you fall when not thrusting

        // REFUEL SYSTEM
        this.maxFuel = 100;
        this.fuel = this.maxFuel;

        // REFUEL PAD SETTINGS
        this.refuelPads = [];         // array of { x, y }
        this.refuelSpawnChance = 0.1; // 10% chance for each new terrain point
        this.refuelWidth = 40;        // width of pad for collision
        this.refuelHeight = 3;        // height of pad for drawing
        this.safeLandingSpeed = 20;  // total speed threshold for safe landing
        this.refuelRate = 0.1;         // how fast we replenish fuel per frame
        this.currentPad = null;       // which pad we're currently landed on (if any)

        // DISTANCE & HIGHSCORE
        this.distance = 0;  
    }

    preload() {
        // Make sure rover.png is at ./assets/rover.png (relative to index.html)
        this.load.image('rover', './assets/rover.png');
    }

    create() {
        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Enable Arcade Physics
        this.physics.world.setBounds(0, 0, this.game.config.width, this.game.config.height);

        // Create rover sprite
        this.rover = this.physics.add.sprite(
            this.game.config.width / 2,
            this.game.config.height / 2,
            'rover'
        );
        this.rover.setOrigin(0.5);
        this.rover.setScale(0.5);
        this.rover.body.setAllowGravity(false);  
        this.rover.setCollideWorldBounds(false);  

        // Graphics for terrain & pads
        this.terrainGraphics = this.add.graphics();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI TEXT
        let uiStyle = { fontFamily: 'Arial', fontSize: '16px', color: '#FFFFFF' };
        this.distanceText = this.add.text(10, 10, `Distance: 0`, uiStyle);
        this.fuelText = this.add.text(10, 30, `Fuel: ${this.fuel}`, uiStyle);
        this.highScoreText = this.add.text(10, 50, `High Score: ${gameHighScore}`, uiStyle);

        // NEW: We'll add a line to display your current speed
        this.speedText = this.add.text(10, 70, 'Speed: 0', uiStyle);

        // Generate initial terrain & draw
        this.initTerrain();
        this.drawTerrain();
    }

    update(time, delta) {
        // 1) Handle rotation
        if (this.cursors.left.isDown) {
            this.rover.angle -= this.roverRotationSpeed;
        } else if (this.cursors.right.isDown) {
            this.rover.angle += this.roverRotationSpeed;
        }

        // 2) Thrust input
        let thrustActive = this.cursors.up.isDown && this.fuel > 0;
        if (thrustActive) {
            // If we were landed on a pad, taking off
            if (this.currentPad) {
                this.landed = false;
                this.currentPad = null;
            }

            // Burn fuel
            this.fuel -= 0.1;
            if (this.fuel < 0) this.fuel = 0;

            // Convert angle so that 0° is up
            let rad = Phaser.Math.DegToRad(this.rover.angle - 90);

            // Apply vertical thrust
            let vy = this.rover.body.velocity.y;
            vy += Math.sin(rad) * (this.roverThrust * delta);
            this.rover.body.setVelocityY(vy);

            // Accelerate horizontally
            let forward = Math.cos(rad) * 0.2; 
            this.scrollSpeed += forward;

            // Clamp horizontal speed
            if (this.scrollSpeed < 0) {
                this.scrollSpeed = 0; // no backward movement
            } else if (this.scrollSpeed > this.maxForwardSpeed) {
                this.scrollSpeed = this.maxForwardSpeed;
            }

            // We are not landed once thrust is applied
            this.landed = false;

        } else {
            // If not thrusting & not landed => apply "gravity"
            if (!this.landed) {
                let vy = this.rover.body.velocity.y;
                vy += this.gravity * delta;
                this.rover.body.setVelocityY(vy);
            }

            // Apply friction to horizontal speed
            this.scrollSpeed *= this.friction;

            // If we are landed on a pad => refuel over time
            if (this.landed && this.currentPad) {
                this.fuel += this.refuelRate;
                if (this.fuel > this.maxFuel) this.fuel = this.maxFuel;
            }
        }

        // 3) Move terrain left by scrollSpeed
        if (Math.abs(this.scrollSpeed) > 0.001) {
            this.distance += this.scrollSpeed;
            this.shiftTerrain(this.scrollSpeed);
            this.drawTerrain();
        }

        // 4) Check collision with the ground or a pad
        this.checkGroundCollision();

        // 5) Compute total speed & update UI
        let vx = this.scrollSpeed;
        let vy = this.rover.body.velocity.y;
        let totalSpeed = Math.sqrt(vx * vx + vy * vy);

        this.distanceText.setText(`Distance: ${Math.floor(this.distance)}`);
        this.fuelText.setText(`Fuel: ${Math.floor(this.fuel)}`);
        this.speedText.setText(`Speed: ${totalSpeed.toFixed(3)}`);

        // Update High Score if needed
        if (this.distance > gameHighScore) {
            gameHighScore = this.distance;
        }
        this.highScoreText.setText(`High Score: ${Math.floor(gameHighScore)}`);
    }

    // ---------------------------------------------------------
    // TERRAIN + REFUEL PAD GENERATION + DRAWING
    // ---------------------------------------------------------
    initTerrain() {
        this.terrainPoints = [];
        this.refuelPads = [];  // clear out any old pads

        let endX = this.game.config.width + 200;
        let currentY = Phaser.Math.Between(this.terrainMinY, this.terrainMaxY);

        for (let x = 0; x <= endX; x += this.terrainSpacing) {
            // Add terrain point
            this.terrainPoints.push({ x, y: currentY });

            // Possibly add a refuel pad here
            if (Math.random() < this.refuelSpawnChance) {
                // We'll place it at the terrain's Y
                this.refuelPads.push({ x, y: currentY, width: this.refuelWidth, height: this.refuelHeight });
            }

            // Random walk for next point
            let deltaY = Phaser.Math.Between(-10, 10);
            currentY += deltaY;
            currentY = Phaser.Math.Clamp(currentY, this.terrainMinY, this.terrainMaxY);
        }
    }

    shiftTerrain(speed) {
        // Shift terrain points left
        for (let i = 0; i < this.terrainPoints.length; i++) {
            this.terrainPoints[i].x -= speed;
        }

        // Shift refuel pads left
        for (let i = 0; i < this.refuelPads.length; i++) {
            this.refuelPads[i].x -= speed;
        }

        // Remove points off left
        while (this.terrainPoints.length > 0 && this.terrainPoints[0].x < -this.terrainSpacing) {
            this.terrainPoints.shift();
        }

        // Remove pads off left
        while (this.refuelPads.length > 0 && this.refuelPads[0].x < -this.terrainSpacing) {
            this.refuelPads.shift();
        }

        // Add new points/pads on the right
        let rightmostX = this.getRightmostX();
        while (rightmostX < this.game.config.width + 200) {
            let lastY = this.terrainPoints[this.terrainPoints.length - 1].y;
            let deltaY = Phaser.Math.Between(-10, 10);
            let newY = Phaser.Math.Clamp(lastY + deltaY, this.terrainMinY, this.terrainMaxY);
            rightmostX += this.terrainSpacing;

            // Add terrain point
            this.terrainPoints.push({ x: rightmostX, y: newY });

            // Possibly add a refuel pad
            if (Math.random() < this.refuelSpawnChance) {
                this.refuelPads.push({
                    x: rightmostX,
                    y: newY,
                    width: this.refuelWidth,
                    height: this.refuelHeight
                });
            }
        }
    }

    getRightmostX() {
        if (this.terrainPoints.length === 0) {
            return 0;
        }
        return this.terrainPoints[this.terrainPoints.length - 1].x;
    }

    drawTerrain() {
        this.terrainGraphics.clear();

        // 1) Draw the terrain line
        this.terrainGraphics.lineStyle(2, 0xffffff, 1.0);
        this.terrainGraphics.beginPath();
        if (this.terrainPoints.length > 0) {
            let first = this.terrainPoints[0];
            this.terrainGraphics.moveTo(first.x, first.y);
            for (let i = 1; i < this.terrainPoints.length; i++) {
                this.terrainGraphics.lineTo(this.terrainPoints[i].x, this.terrainPoints[i].y);
            }
        }
        this.terrainGraphics.strokePath();

        // 2) Draw each refuel pad (small rectangle)
        this.terrainGraphics.fillStyle(0x00ff00, 1.0);
        for (let pad of this.refuelPads) {
            // We'll center the pad horizontally so the rover can land on top
            let left = pad.x - pad.width / 2;
            let top = pad.y - pad.height;
            this.terrainGraphics.fillRect(left, top, pad.width, pad.height);
        }
    }

    // ---------------------------------------------------------
    // LANDING / COLLISION
    // ---------------------------------------------------------
    checkGroundCollision() {
        // Figure out the terrain's Y directly under the rover
        let rx = this.rover.x;
        let groundY = this.getGroundY(rx);
        let roverBottom = this.rover.y + (this.rover.displayHeight / 2);

        // If rover is at or below ground level:
        if (roverBottom >= groundY) {
            // Compute total speed from horizontal + vertical
            let vx = this.scrollSpeed;
            let vy = this.rover.body.velocity.y;
            let totalSpeed = Math.sqrt(vx * vx + vy * vy);

            // See if there is a refuel pad at (or near) this x
            let pad = this.getRefuelPadAtX(rx, 10); 
            if (pad) {
                // If we found a pad, check if our landing speed is safe
                if (totalSpeed < this.safeLandingSpeed) {
                    // Safe landing on pad
                    this.rover.body.setVelocityY(0);
                    // Position rover so bottom is on pad
                    this.rover.y = pad.y - (this.rover.displayHeight / 2);
                    this.landed = true;
                    this.currentPad = pad;
                } else {
                    // Crash if speed is too high
                    this.scene.start("menuScene");
                }
            } else {
                // Landed on terrain, not a pad => crash
                this.scene.start("menuScene");
            }
        }
    }

    getRefuelPadAtX(x, tolerance = 10) {
        // Check each pad to see if the rover's x is within "tolerance" range
        for (let pad of this.refuelPads) {
            let padLeft = pad.x - (pad.width / 2) - tolerance;
            let padRight = pad.x + (pad.width / 2) + tolerance;
            if (x >= padLeft && x <= padRight) {
                return pad;
            }
        }
        return null;
    }

    getGroundY(x) {
        // If no terrain, fallback to screen bottom
        if (this.terrainPoints.length < 2) {
            return this.game.config.height;
        }

        // Find the two terrain points that bracket x
        for (let i = 0; i < this.terrainPoints.length - 1; i++) {
            let p1 = this.terrainPoints[i];
            let p2 = this.terrainPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                let t = (x - p1.x) / (p2.x - p1.x);
                return Phaser.Math.Linear(p1.y, p2.y, t);
            }
        }

        // If x is beyond our known range, clamp to the last point's y
        return this.terrainPoints[this.terrainPoints.length - 1].y;
    }
}
