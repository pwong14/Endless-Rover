class Play extends Phaser.Scene {
    constructor() {
        super("playScene");

        // Terrain generation parameters
        this.terrainPoints = [];
        this.terrainSpacing = 20;      // pixel distance between consecutive terrain points
        // Try narrower min/max to ensure you definitely see the ground
        this.terrainMinY = 300;
        this.terrainMaxY = 420;

        // Rover & movement parameters
        this.roverRotationSpeed = 2;   // degrees per frame
        this.roverThrust = 0.002;      // upward acceleration
        this.maxForwardSpeed = 2;      // how quickly the background (terrain) scrolls
        this.scrollSpeed = 0;          
        this.landed = false;           // to track if rover is on the ground

        // Fuel system
        this.maxFuel = 100;
        this.fuel = this.maxFuel;
        this.distance = 0;
    }

    preload() {
        // Load your local rover.png
        // Make sure rover.png is in the same directory as Play.js
        this.load.image('rover', './assets/rover.png');
    }

    create() {
        // Set background color to black
        this.cameras.main.setBackgroundColor('#000000');

        // Enable Arcade Physics
        this.physics.world.setBounds(0, 0, this.game.config.width, this.game.config.height);

        // Create the rover sprite in the center of the screen
        this.rover = this.physics.add.sprite(
            this.game.config.width / 2,
            this.game.config.height / 2,
            'rover'
        );
        // Basic setup
        this.rover.setOrigin(0.5);
        this.rover.setScale(0.5);
        this.rover.body.setAllowGravity(false);

        // Make sure it doesn't collide with the world edges — we have our own ground check
        this.rover.setCollideWorldBounds(false);

        // Terrain graphics
        this.terrainGraphics = this.add.graphics();
        this.terrainGraphics.setDepth(0);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI text for distance & fuel
        let uiStyle = { fontFamily: 'Arial', fontSize: '16px', color: '#FFFFFF' };
        this.distanceText = this.add.text(10, 10, `Distance: 0`, uiStyle);
        this.fuelText = this.add.text(10, 30, `Fuel: 100`, uiStyle);

        // Generate initial terrain
        this.initTerrain();
        // Draw once
        this.drawTerrain();
    }

    update(time, delta) {
        // Handle rotation
        if (this.cursors.left.isDown) {
            this.rover.angle -= this.roverRotationSpeed;
        } else if (this.cursors.right.isDown) {
            this.rover.angle += this.roverRotationSpeed;
        }

        // Thrust input (UP arrow)
        let thrustActive = this.cursors.up.isDown && this.fuel > 0;
        if (thrustActive) {
            this.fuel -= 0.1;
            if (this.fuel < 0) this.fuel = 0;

            // Convert rover angle to apply upward velocity
            let rad = Phaser.Math.DegToRad(this.rover.angle - 90);
            let vy = this.rover.body.velocity.y;
            vy += Math.sin(rad) * (this.roverThrust * delta);
            this.rover.body.setVelocityY(vy);

            // Increase horizontal scroll speed (forward movement)
            let forward = Math.cos(rad) * 0.05; 
            this.scrollSpeed += forward;
            if (this.scrollSpeed < 0) this.scrollSpeed = 0;
            if (this.scrollSpeed > this.maxForwardSpeed) this.scrollSpeed = this.maxForwardSpeed;

            // Once we thrust, we’re not landed anymore
            this.landed = false;
        } else {
            // Light gravity if not on ground
            if (!this.landed) {
                let vy = this.rover.body.velocity.y;
                vy += 0.001 * delta; // small gravity
                this.rover.body.setVelocityY(vy);
            }
        }

        // Shift terrain left by scrollSpeed, update distance
        if (this.scrollSpeed > 0) {
            this.distance += this.scrollSpeed;
            this.shiftTerrain(this.scrollSpeed);
            this.drawTerrain();
        }

        // Check if rover is on/under ground
        this.checkGroundCollision();

        // Update UI
        this.distanceText.setText(`Distance: ${Math.floor(this.distance)}`);
        this.fuelText.setText(`Fuel: ${Math.floor(this.fuel)}`);
    }

    // -------------------
    // Terrain Generation
    // -------------------

    initTerrain() {
        this.terrainPoints = [];

        // Start from x=0 to some distance beyond screen
        let endX = this.game.config.width + 200;
        // Start with a mid Y for the first point
        let currentY = Phaser.Math.Between(this.terrainMinY, this.terrainMaxY);

        for (let x = 0; x <= endX; x += this.terrainSpacing) {
            this.terrainPoints.push({ x: x, y: currentY });
            let deltaY = Phaser.Math.Between(-10, 10);
            currentY += deltaY;
            currentY = Phaser.Math.Clamp(currentY, this.terrainMinY, this.terrainMaxY);
        }
    }

    shiftTerrain(speed) {
        // Move points left
        for (let i = 0; i < this.terrainPoints.length; i++) {
            this.terrainPoints[i].x -= speed;
        }

        // Remove old points off left edge
        while (this.terrainPoints.length > 0 && this.terrainPoints[0].x < -this.terrainSpacing) {
            this.terrainPoints.shift();
        }

        // Add new points on the right if needed
        let rightmostX = this.getRightmostX();
        while (rightmostX < this.game.config.width + 200) {
            let lastY = this.terrainPoints[this.terrainPoints.length - 1].y;
            let deltaY = Phaser.Math.Between(-10, 10);
            let newY = lastY + deltaY;
            newY = Phaser.Math.Clamp(newY, this.terrainMinY, this.terrainMaxY);
            rightmostX += this.terrainSpacing;
            this.terrainPoints.push({ x: rightmostX, y: newY });
        }
    }

    getRightmostX() {
        if (this.terrainPoints.length > 0) {
            return this.terrainPoints[this.terrainPoints.length - 1].x;
        } else {
            return 0;
        }
    }

    drawTerrain() {
        this.terrainGraphics.clear();
        // White line, thickness=2
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
    }

    // -------------------
    // Ground Collision
    // -------------------

    checkGroundCollision() {
        let rx = this.rover.x;
        let groundY = this.getGroundY(rx);
        let roverBottom = this.rover.y + this.rover.displayHeight * 0.5;

        if (roverBottom >= groundY) {
            // Check vertical velocity
            let vy = this.rover.body.velocity.y;
            if (Math.abs(vy) < 0.05) {
                // Landed safely
                this.rover.body.setVelocityY(0);
                this.rover.y = groundY - (this.rover.displayHeight / 2);
                this.landed = true;

                // Refuel if not pressing thrust
                if(!this.cursors.up.isDown) {
                    this.fuel = this.maxFuel;
                }
            } else {
                // Crash (for example, restart)
                this.scene.start("menuScene");
            }
        }
    }

    getGroundY(x) {
        // If there's no terrain, just default bottom
        if (this.terrainPoints.length < 2) {
            return this.game.config.height;
        }

        // Find the points that bracket x
        for (let i = 0; i < this.terrainPoints.length - 1; i++) {
            let p1 = this.terrainPoints[i];
            let p2 = this.terrainPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                // Linear interpolation
                let t = (x - p1.x) / (p2.x - p1.x);
                return Phaser.Math.Linear(p1.y, p2.y, t);
            }
        }

        // If x beyond known range, clamp to last point's y
        return this.terrainPoints[this.terrainPoints.length - 1].y;
    }
}
