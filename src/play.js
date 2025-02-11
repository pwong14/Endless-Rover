let gameHighScore = 0;

class Play extends Phaser.Scene {
    constructor() {
        super("playScene");
        this.terrainPoints = [];
        this.terrainSpacing = 20;
        this.terrainMinY = 300;
        this.terrainMaxY = 420;
        this.roverRotationSpeed = 1.3;
        this.roverThrust = 0.05;
        this.maxForwardSpeed = 3;
        this.scrollSpeed = 0;
        this.landed = false;
        this.friction = 1;
        this.gravity = 0.01;
        this.maxFuel = 100;
        this.fuel = this.maxFuel;
        this.refuelPads = [];
        this.refuelSpawnChance = 0.1;
        this.refuelWidth = 40;
        this.refuelHeight = 3;
        this.safeLandingSpeed = 20;
        this.refuelRate = 0.1;
        this.currentPad = null;
        this.distance = 0;
        this.smokeTimer = 0;
        // Parallax factor for stars (lower = slower movement)
        this.starParallaxFactor = 0.3;
    }

    preload() {
        this.load.image('rover', './assets/rover.png');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.physics.world.setBounds(0, 0, this.game.config.width, this.game.config.height);
        this.rover = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height / 2, 'rover');
        this.rover.setOrigin(0.5);
        this.rover.setScale(0.6);
        this.rover.body.setAllowGravity(false);
        this.rover.setCollideWorldBounds(false);
        this.terrainGraphics = this.add.graphics();
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create score UI
        this.scoreUI = this.add.container(10, 10);
        this.scoreBG = this.add.graphics();
        this.scoreBG.fillStyle(0x000000, 0.7);
        this.scoreBG.fillRoundedRect(0, 0, 220, 50, 10);
        this.scoreUI.add(this.scoreBG);
        this.distanceText = this.add.text(10, 5, `DIST 0`, { fontFamily: 'Tiny5', fontSize: '16px', color: '#FFFFFF' });
        this.distanceText.setOrigin(0, 0);
        this.scoreUI.add(this.distanceText);
        this.highScoreText = this.add.text(10, 25, `HIGH 0`, { fontFamily: 'Tiny5', fontSize: '16px', color: '#FFD700' });
        this.highScoreText.setOrigin(0, 0);
        this.scoreUI.add(this.highScoreText);

        // Create star graphics and star field.
        // The stars will be drawn as tiny white squares and placed only in the sky.
        this.starGraphics = this.add.graphics();
        // Set depth to -1 so the stars are drawn behind everything
        this.starGraphics.setDepth(-1);
        this.stars = [];
        // Generate stars over a field wider than the game (to allow wrapping)
        for (let i = 0; i < 200; i++) {
            let star = {
                // x in a range twice the game width for wrapping
                x: Phaser.Math.Between(0, this.game.config.width * 2),
                // y is chosen from 0 up to a bit below the lowest ground (terrainMinY)
                y: Phaser.Math.Between(0, this.terrainMinY - 10)
            };
            this.stars.push(star);
        }

        this.initTerrain();
        this.drawTerrain();

        this.miniSize = 80;
        this.miniCam = this.cameras.add((this.game.config.width - this.miniSize) / 2, 10, this.miniSize, this.miniSize)
            .setZoom(1.5)
            .setBackgroundColor(0x000000);
        this.miniCam.setVisible(false);
        this.miniCam.startFollow(this.rover);
        this.miniBorder = this.add.graphics().setScrollFactor(0);
        this.altitudeText = this.add.text(this.game.config.width / 2, 10 + this.miniSize + 5, '', { fontFamily: 'Tiny5', fontSize: '16px', color: '#FFFFFF' });
        this.altitudeText.setScrollFactor(0);
        this.altitudeText.setOrigin(0.5, 0);
        this.fuelBarGraphics = this.add.graphics();
        this.fuelBarX = this.game.config.width - 20;
        this.fuelBarY = 10;
        this.fuelBarWidth = 10;
        this.fuelBarHeight = 120;
        this.arrowWidth = 8;
        this.arrowHeight = 6;
        this.fuelLabel = this.add.text(this.fuelBarX + this.fuelBarWidth / 2, this.fuelBarY + this.fuelBarHeight + 10, "FUEL", { fontFamily: 'Tiny5', fontSize: '12px', color: '#FFFFFF' });
        this.fuelLabel.setOrigin(0.5, 0);
    }

    update(time, delta) {
        // Update the star background each frame.
        this.drawStars();

        if (this.cursors.left.isDown && this.fuel > 0) {
            this.rover.angle -= this.roverRotationSpeed;
            this.fuel -= 0.05;
            if (this.fuel < 0) this.fuel = 0;
        } else if (this.cursors.right.isDown && this.fuel > 0) {
            this.rover.angle += this.roverRotationSpeed;
            this.fuel -= 0.05;
            if (this.fuel < 0) this.fuel = 0;
        }
        let thrustActive = this.cursors.up.isDown && this.fuel > 0;
        if (thrustActive) {
            if (this.landed) {
                this.landed = false;
                this.currentPad = null;
                this.rover.body.setVelocityY(-2);
            }
            this.fuel -= 0.05;
            if (this.fuel < 0) this.fuel = 0;
            let rad = Phaser.Math.DegToRad(this.rover.angle - 90);
            let vy = this.rover.body.velocity.y;
            vy += Math.sin(rad) * (this.roverThrust * delta);
            this.rover.body.setVelocityY(vy);
            let forward = Math.cos(rad) * 0.001;
            this.scrollSpeed += forward;
            if (this.scrollSpeed < 0) {
                this.scrollSpeed = 0;
            } else if (this.scrollSpeed > this.maxForwardSpeed) {
                this.scrollSpeed = this.maxForwardSpeed;
            }
        } else {
            if (!this.landed) {
                let vy = this.rover.body.velocity.y;
                vy += this.gravity * delta;
                this.rover.body.setVelocityY(vy);
            }
            this.scrollSpeed *= this.friction;
            if (this.landed && this.currentPad) {
                this.fuel += this.refuelRate;
                if (this.fuel > this.maxFuel) this.fuel = this.maxFuel;
                this.scrollSpeed = 0;
            }
        }
        if (Math.abs(this.scrollSpeed) > 0.001) {
            this.distance += this.scrollSpeed;
            this.shiftTerrain(this.scrollSpeed);
            this.drawTerrain();
        }
        this.checkGroundCollision();
        let vx = this.scrollSpeed;
        let vy = this.rover.body.velocity.y;
        let totalSpeed = Math.sqrt(vx * vx + vy * vy);
        this.distanceText.setText(`DISTANCE ${Math.floor(this.distance)}m`);
        if (this.distance > gameHighScore) {
            gameHighScore = this.distance;
        }
        this.highScoreText.setText(`HIGHSCORE ${Math.floor(gameHighScore)}m`);
        if (this.rover.y < 0) {
            this.miniCam.setVisible(true);
            let altitude = this.getGroundY(this.rover.x) - this.rover.y;
            this.altitudeText.setText(`${Math.floor(altitude)}m`);
            this.miniBorder.clear();
            this.miniBorder.lineStyle(2, 0xffffff, 1);
            this.miniBorder.strokeRect((this.game.config.width - this.miniSize) / 2, 10, this.miniSize, this.miniSize);
        } else {
            this.miniCam.setVisible(false);
            this.altitudeText.setText('');
            this.miniBorder.clear();
        }
        this.fuelBarGraphics.clear();
        this.fuelBarGraphics.fillStyle(0x222222, 1);
        this.fuelBarGraphics.fillRect(this.fuelBarX, this.fuelBarY, this.fuelBarWidth, this.fuelBarHeight);
        this.fuelBarGraphics.lineStyle(2, 0xffffff, 1);
        this.fuelBarGraphics.strokeRect(this.fuelBarX, this.fuelBarY, this.fuelBarWidth, this.fuelBarHeight);
        let fuelFillHeight = (this.fuel / 100) * this.fuelBarHeight;
        this.fuelBarGraphics.fillStyle(0xffffff, 1);
        this.fuelBarGraphics.fillRect(this.fuelBarX, this.fuelBarY + (this.fuelBarHeight - fuelFillHeight), this.fuelBarWidth, fuelFillHeight);

        // Smoke effects remain unchanged (with updated offsets)
        this.smokeTimer += delta;
        if (this.smokeTimer >= 100 && this.fuel > 0) {
            if (this.cursors.up.isDown) {
                this.spawnSmoke(-10, 10);
                this.spawnSmoke(10, 10);
            } else if (this.cursors.right.isDown) {
                this.spawnSmoke(-10, 10);
            } else if (this.cursors.left.isDown) {
                this.spawnSmoke(10, 10);
            }
            this.smokeTimer = 0;
        }
    }

    // Draw the star field using a parallax effect.
    // Each star's screen x position is offset by distance * starParallaxFactor.
    // Stars that would be below the ground at that x position (according to getGroundY)
    // are not drawn.
    drawStars() {
        this.starGraphics.clear();
        let totalWidth = this.game.config.width * 2;
        for (let star of this.stars) {
            // Calculate the effective x position using parallax.
            let effectiveX = star.x - (this.distance * this.starParallaxFactor);
            // Wrap around horizontally
            effectiveX = ((effectiveX % totalWidth) + totalWidth) % totalWidth;
            // Only draw stars that appear on the current screen (0 to game width)
            if (effectiveX >= 0 && effectiveX <= this.game.config.width) {
                // Get the ground y at this x position.
                let groundY = this.getGroundY(effectiveX);
                // Only draw the star if it's above the ground.
                if (star.y < groundY) {
                    this.starGraphics.fillStyle(0xffffff, 1);
                    // Draw as a tiny square (2x2 pixels)
                    this.starGraphics.fillRect(effectiveX, star.y, 2, 2);
                }
            }
        }
    }

    spawnSmoke(offsetX, offsetY) {
        let theta = Phaser.Math.DegToRad(this.rover.angle);
        let rotatedX = offsetX * Math.cos(theta) - offsetY * Math.sin(theta);
        let rotatedY = offsetX * Math.sin(theta) + offsetY * Math.cos(theta);
        let smokeX = this.rover.x + rotatedX;
        let smokeY = this.rover.y + rotatedY;
        let smoke = this.add.graphics({ x: smokeX, y: smokeY });
        smoke.fillStyle(0xaaaaaa, 1);
        smoke.fillCircle(0, 0, 3);
        this.tweens.add({
            targets: smoke,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: () => {
                smoke.destroy();
            }
        });
    }

    initTerrain() {
        this.terrainPoints = [];
        this.refuelPads = [];
        let endX = this.game.config.width + 200;
        let x = 0;
        let currentY = Phaser.Math.Between(this.terrainMinY, this.terrainMaxY);
        this.terrainPoints.push({ x, y: currentY });
        while (x < endX) {
            if (Math.random() < this.refuelSpawnChance) {
                let p2x = x + this.terrainSpacing;
                let p3x = x + 2 * this.terrainSpacing;
                this.terrainPoints.push({ x: p2x, y: currentY });
                this.terrainPoints.push({ x: p3x, y: currentY });
                this.refuelPads.push({ x: p2x, y: currentY, width: this.refuelWidth, height: this.refuelHeight });
                x = p3x;
                let deltaY = Phaser.Math.Between(-10, 10);
                currentY += deltaY;
                currentY = Phaser.Math.Clamp(currentY, this.terrainMinY, this.terrainMaxY);
            } else {
                let newX = x + this.terrainSpacing;
                let deltaY = Phaser.Math.Between(-10, 10);
                let newY = Phaser.Math.Clamp(currentY + deltaY, this.terrainMinY, this.terrainMaxY);
                this.terrainPoints.push({ x: newX, y: newY });
                x = newX;
                currentY = newY;
            }
        }
    }

    shiftTerrain(speed) {
        for (let i = 0; i < this.terrainPoints.length; i++) {
            this.terrainPoints[i].x -= speed;
        }
        for (let i = 0; i < this.refuelPads.length; i++) {
            this.refuelPads[i].x -= speed;
        }
        while (this.terrainPoints.length > 0 && this.terrainPoints[0].x < -this.terrainSpacing) {
            this.terrainPoints.shift();
        }
        while (this.refuelPads.length > 0 && this.refuelPads[0].x < -this.terrainSpacing) {
            this.refuelPads.shift();
        }
        let rightmostX = this.getRightmostX();
        let screenRight = this.game.config.width + 200;
        let currentY = this.terrainPoints.length > 0 ? this.terrainPoints[this.terrainPoints.length - 1].y : Phaser.Math.Between(this.terrainMinY, this.terrainMaxY);
        while (rightmostX < screenRight) {
            if (Math.random() < this.refuelSpawnChance) {
                let p2x = rightmostX + this.terrainSpacing;
                let p3x = rightmostX + 2 * this.terrainSpacing;
                this.terrainPoints.push({ x: p2x, y: currentY });
                this.terrainPoints.push({ x: p3x, y: currentY });
                this.refuelPads.push({ x: p2x, y: currentY, width: this.refuelWidth, height: this.refuelHeight });
                rightmostX = p3x;
                let deltaY = Phaser.Math.Between(-10, 10);
                currentY = Phaser.Math.Clamp(currentY + deltaY, this.terrainMinY, this.terrainMaxY);
            } else {
                let newX = rightmostX + this.terrainSpacing;
                let deltaY = Phaser.Math.Between(-10, 10);
                let newY = Phaser.Math.Clamp(currentY + deltaY, this.terrainMinY, this.terrainMaxY);
                this.terrainPoints.push({ x: newX, y: newY });
                rightmostX = newX;
                currentY = newY;
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
        this.terrainGraphics.fillStyle(0x00ff00, 1.0);
        for (let pad of this.refuelPads) {
            let left = pad.x - pad.width / 2;
            let top = pad.y - pad.height;
            this.terrainGraphics.fillRect(left, top, pad.width, pad.height);
        }
    }

    checkGroundCollision() {
        if (this.rover.body.velocity.y < 0) {
            return;
        }
        let rx = this.rover.x;
        let groundY = this.getGroundY(rx);
        let roverBottom = this.rover.y + this.rover.displayHeight / 2;
        if (roverBottom >= groundY) {
            let vx = this.scrollSpeed;
            let vy = this.rover.body.velocity.y;
            let totalSpeed = Math.sqrt(vx * vx + vy * vy);
            let pad = this.getRefuelPadAtX(rx, 10);
            if (pad) {
                if (totalSpeed < this.safeLandingSpeed) {
                    this.rover.body.setVelocityY(0);
                    this.rover.body.setVelocityX(0);
                    this.scrollSpeed = 0;
                    this.rover.y = pad.y - this.rover.displayHeight / 2;
                    this.landed = true;
                    this.currentPad = pad;
                } else {
                    this.scene.start("menuScene");
                }
            } else {
                this.scene.start("menuScene");
            }
        }
    }

    getRefuelPadAtX(x, tolerance = 10) {
        for (let pad of this.refuelPads) {
            let padLeft = pad.x - pad.width / 2 - tolerance;
            let padRight = pad.x + pad.width / 2 + tolerance;
            if (x >= padLeft && x <= padRight) {
                return pad;
            }
        }
        return null;
    }

    getGroundY(x) {
        if (this.terrainPoints.length < 2) {
            return this.game.config.height;
        }
        for (let i = 0; i < this.terrainPoints.length - 1; i++) {
            let p1 = this.terrainPoints[i];
            let p2 = this.terrainPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                let t = (x - p1.x) / (p2.x - p1.x);
                return Phaser.Math.Linear(p1.y, p2.y, t);
            }
        }
        return this.terrainPoints[this.terrainPoints.length - 1].y;
    }
}
