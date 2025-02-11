class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    create() {
        // Title is all uppercase so it is yellow.
        let titleConfig = {
            fontFamily: 'Tiny5',
            fontSize: '39px',
            color: '#FFD700',
            align: 'center'
        };

        this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2 - 70,
            "ENDLESS LUNAR ROVER",
            titleConfig
        ).setOrigin(0.5);

        // Define separate style configs for white and yellow text.
        let whiteConfig = {
            fontFamily: 'Tiny5',
            fontSize: '18px',
            color: '#FFFFFF',
            align: 'center'
        };
        let yellowConfig = {
            fontFamily: 'Tiny5',
            fontSize: '18px',
            color: '#FFD700',
            align: 'center'
        };

        // Line 1: "Use LEFT/RIGHT to tilt."
        let line1Texts = [];
        line1Texts.push(this.add.text(0, 0, "Use ", whiteConfig));
        line1Texts.push(this.add.text(0, 0, "LEFT/RIGHT", yellowConfig));
        line1Texts.push(this.add.text(0, 0, " to tilt.", whiteConfig));
        // Position parts of the line next to each other.
        line1Texts[1].x = line1Texts[0].width;
        line1Texts[2].x = line1Texts[0].width + line1Texts[1].width;
        let line1Width = line1Texts[0].width + line1Texts[1].width + line1Texts[2].width;
        // Center the container horizontally.
        this.add.container((this.game.config.width - line1Width) / 2, this.game.config.height / 2 - 10, line1Texts);

        // Line 2: "Hold UP to thrust."
        let line2Texts = [];
        line2Texts.push(this.add.text(0, 0, "Hold ", whiteConfig));
        line2Texts.push(this.add.text(0, 0, "UP", yellowConfig));
        line2Texts.push(this.add.text(0, 0, " to thrust.", whiteConfig));
        line2Texts[1].x = line2Texts[0].width;
        line2Texts[2].x = line2Texts[0].width + line2Texts[1].width;
        let line2Width = line2Texts[0].width + line2Texts[1].width + line2Texts[2].width;
        this.add.container((this.game.config.width - line2Width) / 2, this.game.config.height / 2 + 20, line2Texts);

        // Line 3: "Land gently on terrain to refuel." (all white)
        this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2 + 50,
            "Land gently on terrain to refuel.",
            whiteConfig
        ).setOrigin(0.5);

        // Line 4: "Press SPACE to start!"
        let line4Texts = [];
        line4Texts.push(this.add.text(0, 0, "Press ", whiteConfig));
        line4Texts.push(this.add.text(0, 0, "SPACE", yellowConfig));
        line4Texts.push(this.add.text(0, 0, " to start!", whiteConfig));
        line4Texts[1].x = line4Texts[0].width;
        line4Texts[2].x = line4Texts[0].width + line4Texts[1].width;
        let line4Width = line4Texts[0].width + line4Texts[1].width + line4Texts[2].width;
        this.add.container((this.game.config.width - line4Width) / 2, this.game.config.height / 2 + 80, line4Texts);

        this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.startKey)) {
            this.scene.start("playScene");
        }
    }
}
