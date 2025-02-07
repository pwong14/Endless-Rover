class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    create() {
        // Menu text
        let titleConfig = {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFFFF',
            align: 'center'
        };

        this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2 - 50,
            "ENDLESS LUNAR ROVER",
            titleConfig
        ).setOrigin(0.5);

        let instructionConfig = {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#FFFFFF',
            align: 'center'
        };

        this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2,
            "Use LEFT/RIGHT to tilt.\nHold UP to thrust.\nLand gently on terrain to refuel.\nPress SPACE to start!",
            instructionConfig
        ).setOrigin(0.5);

        this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.startKey)) {
            this.scene.start("playScene");
        }
    }
}
